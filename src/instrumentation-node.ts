/**
 * Runs once when the Node server starts. Schedules the agent every 15 minutes in-process.
 * Assumes a single instance; /api/internal/run is the external backup trigger and
 * runAgent() is single-flight, so overlapping triggers are harmless.
 */
export async function startScheduler() {
  if (process.env.SCHEDULER_ENABLED === "false") return;
  const { schedule } = await import("node-cron");
  const { recheckPublicRepositories } = await import("./lib/public-check-monitor");
  const recheck = () => void recheckPublicRepositories()
    .then((summary) => console.log("[public-checks] hourly recheck", summary))
    .catch((error) => console.error("[public-checks] recheck failed", error));
  // Poll due work; each repository becomes due one hour after its last successful check.
  schedule("*/15 * * * *", recheck, { name: "public-repository-checks", noOverlap: true });
  setTimeout(recheck, 15_000);
  const { githubAppConfigured } = await import("./lib/github");
  if (!githubAppConfigured()) {
    console.log("[agent] scheduler not started: GitHub App not configured");
    return;
  }
  const { runAgent } = await import("./lib/agent");
  const run = () =>
    void runAgent()
      .then((s) => console.log(`[agent] run: ${s.repositories} repos, ${s.prsOpened.length} PRs, ${s.errors.length} errors${s.skippedRun ? " (skipped)" : ""}`))
      .catch((e) => console.error("[agent] run crashed", e));
  schedule("*/15 * * * *", run, { name: "patch-agent", noOverlap: true });
  setTimeout(run, 15_000);
  console.log("[agent] scheduler started: every 15 minutes");
}
