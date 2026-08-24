import { createDataCommit, getDataCommitFile, listDataCommits, updateDataCommitRemote } from "../../../db/data-history-repository";
import { loadInventoryState } from "../../../db/inventory-repository";
import { INVENTORYBOT_DATA_FORMAT_ID, INVENTORYBOT_DATA_FORMAT_VERSION, INVENTORYBOT_DATA_SCHEMA } from "../../data-format";
import { pushInventoryBotDataToGitHub } from "../../inventorybot-data-push";
import type { CreateDataCommitRequest } from "../../data-history-types";
import { listImportDocumentGitFiles, listImportDocuments } from "../../../db/import-document-repository";

const safeCommitId = (value: string | null) => value && /^[a-f0-9]{64}$/.test(value) ? value : "";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = safeCommitId(url.searchParams.get("commit"));
    if (url.searchParams.has("commit") && !id) return Response.json({ error: "A valid data commit is required." }, { status: 400 });
    if (id) {
      const stored = await getDataCommitFile(id);
      if (!stored) return Response.json({ error: "Data commit not found." }, { status: 404 });
      if (url.searchParams.get("download") === "1") {
        return new Response(stored.json, {
          headers: {
            "content-type": "application/json; charset=utf-8",
            "content-disposition": `attachment; filename="inventorybot-data-v${stored.commit.formatVersion}-${stored.commit.id.slice(0, 12)}.json"`,
          },
        });
      }
      return Response.json({ commit: stored.commit, dataFile: stored.dataFile });
    }
    const provenance = await listImportDocuments();
    return Response.json({
      commits: await listDataCommits(),
      format: { id: INVENTORYBOT_DATA_FORMAT_ID, version: INVENTORYBOT_DATA_FORMAT_VERSION, schema: INVENTORYBOT_DATA_SCHEMA },
      storage: "d1+r2",
      documentCount: provenance.documents.length,
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not load data history." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as CreateDataCommitRequest;
    const storedState = await loadInventoryState();
    if (!storedState.state) return Response.json({ error: "Save the workspace before creating its first data commit." }, { status: 409 });
    const created = await createDataCommit(storedState.state, body.message ?? "");
    let commit = created.commit;
    if (body.remote) {
      try {
        const documentFiles = await listImportDocumentGitFiles();
        const pushed = await pushInventoryBotDataToGitHub(body.remote, created.json, commit.message, documentFiles.map((file) => ({ path: file.path, content: file.content, contentType: file.document.contentType })));
        commit = await updateDataCommitRemote(commit.id, { status: "pushed", ...pushed }) ?? commit;
      } catch (error) {
        commit = await updateDataCommitRemote(commit.id, {
          status: "failed",
          repository: body.remote.repository.trim(),
          branch: body.remote.branch.trim() || "main",
          path: body.remote.path.trim() || "inventorybot-data.json",
          error: error instanceof Error ? error.message : "The Git push failed.",
        }) ?? commit;
      }
    }
    return Response.json({ commit, dataFile: created.dataFile, git: { status: commit.remoteStatus, error: commit.remoteError } }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not commit the current data." }, { status: 500 });
  }
}
