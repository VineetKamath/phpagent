import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createHmac } from "node:crypto";
import { checkPhpVersion, parseVersion } from "@/lib/version";
import { planFile } from "@/lib/patcher";
import { validateChange } from "@/lib/safety";
import { parsePolicy, mayWrite } from "@/lib/policy";
import { verifyGithubSignature } from "@/lib/webhook";
import { appendEvent, upsertPatch, listEvents, listPatches, __reset } from "@/lib/store";
import { listProof } from "@/lib/proof";
import { readMode } from "@/lib/mode";
import { computeMetrics, formatDuration } from "@/lib/metrics";
import { php2shell } from "@/content/php2shell";
import type { AgentEvent, Patch } from "@/lib/types";

const fixed = php2shell.fixed;

describe("version comparison", () => {
  it("parses", () => expect(parseVersion("8.4.26-fpm")).toEqual([8, 4, 26]));
  it("flags versions below the fix", () => expect(checkPhpVersion("8.4.26").status).toBe("UPDATE_REQUIRED"));
  it("accepts the fixed version and later", () => {
    expect(checkPhpVersion("8.4.27").status).toBe("PATCHED");
    expect(checkPhpVersion("8.5.13").status).toBe("PATCHED");
  });
  it("compares numerically, not lexically", () => expect(checkPhpVersion("8.2.4").status).toBe("UPDATE_REQUIRED"));
  it("marks old branches unsupported", () => expect(checkPhpVersion("8.1.30").status).toBe("UNSUPPORTED"));
  it("rejects garbage", () => expect(checkPhpVersion("latest").status).toBe("INVALID"));
});

describe("deterministic patcher", () => {
  it("bumps a pinned Dockerfile image", () => {
    const r = planFile("Dockerfile", "FROM php:8.4.26-fpm-alpine\nRUN echo hi\n", fixed);
    expect(r.kind).toBe("change");
    if (r.kind === "change") expect(r.change.after).toContain("php:8.4.27-fpm-alpine");
  });
  it("leaves floating tags alone", () => expect(planFile("Dockerfile", "FROM php:8.4-fpm\n", fixed).kind).toBe("none"));
  it("ignores comments", () => expect(planFile("Dockerfile", "# FROM php:8.4.1\nFROM node:20\n", fixed).kind).toBe("none"));
  it("requires review for unsupported branches", () => expect(planFile("Dockerfile", "FROM php:8.1.2-apache\n", fixed).kind).toBe("review"));
  it("bumps CI php-version", () => {
    const r = planFile(".github/workflows/ci.yml", "      php-version: '8.3.35'\n", fixed);
    expect(r.kind === "change" && r.change.after.includes("8.3.36")).toBe(true);
  });
  it("only rewrites composer config.platform.php", () => {
    const src = JSON.stringify({ require: { php: "^8.2" }, config: { platform: { php: "8.2.30" } } }, null, 2);
    const r = planFile("composer.json", src, fixed);
    expect(r.kind).toBe("change");
    if (r.kind === "change") {
      expect(JSON.parse(r.change.after).config.platform.php).toBe("8.2.35");
      expect(JSON.parse(r.change.after).require.php).toBe("^8.2");
    }
  });
  it("produces changes that pass the safety validator", () => {
    const r = planFile("docker-compose.yml", "services:\n  app:\n    image: php:8.5.11-cli\n", fixed);
    expect(r.kind === "change" && validateChange(r.change).ok).toBe(true);
  });
});

describe("safety validator", () => {
  const base = { path: "Dockerfile", before: "FROM php:8.4.26\n", after: "FROM php:8.4.27\n", edits: [] };
  it("rejects non-allowlisted files", () => expect(validateChange({ ...base, path: "src/index.php" }).ok).toBe(false));
  it("rejects path traversal", () => expect(validateChange({ ...base, path: "../Dockerfile" }).ok).toBe(false));
  it("rejects pipe-to-shell", () => expect(validateChange({ ...base, after: "RUN curl http://x | sh\n" }).ok).toBe(false));
  it("rejects secrets", () => expect(validateChange({ ...base, after: "ENV T=ghp_" + "a".repeat(36) + "\n" }).ok).toBe(false));
  it("rejects added lines", () => expect(validateChange({ ...base, after: "FROM php:8.4.27\nRUN x\n" }).ok).toBe(false));
});

