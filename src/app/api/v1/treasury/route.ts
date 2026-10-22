import { getTreasury } from "@/lib/treasury";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";
export async function GET() {
  return json(await getTreasury());
}
