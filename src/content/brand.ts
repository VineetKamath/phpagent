// Single source of truth for naming. Edit here to rebrand the whole product.
export const brand = {
  brandName: "Patch Agent",
  shortName: "PATCH",
  agentName: "patch-agent",
  ticker: "", // e.g. "$PATCH": left empty until a token actually exists
  tagline: "Software breaks. The patch shouldn't wait.",
  description:
    "An autonomous defensive agent that watches critical software disclosures, identifies affected opted-in open-source projects, generates defensive fixes and proves every patch publicly.",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  wallet: process.env.TREASURY_WALLET ?? "",
  // Token contract address. Empty until a token actually exists; the header then shows NOT LAUNCHED.
  contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "",
  network: "solana-mainnet",
  github: process.env.NEXT_PUBLIC_GITHUB_REPO || "https://github.com/VineetKamath/phpagent",
  githubApp: process.env.NEXT_PUBLIC_GITHUB_APP_URL ?? "",
  securityContact: process.env.NEXT_PUBLIC_SECURITY_CONTACT ?? "security@example.org",
  socials: {} as Record<string, string>,
  version: "0.1.0",
};
