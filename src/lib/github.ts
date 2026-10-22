import { createSign } from "node:crypto";

/**
 * Minimal GitHub App client. Requested permissions:
 *   metadata: read, contents: write (branch + commit only), pull_requests: write, checks: read.
 * The agent never pushes to the default branch; it only creates `patch-agent/*` branches.
 */
const API = "https://api.github.com";
export const REPO_RE = /^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}$/;

export function githubAppConfigured(): boolean {
  return Boolean(process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY);
}

export function githubWritesEnabled(): boolean {
  return githubAppConfigured() && process.env.GITHUB_WRITES_ENABLED === "true";
}

function appJwt(): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const data = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ iat: now - 60, exp: now + 540, iss: process.env.GITHUB_APP_ID })}`;
  const key = process.env.GITHUB_APP_PRIVATE_KEY!.replace(/\\n/g, "\n");
  return `${data}.${createSign("RSA-SHA256").update(data).sign(key, "base64url")}`;
}

// Serialised, spaced requests with rate-limit back-off.
let chain: Promise<unknown> = Promise.resolve();
let last = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class GitHubError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, token: string, init: RequestInit = {}, attempt = 0): Promise<T> {
  const spacing = Number(process.env.GITHUB_MIN_INTERVAL_MS ?? 250);
  const wait = last + spacing - Date.now();
  if (wait > 0) await sleep(wait);
  last = Date.now();
  const r = await fetch(API + path, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "patch-agent", ...(init.headers ?? {}) },
  });
  if ((r.status === 403 || r.status === 429) && attempt < 2) {
    const reset = Number(r.headers.get("x-ratelimit-reset")) * 1000 - Date.now();
    const retryAfter = Number(r.headers.get("retry-after")) * 1000;
    const delay = retryAfter || (r.headers.get("x-ratelimit-remaining") === "0" ? reset : 0);
    if (delay > 0 && delay <= 60_000) {
      await sleep(delay);
      return request<T>(path, token, init, attempt + 1);
    }
  }
  if (!r.ok) throw new GitHubError(r.status, `GitHub ${init.method ?? "GET"} ${path.split("?")[0]}: HTTP ${r.status}`);
  return (r.status === 204 ? null : await r.json()) as T;
}

function gh<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const p = chain.then(() => request<T>(path, token, init));
  chain = p.catch(() => {});
  return p;
}

export async function pingApp(): Promise<void> {
  await gh("/app", appJwt());
}

export type Installation = { id: number; account: { login: string } | null };
export type Repo = { full_name: string; default_branch: string; html_url: string; archived: boolean };

export async function listInstallations(): Promise<Installation[]> {
  return gh<Installation[]>("/app/installations?per_page=100", appJwt());
}

export async function installationToken(installationId: number): Promise<string> {
  return (await gh<{ token: string }>(`/app/installations/${installationId}/access_tokens`, appJwt(), { method: "POST" })).token;
}

export async function listInstallationRepos(token: string): Promise<Repo[]> {
  const out: Repo[] = [];
  for (let page = 1; page <= 10; page++) {
    const r = await gh<{ total_count: number; repositories: Repo[] }>(`/installation/repositories?per_page=100&page=${page}`, token);
    out.push(...r.repositories.filter((x) => REPO_RE.test(x.full_name)));
    if (out.length >= r.total_count || r.repositories.length < 100) break;
  }
  return out;
}

export type TreeEntry = { path: string; type: string; sha: string; size?: number };

export async function getTree(token: string, repo: string, ref: string): Promise<{ tree: TreeEntry[]; truncated: boolean }> {
  return gh(`/repos/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`, token);
}

export async function readBlob(token: string, repo: string, sha: string): Promise<string> {
  const b = await gh<{ content: string; encoding: string }>(`/repos/${repo}/git/blobs/${sha}`, token);
  return Buffer.from(b.content, b.encoding === "base64" ? "base64" : "utf8").toString("utf8");
}

export type OpenPr = { number: number; title: string; html_url: string; head: { ref: string } };
export async function listOpenAgentPrs(token: string, repo: string): Promise<OpenPr[]> {
  const prs = await gh<OpenPr[]>(`/repos/${repo}/pulls?state=open&per_page=100`, token);
  return prs.filter((p) => p.head.ref.startsWith("patch-agent/"));
}

export type CommitChange = { path: string; after: string; blobSha: string };

/** Creates branch → one commit per changed file → opens a PR. Never touches the default branch. */
export async function openPullRequest(token: string, repo: string, base: string, branch: string, changes: CommitChange[], title: string, body: string) {
  if (!githubWritesEnabled()) throw new Error("GitHub writes are disabled");
  if (!REPO_RE.test(repo)) throw new Error("invalid repository name");
  if (!branch.startsWith("patch-agent/")) throw new Error("agent branches must be under patch-agent/");
  const head = await gh<{ object: { sha: string } }>(`/repos/${repo}/git/ref/heads/${encodeURIComponent(base)}`, token);
  await gh(`/repos/${repo}/git/refs`, token, { method: "POST", body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: head.object.sha }) });
  let commitSha = "";
  for (const c of changes) {
    const r = await gh<{ commit: { sha: string } }>(`/repos/${repo}/contents/${c.path.split("/").map(encodeURIComponent).join("/")}`, token, {
      method: "PUT",
      body: JSON.stringify({ message: `${title}\n\nUpdate ${c.path}`, content: Buffer.from(c.after).toString("base64"), sha: c.blobSha, branch }),
    });
    commitSha = r.commit.sha;
  }
  const pr = await gh<{ html_url: string; number: number }>(`/repos/${repo}/pulls`, token, {
    method: "POST",
    body: JSON.stringify({ title, body, head: branch, base, maintainer_can_modify: true }),
  });
  return { prUrl: pr.html_url, prNumber: pr.number, commitSha, branch };
}

const PASS = new Set(["success", "neutral", "skipped"]);

/** Aggregate check runs for a commit. Returns null while any run is still in progress or none exist. */
export async function checkSummary(token: string, repo: string, sha: string): Promise<{ passed: number; total: number } | null> {
  const r = await gh<{ check_runs: { status: string; conclusion: string | null }[] }>(`/repos/${repo}/commits/${sha}/check-runs?per_page=100`, token);
  const runs = r.check_runs;
  if (!runs.length || runs.some((c) => c.status !== "completed")) return null;
  return { passed: runs.filter((c) => PASS.has(c.conclusion ?? "")).length, total: runs.length };
}
