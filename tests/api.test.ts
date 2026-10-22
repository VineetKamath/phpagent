import { describe, it, expect, vi, beforeAll } from "vitest";
import { createHmac } from "node:crypto";

// Network is stubbed: every external probe fails, so status must report it honestly.
beforeAll(() => {
  vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network disabled in tests"); }));
  process.env.DEMO_MODE = "false";
  process.env.GITHUB_WEBHOOK_SECRET = "whsec";
});

describe("status endpoint", () => {
  it("never claims operational when providers are down", async () => {
    const { GET } = await import("@/app/api/v1/status/route");
    const j = await (await GET()).json();
    expect(j.status).not.toBe("operational");
    expect(j.services.cveIngestion.status).toBe("unavailable");
    expect(j.capabilities.githubWrite).toBe(false);
    expect(j.capabilities.liveTreasury).toBe(false);
    expect(j.demoMode).toBe(false);
    expect(j.services.phpReleases.status).toBe("degraded");
  });
});

describe("webhook route", () => {
  it("rejects unsigned requests", async () => {
    const { POST } = await import("@/app/api/webhooks/github/route");
    const r = await POST(new Request("http://x/api/webhooks/github", { method: "POST", body: "{}" }));
    expect(r.status).toBe(401);
  });
  it("records a REAL merge with evidence from a signed request", async () => {
    const { POST } = await import("@/app/api/webhooks/github/route");
    const { listProof } = await import("@/lib/proof");
    const body = JSON.stringify({ action: "closed", repository: { full_name: "acme/site" }, pull_request: { merged: true, number: 7, html_url: "https://github.com/acme/site/pull/7", merge_commit_sha: "abc123", head: { ref: "patch-agent/1" } } });
    const sig = "sha256=" + createHmac("sha256", "whsec").update(body).digest("hex");
    const r = await POST(new Request("http://x", { method: "POST", body, headers: { "x-github-event": "pull_request", "x-hub-signature-256": sig } }));
    expect(r.status).toBe(200);
    const p = (await listProof()).find((x) => x.repository === "acme/site");
    expect(p?.github_url).toBe("https://github.com/acme/site/pull/7");
    expect(p?.commit_sha).toBe("abc123");
  });
});

describe("schema", () => {
  it("openapi lists every public endpoint", async () => {
    const { GET } = await import("@/app/api/v1/openapi/route");
    const j = await (await GET()).json();
    expect(Object.keys(j.paths)).toContain("/api/v1/proof");
    expect(j.openapi).toBe("3.1.0");
  });
  it("proof endpoint is labelled REAL", async () => {
    const { GET } = await import("@/app/api/v1/proof/route");
    const j = await (await GET()).json();
    expect(j.dataMode).toBe("REAL");
  });
});
