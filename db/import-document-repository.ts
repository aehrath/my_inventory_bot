import { env } from "cloudflare:workers";
import { detectImportSource, importDocumentEntityTypes, semanticImportContent, storedImportFileName } from "../app/import-documents";
import type { ImportDocumentIndex, ImportDocumentLink, ImportDocumentLinkInput, ImportDocumentSummary } from "../app/import-documents";
import { inventoryDatabase } from "./inventory-repository";

type ImportDocumentRow = {
  id: string;
  original_name: string;
  stored_name: string;
  source_name: string;
  import_kind: "expense" | "invoice";
  imported_at: string;
  content_type: string;
  byte_size: number;
  content_hash: string;
  semantic_hash: string;
  last_imported_at: string;
  import_count: number;
  storage_key: string;
  link_count?: number;
};

type ImportDocumentLinkRow = {
  document_id: string;
  entity_type: ImportDocumentLink["entityType"];
  entity_id: string;
  relation: ImportDocumentLink["relation"];
  linked_at: string;
};

const documentBucket = () => {
  if (!env.DATA_SNAPSHOTS) throw new Error("Imported document storage is unavailable.");
  return env.DATA_SNAPSHOTS;
};

const hashBytes = async (value: ArrayBuffer) => {
  const digest = await crypto.subtle.digest("SHA-256", value);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};

const summary = (row: ImportDocumentRow): ImportDocumentSummary => ({
  id: row.id,
  originalName: row.original_name,
  storedName: row.stored_name,
  sourceName: row.source_name,
  importKind: row.import_kind,
  importedAt: row.imported_at,
  contentType: row.content_type,
  byteSize: row.byte_size,
  contentHash: row.content_hash,
  semanticHash: row.semantic_hash,
  lastImportedAt: row.last_imported_at,
  importCount: row.import_count,
  linkCount: row.link_count ?? 0,
});

const link = (row: ImportDocumentLinkRow): ImportDocumentLink => ({
  documentId: row.document_id,
  entityType: row.entity_type,
  entityId: row.entity_id,
  relation: row.relation,
  linkedAt: row.linked_at,
});

const relationRank = { referenced: 0, updated: 1, created: 2 } as const;

const normalizeLinks = (links: readonly ImportDocumentLinkInput[]) => {
  const unique = new Map<string, ImportDocumentLinkInput>();
  for (const candidate of links) {
    if (!importDocumentEntityTypes.includes(candidate.entityType) || !candidate.entityId.trim() || !(candidate.relation in relationRank)) continue;
    const normalized = { ...candidate, entityId: candidate.entityId.trim() };
    const key = `${normalized.entityType}:${normalized.entityId}`;
    const previous = unique.get(key);
    if (!previous || relationRank[normalized.relation] > relationRank[previous.relation]) unique.set(key, normalized);
  }
  return Array.from(unique.values());
};

export async function listImportDocuments(): Promise<ImportDocumentIndex> {
  const db = await inventoryDatabase();
  const [documentResult, linkResult] = await Promise.all([
    db.prepare(`
      SELECT d.*, COUNT(l.document_id) AS link_count
      FROM import_documents d
      LEFT JOIN import_document_links l ON l.document_id = d.id
      GROUP BY d.id
      ORDER BY d.imported_at DESC, d.id DESC
    `).all() as Promise<{ results?: ImportDocumentRow[] }>,
    db.prepare(`
      SELECT document_id, entity_type, entity_id, relation, linked_at
      FROM import_document_links
      ORDER BY linked_at DESC, document_id DESC
    `).all() as Promise<{ results?: ImportDocumentLinkRow[] }>,
  ]);
  return { documents: (documentResult.results ?? []).map(summary), links: (linkResult.results ?? []).map(link) };
}

export async function getImportDocument(id: string) {
  const db = await inventoryDatabase();
  const row = await db.prepare(`
    SELECT d.*, COUNT(l.document_id) AS link_count
    FROM import_documents d
    LEFT JOIN import_document_links l ON l.document_id = d.id
    WHERE d.id = ?
    GROUP BY d.id
  `).bind(id).first() as ImportDocumentRow | null;
  if (!row) return null;
  const object = await documentBucket().get(row.storage_key);
  if (!object) throw new Error("The archived import file is missing from document storage.");
  return { document: summary(row), object };
}

