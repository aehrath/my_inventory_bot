"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { dataDiffValue, diffStockBotDataFiles, stockBotDatasetLabels, STOCKBOT_DATA_FORMAT_ID, STOCKBOT_DATA_FORMAT_VERSION } from "./data-format";
import type { DataDiffChange, DataDiffRow, StockBotDataFile, StockBotDataset } from "./data-format";
import type { DataCommitSummary, DataHistoryResponse } from "./data-history-types";
import { emptyImportDocumentIndex } from "./import-documents";
import type { ImportDocumentIndex } from "./import-documents";

type SaveStatus = "saved" | "saving" | "error";
type SortDirection = "asc" | "desc";
type SortKey = "dataset" | "record" | "key" | "field" | "previous" | "current" | "change";
type CommitFileResponse = { commit: DataCommitSummary; dataFile: StockBotDataFile; error?: string };
type GitTargetPreference = { repository: string; branch: string; path: string };

const gitPreferenceKey = "stockbot-git-data-target-v1";
const defaultGitTarget: GitTargetPreference = { repository: "", branch: "main", path: "stockbot-data.json" };
const formatDate = (value: string) => new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
const shortHash = (value: string | null | undefined) => value ? value.slice(0, 12) : "—";
const byteSize = (value: number) => value < 1024 ? `${value} B` : value < 1024 * 1024 ? `${(value / 1024).toFixed(1)} KB` : `${(value / (1024 * 1024)).toFixed(1)} MB`;
const displayValue = (row: DataDiffRow, side: "previous" | "current") => {
  const value = dataDiffValue(row[side]);
  return value || "Empty";
};

