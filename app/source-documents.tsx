"use client";

import { documentsForEntity } from "./import-documents";
import type { ImportDocumentEntityType, ImportDocumentIndex } from "./import-documents";

const shortDate = (value: string) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
const sourceLabel = (value: string) => value.trim().toLowerCase() === "amazon" ? "Amazon" : value.trim();
const documentTitle = (document: { originalName: string; importedAt: string; sourceName: string }) => `${document.originalName}\nImported ${new Date(document.importedAt).toLocaleString()}\nSource: ${document.sourceName}`;
const documentHref = (id: string) => `/api/import-documents?document=${encodeURIComponent(id)}&download=1`;

export function SourceDocumentsCell({ index, entityType, entityId }: { index: ImportDocumentIndex; entityType: ImportDocumentEntityType; entityId: string }) {
  const documents = documentsForEntity(index, entityType, entityId);
  if (!documents.length) return <span className="sourceDocumentsCell emptySource">—</span>;
  return <span className="sourceDocumentsCell">
    {documents.map((document) => <a
      key={document.id}
      href={documentHref(document.id)}
      title={documentTitle(document)}
      onClick={(event) => event.stopPropagation()}
    >{sourceLabel(document.sourceName)} · {shortDate(document.importedAt)}</a>)}
  </span>;
}

export function SourceDocumentSellerCell({ index, entityType, entityId, fallback }: { index: ImportDocumentIndex; entityType: ImportDocumentEntityType; entityId: string; fallback: string }) {
  const documents = documentsForEntity(index, entityType, entityId);
  if (!documents.length) return <span className="sourceDocumentsCell"><span className="sourceDocumentFallback">{sourceLabel(fallback) || "—"}</span></span>;
  return <span className="sourceDocumentsCell">{documents.map((document) => <a key={document.id} href={documentHref(document.id)} title={documentTitle(document)} onClick={(event) => event.stopPropagation()}>{sourceLabel(document.sourceName)}</a>)}</span>;
}

export function SourceDocumentDateCell({ index, entityType, entityId, fallback }: { index: ImportDocumentIndex; entityType: ImportDocumentEntityType; entityId: string; fallback: string }) {
  const documents = documentsForEntity(index, entityType, entityId);
  if (!documents.length) return <span className="sourceDocumentsCell"><span className="sourceDocumentFallback">{fallback ? shortDate(fallback) : "—"}</span></span>;
  return <span className="sourceDocumentsCell">{documents.map((document) => <a key={document.id} href={documentHref(document.id)} title={documentTitle(document)} onClick={(event) => event.stopPropagation()}>{shortDate(document.importedAt)}</a>)}</span>;
}