export async function archiveImportedDocument(input: {
  originalName: string;
  contentType: string;
  bytes: ArrayBuffer;
  sourceHint: string;
  importKind: "expense" | "invoice";
  links: ImportDocumentLinkInput[];
}) {
  const normalizedLinks = normalizeLinks(input.links);
  if (!normalizedLinks.length) throw new Error("The document must refer to at least one imported data entry.");
  if (!input.originalName.trim()) throw new Error("The imported document needs a file name.");
  if (input.bytes.byteLength > 20 * 1024 * 1024) throw new Error("Imported documents are limited to 20 MB each.");
  const importedAtDate = new Date();
  const importedAt = importedAtDate.toISOString();
  const decodedText = new TextDecoder("utf-8", { fatal: false }).decode(input.bytes);
  const textSample = decodedText.slice(0, 24_000);
  const sourceName = detectImportSource(input.originalName, textSample, input.sourceHint);
  const contentHash = await hashBytes(input.bytes);
  const semanticHash = await hashBytes(new TextEncoder().encode(semanticImportContent(input.originalName, decodedText)).buffer as ArrayBuffer);
  const db = await inventoryDatabase();
  const existing = await db.prepare(`
    SELECT d.*, COUNT(l.document_id) AS link_count
    FROM import_documents d
    LEFT JOIN import_document_links l ON l.document_id = d.id
    WHERE d.semantic_hash = ?
    GROUP BY d.id
  `).bind(semanticHash).first() as ImportDocumentRow | null;
  if (existing) {
    const statements = [db.prepare(`
      UPDATE import_documents
      SET last_imported_at = ?, import_count = import_count + 1
      WHERE id = ?
    `).bind(importedAt, existing.id)];
    for (const item of normalizedLinks) statements.push(db.prepare(`
      INSERT INTO import_document_links (document_id, entity_type, entity_id, relation, linked_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(document_id, entity_type, entity_id) DO UPDATE SET
        relation = CASE
          WHEN excluded.relation = 'created' THEN 'created'
          WHEN import_document_links.relation = 'created' THEN 'created'
          WHEN excluded.relation = 'updated' THEN 'updated'
          ELSE import_document_links.relation
        END,
        linked_at = excluded.linked_at
    `).bind(existing.id, item.entityType, item.entityId, item.relation, importedAt));
    await db.batch(statements);
    const refreshed = await db.prepare(`
      SELECT d.*, COUNT(l.document_id) AS link_count
      FROM import_documents d
      LEFT JOIN import_document_links l ON l.document_id = d.id
      WHERE d.id = ?
      GROUP BY d.id
    `).bind(existing.id).first() as ImportDocumentRow;
    return {
      document: summary(refreshed),
      links: normalizedLinks.map((item): ImportDocumentLink => ({ documentId: existing.id, ...item, linkedAt: importedAt })),
      deduplicated: true,
    };
  }
  const id = crypto.randomUUID();
  const storedName = storedImportFileName(input.originalName, sourceName, importedAtDate, id);
  const storageKey = `imported-documents/${importedAt.slice(0, 4)}/${storedName}`;
  const contentType = input.contentType || "application/octet-stream";
  const bucket = documentBucket();
  await bucket.put(storageKey, input.bytes, {
    httpMetadata: { contentType },
    customMetadata: { id, originalName: input.originalName, sourceName, importedAt, contentHash, importKind: input.importKind },
  });

  try {
    const statements = [db.prepare(`
      INSERT INTO import_documents (
        id, original_name, stored_name, source_name, import_kind, imported_at,
        content_type, byte_size, content_hash, semantic_hash, last_imported_at, import_count, storage_key
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).bind(id, input.originalName, storedName, sourceName, input.importKind, importedAt, contentType, input.bytes.byteLength, contentHash, semanticHash, importedAt, storageKey)];
    for (const item of normalizedLinks) statements.push(db.prepare(`
      INSERT INTO import_document_links (document_id, entity_type, entity_id, relation, linked_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(id, item.entityType, item.entityId, item.relation, importedAt));
    await db.batch(statements);
  } catch (error) {
    await bucket.delete(storageKey);
    throw error;
  }

  const document: ImportDocumentSummary = {
    id, originalName: input.originalName, storedName, sourceName, importKind: input.importKind,
    importedAt, contentType, byteSize: input.bytes.byteLength, contentHash, semanticHash, lastImportedAt: importedAt, importCount: 1, linkCount: normalizedLinks.length,
  };
  return { document, links: normalizedLinks.map((item): ImportDocumentLink => ({ documentId: id, ...item, linkedAt: importedAt })), deduplicated: false };
}

export async function listImportDocumentGitFiles() {
  const index = await listImportDocuments();
  return Promise.all(index.documents.map(async (document) => {
    const stored = await getImportDocument(document.id);
    if (!stored) throw new Error(`Imported document ${document.id} is missing.`);
    return { path: `imported-documents/${document.storedName}`, content: await stored.object.arrayBuffer(), document };
  }));
}
