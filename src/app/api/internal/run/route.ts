import { timingSafeEqual } from "node:crypto";
import { runAgent } from "@/lib/agent";
import { json } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(header: string | null): boolean {
  const token = process.env.INTERNAL_API_TOKEN;
  if (!token || token.length < 16 || !header?.startsWith("Bearer ")) return false;
  const a = Buffer.from(header.slice(7));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Backup trigger for the scheduler (external cron). Bearer INTERNAL_API_TOKEN. */
export async function POST(req: Request) {
  if (!process.env.INTERNAL_API_TOKEN) return json({ error: "internal API disabled" }, { status: 503 });
  if (!authorized(req.headers.get("authorization"))) return json({ error: "unauthorized" }, { status: 401 });
  const summary = await runAgent();
  return json(summary, { status: summary.skippedRun ? 409 : 200 });
}