export function DataHistory({ saveStatus }: { saveStatus: SaveStatus }) {
  const [commits, setCommits] = useState<DataCommitSummary[]>([]);
  const [files, setFiles] = useState<Record<string, StockBotDataFile>>({});
  const [baseId, setBaseId] = useState("");
  const [compareId, setCompareId] = useState("");
  const [loading, setLoading] = useState(true);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [message, setMessage] = useState("");
  const [pushToGitHub, setPushToGitHub] = useState(false);
  const [gitTarget, setGitTarget] = useState<GitTargetPreference>(defaultGitTarget);
  const [gitToken, setGitToken] = useState("");
  const [query, setQuery] = useState("");
  const [dataset, setDataset] = useState<StockBotDataset | "all">("all");
  const [change, setChange] = useState<DataDiffChange | "all">("all");
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({ key: "dataset", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(250);
  const [documentIndex, setDocumentIndex] = useState<ImportDocumentIndex>(emptyImportDocumentIndex);

  const loadHistory = useCallback(async (selectLatest = false) => {
    const response = await fetch("/api/data-history", { headers: { accept: "application/json" } });
    const payload = await response.json() as DataHistoryResponse & { error?: string };
    if (!response.ok) throw new Error(payload.error || "Could not load data history.");
    setCommits(payload.commits);
    if (selectLatest && payload.commits[0]) {
      setCompareId(payload.commits[0].id);
      setBaseId(payload.commits[0].parentId ?? "");
    } else {
      setCompareId((current) => current || payload.commits[0]?.id || "");
      setBaseId((current) => current || payload.commits[0]?.parentId || "");
    }
  }, []);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(gitPreferenceKey);
      if (saved) queueMicrotask(() => setGitTarget({ ...defaultGitTarget, ...JSON.parse(saved) as Partial<GitTargetPreference> }));
    } catch { /* Device preference is optional. */ }
    queueMicrotask(() => { void Promise.all([
      loadHistory(true),
      fetch("/api/import-documents", { headers: { accept: "application/json" } }).then(async (response) => {
        if (!response.ok) throw new Error("Could not load imported documents.");
        setDocumentIndex(await response.json() as ImportDocumentIndex);
      }),
    ]).catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load data history.")).finally(() => setLoading(false)); });
  }, [loadHistory]);
  useEffect(() => {
    const missing = Array.from(new Set([compareId, baseId].filter((id) => id && !files[id])));
    if (!missing.length) return;
    let cancelled = false;
    void Promise.all(missing.map(async (id) => {
      const response = await fetch(`/api/data-history?commit=${encodeURIComponent(id)}`, { headers: { accept: "application/json" } });
      const payload = await response.json() as CommitFileResponse;
      if (!response.ok) throw new Error(payload.error || "Could not load the selected data commit.");
      return [id, payload.dataFile] as const;
    })).then((loadedFiles) => {
      if (!cancelled) setFiles((current) => ({ ...current, ...Object.fromEntries(loadedFiles) }));
    }).catch((caught) => {
      if (!cancelled) setError(caught instanceof Error ? caught.message : "Could not load the comparison.");
    });
    return () => { cancelled = true; };
  }, [baseId, compareId, files]);

  const saveGitPreference = (next: GitTargetPreference) => {
    setGitTarget(next);
    try { window.localStorage.setItem(gitPreferenceKey, JSON.stringify(next)); } catch { /* Device preference is optional. */ }
  };
  const commitSnapshot = async () => {
    if (saveStatus !== "saved" || committing) return;
    if (pushToGitHub && (!gitTarget.repository.trim() || !gitToken.trim())) {
      setError("Enter a GitHub repository and one-time token, or turn off GitHub push.");
      return;
    }
    setCommitting(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/data-history", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          message: message.trim() || "Update StockBot data",
          remote: pushToGitHub ? { provider: "github", ...gitTarget, token: gitToken } : undefined,
        }),
      });
      const payload = await response.json() as { commit?: DataCommitSummary; dataFile?: StockBotDataFile; git?: { status: string; error?: string | null }; error?: string };
      if (!response.ok || !payload.commit || !payload.dataFile) throw new Error(payload.error || "Could not commit the current data.");
      setFiles((current) => ({ ...current, [payload.commit!.id]: payload.dataFile! }));
      setMessage("");
      await loadHistory(true);
      setPage(1);
      setNotice(payload.git?.status === "failed" ? `Snapshot saved, but GitHub push failed: ${payload.git.error || "Unknown GitHub error."}` : payload.git?.status === "pushed" ? `Snapshot and ${documentIndex.documents.length} imported document${documentIndex.documents.length === 1 ? "" : "s"} checked into GitHub.` : "Snapshot saved to Data History. Add a GitHub target any time you want a remote Git commit.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not commit the current data.");
    } finally { setGitToken(""); setCommitting(false); }
  };

  const currentFile = compareId ? files[compareId] : undefined;
  const previousFile = baseId ? files[baseId] : null;
  const comparisonReady = Boolean(currentFile && (!baseId || previousFile));
  const allRows = useMemo(() => comparisonReady && currentFile ? diffStockBotDataFiles(previousFile, currentFile) : [], [comparisonReady, currentFile, previousFile]);
  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const selected = allRows.filter((row) => {
      if (dataset !== "all" && row.dataset !== dataset) return false;
      if (change !== "all" && row.change !== change) return false;
      if (!needle) return true;
      return `${row.datasetLabel} ${row.recordLabel} ${row.recordKey} ${row.field} ${dataDiffValue(row.previous)} ${dataDiffValue(row.current)} ${row.change}`.toLowerCase().includes(needle);
    });
    const value = (row: DataDiffRow, key: SortKey) => key === "dataset" ? row.datasetLabel : key === "record" ? row.recordLabel : key === "key" ? row.recordKey : key === "previous" ? dataDiffValue(row.previous) : key === "current" ? dataDiffValue(row.current) : row[key];
    return selected.sort((left, right) => String(value(left, sort.key)).localeCompare(String(value(right, sort.key)), undefined, { numeric: true, sensitivity: "base" }) * (sort.direction === "asc" ? 1 : -1));
  }, [allRows, change, dataset, query, sort]);
  const pages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const visibleRows = filteredRows.slice((Math.min(page, pages) - 1) * pageSize, Math.min(page, pages) * pageSize);
  const counts = useMemo(() => ({
    added: allRows.filter((row) => row.change === "added").length,
    removed: allRows.filter((row) => row.change === "removed").length,
    modified: allRows.filter((row) => row.change === "modified").length,
    unchanged: allRows.filter((row) => row.change === "unchanged").length,
  }), [allRows]);
  const compareCommit = commits.find((commit) => commit.id === compareId);
  const baseCommit = commits.find((commit) => commit.id === baseId);
  const changeSort = (key: SortKey) => { setSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" })); setPage(1); };
  const headers: Array<{ key: SortKey; label: string }> = [{ key: "dataset", label: "Dataset" }, { key: "record", label: "Record" }, { key: "key", label: "Record key" }, { key: "field", label: "Field" }, { key: "previous", label: "Previous value" }, { key: "current", label: "Current value" }, { key: "change", label: "Change" }];

  return <div className="dataHistoryLayout">
    <section className="dataHistoryHero">
      <div><span className="pill good">{STOCKBOT_DATA_FORMAT_ID} v{STOCKBOT_DATA_FORMAT_VERSION}</span><h2>Every data change,<br />fully exposed.</h2><p>Create immutable snapshots, check the canonical JSON and imported source files into Git, and compare every field—including provenance, empty, and unchanged values.</p></div>
      <div className="dataFormatCard"><span>Data format</span><strong>Version {STOCKBOT_DATA_FORMAT_VERSION}</strong><small>Application state {currentFile?.applicationStateVersion ?? "—"}</small><code>{STOCKBOT_DATA_FORMAT_ID}</code></div>
    </section>

    <section className="panel importedDocumentPanel">
      <div className="panelTitle"><div><p className="eyebrow">Source archive</p><h3>{documentIndex.documents.length} imported document{documentIndex.documents.length === 1 ? "" : "s"}</h3></div><span className="pill neutral">D1 metadata · R2 files</span></div>
      <p className="settingsCopy">Every file is preserved under its UTC import timestamp and detected source. Row links remain many-to-many, so another import of the same business entry adds provenance without duplicating the entry.</p>
      <div className="importedDocumentGrid">{documentIndex.documents.map((document) => <a href={`/api/import-documents?document=${encodeURIComponent(document.id)}&download=1`} key={document.id}><span><strong>{document.storedName}</strong><small>{document.originalName}</small></span><span><b>{document.sourceName}</b><small>First {formatDate(document.importedAt)}{document.importCount > 1 ? ` · last ${formatDate(document.lastImportedAt)} · imported ${document.importCount}×` : ""} · {byteSize(document.byteSize)} · {document.linkCount} linked row{document.linkCount === 1 ? "" : "s"}</small></span></a>)}{!documentIndex.documents.length && <div className="empty">Imported CSV and JSON source files will appear here after they contribute to an expense or invoice entry.</div>}</div>
    </section>

    <section className="dataCommitPanel panel">
      <div className="panelTitle"><div><p className="eyebrow">Version control</p><h3>Commit the current data</h3></div><span className={`pill ${saveStatus === "saved" ? "good" : "warn"}`}>{saveStatus === "saved" ? "Ready" : saveStatus === "saving" ? "Waiting for save" : "Save unavailable"}</span></div>
      <div className="dataCommitForm"><label className="dataCommitMessage"><span>Commit message</span><input value={message} maxLength={160} onChange={(event) => setMessage(event.target.value)} placeholder="Reconciled July inventory" /></label><label className="gitPushToggle"><input type="checkbox" checked={pushToGitHub} onChange={(event) => setPushToGitHub(event.target.checked)} /><span><strong>Also push a real Git commit to GitHub</strong><small>Use a private repository—the complete data JSON and {documentIndex.documents.length} imported source document{documentIndex.documents.length === 1 ? "" : "s"} will be pushed.</small></span></label></div>
      {pushToGitHub && <div className="gitTargetGrid"><label><span>Repository</span><input value={gitTarget.repository} onChange={(event) => saveGitPreference({ ...gitTarget, repository: event.target.value })} placeholder="owner/private-data-repo" /></label><label><span>Branch</span><input value={gitTarget.branch} onChange={(event) => saveGitPreference({ ...gitTarget, branch: event.target.value })} placeholder="main" /></label><label><span>JSON file path</span><input value={gitTarget.path} onChange={(event) => saveGitPreference({ ...gitTarget, path: event.target.value })} placeholder="accounting/stockbot-data.json" /></label><label><span>Fine-grained token</span><input type="password" autoComplete="off" value={gitToken} onChange={(event) => setGitToken(event.target.value)} placeholder="Used for this push only" /><small>Grant repository Contents read/write. The token is sent for this push, then cleared and never stored.</small></label></div>}
      {(error || notice) && <div className={`dataHistoryNotice ${error ? "error" : "success"}`}><strong>{error ? "Couldn’t complete that action" : "Data commit complete"}</strong><span>{error || notice}</span></div>}
      <div className="dataCommitActions"><span>Snapshots use server storage; GitHub is optional.</span><button className="primary" disabled={saveStatus !== "saved" || committing} onClick={commitSnapshot}>{committing ? "Committing…" : pushToGitHub ? "Commit snapshot + push" : "Commit snapshot"}</button></div>
    </section>

    <section className="dataHistoryWorkspace">
      <aside className="commitTimeline panel"><div className="panelTitle"><div><p className="eyebrow">Commit log</p><h3>{commits.length} data version{commits.length === 1 ? "" : "s"}</h3></div></div>{loading && <div className="empty">Loading data history…</div>}{!loading && !commits.length && <div className="empty">No snapshots yet. Commit the current data to start the history.</div>}{commits.map((commit) => <button className={`commitTimelineItem ${compareId === commit.id ? "active" : ""}`} key={commit.id} onClick={() => { setCompareId(commit.id); setBaseId(commit.parentId ?? ""); setPage(1); }}><span className="commitDot" /><span><strong>{commit.message}</strong><small>{formatDate(commit.createdAt)}</small><code>{shortHash(commit.id)}</code></span><span><b>{commit.changedFieldCount}</b><small>changed fields</small>{commit.remoteStatus === "pushed" ? <em className="gitPushed">Git ✓</em> : commit.remoteStatus === "failed" ? <em className="gitFailed">Git !</em> : null}</span></button>)}</aside>

      <div className="dataDiffPanel panel">
        <div className="panelTitle"><div><p className="eyebrow">Full-field comparison</p><h3>Version-to-version diff</h3></div>{compareCommit && <a className="secondary dataDownload" href={`/api/data-history?commit=${encodeURIComponent(compareCommit.id)}&download=1`}>↓ Download JSON</a>}</div>
        <div className="commitCompareSelectors"><label>From<select value={baseId} onChange={(event) => { setBaseId(event.target.value); setPage(1); }}><option value="">Empty baseline</option>{commits.map((commit) => <option value={commit.id} key={commit.id}>{formatDate(commit.createdAt)} · {commit.message} · {shortHash(commit.id)}</option>)}</select></label><span>→</span><label>To<select value={compareId} onChange={(event) => { setCompareId(event.target.value); setPage(1); }}><option value="">Choose a version</option>{commits.map((commit) => <option value={commit.id} key={commit.id}>{formatDate(commit.createdAt)} · {commit.message} · {shortHash(commit.id)}</option>)}</select></label></div>
        <div className="diffVersionLine"><span><strong>{baseCommit ? shortHash(baseCommit.id) : "Empty"}</strong><small>{baseCommit ? `Format v${baseCommit.formatVersion}` : "Before first commit"}</small></span><span><strong>{compareCommit ? shortHash(compareCommit.id) : "Choose version"}</strong><small>{compareCommit ? `Format v${compareCommit.formatVersion} · ${byteSize(compareCommit.snapshotBytes)}` : ""}</small>{compareCommit?.remoteUrl && <a href={compareCommit.remoteUrl} target="_blank" rel="noreferrer">Open Git commit ↗</a>}</span></div>
        <div className="dataDiffMetrics"><button className={change === "all" ? "active" : ""} onClick={() => { setChange("all"); setPage(1); }}><strong>{allRows.length}</strong><span>All fields</span></button><button className={change === "modified" ? "active modified" : "modified"} onClick={() => { setChange("modified"); setPage(1); }}><strong>{counts.modified}</strong><span>Modified</span></button><button className={change === "added" ? "active added" : "added"} onClick={() => { setChange("added"); setPage(1); }}><strong>{counts.added}</strong><span>Added</span></button><button className={change === "removed" ? "active removed" : "removed"} onClick={() => { setChange("removed"); setPage(1); }}><strong>{counts.removed}</strong><span>Removed</span></button><button className={change === "unchanged" ? "active unchanged" : "unchanged"} onClick={() => { setChange("unchanged"); setPage(1); }}><strong>{counts.unchanged}</strong><span>Unchanged</span></button></div>
        <div className="dataDiffToolbar"><label className="search"><span>⌕</span><input aria-label="Search all data fields" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search dataset, record, key, field, or value" /></label><label>Dataset<select value={dataset} onChange={(event) => { setDataset(event.target.value as StockBotDataset | "all"); setPage(1); }}><option value="all">All datasets</option>{Object.entries(stockBotDatasetLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label><label>Rows<select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}><option value="100">100</option><option value="250">250</option><option value="500">500</option><option value="1000000">All</option></select></label></div>
        <p className="allFieldsNote"><strong>Nothing is hidden:</strong> this grid includes every known field for every record. Empty values are labeled “Empty,” and unchanged values remain visible unless you choose a change filter.</p>
        <div className="dataDiffGridWrap"><div className="dataDiffGrid" role="table" aria-label="Complete data version comparison"><div className="dataDiffHead" role="row">{headers.map((header) => <button role="columnheader" aria-sort={sort.key === header.key ? (sort.direction === "asc" ? "ascending" : "descending") : "none"} type="button" key={header.key} className={`stockHeaderCell ${sort.key === header.key ? `sorted ${sort.direction}` : ""}`} onClick={() => changeSort(header.key)}><span>{header.label}</span><span className="sortPair" aria-hidden="true"><i /><b /></span></button>)}</div>{visibleRows.map((row) => <div className={`dataDiffRow ${row.change}`} role="row" key={row.id}><span>{row.datasetLabel}</span><span title={row.recordLabel}>{row.recordLabel}</span><code title={row.recordKey}>{row.recordKey}</code><code title={row.field}>{row.field}</code><span className={displayValue(row, "previous") === "Empty" ? "emptyValue" : ""} title={displayValue(row, "previous")}>{displayValue(row, "previous")}</span><span className={displayValue(row, "current") === "Empty" ? "emptyValue" : ""} title={displayValue(row, "current")}>{displayValue(row, "current")}</span><span><b className={`changeBadge ${row.change}`}>{row.change}</b></span></div>)}{comparisonReady && !visibleRows.length && <div className="empty">No fields match this view.</div>}{!comparisonReady && <div className="empty">{compareId ? "Loading every field in this comparison…" : "Choose a data version to inspect every field."}</div>}</div></div>
        {filteredRows.length > pageSize && <div className="dataDiffPager"><span>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredRows.length)} of {filteredRows.length} fields</span><button className="secondary" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>← Previous</button><strong>Page {Math.min(page, pages)} of {pages}</strong><button className="secondary" disabled={page >= pages} onClick={() => setPage((current) => Math.min(pages, current + 1))}>Next →</button></div>}
      </div>
    </section>
  </div>;
}
