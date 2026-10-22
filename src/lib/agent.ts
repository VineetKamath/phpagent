import { createHash, randomUUID } from "node:crypto";
import { brand } from "@/content/brand";
import { php2shell } from "@/content/php2shell";
import { getReleaseTable } from "./php-releases";
import { lookupCve } from "./providers";
import { planFile, type FileChange } from "./patcher";
import { validateChange } from "./safety";
import { parsePolicy, mayWrite, type Authorization } from "./policy";
import {
  githubAppConfigured, githubWritesEnabled, listInstallations, installationToken, listInstallationRepos,
  getTree, readBlob, listOpenAgentPrs, openPullRequest, type Installation, type Repo, type TreeEntry,
} from "./github";
import { appendEvent, upsertPatch, getPatch, hasSource, recordSource, cveFirstSeen, recordAuthorization } from "./store";
import type { AgentEvent, Patch } from "./types";

/**
 * Orchestration worker: ingest → match → authorize → plan → validate → PR.
 * Only repositories in a GitHub App installation are ever read. Every transition is a
 * REAL AgentEvent, persisted before it is streamed.
 */
const CAMPAIGN = php2shell.name;
const CVE_IDS = php2shell.cves.map((c) => c.id);
const PRIMARY = CVE_IDS[0];
const SEVERITY = "critical" as const;
const MAX_FILES = 40;
const MAX_BYTES = 256 * 1024;
const POLICY_PATHS = [".patchbot", ".patchbot.yml", ".patchbot.yaml"];
const DONE_STAGES = new Set<Patch["stage"]>(["pr_opened", "tested", "merged", "closed", "review_required", "policy_blocked"]);
const nvdUrl = (id: string) => `https://nvd.nist.gov/vuln/detail/${id}`;
const now = () => new Date().toISOString();

export type RunSummary = {
  startedAt: string;
  finishedAt: string | null;
  installations: number;
  repositories: number;
  prsOpened: string[];
  reviews: number;
  skipped: number;
  errors: string[];
  skippedRun?: string;
};

type State = { running: boolean; lastRunAt: string | null; lastOk: boolean | null; lastSummary: RunSummary | null; errorsSeen: Map<string, string> };
const g = globalThis as unknown as { __agent?: State };
const state: State = (g.__agent ??= { running: false, lastRunAt: null, lastOk: null, lastSummary: null, errorsSeen: new Map() });
export const agentState = () => ({ running: state.running, lastRunAt: state.lastRunAt, lastOk: state.lastOk, lastSummary: state.lastSummary });

function event(e: Pick<AgentEvent, "eventType" | "message"> & Partial<AgentEvent>): AgentEvent {
  return {
    id: randomUUID(),
    timestamp: now(),
    status: "ok",
    environment: process.env.DEPLOYMENT_ID ?? "production",
    dataMode: "REAL",
    source: "agent",
    cveId: null,
    repositoryId: null,
    patchId: null,
    metadata: {},
    verificationUrl: null,
    ...e,
  };
}

/** Failures become events, but a repeating failure is only recorded when its message changes. */
async function logError(key: string, message: string, extra: Partial<AgentEvent> = {}) {
  if (state.errorsSeen.get(key) === message) return;
  state.errorsSeen.set(key, message);
  await appendEvent(event({ eventType: "agent.error", status: "error", message: message.slice(0, 500), ...extra })).catch(() => {});
}

const fingerprint = (...parts: unknown[]) => "p_" + createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 24);

