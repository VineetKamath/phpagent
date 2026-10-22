import { brand } from "@/content/brand";
import { getSetting, setSetting } from "./store";

export const CA_KEY = "contract_address";
// Solana public keys are 32 bytes → 32–44 base58 chars. Anything longer (e.g. an 88-char secret key) is rejected.
const ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export const isAddress = (v: string) => ADDRESS_RE.test(v);

export type TokenInfo = { contractAddress: string | null; network: string; explorerUrl: string | null; updatedAt: string | null; source: "database" | "env" | "none" };

/** Database value wins (set at runtime with `npm run ca`); the build-time env var is a fallback. */
export async function getTokenInfo(): Promise<TokenInfo> {
  let row: { value: string; updatedAt: string } | null = null;
  try {
    row = await getSetting(CA_KEY);
  } catch {
    // database unreachable: fall back to env
  }
  const env = brand.contractAddress && isAddress(brand.contractAddress) ? brand.contractAddress : "";
  const ca = row ? row.value : env;
  return {
    contractAddress: ca || null,
    network: brand.network,
    explorerUrl: ca ? `https://explorer.solana.com/address/${ca}` : null,
    updatedAt: row?.updatedAt ?? null,
    source: row ? "database" : env ? "env" : "none",
  };
}

/** Empty string clears the address (header shows NOT LAUNCHED). */
export async function setContractAddress(value: string): Promise<void> {
  const v = value.trim();
  if (v && !isAddress(v)) throw new Error("not a Solana public address (expected 32–44 base58 characters)");
  await setSetting(CA_KEY, v);
}
