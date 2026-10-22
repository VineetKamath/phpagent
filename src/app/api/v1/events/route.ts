import { listEvents } from "@/lib/store";
import { readMode } from "@/lib/mode";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const mode = readMode(sp);
  const limit = Math.min(500, Math.max(1, Number(sp.get("limit")) || 100));
  return json({ mode, events: await listEvents(mode, limit) });
}
