import type { Metadata } from "next";
import Link from "next/link";
import { listProof } from "@/lib/proof";
import { PageHead, fmtTime } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Proof ledger", description: "Public, REAL-only verification ledger of every agent action, with external evidence links.", alternates: { canonical: "/proof" } };

const FILTERS: [string, (k: string) => boolean][] = [
  ["all", () => true],
  ["patches", (k) => k.startsWith("patch.")],
  ["prs", (k) => k === "pr.opened"],
  ["merges", (k) => k === "pr.merged"],
  ["ci", (k) => k.startsWith("patch.tests")],
  ["treasury", (k) => k.startsWith("treasury.")],
  ["advisories", (k) => k.startsWith("advisory.")],
];

export default async function Proof({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const f = (await searchParams).f ?? "all";
  const pred = FILTERS.find(([n]) => n === f)?.[1] ?? (() => true);
  const rows = (await listProof()).filter((r) => pred(r.kind));

  return (
    <>
      <PageHead eyebrow="/proof" title={<>Don&apos;t trust the agent. Verify it.</>} meta={[["mode","REAL only"],["requires","external url"],["hash","sha256 per row"],["api","/api/v1/proof"]]}>
        Only REAL records with an external verification URL appear here, in every environment. Machine-readable: <a className="font-mono text-sm text-php" href="/api/v1/proof">/api/v1/proof</a>.
      </PageHead>
      <div className="mx-auto mt-12 max-w-[1560px] px-4 md:px-8 reveal">
        <nav aria-label="Filter" className="flex flex-wrap gap-2 font-mono text-xs">
          {FILTERS.map(([n]) => (
            <Link key={n} href={`?f=${n}`} aria-current={f === n ? "true" : undefined} className={`rounded-full border px-3 py-1 uppercase ${f === n ? "border-php text-paper" : "border-line text-steel hover:text-paper"}`}>{n}</Link>
          ))}
        </nav>
        {rows.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-line p-12 text-center">
            <p className="font-mono text-sm text-steel">LEDGER EMPTY</p>
            <p className="mx-auto mt-3 max-w-md text-sm text-dim">No verifiable real-world action has been recorded yet. This page stays empty until there is something you can check on GitHub or on-chain.</p>
          </div>
        ) : (
          <div className="mt-10 overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="eyebrow text-[10px]! border-b border-line">
                <tr>{["timestamp", "kind", "cve", "repository", "commit / signature", "evidence", "data hash"].map((h) => <th key={h} className="px-4 py-3 font-normal">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-line font-mono text-xs">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 text-steel">{fmtTime(r.timestamp)}</td>
                    <td className="px-4 py-3">{r.kind}</td>
                    <td className="px-4 py-3">{r.cve_id ?? "n/a"}</td>
                    <td className="px-4 py-3">{r.repository ?? "n/a"}</td>
                    <td className="px-4 py-3">{(r.commit_sha ?? r.transaction_signature ?? "n/a").slice(0, 12)}</td>
                    <td className="px-4 py-3"><a className="text-php hover:underline" href={r.source_url!} target="_blank" rel="noopener noreferrer">open →</a></td>
                    <td className="px-4 py-3 text-dim" title={r.data_hash}>{r.data_hash.slice(7, 19)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
