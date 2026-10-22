import { brand } from "@/content/brand";
import { getStatus } from "./health";
import { getTokenInfo } from "./token";

export async function projectInfo() {
  const [s, token] = await Promise.all([getStatus(), getTokenInfo()]);
  const u = (p: string) => new URL(p, brand.siteUrl).toString();
  return {
    name: brand.brandName,
    description: brand.description,
    canonicalUrl: brand.siteUrl,
    sourceRepository: brand.github || null,
    apiVersion: "v1",
    currentRelease: brand.version,
    deployment: s.deployment,
    lastUpdated: s.updatedAt,
    demoMode: s.demoMode,
    documentation: { api: u("/docs/api"), openapi: u("/openapi.json"), methodology: u("/methodology"), llms: u("/llms.txt") },
    whitepaper: u("/whitepaper"),
    securityPolicy: u("/security"),
    statusEndpoint: u("/status.json"),
    proofEndpoint: u("/api/v1/proof"),
    sources: u("/sources"),
    supportedCapabilities: ["advisory-ingestion", "repository-matching", "deterministic-php-version-remediation", "pull-request-creation", "ci-verification", "public-proof-ledger", "read-only-treasury"],
    operationalCapabilities: s.capabilities,
    githubApp: brand.githubApp || null,
    treasury: { network: brand.network, publicWallet: brand.wallet || null, live: s.capabilities.liveTreasury },
    token: { contractAddress: token.contractAddress, explorerUrl: token.explorerUrl, endpoint: u("/api/v1/token") },
    doesNot: ["generate exploits or payloads", "scan arbitrary hosts or URLs", "open PRs on repositories that have not opted in", "push to default branches", "hold private keys"],
  };
}
