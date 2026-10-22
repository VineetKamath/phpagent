import { php2shell } from "@/content/php2shell";
import { parseVersion, compare } from "./version";

export type ReleaseTable = {
  fixed: Record<string, string>;
  latest: Record<string, string>;
  source: "php.net" | "seed";
  retrievedAt: string;
  error?: string;
};

let cache: { at: number; data: ReleaseTable } | null = null;

/**
 * Latest release per branch from php.net. The PHP2Shell fixed table is seed data;
 * live data is exposed as `latest` and never lowers a fixed version.
 */
export async function getReleaseTable(): Promise<ReleaseTable> {
  if (cache && Date.now() - cache.at < 10 * 60_000) return cache.data;
  const latest: Record<string, string> = {};
  let data: ReleaseTable;
  try {
    const res = await fetch("https://www.php.net/releases/index.php?json&max=40&version=8", {
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`php.net HTTP ${res.status}`);
    const json = (await res.json()) as Record<string, unknown>;
    for (const k of Object.keys(json)) {
      const p = parseVersion(k);
      if (!p) continue;
      const b = `${p[0]}.${p[1]}`;
      const cur = latest[b] ? parseVersion(latest[b])! : null;
      if (!cur || compare(p, cur) > 0) latest[b] = p.join(".");
    }
    data = { fixed: php2shell.fixed, latest, source: "php.net", retrievedAt: new Date().toISOString() };
  } catch (e) {
    data = { fixed: php2shell.fixed, latest: {}, source: "seed", retrievedAt: new Date().toISOString(), error: String(e) };
  }
  cache = { at: Date.now(), data };
  return data;
}
