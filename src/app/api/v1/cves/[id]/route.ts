import { CVE_ID_RE, lookupCve } from "@/lib/providers";
import { php2shell } from "@/content/php2shell";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id.toUpperCase();
  if (!CVE_ID_RE.test(id)) return json({ error: "invalid CVE id" }, { status: 400 });
  const { cve, errors } = await lookupCve(id);
  const seed = php2shell.cves.find((c) => c.id === id);
  return json({
    id,
    providers: cve ? "found" : "not_found",
    record: cve,
    providerErrors: errors,
    seed: seed ? { ...seed, campaign: php2shell.name, verification: php2shell.verification, fixed: php2shell.fixed } : null,
  });
}
