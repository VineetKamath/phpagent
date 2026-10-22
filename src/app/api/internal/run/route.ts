import { runAgent } from "@/lib/agent";
import { json } from "@/lib/http";
import { internalAuthorized } from "@/lib/internal-auth";
import { recheckPublicRepositories } from "@/lib/public-check-monitor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Backup trigger for the scheduler (external cron). Bearer INTERNAL_API_TOKEN. */
export async function POST(req: Request) {
  if (!process.env.INTERNAL_API_TOKEN) return json({ error: "internal API disabled" }, { status: 503 });
  if (!internalAuthorized(req.headers.get("authorization"))) return json({ error: "unauthorized" }, { status: 401 });
  const [summary, publicChecks] = await Promise.all([runAgent(), recheckPublicRepositories()]);
  return json({ ...summary, publicChecks }, { status: summary.skippedRun ? 409 : 200 });
}
