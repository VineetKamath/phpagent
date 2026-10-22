import { getReleaseTable } from "./php-releases";
import { planFile } from "./patcher";
import { validateChange } from "./safety";

const REPO_RE = /^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}$/;
const MAX_FILES = 40;
const MAX_BYTES = 256 * 1024;

type TreeEntry = { path: string; type: string; sha: string; size?: number };
type GitHubRepo = { full_name: string; html_url: string; default_branch: string; private: boolean };

export type PublicCheck = {
  repository: string;
  url: string;
  defaultBranch: string;
  changes: { path: string; edits: { line: number; from: string; to: string }[] }[];
  reviews: { path: string; reason: string }[];
  scannedFiles: number;
};

function headers(): HeadersInit {
  const h: Record<string, string> = { Accept: "application/vnd.github+json", "User-Agent": "phpagent-si" };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

async function github<T>(path: string): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, { headers: headers(), cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (res.status === 409) throw new Error("repository has no commits on its default branch");
  if (res.status === 404) throw new Error("repository is unavailable or private");
  if (!res.ok) throw new Error(`GitHub HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

function candidates(tree: TreeEntry[]) {
  return tree.filter((e) => e.type === "blob" && (e.size ?? 0) <= MAX_BYTES && !/(^|\/)(vendor|node_modules)\//.test(e.path)).filter((e) => {
    const name = e.path.split("/").pop()!;
    return name === "Dockerfile" || /\.dockerfile$/i.test(name) || /^(docker-compose|compose)[\w.-]*\.ya?ml$/i.test(name) || /^\.github\/workflows\/[^/]+\.ya?ml$/.test(e.path) || name === "composer.json";
  }).slice(0, MAX_FILES);
}

export async function checkPublicRepository(repository: string): Promise<PublicCheck> {
  if (!REPO_RE.test(repository)) throw new Error("use a public GitHub repository in owner/repository format");
  const repo = await github<GitHubRepo>(`/repos/${repository}`);
  if (repo.private) throw new Error("only public repositories can be checked here");
  const tree = await github<{ tree: TreeEntry[] }>(`/repos/${repository}/git/trees/${encodeURIComponent(repo.default_branch)}?recursive=1`);
  const files = candidates(tree.tree);
  const fixed = (await getReleaseTable()).fixed;
  const changes: PublicCheck["changes"] = [];
  const reviews: PublicCheck["reviews"] = [];
  for (const file of files) {
    const blob = await github<{ content: string; encoding: string }>(`/repos/${repository}/git/blobs/${file.sha}`);
    const text = Buffer.from(blob.content, blob.encoding === "base64" ? "base64" : "utf8").toString("utf8");
    const plan = planFile(file.path, text, fixed);
    if (plan.kind === "review") reviews.push({ path: file.path, reason: plan.reason });
    if (plan.kind === "change" && validateChange(plan.change).ok) changes.push({ path: file.path, edits: plan.change.edits });
  }
  return { repository: repo.full_name, url: repo.html_url, defaultBranch: repo.default_branch, changes, reviews, scannedFiles: files.length };
}
