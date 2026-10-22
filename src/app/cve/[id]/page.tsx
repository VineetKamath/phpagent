import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CVE_ID_RE, lookupCve } from "@/lib/providers";
import { php2shell } from "@/content/php2shell";
import { listPatches } from "@/lib/store";
import { readMode } from "@/lib/mode";
import { ProofCard } from "@/components/ProofCard";
import { Badge, Cite, PageHead, fmtTime } from "@/components/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const id = (await params).id.toUpperCase();
  return { title: id, description: `Source data, affected versions and agent activity for ${id}.`, alternates: { canonical: `/cve/${id}` } };
}

export default async function Cve({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const id = (await params).id.toUpperCase();
  if (!CVE_ID_RE.test(id)) notFound();
  const [{ cve, errors }, sp] = await Promise.all([lookupCve(id), searchParams]);
  const seed = php2shell.cves.find((c) => c.id === id);
  const patches = (await listPatches(readMode(sp))).filter((p) => p.cveId === id);

  return (
    <>
      <PageHead eyebrow={seed ? `${php2shell.name} · advisory` : "advisory"} title={<span className="font-mono">{id}</span>} meta={[["providers","NVD · GHSA · KEV"],["fetched","per request"],["provenance","raw hash kept"],["exploit_details","never"]]} />
      <div className="mx-auto mt-12 grid max-w-[1560px] gap-12 px-4 md:px-8 lg:grid-cols-[1.4fr_1fr] reveal">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            {cve ? <Badge label="LIVE" /> : seed ? <Badge label="VERIFYING" /> : <Badge label="UNAVAILABLE" />}
            <span className="font-mono text-xs text-steel">{cve ? `provider data · ${cve.provenance.length} source(s)` : "No provider record found yet."}</span>
          </div>
          <h2 className="eyebrow mt-10">Official description</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-steel">{cve?.summary || (seed ? php2shell.summary + " (seed summary: provider record pending)" : "n/a")}</p>

          <dl className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-4">
            <div><dt className="eyebrow">Severity</dt><dd className="mt-1 font-mono">{cve?.severity ?? (seed ? "CRITICAL (seed)" : "n/a")}</dd></div>
            <div><dt className="eyebrow">CVSS</dt><dd className="mt-1 font-mono">{cve?.cvss ?? seed?.cvssV4 ?? "n/a"}</dd></div>
            <div><dt className="eyebrow">Published</dt><dd className="mt-1 font-mono text-sm">{fmtTime(cve?.published ?? (seed ? php2shell.disclosedAt : null))}</dd></div>
            <div><dt className="eyebrow">Modified</dt><dd className="mt-1 font-mono text-sm">{fmtTime(cve?.modified ?? null)}</dd></div>
          </dl>

          <h2 className="eyebrow mt-12">Affected packages / fixed versions</h2>
          <ul className="mt-3 divide-y divide-line border-y border-line font-mono text-sm">
            {cve?.affected.map((a, i) => <li key={i} className="py-3">{a.ecosystem} · {a.package} · {a.ranges.join(", ")}</li>)}
            {seed && Object.entries(php2shell.fixed).map(([b, v]) => <li key={b} className="flex justify-between py-3"><span>php {b}.x</span><span className="text-ok">fixed in {v}</span></li>)}
            {!cve?.affected.length && !seed && <li className="py-3 text-steel">-</li>}
          </ul>

          <h2 className="eyebrow mt-12">Agent activity</h2>
          <div className="mt-4 grid gap-4">{patches.length ? patches.map((p) => <ProofCard key={p.id} p={p} />) : <p className="text-sm text-steel">No patches recorded for this advisory.</p>}</div>
        </div>

        <aside className="space-y-8">
          <div className="rounded-2xl border border-line bg-ink-2 p-6">
            <p className="eyebrow">Provenance</p>
            <ul className="mt-4 space-y-4 font-mono text-xs">
              {cve?.provenance.map((p) => (
                <li key={p.provider + p.providerRecordId}>
                  <a className="text-php" href={p.sourceUrl} target="_blank" rel="noopener noreferrer">{p.provider.toUpperCase()} · {p.providerRecordId}</a>
                  <div className="mt-1 text-dim">retrieved {fmtTime(p.retrievedAt)}</div>
                  <div className="break-all text-dim">{p.rawHash.slice(0, 30)}…</div>
                </li>
              ))}
              {seed && <li>seed source <Cite id={seed.sourceId} /> · <Cite id="php-changelog-8" /></li>}
            </ul>
          </div>
          {errors.length > 0 && (
            <div className="rounded-2xl border border-amber/30 p-6">
              <p className="eyebrow text-amber!">Provider errors</p>
              <ul className="mt-3 space-y-1 font-mono text-xs text-steel">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
            </div>
          )}
          <p className="text-xs text-dim">This page never publishes exploit details. Data freshness: fetched at request time.</p>
        </aside>
      </div>
    </>
  );
}