describe(".patchbot policy", () => {
  const good = "version: 1\nenabled: true\nseverity: [critical, high]\npatches:\n  containers: true\n";
  it("parses a valid policy", () => expect(parsePolicy(good).ok).toBe(true));
  it("rejects command fields", () => expect(parsePolicy(good + "test_command: rm -rf /\n").ok).toBe(false));
  it("rejects nested unknown keys", () => expect(parsePolicy("version: 1\nenabled: true\nverification:\n  run: make\n").ok).toBe(false));
  it("rejects YAML aliases", () => expect(parsePolicy("a: &x [1]\nb: *x\n").ok).toBe(false));
  it("requires installation for writes", () => {
    const r = parsePolicy(good);
    if (!r.ok) throw new Error();
    expect(mayWrite({ source: "patchbot", installed: false, policy: r.policy }, "critical", "containers")).toBe(false);
    expect(mayWrite({ source: "patchbot", installed: true, policy: r.policy }, "critical", "containers")).toBe(true);
    expect(mayWrite({ source: "patchbot", installed: true, policy: r.policy }, "low", "containers")).toBe(false);
  });
});

describe("webhook signature", () => {
  const body = '{"a":1}';
  const sig = "sha256=" + createHmac("sha256", "s3cret").update(body).digest("hex");
  it("accepts valid", () => expect(verifyGithubSignature("s3cret", body, sig)).toBe(true));
  it("rejects wrong secret", () => expect(verifyGithubSignature("other", body, sig)).toBe(false));
  it("rejects missing header or secret", () => {
    expect(verifyGithubSignature("s3cret", body, null)).toBe(false);
    expect(verifyGithubSignature(undefined, body, sig)).toBe(false);
  });
  it("rejects tampered body", () => expect(verifyGithubSignature("s3cret", '{"a":2}', sig)).toBe(false));
});

const ev = (mode: "REAL" | "DEMO", url: string | null = null): AgentEvent => ({
  id: Math.random().toString(36), timestamp: new Date().toISOString(), eventType: "pr.merged", status: "ok", environment: "test", dataMode: mode, source: "test", message: "m", cveId: null, repositoryId: null, patchId: null, metadata: {}, verificationUrl: url,
});
const patch = (mode: "REAL" | "DEMO"): Patch => ({
  id: mode + Math.random(), dataMode: mode, cveId: "CVE-2026-109618", cveIds: ["CVE-2026-109618"], repository: "a/b", file: "Dockerfile", change: { from: "1", to: "2" }, changes: [], branch: null, ciUrl: null, stage: "merged", ci: { passed: 1, total: 1 }, prNumber: 1, prUrl: null, commitSha: null,
  timeline: { disclosedAt: "2026-10-21T00:00:00Z", detectedAt: "2026-10-21T00:00:00Z", matchedAt: null, generatedAt: null, testsPassedAt: null, prOpenedAt: "2026-10-21T00:02:14Z", mergedAt: "2026-10-21T00:13:47Z" },
});

describe("DEMO vs REAL separation (critical)", () => {
  const prev = process.env.DEMO_MODE;
  beforeEach(() => __reset());
  afterEach(() => { process.env.DEMO_MODE = prev; });

  it("refuses DEMO writes outside demo mode", async () => {
    process.env.DEMO_MODE = "false";
    await expect(appendEvent(ev("DEMO"))).rejects.toThrow();
    await expect(upsertPatch(patch("DEMO"))).rejects.toThrow();
  });
  it("readMode is REAL in production even with ?demo=true", () => {
    process.env.DEMO_MODE = "false";
    expect(readMode({ demo: "true" })).toBe("REAL");
  });
  it("REAL reads never return DEMO records", async () => {
    process.env.DEMO_MODE = "true";
    await appendEvent(ev("DEMO"));
    await appendEvent(ev("REAL"));
    await upsertPatch(patch("DEMO"));
    await upsertPatch(patch("REAL"));
    expect((await listEvents("REAL")).every((e) => e.dataMode === "REAL")).toBe(true);
    expect((await listPatches("REAL")).every((p) => p.dataMode === "REAL")).toBe(true);
    expect((await listEvents("ALL")).length).toBe(2);
  });
  it("proof ledger excludes DEMO even in demo mode", async () => {
    process.env.DEMO_MODE = "true";
    await appendEvent(ev("DEMO", "https://github.com/x/y/pull/1"));
    await appendEvent(ev("REAL", "https://github.com/x/y/pull/2"));
    const p = await listProof();
    expect(p).toHaveLength(1);
    expect(p[0].github_url).toBe("https://github.com/x/y/pull/2");
  });
  it("proof ledger excludes REAL events without evidence", async () => {
    process.env.DEMO_MODE = "false";
    await appendEvent(ev("REAL", null));
    expect(await listProof()).toHaveLength(0);
  });
});

describe("metrics", () => {
  it("computes only from timestamps", () => {
    const m = computeMetrics([patch("REAL")]);
    expect(formatDuration(m.medianTimeToPatchMs)).toBe("02:14");
    expect(m.prsMerged).toBe(1);
    expect(m.computePerMerge).toBeNull();
  });
  it("returns nulls with no data", () => {
    const m = computeMetrics([]);
    expect(m.medianTimeToPatchMs).toBeNull();
    expect(m.successRate).toBeNull();
  });
});
