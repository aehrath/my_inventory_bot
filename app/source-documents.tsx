"use client";

import { documentsForEntity } from "./import-documents";
import type { ImportDocumentEntityType, ImportDocumentIndex } from "./import-documents";

const shortDate = (value: string) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });

export function SourceDocumentsCell({ index, entityType, entityId }: { index: ImportDocumentIndex; entityType: ImportDocumentEntityType; entityId: string }) {
  const documents = documentsForEntity(index, entityType, entityId);
  if (!documents.length) return <span className="sourceDocumentsCell emptySource">—</span>;
  return <span className="sourceDocumentsCell">
    {documents.map((document) => <a
      key={document.id}
      href={`/api/import-documents?document=${encodeURIComponent(document.id)}&download=1`}
      title={`${document.originalName}\nImported ${new Date(document.importedAt).toLocaleString()}\nSource: ${document.sourceName}`}
      onClick={(event) => event.stopPropagation()}
    >{document.sourceName} · {shortDate(document.importedAt)}</a>)}
  </span>;
}
