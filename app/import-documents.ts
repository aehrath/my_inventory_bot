export const importDocumentEntityTypes = ["expense", "product", "movement", "customer"] as const;
export type ImportDocumentEntityType = typeof importDocumentEntityTypes[number];
export type ImportDocumentRelation = "created" | "updated" | "referenced";

export type ImportDocumentLinkInput = {
  entityType: ImportDocumentEntityType;
  entityId: string;
  relation: ImportDocumentRelation;
};

export type ImportDocumentSummary = {
  id: string;
  originalName: string;
  storedName: string;
  sourceName: string;
  importKind: "expense" | "invoice";
  importedAt: string;
  contentType: string;
  byteSize: number;
  contentHash: string;
  semanticHash: string;
  lastImportedAt: string;
  importCount: number;
  linkCount: number;
};

export type ImportDocumentLink = ImportDocumentLinkInput & {
  documentId: string;
  linkedAt: string;
};

export type ImportDocumentIndex = {
  documents: ImportDocumentSummary[];
  links: ImportDocumentLink[];
};

export const emptyImportDocumentIndex: ImportDocumentIndex = { documents: [], links: [] };

export const formatImportTimestamp = (date: Date) => [
  date.getUTCFullYear(),
  String(date.getUTCMonth() + 1).padStart(2, "0"),
  String(date.getUTCDate()).padStart(2, "0"),
  String(date.getUTCHours()).padStart(2, "0"),
  String(date.getUTCMinutes()).padStart(2, "0"),
  String(date.getUTCSeconds()).padStart(2, "0"),
].join("");

const sourceMatchers: Array<[string, RegExp]> = [
  ["amazon", /\bamazon\b|\basin\b|amazon[ -]?internal|your amazon orders/i],
  ["aliexpress", /\bali\s*express\b|\baliexpress\b/i],
  ["ebay", /\bebay\b/i],
  ["etsy", /\betsy\b/i],
  ["shopify", /\bshopify\b/i],
  ["square", /\bsquare\b/i],
  ["stripe", /\bstripe\b/i],
  ["paypal", /\bpay\s*pal\b/i],
  ["walmart", /\bwal\s*mart\b/i],
];

export const sourceSlug = (value: string) => value.toLowerCase()
  .normalize("NFKD")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .slice(0, 48);

export function detectImportSource(fileName: string, sample: string, sourceHint = "") {
  const haystack = `${fileName}\n${sourceHint}\n${sample.slice(0, 24_000)}`;
  return sourceMatchers.find(([, pattern]) => pattern.test(haystack))?.[0]
    ?? sourceSlug(sourceHint)
    ?? "import";
}

const cleanFilePart = (value: string) => sourceSlug(value).slice(0, 72) || "document";

export function storedImportFileName(originalName: string, sourceName: string, importedAt: Date, suffix: string) {
  const extensionMatch = originalName.match(/\.([a-z0-9]{1,12})$/i);
  const extension = extensionMatch ? `.${extensionMatch[1].toLowerCase()}` : "";
  const base = originalName.slice(0, extensionMatch?.index ?? originalName.length);
  return `${formatImportTimestamp(importedAt)}-${cleanFilePart(sourceName)}-${cleanFilePart(base)}-${cleanFilePart(suffix).slice(0, 10)}${extension}`;
}

const stableJsonValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableJsonValue);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, nested]) => [key, stableJsonValue(nested)]));
  return value;
};

const normalizedCsv = (text: string) => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(cell.trim().replace(/\s+/g, " ")); cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell.trim().replace(/\s+/g, " ")); cell = "";
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else cell += character;
  }
  row.push(cell.trim().replace(/\s+/g, " "));
  if (row.some(Boolean)) rows.push(row);
  return JSON.stringify(rows);
};

export function semanticImportContent(fileName: string, text: string) {
  const trimmed = text.replace(/^\uFEFF/, "").trim();
  if (fileName.toLowerCase().endsWith(".json") || trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try { return JSON.stringify(stableJsonValue(JSON.parse(trimmed))); } catch { /* Fall back to text normalization. */ }
  }
  if (fileName.toLowerCase().endsWith(".csv")) return normalizedCsv(trimmed);
  return trimmed.replace(/\s+/g, " ");
}

export async function archiveImportDocument(file: File, importKind: "expense" | "invoice", sourceHint: string, links: ImportDocumentLinkInput[]) {
  const body = new FormData();
  body.set("file", file);
  body.set("importKind", importKind);
  body.set("sourceHint", sourceHint);
  body.set("links", JSON.stringify(links));
  const response = await fetch("/api/import-documents", { method: "POST", body, headers: { accept: "application/json" } });
  const payload = await response.json() as { document?: ImportDocumentSummary; links?: ImportDocumentLink[]; deduplicated?: boolean; error?: string };
  if (!response.ok || !payload.document) throw new Error(payload.error || "The imported document could not be archived.");
  return { document: payload.document, links: payload.links ?? [], deduplicated: payload.deduplicated ?? false };
}

export const documentsForEntity = (index: ImportDocumentIndex, entityType: ImportDocumentEntityType, entityId: string) => {
  const ids = new Set(index.links.filter((link) => link.entityType === entityType && link.entityId === entityId).map((link) => link.documentId));
  return index.documents.filter((document) => ids.has(document.id));
};
