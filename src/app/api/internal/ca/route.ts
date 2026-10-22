import { internalAuthorized } from "@/lib/internal-auth";
import { getTokenInfo, setContractAddress } from "@/lib/token";
import { json } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Set or clear the contract address at runtime. Used by `npm run ca`. Bearer INTERNAL_API_TOKEN. */
export async function POST(req: Request) {
  if (!process.env.INTERNAL_API_TOKEN) return json({ error: "internal API disabled" }, { status: 503 });
  if (!internalAuthorized(req.headers.get("authorization"))) return json({ error: "unauthorized" }, { status: 401 });
  let address: unknown;
  try {
    address = (await req.json()).address;
  } catch {
    return json({ error: "body must be JSON: {\"address\": \"...\"}" }, { status: 400 });
  }
  if (typeof address !== "string") return json({ error: "address must be a string (empty to clear)" }, { status: 400 });
  try {
    await setContractAddress(address);
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 422 });
  }
  return json(await getTokenInfo());
}
