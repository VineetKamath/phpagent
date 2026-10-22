// Seed data for the PHP2Shell incident. This is a FALLBACK. The version database
// prefers live php.net release data (see lib/php-releases.ts) and reports which it used.
export const php2shell = {
  name: "PHP2Shell",
  disclosedAt: "2026-10-21T00:00:00Z",
  verification: "VERIFIED" as "VERIFIED" | "VERIFYING",
  cves: [
    { id: "CVE-2026-109618", cvssV4: 9.2, sourceId: "nvd-cve-2026-109618" },
    { id: "CVE-2026-109619", cvssV4: 9.2, sourceId: "nvd-cve-2026-109619" },
  ],
  // branch -> first fixed release
  fixed: { "8.5": "8.5.12", "8.4": "8.4.27", "8.3": "8.3.36", "8.2": "8.2.35" } as Record<string, string>,
  unsupported: ["8.1", "8.0", "7.x", "5.x"],
  summary:
    "Critical vulnerabilities in the PHP runtime (php-src) in which certain fatal-error / out-of-memory paths could leave internal engine state unsafe for later request handling.",
};
