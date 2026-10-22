import type { Metadata } from "next";
import Link from "next/link";
import { listPatches } from "@/lib/store";
import { readMode } from "@/lib/mode";
import { ProofCard } from "@/components/ProofCard";
import { PageHead } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Patches", description: "Engineering history of every patch attempt.", alternates: { canonical: "/patches" } };

const FILTERS = { data: ["all", "real", "demo"], state: ["all", "merged", "open", "failed"] } as const;

export default async function Patches({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const data = sp.data ?? "all";
  const state = sp.state ?? "all";
  let ps = await listPatches(readMode(sp));
  if (data === "real") ps = ps.filter((p) => p.dataMode === "REAL");
  if (data === "demo") ps = ps.filter((p) => p.dataMode === "DEMO");
  if (state === "merged") ps = ps.filter((p) => p.stage === "merged");
  if (state === "open") ps = ps.filter((p) => p.stage === "pr_opened");
  if (state === "failed") ps = ps.filter((p) => ["failed", "review_required", "closed", "policy_blocked"].includes(p.stage));
  const q = (k: string, v: string) => `?${new URLSearchParams({ data, state, [k]: v })}`;

  return (
    <>
      <PageHead eyebrow="/patches" title="Patch history." meta={[["id","fingerprint(repo, edits)"],["writes","patch-agent/* only"],["failures","shown, not hidden"],["api","/api/v1/patches"]]}>Every attempt, including failures and the ones handed to human review.</PageHead>
      <div className="mx-auto mt-12 max-w-[1560px] px-4 md:px-8 reveal">
        <nav aria-label="Filters" className="flex flex-wrap gap-6 font-mono text-xs">
          {(Object.keys(FILTERS) as (keyof typeof FILTERS)[]).map((k) => (
            <div key={k} className="flex flex-wrap gap-2">
              {FILTERS[k].map((v) => {
                const on = (k === "data" ? data : state) === v;
                return <Link key={v} href={q(k, v)} aria-current={on ? "true" : undefined} className={`rounded-full border px-3 py-1 uppercase ${on ? "border-php text-paper" : "border-line text-steel hover:text-paper"}`}>{v}</Link>;
              })}
            </div>
          ))}
        </nav>
        {ps.length ? (
          <div className="mt-10 grid gap-4 lg:grid-cols-2">{ps.map((p) => <ProofCard key={p.id} p={p} />)}</div>
        ) : (
          <p className="mt-10 rounded-2xl border border-dashed border-line p-12 text-center font-mono text-sm text-steel">NO PATCHES MATCH · real patches appear after a PR exists on GitHub</p>
        )}
      </div>
    </>
  );
}
