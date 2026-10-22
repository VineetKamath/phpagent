import { getTokenInfo } from "@/lib/token";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Current token contract address. Live updates arrive on /api/v1/stream as `config` events. */
export async function GET() {
  return json(await getTokenInfo());
}
