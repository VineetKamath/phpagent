import { php2shell } from "@/content/php2shell";
import { getReleaseTable } from "@/lib/php-releases";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Tracked advisories. Live provider data per CVE is at /api/v1/cves/:id. */
export async function GET() {
  const releases = await getReleaseTable();
  return json({
    tracked: php2shell.cves.map((c) => ({
      id: c.id,
      campaign: php2shell.name,
      cvssV4: c.cvssV4,
      disclosedAt: php2shell.disclosedAt,
      verification: php2shell.verification,
      fixedReleases: releases.fixed,
      detail: `/api/v1/cves/${c.id}`,
    })),
    releaseData: { source: releases.source, retrievedAt: releases.retrievedAt, latestPerBranch: releases.latest },
  });
}
