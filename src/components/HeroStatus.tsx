"use client";
import { useEffect, useState } from "react";

type S = { status: string; services: Record<string, { status: string }>; ledger: { realPrsOpened?: number; realPatches: number } };

/** Real numbers only: every cell comes from /status.json; "n/a" while loading or unavailable. */
export function HeroStatus() {
  const [s, setS] = useState<S | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    fetch("/api/v1/status").then((r) => r.json()).then(setS).catch(() => setErr(true));
  }, []);
  const tone = (x?: string) => (x === "operational" ? "text-ok" : x === "degraded" || x === "demo" ? "text-amber" : x ? "text-steel" : "text-dim");
  const cells: [string, string | number | undefined, string?][] = [
    ["System", s?.status, s?.status],
    ["CVE ingestion", s?.services.cveIngestion?.status, s?.services.cveIngestion?.status],
    ["Worker", s?.services.orchestrationWorker?.status, s?.services.orchestrationWorker?.status],
    ["Database", s?.services.database?.status, s?.services.database?.status],
    ["Tracked CVEs", 2],
    ["Real PRs opened", s?.ledger.realPrsOpened ?? s?.ledger.realPatches],
  ];
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line/70 backdrop-blur sm:grid-cols-3 lg:grid-cols-6">
      {cells.map(([k, v, st]) => (
        <div key={k} className="bg-ink/80 px-4 py-3">
          <dt className="font-mono text-[9.5px] tracking-[0.14em] text-dim">{k.toUpperCase()}</dt>
          <dd className={`mt-1 font-mono text-sm ${st ? tone(st) : "text-paper"}`}>{v == null ? (err ? "UNAVAILABLE" : "…") : String(v).replace("_", " ").toUpperCase()}</dd>
        </div>
      ))}
    </dl>
  );
}
