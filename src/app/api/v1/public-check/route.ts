import { checkPublicRepository } from "@/lib/public-repo";
import { savePublicCheck } from "@/lib/public-check-history";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Read-only analysis of a user-supplied public GitHub repository. Never records, writes, or opens a PR. */
export async function GET(req: Request) {
  const repository = new URL(req.url).searchParams.get("repo") ?? "";
  try {
    const check = await checkPublicRepository(repository);
    return json(await savePublicCheck(check));
  } catch (error) {
    return json({ error: String(error).replace(/^Error: /, "") }, { status: 400 });
  }
}
