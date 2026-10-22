import { listPatches } from "@/lib/store";
import { readMode } from "@/lib/mode";
import { computeMetrics } from "@/lib/metrics";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const mode = readMode(new URL(req.url).searchParams);
  return json({ mode, metrics: computeMetrics(await listPatches(mode)), note: "Computed from recorded timestamps only. null = no data." });
}
