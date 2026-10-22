import { json } from "@/lib/http";
import { listPublicChecks } from "@/lib/public-check-history";

export const dynamic = "force-dynamic";

/** Completed /check inspections only. These are read-only findings, never patches. */
export async function GET() {
  return json({ checks: await listPublicChecks(), mode: "read-only", note: "No App authorization, source write, branch, or pull request is associated with these checks." });
}
