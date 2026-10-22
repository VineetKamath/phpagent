import { listPatches } from "@/lib/store";
import { readMode } from "@/lib/mode";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const mode = readMode(new URL(req.url).searchParams);
  return json({ mode, patches: await listPatches(mode) });
}
