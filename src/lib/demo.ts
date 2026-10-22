import { appendEvent, isDemoEnv, upsertPatch } from "./store";
import type { AgentEvent, EventType, Patch } from "./types";

/**
 * SIMULATED activity for development. Every record is dataMode "DEMO", every
 * repository lives under the reserved "demo-org/" namespace, and no record carries
 * a GitHub URL, commit SHA or transaction signature: so nothing here can be mistaken
 * for, or link to, real-world activity.
 */
const REPOS = ["demo-org/storefront-api", "demo-org/cms-runtime", "demo-org/billing-worker", "demo-org/docs-site"];
const CVES = ["CVE-2026-109618", "CVE-2026-109619"];
const FILES: [string, string, string][] = [
  ["Dockerfile", "php:8.4.26-fpm", "php:8.4.27-fpm"],
  ["docker-compose.yml", "php:8.3.35-apache", "php:8.3.36-apache"],
  [".github/workflows/ci.yml", "php-version: 8.2.34", "php-version: 8.2.35"],
  ["Dockerfile", "php:8.5.11-cli", "php:8.5.12-cli"],
];

let n = 0;
const g = globalThis as unknown as { __demoStarted?: boolean };

function ev(type: EventType, message: string, extra: Partial<AgentEvent> = {}): AgentEvent {
  return {
    id: `demo-ev-${Date.now()}-${n++}`,
    timestamp: new Date().toISOString(),
    eventType: type,
    status: type.endsWith("failed") || type.endsWith("denied") || type.endsWith("rejected") ? "warn" : "ok",
    environment: "demo",
    dataMode: "DEMO",
    source: "simulator",
    message,
    cveId: null,
    repositoryId: null,
    patchId: null,
    metadata: { simulated: true },
    verificationUrl: null,
    ...extra,
  };
}

function runCycle(i: number) {
  const repo = REPOS[i % REPOS.length];
  const cve = CVES[i % CVES.length];
  const [file, from, to] = FILES[i % FILES.length];
  const id = `demo-patch-${i}`;
  const t0 = Date.now();
  const at = (s: number) => new Date(t0 + s * 1000).toISOString();
  const ci = { passed: 38 + (i % 5), total: 38 + (i % 5) };
  const fail = i % 4 === 3;

  const base: Patch = {
    id,
    dataMode: "DEMO",
    cveId: cve,
    cveIds: [cve],
    repository: repo,
    file,
    change: { from, to },
    changes: [{ path: file, line: 1, from, to }],
    branch: null,
    ciUrl: null,
    stage: "planned",
    ci: null,
    prNumber: null,
    prUrl: null,
    commitSha: null,
    timeline: { disclosedAt: "2026-10-21T00:00:00Z", detectedAt: at(0), matchedAt: null, generatedAt: null, testsPassedAt: null, prOpenedAt: null, mergedAt: null },
  };
  const steps: [number, () => void][] = [
    [0, () => appendEvent(ev("advisory.normalized", `${cve} normalized`, { cveId: cve }))],
    [1.2, () => appendEvent(ev("match.evaluated", `composer + container index evaluated: 12 candidates`, { cveId: cve, metadata: { simulated: true, candidates: 12 } }))],
    [2.1, () => {
      appendEvent(ev("policy.authorized", `${repo} authorization confirmed (.patchbot v1)`, { cveId: cve, repositoryId: repo }));
      upsertPatch({ ...base, timeline: { ...base.timeline, matchedAt: at(2) } });
    }],
    [3.4, () => {
      appendEvent(ev("patch.generated", `${file}: ${from} → ${to}`, { cveId: cve, repositoryId: repo, patchId: id }));
      upsertPatch({ ...base, stage: "generated", timeline: { ...base.timeline, matchedAt: at(2), generatedAt: at(3) } });
    }],
    [6.5, () => {
      if (fail) {
        appendEvent(ev("patch.tests.failed", `CI ${ci.total - 2}/${ci.total}: human review required`, { cveId: cve, repositoryId: repo, patchId: id }));
        upsertPatch({ ...base, stage: "review_required", ci: { passed: ci.total - 2, total: ci.total }, timeline: { ...base.timeline, matchedAt: at(2), generatedAt: at(3) } });
        return;
      }
      appendEvent(ev("patch.tests.passed", `CI ${ci.passed}/${ci.total} passed`, { cveId: cve, repositoryId: repo, patchId: id }));
      upsertPatch({ ...base, stage: "tested", ci, timeline: { ...base.timeline, matchedAt: at(2), generatedAt: at(3), testsPassedAt: at(6) } });
    }],
    [7.2, () => {
      if (fail) return;
      appendEvent(ev("pr.opened", `pull request opened (simulated #${100 + i})`, { cveId: cve, repositoryId: repo, patchId: id }));
      upsertPatch({ ...base, stage: "pr_opened", ci, prNumber: 100 + i, timeline: { ...base.timeline, matchedAt: at(2), generatedAt: at(3), testsPassedAt: at(6), prOpenedAt: at(7) } });
    }],
    [14, () => {
      if (fail || i % 3 === 2) return;
      appendEvent(ev("pr.merged", `merge verified (simulated)`, { cveId: cve, repositoryId: repo, patchId: id }));
      upsertPatch({ ...base, stage: "merged", ci, prNumber: 100 + i, timeline: { ...base.timeline, matchedAt: at(2), generatedAt: at(3), testsPassedAt: at(6), prOpenedAt: at(7), mergedAt: at(14) } });
    }],
  ];
  for (const [s, fn] of steps) setTimeout(fn, s * 1000);
}

/** Idempotent. No-op unless DEMO_MODE=true. */
export function ensureDemo() {
  if (!isDemoEnv() || g.__demoStarted) return;
  g.__demoStarted = true;
  let i = 0;
  runCycle(i++);
  const t = setInterval(() => runCycle(i++), 18_000);
  (t as unknown as { unref?: () => void }).unref?.();
}
