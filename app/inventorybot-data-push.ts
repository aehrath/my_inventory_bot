import type { GitHubPushTarget } from "./data-history-types";

type GitHubObject = { sha?: string; object?: { sha?: string }; tree?: { sha?: string }; html_url?: string; message?: string };
export type GitHubPushAsset = { path: string; content: ArrayBuffer; contentType?: string };

const repositoryPattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const branchPattern = /^[A-Za-z0-9._/-]+$/;
const safePathPattern = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._/ -]+\.json$/;

export function validateGitHubTarget(target: GitHubPushTarget) {
  const repository = target.repository.trim();
  const branch = target.branch.trim() || "main";
  const path = target.path.trim() || "inventorybot-data.json";
  if (!repositoryPattern.test(repository)) throw new Error("Use a GitHub repository in owner/repository format.");
  if (!branchPattern.test(branch) || branch.includes("..") || branch.startsWith("/") || branch.endsWith("/")) throw new Error("The Git branch name is not valid.");
  if (!safePathPattern.test(path)) throw new Error("The Git data path must be a safe relative .json path.");
  if (!target.token.trim()) throw new Error("A GitHub token is required for this push.");
  return { repository, branch, path, token: target.token.trim() };
}

const githubRequest = async (repository: string, token: string, path: string, init?: RequestInit) => {
  const response = await fetch(`https://api.github.com/repos/${repository}${path}`, {
    ...init,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "user-agent": "InventoryBot-Data-History",
      "x-github-api-version": "2022-11-28",
      ...init?.headers,
    },
  });
  const payload = await response.json().catch(() => ({})) as GitHubObject;
  if (!response.ok) {
    const detail = typeof payload.message === "string" ? payload.message : `GitHub returned ${response.status}.`;
    throw new Error(detail === "Bad credentials" ? "GitHub rejected the token." : detail);
  }
  return payload;
};

const base64 = (content: ArrayBuffer) => {
  const bytes = new Uint8Array(content);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + 0x8000, bytes.length)));
  }
  return btoa(binary);
};

const assetGitPath = (dataPath: string, assetPath: string) => {
  const parent = dataPath.includes("/") ? dataPath.slice(0, dataPath.lastIndexOf("/") + 1) : "";
  return `${parent}${assetPath}`;
};

export async function pushInventoryBotDataToGitHub(rawTarget: GitHubPushTarget, content: string, message: string, assets: GitHubPushAsset[] = []) {
  const target = validateGitHubTarget(rawTarget);
  const refName = `heads/${target.branch}`.split("/").map(encodeURIComponent).join("/");
  const reference = await githubRequest(target.repository, target.token, `/git/ref/${refName}`);
  const parentSha = reference.object?.sha;
  if (!parentSha) throw new Error(`The ${target.branch} branch was not found.`);
  const parentCommit = await githubRequest(target.repository, target.token, `/git/commits/${encodeURIComponent(parentSha)}`);
  const baseTree = parentCommit.tree?.sha;
  if (!baseTree) throw new Error("GitHub did not return the branch tree.");
  const blob = await githubRequest(target.repository, target.token, "/git/blobs", { method: "POST", body: JSON.stringify({ content, encoding: "utf-8" }) });
  if (!blob.sha) throw new Error("GitHub did not create the data blob.");
  const assetEntries = [];
  for (const asset of assets) {
    const assetBlob = await githubRequest(target.repository, target.token, "/git/blobs", { method: "POST", body: JSON.stringify({ content: base64(asset.content), encoding: "base64" }) });
    if (!assetBlob.sha) throw new Error(`GitHub did not create the blob for ${asset.path}.`);
    assetEntries.push({ path: assetGitPath(target.path, asset.path), mode: "100644", type: "blob", sha: assetBlob.sha });
  }
  const tree = await githubRequest(target.repository, target.token, "/git/trees", {
    method: "POST",
    body: JSON.stringify({ base_tree: baseTree, tree: [{ path: target.path, mode: "100644", type: "blob", sha: blob.sha }, ...assetEntries] }),
  });
  if (!tree.sha) throw new Error("GitHub did not create the data tree.");
  const commit = await githubRequest(target.repository, target.token, "/git/commits", {
    method: "POST",
    body: JSON.stringify({ message, tree: tree.sha, parents: [parentSha] }),
  });
  if (!commit.sha) throw new Error("GitHub did not create the data commit.");
  await githubRequest(target.repository, target.token, `/git/refs/${refName}`, { method: "PATCH", body: JSON.stringify({ sha: commit.sha, force: false }) });
  return {
    repository: target.repository,
    branch: target.branch,
    path: target.path,
    commitSha: commit.sha,
    url: `https://github.com/${target.repository}/commit/${commit.sha}`,
    documentCount: assets.length,
  };
}
