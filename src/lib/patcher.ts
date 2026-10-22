import { parseVersion, compare } from "./version";

/**
 * Deterministic PHP2Shell remediation. Only rewrites explicit, pinned PHP versions
 * in known file types. Anything ambiguous returns `review` instead of a change.
 */
export type FileChange = { path: string; before: string; after: string; edits: { line: number; from: string; to: string }[] };
export type PlanResult =
  | { kind: "change"; change: FileChange }
  | { kind: "none"; reason: string }
  | { kind: "review"; reason: string };

// php:8.4.26-fpm, php:8.4.26, php:8.4-fpm-alpine (floating: review), php:latest (review)
const IMAGE_RE = /\b(php):(\d+\.\d+(?:\.\d+)?)([-\w.]*)/g;
const CI_RE = /(php-version\s*:\s*['"]?)(\d+\.\d+(?:\.\d+)?)(['"]?)/g;

function bump(version: string, fixed: Record<string, string>): { to: string } | { review: string } | null {
  const v = parseVersion(version);
  if (!v) return null;
  const branch = `${v[0]}.${v[1]}`;
  const fix = fixed[branch];
  if (!fix) return { review: `PHP ${branch} has no upstream fix; branch migration needs human review` };
  if (version.split(".").length < 3) return null; // floating tag (e.g. 8.4): resolved upstream, not pinned here
  return compare(v, parseVersion(fix)!) >= 0 ? null : { to: fix };
}

function rewrite(path: string, src: string, re: RegExp, verGroup: number, fixed: Record<string, string>): PlanResult {
  const lines = src.split("\n");
  const edits: FileChange["edits"] = [];
  let review: string | null = null;
  const out = lines.map((line, idx) => {
    if (/^\s*#/.test(line)) return line; // comments are data, not config
    return line.replace(re, (...m: string[]) => {
      const r = bump(m[verGroup], fixed);
      if (!r) return m[0];
      if ("review" in r) {
        review = r.review;
        return m[0];
      }
      const next = m[0].replace(m[verGroup], r.to);
      edits.push({ line: idx + 1, from: m[0], to: next });
      return next;
    });
  });
  if (review) return { kind: "review", reason: review };
  if (!edits.length) return { kind: "none", reason: "no pinned affected PHP version found" };
  return { kind: "change", change: { path, before: src, after: out.join("\n"), edits } };
}

export function planFile(path: string, content: string, fixed: Record<string, string>): PlanResult {
  const name = path.split("/").pop()!.toLowerCase();
  if (name === "dockerfile" || name.endsWith(".dockerfile") || /^docker-compose.*\.ya?ml$|^compose\.ya?ml$/.test(name)) {
    return rewrite(path, content, IMAGE_RE, 2, fixed);
  }
  if (path.startsWith(".github/workflows/") && /\.ya?ml$/.test(name)) {
    return rewrite(path, content, CI_RE, 2, fixed);
  }
  if (name === "composer.json") return planComposer(path, content, fixed);
  return { kind: "none", reason: "unsupported file type" };
}

/**
 * composer.json: only `config.platform.php` is a pinned runtime version we can bump safely.
 * `require.php` is a compatibility constraint, not the deployed runtime: we never rewrite it.
 */
function planComposer(path: string, content: string, fixed: Record<string, string>): PlanResult {
  let json: { config?: { platform?: { php?: string } } };
  try {
    json = JSON.parse(content);
  } catch {
    return { kind: "review", reason: "composer.json is not valid JSON" };
  }
  const cur = json.config?.platform?.php;
  if (!cur) return { kind: "none", reason: "no config.platform.php pin" };
  const r = bump(cur, fixed);
  if (!r) return { kind: "none", reason: "platform pin already safe" };
  if ("review" in r) return { kind: "review", reason: r.review };
  const after = content.replace(new RegExp(`("php"\\s*:\\s*")${cur.replace(/\./g, "\\.")}(")`), `$1${r.to}$2`);
  if (after === content) return { kind: "review", reason: "could not apply edit deterministically" };
  return { kind: "change", change: { path, before: content, after, edits: [{ line: 0, from: cur, to: r.to }] } };
}
