import { listProof } from "@/lib/proof";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";
/** REAL records only, in every environment. */
export async function GET() {
  return json({ dataMode: "REAL", records: await listProof() });
}
