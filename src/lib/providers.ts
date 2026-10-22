import { createHash } from "node:crypto";
import type { NormalizedCve } from "./types";

/** rawHash covers the provider record itself (not the envelope), so it changes only when the record does.
 * All provider output is untrusted text; it is rendered as plain text only, never as HTML. */
export interface CVEProvider {
  name: NormalizedCve["provenance"][number]["provider"];
  fetchById(id: string): Promise<NormalizedCve | null>;
  ping(): Promise<void>;
}

const hash = (s: string) => "sha256:" + createHash("sha256").update(s).digest("hex");
const clean = (s: unknown, max = 2000) => String(s ?? "").replace(/[\u0000-\u001f]/g, " ").slice(0, max);
const T = () => AbortSignal.timeout(6000);

export const nvd: CVEProvider = {
  name: "nvd",
  async ping() {
    const r = await fetch("https://services.nvd.nist.gov/rest/json/cves/2.0/?resultsPerPage=1", { signal: T(), headers: nvdHeaders(), cache: "no-store" });
    if (!r.ok) throw new Error(`NVD HTTP ${r.status}`);
  },
  async fetchById(id) {
    const r = await fetch(`https://services.nvd.nist.gov/rest/json/cves/2.0/?cveId=${encodeURIComponent(id)}`, { signal: T(), headers: nvdHeaders(), cache: "no-store" });
    if (!r.ok) throw new Error(`NVD HTTP ${r.status}`);
    const text = await r.text();
    const j = JSON.parse(text);
    const c = j.vulnerabilities?.[0]?.cve;
    if (!c) return null;
    const m = c.metrics?.cvssMetricV40?.[0]?.cvssData ?? c.metrics?.cvssMetricV31?.[0]?.cvssData;
    return {
      id: c.id,
      summary: clean(c.descriptions?.find((d: { lang: string }) => d.lang === "en")?.value),
      severity: m?.baseSeverity ?? null,
      cvss: m?.baseScore ?? null,
      published: c.published ?? null,
      modified: c.lastModified ?? null,
      affected: [],
      provenance: [{ provider: "nvd", providerRecordId: c.id, sourceUrl: `https://nvd.nist.gov/vuln/detail/${c.id}`, retrievedAt: new Date().toISOString(), rawHash: hash(JSON.stringify(c)) }],
    };
  },
};

function nvdHeaders(): HeadersInit {
  return process.env.NVD_API_KEY ? { apiKey: process.env.NVD_API_KEY } : {};
}

function ghHeaders(): HeadersInit {
  const h: Record<string, string> = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

export const ghsa: CVEProvider = {
  name: "ghsa",
  async ping() {
    const r = await fetch("https://api.github.com/advisories?per_page=1", { signal: T(), headers: ghHeaders(), cache: "no-store" });
    if (!r.ok) throw new Error(`GitHub HTTP ${r.status}`);
  },
  async fetchById(id) {
    const r = await fetch(`https://api.github.com/advisories?cve_id=${encodeURIComponent(id)}`, { signal: T(), headers: ghHeaders(), cache: "no-store" });
    if (!r.ok) throw new Error(`GitHub HTTP ${r.status}`);
    const text = await r.text();
    const a = JSON.parse(text)?.[0];
    if (!a) return null;
    return {
      id,
      summary: clean(a.summary),
      severity: a.severity ?? null,
      cvss: a.cvss?.score ?? null,
      published: a.published_at ?? null,
      modified: a.updated_at ?? null,
      affected: (a.vulnerabilities ?? []).map((v: { package?: { ecosystem?: string; name?: string }; vulnerable_version_range?: string }) => ({
        ecosystem: clean(v.package?.ecosystem, 40),
        package: clean(v.package?.name, 200),
        ranges: [clean(v.vulnerable_version_range, 200)],
      })),
      provenance: [{ provider: "ghsa", providerRecordId: a.ghsa_id, sourceUrl: a.html_url, retrievedAt: new Date().toISOString(), rawHash: hash(JSON.stringify(a)) }],
    };
  },
};

const KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";
export const cisaKev: CVEProvider = {
  name: "cisa-kev",
  async ping() {
    const r = await fetch(KEV_URL, { method: "HEAD", signal: T(), cache: "no-store" });
    if (!r.ok) throw new Error(`CISA HTTP ${r.status}`);
  },
  async fetchById(id) {
    const r = await fetch(KEV_URL, { signal: T(), next: { revalidate: 3600 } });
    if (!r.ok) throw new Error(`CISA HTTP ${r.status}`);
    const text = await r.text();
    const v = JSON.parse(text).vulnerabilities?.find((x: { cveID: string }) => x.cveID === id);
    if (!v) return null;
    return {
      id,
      summary: clean(v.shortDescription),
      severity: null,
      cvss: null,
      published: v.dateAdded ?? null,
      modified: null,
      affected: [{ ecosystem: "vendor", package: clean(`${v.vendorProject} ${v.product}`, 200), ranges: [] }],
      provenance: [{ provider: "cisa-kev", providerRecordId: id, sourceUrl: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog", retrievedAt: new Date().toISOString(), rawHash: hash(JSON.stringify(v)) }],
    };
  },
};

export const providers = [nvd, ghsa, cisaKev];

/** Merge results from every provider; provenance is retained per provider. Failures are reported, not hidden. */
export async function lookupCve(id: string): Promise<{ cve: NormalizedCve | null; errors: string[] }> {
  const results = await Promise.allSettled(providers.map((p) => p.fetchById(id)));
  const errors: string[] = [];
  let merged: NormalizedCve | null = null;
  results.forEach((r, i) => {
    if (r.status === "rejected") return void errors.push(`${providers[i].name}: ${String(r.reason)}`);
    const c = r.value;
    if (!c) return;
    if (!merged) merged = { ...c };
    else {
      merged.summary ||= c.summary;
      merged.severity ??= c.severity;
      merged.cvss ??= c.cvss;
      merged.affected.push(...c.affected);
      merged.provenance.push(...c.provenance);
    }
  });
  return { cve: merged, errors };
}

export const CVE_ID_RE = /^CVE-\d{4}-\d{4,7}$/;
