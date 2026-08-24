import { env } from "cloudflare:workers";
import { createInventoryBotDataFile, diffInventoryBotDataFiles, stableInventoryBotDataJson, INVENTORYBOT_DATA_FORMAT_VERSION } from "../app/data-format";
import type { InventoryBotDataFile } from "../app/data-format";
import type { DataCommitSummary } from "../app/data-history-types";
import { inventoryDatabase } from "./inventory-repository";
import { listImportDocuments } from "./import-document-repository";

type DataCommitRow = {
  id: string;
  parent_id: string | null;
  message: string;
  created_at: string;
  format_version: number;
  application_state_version: number;
  content_hash: string;
  snapshot_key: string;
  snapshot_bytes: number;
  record_count: number;
  field_count: number;
  changed_field_count: number;
  remote_status: "not_pushed" | "pushed" | "failed";
  remote_repository: string | null;
  remote_branch: string | null;
  remote_path: string | null;
  remote_commit_sha: string | null;
  remote_url: string | null;
  remote_error: string | null;
};

const snapshotBucket = () => {
  if (!env.DATA_SNAPSHOTS) throw new Error("Data snapshot storage is unavailable.");
  return env.DATA_SNAPSHOTS;
};
const bytes = (value: string) => new TextEncoder().encode(value).byteLength;
const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};
const summary = (row: DataCommitRow): DataCommitSummary => ({
  id: row.id,
  parentId: row.parent_id,
  message: row.message,
  createdAt: row.created_at,
  formatVersion: row.format_version,
  applicationStateVersion: row.application_state_version,
  contentHash: row.content_hash,
  snapshotBytes: row.snapshot_bytes,
  recordCount: row.record_count,
  fieldCount: row.field_count,
  changedFieldCount: row.changed_field_count,
  remoteStatus: row.remote_status,
  remoteRepository: row.remote_repository,
  remoteBranch: row.remote_branch,
  remotePath: row.remote_path,
  remoteCommitSha: row.remote_commit_sha,
  remoteUrl: row.remote_url,
  remoteError: row.remote_error,
});

export async function listDataCommits(limit = 100) {
  const db = await inventoryDatabase();
  const result = await db.prepare(`
    SELECT * FROM data_commits
    ORDER BY created_at DESC, id DESC
    LIMIT ?
  `).bind(Math.max(1, Math.min(limit, 250))).all() as { results?: DataCommitRow[] };
  return (result.results ?? []).map(summary);
}

export async function getDataCommit(id: string) {
  const db = await inventoryDatabase();
  const row = await db.prepare("SELECT * FROM data_commits WHERE id = ?").bind(id).first() as DataCommitRow | null;
  return row ? summary(row) : null;
}

export async function getDataCommitFile(id: string): Promise<{ commit: DataCommitSummary; dataFile: InventoryBotDataFile; json: string } | null> {
  const db = await inventoryDatabase();
  const row = await db.prepare("SELECT * FROM data_commits WHERE id = ?").bind(id).first() as DataCommitRow | null;
  if (!row) return null;
  const object = await snapshotBucket().get(row.snapshot_key);
  if (!object) throw new Error("The snapshot file for this commit is missing.");
  const json = await object.text();
  const dataFile = JSON.parse(json) as InventoryBotDataFile;
  return { commit: summary(row), dataFile, json };
}

export async function createDataCommit(rawState: unknown, requestedMessage: string) {
  const db = await inventoryDatabase();
  const latestRow = await db.prepare("SELECT * FROM data_commits ORDER BY created_at DESC, id DESC LIMIT 1").first() as DataCommitRow | null;
  const dataFile = createInventoryBotDataFile(rawState, await listImportDocuments());
  const json = stableInventoryBotDataJson(dataFile);
  const contentHash = await sha256(json);
  const createdAt = new Date().toISOString();
  const message = requestedMessage.trim().slice(0, 160) || "Update InventoryBot data";
  const id = await sha256(`${latestRow?.id ?? "root"}\n${contentHash}\n${createdAt}\n${message}`);
  const snapshotKey = `inventorybot-data/v${INVENTORYBOT_DATA_FORMAT_VERSION}/${id}.json`;
  const previous = latestRow ? await getDataCommitFile(latestRow.id) : null;
  const diffRows = diffInventoryBotDataFiles(previous?.dataFile ?? null, dataFile);
  const recordCount = Object.values(dataFile.data).reduce((total, records) => total + records.length, 0);
  const changedFieldCount = diffRows.filter((row) => row.change !== "unchanged").length;

  await snapshotBucket().put(snapshotKey, json, {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
    customMetadata: { format: dataFile.format, formatVersion: String(dataFile.formatVersion), commitId: id, contentHash },
  });
  await db.prepare(`
    INSERT INTO data_commits (
      id, parent_id, message, created_at, format_version, application_state_version,
      content_hash, snapshot_key, snapshot_bytes, record_count, field_count, changed_field_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, latestRow?.id ?? null, message, createdAt, dataFile.formatVersion, dataFile.applicationStateVersion,
    contentHash, snapshotKey, bytes(json), recordCount, diffRows.length, changedFieldCount,
  ).run();
  const commit = await getDataCommit(id);
  if (!commit) throw new Error("The data commit could not be saved.");
  return { commit, dataFile, json };
}

export async function updateDataCommitRemote(id: string, remote: {
  status: "pushed" | "failed";
  repository: string;
  branch: string;
  path: string;
  commitSha?: string;
  url?: string;
  error?: string;
}) {
  const db = await inventoryDatabase();
  await db.prepare(`
    UPDATE data_commits SET
      remote_status = ?, remote_repository = ?, remote_branch = ?, remote_path = ?,
      remote_commit_sha = ?, remote_url = ?, remote_error = ?
    WHERE id = ?
  `).bind(remote.status, remote.repository, remote.branch, remote.path, remote.commitSha ?? null, remote.url ?? null, remote.error ?? null, id).run();
  return getDataCommit(id);
}
