import { getPatch } from "@/lib/store";
import { readMode } from "@/lib/mode";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const p = await getPatch((await params).id, readMode(new URL(req.url).searchParams));
  return p ? json(p) : json({ error: "not found" }, { status: 404 });
}