export function candidateFiles(tree: TreeEntry[]): TreeEntry[] {
  return tree
    .filter((e) => e.type === "blob" && (e.size ?? 0) <= MAX_BYTES && !/(^|\/)(vendor|node_modules)\//.test(e.path))
    .filter((e) => {
      const name = e.path.split("/").pop()!;
      return (
        name === "Dockerfile" ||
        /\.dockerfile$/i.test(name) ||
        /^(docker-compose|compose)[\w.-]*\.ya?ml$/i.test(name) ||
        /^\.github\/workflows\/[^/]+\.ya?ml$/.test(e.path) ||
        name === "composer.json"
      );
    })
    .slice(0, MAX_FILES);
}

const kindOf = (path: string): "dependencies" | "containers" | "ci" =>
  path.endsWith("composer.json") ? "dependencies" : path.startsWith(".github/workflows/") ? "ci" : "containers";

function lineDiff(c: FileChange): string {
  const a = c.before.split("\n");
  const b = c.after.split("\n");
  return a.flatMap((l, i) => (l === b[i] ? [] : [`- ${l}`, `+ ${b[i]}`])).join("\n");
}

function prBody(repo: Repo, changes: FileChange[], policyFile: string | null): string {
  const site = brand.siteUrl.replace(/\/$/, "");
  const rows = php2shell.cves.map((c) => `| [${c.id}](${nvdUrl(c.id)}) | Critical · CVSS v4 ${c.cvssV4} |`).join("\n");
  const diffs = changes.map((c) => `**\`${c.path}\`**\n\n\`\`\`diff\n${lineDiff(c)}\n\`\`\``).join("\n\n");
  return `## Security update: ${CAMPAIGN} (${CVE_IDS.join(", ")})

This pull request updates pinned PHP runtime versions to the first fixed release on the same branch.

| Advisory | Severity |
|---|---|
${rows}

Fixed releases: ${Object.entries(php2shell.fixed).map(([b, v]) => `${b} → **${v}**`).join(", ")} ([PHP ChangeLog](https://www.php.net/ChangeLog-8.php), [php.net releases](https://www.php.net/releases/)).

### Exact changes

${diffs}

### How this was verified
- **Deterministic match:** an explicit three-part PHP version pin on a supported branch. Floating tags are never changed.
- **Static validation:** file allowlist, unchanged line count, at most 20 changed lines, secret scan, dangerous-content scan. All passed.
- **Tests:** this repository's own CI runs on this branch. The agent records the result publicly and never runs your code itself.

### Before merging
Merging updates the pin. Rebuild and redeploy your images for the fix to take effect.

### Why you are receiving this
This repository installed the ${brand.brandName} GitHub App${policyFile ? `, and \`${policyFile}\` permits this update` : ""}. Uninstall the App to revoke access at any time.

Public record: ${site}/proof · ${site}/repo/${repo.full_name}
`;
}

export async function ingestAdvisories(): Promise<void> {
  for (const id of CVE_IDS) {
    const { cve, errors } = await lookupCve(id);
    for (const e of errors) await logError(`ingest:${id}:${e.split(":")[0]}`, `${id} ingestion: ${e}`, { cveId: id });
    if (!cve) continue;
    const row = { id, summary: cve.summary, severity: cve.severity, cvss: cve.cvss, published: cve.published, modified: cve.modified };
    let changed = 0;
    for (const p of cve.provenance) {
      if (await hasSource(id, p)) continue;
      await recordSource(row, p);
      changed++;
      await appendEvent(event({
        eventType: "advisory.ingested",
        message: `${id} ingested from ${p.provider.toUpperCase()}`,
        source: p.provider,
        cveId: id,
        verificationUrl: p.sourceUrl,
        metadata: { provider: p.provider, providerRecordId: p.providerRecordId, rawHash: p.rawHash, retrievedAt: p.retrievedAt },
      }));
    }
    if (changed) {
      await appendEvent(event({
        eventType: "advisory.normalized",
        message: `${id} normalized: ${cve.severity ?? "severity n/a"} · CVSS ${cve.cvss ?? "n/a"} · ${cve.provenance.length} provider record(s)`,
        cveId: id,
        verificationUrl: nvdUrl(id),
        metadata: { severity: cve.severity, cvss: cve.cvss, providers: cve.provenance.map((p) => p.provider) },
      }));
    }
  }
}

async function processRepo(token: string, inst: Installation, repo: Repo, fixed: Record<string, string>, s: RunSummary) {
  const full = repo.full_name;
  const fileUrl = (p: string) => `${repo.html_url}/blob/${repo.default_branch}/${p}`;
  await recordAuthorization(full, inst.id, "github-app", true);

  const { tree } = await getTree(token, full, repo.default_branch);

  // Policy: absent → App installation alone authorizes; invalid → fail closed.
  const policyEntry = tree.find((e) => e.type === "blob" && POLICY_PATHS.includes(e.path));
  let policy: Authorization["policy"] = null;
  if (policyEntry) {
    const r = (policyEntry.size ?? 0) > 8192 ? ({ ok: false, error: "policy file too large" } as const) : parsePolicy(await readBlob(token, full, policyEntry.sha));
    if (!r.ok) {
      s.skipped++;
      await logError(`policy:${full}`, `${full}: invalid ${policyEntry.path}: ${r.error}. Repository skipped.`, { eventType: "policy.denied", status: "warn", repositoryId: full, verificationUrl: fileUrl(policyEntry.path) });
      return;
    }
    policy = r.policy;
    await recordAuthorization(full, inst.id, "patchbot", r.policy.enabled, r.policy);
  }
  const auth: Authorization = { source: policy ? "patchbot" : "github-app", installed: true, policy };

  const changes: (FileChange & { blobSha: string })[] = [];
  const reviews: { path: string; reason: string }[] = [];
  for (const f of candidateFiles(tree)) {
    const plan = planFile(f.path, await readBlob(token, full, f.sha), fixed);
    if (plan.kind === "review") reviews.push({ path: f.path, reason: plan.reason });
    if (plan.kind !== "change") continue;
    const v = validateChange(plan.change);
    if (!v.ok) {
      await logError(`reject:${full}:${f.path}`, `${full}: ${f.path} change rejected: ${v.reasons.join("; ")}`, { eventType: "patch.rejected", status: "warn", repositoryId: full, cveId: PRIMARY, verificationUrl: fileUrl(f.path) });
      continue;
    }
    changes.push({ ...plan.change, blobSha: f.sha });
  }

  const detectedAt = (await cveFirstSeen(PRIMARY)) ?? now();
  const base = (id: string, stage: Patch["stage"], file: string, from: string, to: string, edits: Patch["changes"]): Patch => ({
    id, dataMode: "REAL", cveId: PRIMARY, cveIds: CVE_IDS, repository: full, file, change: { from, to }, changes: edits, branch: null, ciUrl: null,
    stage, ci: null, prNumber: null, prUrl: null, commitSha: null,
    timeline: { disclosedAt: php2shell.disclosedAt, detectedAt, matchedAt: now(), generatedAt: null, testsPassedAt: null, prOpenedAt: null, mergedAt: null },
  });

  // Ambiguous or unsupported runtimes: record once, never open a PR.
  if (reviews.length) {
    const id = fingerprint(full, CAMPAIGN, "review", reviews);
    if (!(await getPatch(id))) {
      s.reviews++;
      await upsertPatch(base(id, "review_required", reviews.map((r) => r.path).join(", "), reviews[0].reason, "human review", []));
      for (const r of reviews) {
        await appendEvent(event({ eventType: "review.required", status: "warn", message: `${full}: ${r.path}: ${r.reason}`, repositoryId: full, cveId: PRIMARY, patchId: id, verificationUrl: fileUrl(r.path) }));
      }
    }
  }
  if (!changes.length) return;

  const edits = (cs: FileChange[]) => cs.flatMap((c) => c.edits.map((e) => ({ path: c.path, line: e.line, from: e.from, to: e.to })));
  const allowed = changes.filter((c) => mayWrite(auth, SEVERITY, kindOf(c.path)));
  if (!allowed.length) {
    const id = fingerprint(full, CAMPAIGN, "blocked", edits(changes));
    if (!(await getPatch(id))) {
      const e0 = edits(changes)[0];
      await upsertPatch(base(id, "policy_blocked", changes[0].path, e0.from, e0.to, edits(changes)));
      await appendEvent(event({ eventType: "policy.denied", status: "warn", message: `${full}: ${changes.length} affected pin(s) found; ${policyEntry?.path ?? "policy"} does not permit this update`, repositoryId: full, cveId: PRIMARY, patchId: id, verificationUrl: policyEntry ? fileUrl(policyEntry.path) : null }));
    }
    return;
  }

  // Idempotency: same exact change already handled, or an open agent PR for this campaign.
  const id = fingerprint(full, CAMPAIGN, edits(allowed));
  const existing = await getPatch(id);
  if (existing && DONE_STAGES.has(existing.stage)) return void s.skipped++;
  const open = await listOpenAgentPrs(token, full);
  if (open.some((p) => CVE_IDS.some((c) => p.title.includes(c)))) return void s.skipped++;

  const e = edits(allowed);
  const more = allowed.length > 1 ? ` +${allowed.length - 1} more` : "";
  let patch = base(id, "planned", allowed[0].path + more, e[0].from, e[0].to, e);
  await appendEvent(event({ eventType: "policy.authorized", message: `${full} authorized via ${auth.source === "patchbot" ? policyEntry!.path : "GitHub App installation"}`, repositoryId: full, verificationUrl: policyEntry ? fileUrl(policyEntry.path) : null, metadata: { installationId: inst.id } }));
  await upsertPatch(patch);
  await appendEvent(event({ eventType: "match.evaluated", message: `${full}: ${e.length} pinned affected PHP version(s)`, repositoryId: full, cveId: PRIMARY, patchId: id, verificationUrl: nvdUrl(PRIMARY), metadata: { files: allowed.map((c) => c.path) } }));

  patch = { ...patch, stage: "generated", timeline: { ...patch.timeline, generatedAt: now() } };
  await upsertPatch(patch);
  await appendEvent(event({ eventType: "patch.generated", message: e.map((x) => `${x.path}: ${x.from} → ${x.to}`).join("; "), repositoryId: full, cveId: PRIMARY, patchId: id, verificationUrl: nvdUrl(PRIMARY), metadata: { edits: e } }));

  if (!githubWritesEnabled()) {
    await logError(`writes:${full}`, `${full}: patch ready but GitHub writes are disabled; no PR opened`, { eventType: "agent.error", status: "warn", repositoryId: full, patchId: id });
    return;
  }

  const branch = `patch-agent/${CAMPAIGN.toLowerCase()}-${Date.now().toString(36)}`;
  try {
    const title = `Security: update PHP runtime for ${CAMPAIGN} (${CVE_IDS.join(", ")})`;
    const pr = await openPullRequest(token, full, repo.default_branch, branch, allowed.map((c) => ({ path: c.path, after: c.after, blobSha: c.blobSha })), title, prBody(repo, allowed, policyEntry?.path ?? null));
    patch = { ...patch, stage: "pr_opened", branch: pr.branch, prNumber: pr.prNumber, prUrl: pr.prUrl, commitSha: pr.commitSha, timeline: { ...patch.timeline, prOpenedAt: now() } };
    await upsertPatch(patch);
    await appendEvent(event({ eventType: "pr.opened", message: `${full}#${pr.prNumber} opened`, source: "github", repositoryId: full, cveId: PRIMARY, patchId: id, verificationUrl: pr.prUrl, metadata: { commitSha: pr.commitSha, branch: pr.branch, prNumber: pr.prNumber } }));
    s.prsOpened.push(pr.prUrl);
  } catch (err) {
    await upsertPatch({ ...patch, stage: "failed", branch });
    throw err;
  }
}

