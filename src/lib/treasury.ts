/**
 * Read-only treasury view. Only a PUBLIC address is configured; no key material exists
 * anywhere in this codebase. Expense categorisation is not yet live, so runway is reported
 * as unavailable rather than estimated.
 */
export type TreasuryView =
  | { state: "unconfigured" }
  | { state: "unavailable"; wallet: string; error: string }
  | {
      state: "live";
      wallet: string;
      network: string;
      balanceSol: number;
      retrievedAt: string;
      signatures: { signature: string; blockTime: string | null; explorerUrl: string; err: boolean }[];
      runwayDays: number | null;
      runwayNote: string;
    };

const ADDR_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const url = process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(6000),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`RPC HTTP ${r.status}`);
  const j = await r.json();
  if (j.error) throw new Error(`RPC ${j.error.message}`);
  return j.result as T;
}

export async function getTreasury(): Promise<TreasuryView> {
  const wallet = process.env.TREASURY_WALLET ?? "";
  if (!wallet) return { state: "unconfigured" };
  if (!ADDR_RE.test(wallet)) return { state: "unavailable", wallet, error: "configured address is not a valid base58 public key" };
  try {
    const [bal, sigs] = await Promise.all([
      rpc<{ value: number }>("getBalance", [wallet]),
      rpc<{ signature: string; blockTime: number | null; err: unknown }[]>("getSignaturesForAddress", [wallet, { limit: 20 }]),
    ]);
    return {
      state: "live",
      wallet,
      network: "solana-mainnet",
      balanceSol: bal.value / 1e9,
      retrievedAt: new Date().toISOString(),
      signatures: sigs.map((s) => ({
        signature: s.signature,
        blockTime: s.blockTime ? new Date(s.blockTime * 1000).toISOString() : null,
        explorerUrl: `https://explorer.solana.com/tx/${s.signature}`,
        err: Boolean(s.err),
      })),
      runwayDays: null,
      runwayNote: "Expense tracking is not live yet. Runway = liquid balance ÷ 30-day average daily operating cost; shown once 30 days of recorded expenses exist.",
    };
  } catch (e) {
    return { state: "unavailable", wallet, error: String(e) };
  }
}

export async function pingRpc(): Promise<void> {
  await rpc("getHealth", []);
}
