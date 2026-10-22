import { listPatches, listEvents } from "@/lib/store";
import { readMode } from "@/lib/mode";
import { json } from "@/lib/http";
import { computeMetrics } from "@/lib/metrics";

export const dynamic = "force-dynamic";
export async function GET(req: Request, { params }: { params: Promise<{ owner: string; repo: string }> }) {
  const { owner, repo } = await params;
  const full = `${owner}/${repo}`;
  const mode = readMode(new URL(req.url).searchParams);
  const patches = (await listPatches(mode)).filter((p) => p.repository === full);
  const auth = (await listEvents(mode, 2000)).find((e) => e.repositoryId === full && e.eventType.startsWith("policy."));
  return json({
    repository: full,
    authorization: auth ? { status: auth.eventType === "policy.authorized" ? "authorized" : "denied", at: auth.timestamp, dataMode: auth.dataMode } : { status: "unknown" },
    patches,
    metrics: computeMetrics(patches),
  });
}
