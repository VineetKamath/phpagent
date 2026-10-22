import { agentState } from "@/lib/agent";
import { githubAppConfigured, githubWritesEnabled } from "@/lib/github";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Worker telemetry for this process: whether it is running and what the last run did. */
export async function GET() {
  return json({
    ...agentState(),
    schedule: "*/15 * * * *",
    schedulerEnabled: process.env.SCHEDULER_ENABLED !== "false" && githubAppConfigured(),
    githubAppConfigured: githubAppConfigured(),
    githubWritesEnabled: githubWritesEnabled(),
  });
}
