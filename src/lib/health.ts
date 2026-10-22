import { brand } from "@/content/brand";
import { nvd, ghsa, cisaKev } from "./providers";
import { githubAppConfigured, githubWritesEnabled, pingApp } from "./github";
import { pingRpc } from "./treasury";
import { isDemoEnv, listEvents, listPatches, persistence, pingDatabase } from "./store";
import { agentState } from "./agent";
import { getReleaseTable } from "./php-releases";

export type ServiceStatus = "operational" | "degraded" | "unavailable" | "disabled" | "demo" | "not_configured";
export type Service = {
  name: string;
  status: ServiceStatus;
  latencyMs: number | null;
  checkedAt: string;
  lastSuccess: string | null;
  source: string | null;
  detail: string;
};

async function probe(name: string, source: string | null, fn: () => Promise<unknown>): Promise<Service> {
  const t = Date.now();
  try {
    await fn();
    return { name, status: "operational", latencyMs: Date.now() - t, checkedAt: new Date().toISOString(), lastSuccess: new Date().toISOString(), source, detail: "probe succeeded" };
  } catch (e) {
    return { name, status: "unavailable", latencyMs: Date.now() - t, checkedAt: new Date().toISOString(), lastSuccess: null, source, detail: String(e).slice(0, 200) };
  }
}

const fixed = (name: string, status: ServiceStatus, detail: string, source: string | null = null): Service => ({
  name, status, latencyMs: null, checkedAt: new Date().toISOString(), lastSuccess: null, source, detail,
});

let cache: { at: number; data: StatusReport } | null = null;

export type StatusReport = Awaited<ReturnType<typeof computeStatus>>;

async function computeStatus() {
  const demo = isDemoEnv();
  const releases = await getReleaseTable();
  const [nvdS, ghS, kevS, appS, rpcS] = await Promise.all([
    probe("CVE ingestion (NVD)", "https://services.nvd.nist.gov", () => nvd.ping()),
    probe("GitHub reader (advisories API)", "https://api.github.com", () => ghsa.ping()),
    probe("CISA KEV feed", "https://www.cisa.gov", () => cisaKev.ping()),
    githubAppConfigured() ? probe("GitHub App", "https://api.github.com/app", pingApp) : Promise.resolve(fixed("GitHub App", "not_configured", "GITHUB_APP_ID / private key not set")),
    process.env.TREASURY_WALLET ? probe("Treasury RPC", process.env.SOLANA_RPC_URL ?? "solana mainnet", pingRpc) : Promise.resolve(fixed("Treasury RPC", "not_configured", "no public treasury wallet configured")),
  ]);
  const dbS = persistence() === "postgres" ? await probe("Database (Postgres)", "DATABASE_URL", pingDatabase) : fixed("Database", "degraded", "DATABASE_URL not set: in-memory ledger, records are lost on restart");
  const dbOk = dbS.status === "operational" || persistence() === "memory";
  const [realEvents, realPatches] = dbOk ? await Promise.all([listEvents("REAL", 1), listPatches("REAL")]) : [[], []];
  const a = agentState();
  const fresh = a.lastRunAt != null && Date.now() - new Date(a.lastRunAt).getTime() < 35 * 60_000;
  const workerS: Service = !githubAppConfigured()
    ? fixed("Orchestration worker", "not_configured", "requires GitHub App credentials")
    : a.lastRunAt == null
      ? fixed("Orchestration worker", "degraded", a.running ? "first run in progress" : "no completed run since this process started")
      : { ...fixed("Orchestration worker", a.lastOk && fresh ? "operational" : "degraded", `${a.lastOk ? "last run ok" : "last run had errors"}${fresh ? "" : " · last run older than 35 min"}: ${a.lastSummary?.repositories ?? 0} repos, ${a.lastSummary?.prsOpened.length ?? 0} PRs`), lastSuccess: a.lastOk ? a.lastRunAt : null };
  const services = {
    cveIngestion: nvdS,
    githubReader: ghS,
    cisaKev: kevS,
    phpReleases: { ...fixed("PHP release index", releases.source === "php.net" ? "operational" : "degraded", releases.source === "php.net" ? "live php.net data" : `using seed data: ${releases.error ?? ""}`, "https://www.php.net/releases/"), lastSuccess: releases.source === "php.net" ? releases.retrievedAt : null },
    repositoryMatcher: fixed("Repository matcher", demo ? "demo" : "operational", "deterministic matcher for Dockerfile, compose, CI and composer.json (in-process)"),
    patchGenerator: fixed("Patch generator", demo ? "demo" : "operational", "deterministic PHP version bump with safety validator"),
    orchestrationWorker: workerS,
    ciVerifier: githubAppConfigured() && process.env.GITHUB_WEBHOOK_SECRET ? fixed("CI verifier", appS.status === "operational" ? "operational" : "degraded", "check_suite / check_run webhooks aggregated via GitHub App") : fixed("CI verifier", "not_configured", "requires GitHub App and GITHUB_WEBHOOK_SECRET"),
    githubApp: appS,
    githubWriter: fixed("GitHub writer", githubWritesEnabled() ? "operational" : "disabled", githubWritesEnabled() ? "branch + PR creation enabled" : "writes disabled (GITHUB_WRITES_ENABLED != true or App not configured)"),
    treasuryIndexer: rpcS,
    realtimeStream: fixed("Realtime stream (SSE)", "operational", "in-process event bus"),
    database: dbS,
    isolatedRunner: fixed("Isolated test runner", "not_configured", "repository tests run in the target repository's own CI; no repository code executes on this server"),
  };
  const values = Object.values(services);
  const critical = [nvdS, ghS];
  const overall: "operational" | "degraded" | "down" = critical.every((s) => s.status === "unavailable") ? "down" : values.some((s) => s.status === "unavailable" || s.status === "degraded") ? "degraded" : "operational";
  return {
    project: brand.brandName,
    status: overall,
    updatedAt: new Date().toISOString(),
    version: brand.version,
    deployment: process.env.DEPLOYMENT_ID || process.env.RENDER_GIT_COMMIT?.slice(0, 7) || process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local",
    demoMode: demo,
    services,
    capabilities: {
      githubRead: ghS.status === "operational",
      githubWrite: githubWritesEnabled(),
      automatedPatchGeneration: true,
      automatedPullRequests: githubWritesEnabled(),
      liveTreasury: rpcS.status === "operational",
      durablePersistence: dbS.status === "operational" && persistence() === "postgres",
      autonomousWorker: workerS.status === "operational",
    },
    ledger: {
      realPatches: realPatches.length,
      realPrsOpened: realPatches.filter((p) => p.prUrl).length,
      latestRealEvent: realEvents[0]?.timestamp ?? null,
    },
  };
}

export async function getStatus(): Promise<StatusReport> {
  if (cache && Date.now() - cache.at < 30_000) return cache.data;
  const data = await computeStatus();
  cache = { at: Date.now(), data };
  return data;
}