/** Single-flight: overlapping triggers (cron, backup cron, webhook) return immediately. */
export async function runAgent(opts: { repos?: string[] } = {}): Promise<RunSummary> {
  const s: RunSummary = { startedAt: now(), finishedAt: null, installations: 0, repositories: 0, prsOpened: [], reviews: 0, skipped: 0, errors: [] };
  if (state.running) return { ...s, finishedAt: now(), skippedRun: "a run is already in progress" };
  state.running = true;
  try {
    if (!githubAppConfigured()) throw new Error("GitHub App not configured");
    const { fixed } = await getReleaseTable();
    await ingestAdvisories();
    const installations = await listInstallations();
    s.installations = installations.length;
    for (const inst of installations) {
      try {
        const token = await installationToken(inst.id);
        for (const repo of await listInstallationRepos(token)) {
          if (repo.archived || (opts.repos && !opts.repos.includes(repo.full_name))) continue;
          s.repositories++;
          try {
            await processRepo(token, inst, repo, fixed, s);
          } catch (e) {
            s.errors.push(`${repo.full_name}: ${String(e)}`);
            await logError(`repo:${repo.full_name}`, `${repo.full_name}: ${String(e)}`, { repositoryId: repo.full_name });
          }
        }
      } catch (e) {
        s.errors.push(`installation ${inst.id}: ${String(e)}`);
        await logError(`inst:${inst.id}`, `installation ${inst.id}: ${String(e)}`);
      }
    }
  } catch (e) {
    s.errors.push(String(e));
    await logError("run", `run failed: ${String(e)}`);
  } finally {
    s.finishedAt = now();
    state.running = false;
    state.lastRunAt = s.finishedAt;
    state.lastOk = s.errors.length === 0;
    state.lastSummary = s;
    await appendEvent(event({
      eventType: "agent.run",
      status: s.errors.length ? "warn" : "ok",
      message: `run complete: ${s.repositories} repositories, ${s.prsOpened.length} PR(s) opened, ${s.reviews} review(s), ${s.errors.length} error(s)`,
      metadata: { ...s },
    })).catch(() => {});
  }
  return s;
}
