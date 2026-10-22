import { brand } from "@/content/brand";
import { getStatus } from "@/lib/health";
import { php2shell } from "@/content/php2shell";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getStatus();
  const u = (p: string) => new URL(p, brand.siteUrl).toString();
  const svc = Object.values(s.services).map((x) => `- ${x.name}: ${x.status}`).join("\n");
  const text = `# ${brand.brandName}

> ${brand.description}

## Purpose
Reduce the time between a public vulnerability disclosure and a tested fix in open-source repositories that have explicitly opted in.

## What it does
- Ingests advisories from NVD, GitHub Security Advisories and CISA KEV, keeping provenance (provider, record id, URL, retrieval time, raw hash).
- Matches pinned PHP runtime versions in Dockerfiles, compose files, CI workflows and composer.json config.platform.
- Generates deterministic version-bump patches; validates them against a file allowlist, diff-size limit, secret and dangerous-content checks.
- Opens a pull request on a new branch only when the repository installed the GitHub App and its .patchbot policy permits it.
- Publishes REAL actions with external verification URLs at /proof.

## What it does NOT do
- No exploit, payload or proof-of-concept generation.
- No scanning of arbitrary hosts, URLs or private systems.
- No pull requests to repositories that have not opted in. No pushes to default branches.
- No private keys are held by the website.

## Operational status (computed ${s.updatedAt})
Overall: ${s.status}
Demo mode: ${s.demoMode}
GitHub writes enabled: ${s.capabilities.githubWrite}
Live treasury: ${s.capabilities.liveTreasury}
Durable persistence: ${s.capabilities.durablePersistence}
Real patches recorded: ${s.ledger.realPatches}
${svc}

## Evidence
- Status (JSON): ${u("/status.json")}
- Project (JSON): ${u("/project.json")}
- Proof ledger: ${u("/proof")} and ${u("/api/v1/proof")}
- OpenAPI: ${u("/openapi.json")}
- Methodology: ${u("/methodology")}
- Sources: ${u("/sources")}
- Whitepaper: ${u("/whitepaper")}
- Security: ${u("/security")}

## Data labelling
Records carry dataMode REAL or DEMO. DEMO records are produced only when the server runs with DEMO_MODE=true and are never included in /api/v1/proof.
PHP2Shell facts (CVE-2026-109618, CVE-2026-109619, fixed releases): ${php2shell.verification} against NVD and php.net; see ${u("/sources")}. Third-party research write-ups are not cited until confirmed.

## Contact
${brand.securityContact}

Version ${brand.version}, deployment ${s.deployment}.
`;
  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
