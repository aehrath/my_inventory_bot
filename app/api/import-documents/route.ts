import { archiveImportedDocument, getImportDocument, listImportDocuments } from "../../../db/import-document-repository";
import type { ImportDocumentLinkInput } from "../../import-documents";

const safeDocumentId = (value: string | null) => value && /^[a-f0-9-]{36}$/i.test(value) ? value : "";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = safeDocumentId(url.searchParams.get("document"));
    if (url.searchParams.has("document") && !id) return Response.json({ error: "A valid imported document is required." }, { status: 400 });
    if (!id) return Response.json(await listImportDocuments());
    const stored = await getImportDocument(id);
    if (!stored) return Response.json({ error: "Imported document not found." }, { status: 404 });
    return new Response(stored.object.body, {
      headers: {
        "content-type": stored.document.contentType,
        "content-length": String(stored.document.byteSize),
        "content-disposition": `attachment; filename="${stored.document.storedName}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not load imported documents." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const importKind = form.get("importKind");
    if (!(file instanceof File)) return Response.json({ error: "Choose a document to archive." }, { status: 400 });
    if (importKind !== "expense" && importKind !== "invoice") return Response.json({ error: "The import type is not supported." }, { status: 400 });
    let links: ImportDocumentLinkInput[];
    try {
      const parsed = JSON.parse(String(form.get("links") ?? "[]"));
      links = Array.isArray(parsed) ? parsed as ImportDocumentLinkInput[] : [];
    } catch {
      return Response.json({ error: "The document links are not valid JSON." }, { status: 400 });
    }
    const archived = await archiveImportedDocument({
      originalName: file.name,
      contentType: file.type,
      bytes: await file.arrayBuffer(),
      sourceHint: String(form.get("sourceHint") ?? ""),
      importKind,
      links,
    });
    return Response.json(archived, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not archive the imported document." }, { status: 500 });
  }
}
