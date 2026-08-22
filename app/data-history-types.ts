export type DataCommitSummary = {
  id: string;
  parentId: string | null;
  message: string;
  createdAt: string;
  formatVersion: number;
  applicationStateVersion: number;
  contentHash: string;
  snapshotBytes: number;
  recordCount: number;
  fieldCount: number;
  changedFieldCount: number;
  remoteStatus: "not_pushed" | "pushed" | "failed";
  remoteRepository: string | null;
  remoteBranch: string | null;
  remotePath: string | null;
  remoteCommitSha: string | null;
  remoteUrl: string | null;
  remoteError: string | null;
};

export type DataHistoryResponse = {
  commits: DataCommitSummary[];
  format: { id: string; version: number; schema: string };
  storage: "d1+r2";
  documentCount: number;
};

export type GitHubPushTarget = {
  provider: "github";
  repository: string;
  branch: string;
  path: string;
  token: string;
};

export type CreateDataCommitRequest = {
  message?: string;
  remote?: GitHubPushTarget;
};
