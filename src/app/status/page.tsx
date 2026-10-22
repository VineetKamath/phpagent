import type { Metadata } from "next";
import { getStatus } from "@/lib/health";
import { PageHead, StatusText, fmtTime } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "System status", description: "Computed health of every agent service and integration.", alternates: { canonical: "/status" } };

export default async function Status() {
  const s = await getStatus();
  return (
    <>
      <PageHead eyebrow="/status" title="System status." meta={[["probes","live, per request"],["cache","30s"],["database","SELECT 1"],["json","/status.json"]]}>
        Every value below is computed from a live probe or from configuration at request time. Machine-readable: <a className="font-mono text-sm text-php" href="/status.json">/status.json</a>.
      </PageHead>
      <div className="mx-auto mt-12 max-w-[1560px] px-4 md:px-8 reveal">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-4">
          {[
            ["Overall", <StatusText key="o" s={s.status} />],
            ["Version", `v${s.version}`],
            ["Deployment", s.deployment],
            ["Demo mode", s.demoMode ? "ON" : "OFF"],
          ].map(([k, v]) => (
            <div key={String(k)} className="bg-ink-2 p-5"><dt className="eyebrow text-[10px]!">{k}</dt><dd className="mt-2 truncate font-mono">{v}</dd></div>
          ))}
        </dl>

        <h2 className="eyebrow reveal mt-14 flex items-center gap-3"><span className="h-px w-8 bg-php" />Services</h2>
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {Object.entries(s.services).map(([k, v]) => (
            <li key={k} className="grid gap-2 py-4 md:grid-cols-[1.3fr_140px_1fr_110px_1fr] md:items-baseline md:gap-6">
              <span className="font-medium">{v.name}</span>
              <StatusText s={v.status} />
              <span className="text-sm text-steel">{v.detail}</span>
              <span className="font-mono text-xs text-dim">{v.latencyMs != null ? `${v.latencyMs} ms` : "n/a"}</span>
              <span className="font-mono text-xs text-dim">last ok {fmtTime(v.lastSuccess)}</span>
            </li>
          ))}
        </ul>

        <h2 className="eyebrow reveal mt-14 flex items-center gap-3"><span className="h-px w-8 bg-php" />Capabilities</h2>
        <ul className="reveal mt-4 flex flex-wrap gap-2">
          {Object.entries(s.capabilities).map(([k, v]) => (
            <li key={k} className={`flex items-center gap-3 rounded-full border px-4 py-2 font-mono text-sm ${v ? "border-ok/40 bg-ok/5" : "border-line bg-ink-2"}`}>
              <span>{k}</span>
              <span className={v ? "text-ok" : "text-steel"}>{v ? "true" : "false"}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 font-mono text-xs text-dim">checked {fmtTime(s.updatedAt)} · cached ≤ 30s · real patches recorded: {s.ledger.realPatches}</p>
      </div>
    </>
  );
}
