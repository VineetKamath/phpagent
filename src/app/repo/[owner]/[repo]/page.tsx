import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listEvents, listPatches } from "@/lib/store";
import { readMode } from "@/lib/mode";
import { computeMetrics, formatDuration } from "@/lib/metrics";
import { ProofCard } from "@/components/ProofCard";
import { Badge, PageHead, fmtTime } from "@/components/ui";

export const dynamic = "force-dynamic";
const NAME = /^[A-Za-z0-9._-]{1,100}$/;

export async function generateMetadata({ params }: { params: Promise<{ owner: string; repo: string }> }): Promise<Metadata> {
  const { owner, repo } = await params;
  return { title: `${owner}/${repo}`, alternates: { canonical: `/repo/${owner}/${repo}` } };
}

export default async function Repo({ params, searchParams }: { params: Promise<{ owner: string; repo: string }>; searchParams: Promise<Record<string, string>> }) {
  const { owner, repo } = await params;
  if (!NAME.test(owner) || !NAME.test(repo)) notFound();
  const full = `${owner}/${repo}`;
  const mode = readMode(await searchParams);
  const patches = (await listPatches(mode)).filter((p) => p.repository === full);
  const auth = (await listEvents(mode, 2000)).find((e) => e.repositoryId === full && e.eventType.startsWith("policy."));
  const m = computeMetrics(patches);
  const lastOk = patches.find((p) => p.timeline.testsPassedAt)?.timeline.testsPassedAt ?? null;
  const demo = owner === "demo-org";

  return (
    <>
      <PageHead eyebrow="repository" title={<span className="break-all font-mono">{full}</span>} meta={[["authorization","GitHub App"],["policy",".patchbot (optional)"],["api","/api/v1/repos/:owner/:repo"]]} />
      <div className="mx-auto mt-12 max-w-[1560px] px-4 md:px-8 reveal">
        <div className="flex flex-wrap gap-3">{demo ? <Badge label="DEMO" /> : <Badge label="REAL" />}</div>
        <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-5">
          {[
            ["Authorization", auth ? (auth.eventType === "policy.authorized" ? "AUTHORIZED" : "DENIED") : "NOT OPTED IN"],
            ["Protection", auth?.eventType === "policy.authorized" ? "ACTIVE" : "INACTIVE"],
            ["Patches", String(m.patchAttempts)],
            ["Median time to patch", formatDuration(m.medianTimeToPatchMs)],
            ["Last verification", fmtTime(lastOk)],
          ].map(([k, v]) => <div key={k} className="bg-ink-2 p-5"><dt className="eyebrow text-[10px]!">{k}</dt><dd className="mt-2 font-mono text-sm">{v}</dd></div>)}
        </dl>
        <h2 className="eyebrow mt-14">Dependency inventory</h2>
        <ul className="mt-3 divide-y divide-line border-y border-line font-mono text-sm">
          {[...new Set(patches.map((p) => `${p.file} · ${p.change.from}`))].map((d) => <li key={d} className="py-3">{d}</li>)}
          {!patches.length && <li className="py-3 text-steel">No indexed runtime pins.</li>}
        </ul>
        <h2 className="eyebrow mt-14">Patch history</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">{patches.map((p) => <ProofCard key={p.id} p={p} />)}</div>
      </div>
    </>
  );
}
