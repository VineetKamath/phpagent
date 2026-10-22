import { getStatus } from "@/lib/health";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";
export async function GET() {
  return json(await getStatus());
}
