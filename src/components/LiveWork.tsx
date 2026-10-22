"use client";
import { useEffect, useRef, useState } from "react";
import { useAgentStream } from "./useAgentStream";
import type { Patch } from "@/lib/types";
import type { computeMetrics } from "@/lib/metrics";
import { formatDuration } from "@/lib/metrics";
import { ProofCard } from "./ProofCard";

type M = ReturnType<typeof computeMetrics>;

/** Re-reads patches and metrics whenever the shared stream delivers an event. */
function useLedger() {
  const { events } = useAgentStream();
  const [patches, setPatches] = useState<Patch[] | null>(null);
  const [metrics, setMetrics] = useState<M | null>(null);
  const [err, setErr] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const head = events[0]?.id;
  useEffect(() => {
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => {
      Promise.all([fetch("/api/v1/patches").then((r) => r.json()), fetch("/api/v1/metrics").then((r) => r.json())])
        .then(([p, m]) => {
          setPatches(p.patches);
          setMetrics(m.metrics);
          setErr(false);
        })
        .catch(() => setErr(true));
    }, 250);
  }, [head]);
  return { patches, metrics, err };
}

export function LiveWork({ limit = 3 }: { limit?: number }) {
  const { patches, err } = useLedger();
  if (err) return <p className="text-sm text-amber">Patch ledger temporarily unavailable.</p>;
  if (!patches) return <div className="h-48 animate-pulse rounded-2xl border border-line bg-ink-2" aria-label="Loading patches" />;
  if (!patches.length)
    return (
      <div className="rounded-2xl border border-dashed border-line p-10 text-center">
        <p className="font-mono text-sm text-steel">NO PATCHES RECORDED YET</p>
        <p className="mt-2 text-sm text-dim">Real patches appear here only after a PR exists on GitHub.</p>
      </div>
    );
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {patches.slice(0, limit).map((p) => <ProofCard key={p.id} p={p} compact />)}
    </div>
  );
}

export function MetricsStrip() {
  const { metrics } = useLedger();
  const v = (x: number | null | undefined, f: (n: number) => string = String) => (x == null || metrics == null ? "n/a" : f(x));
  const items: [string, string][] = [
    ["Authorized repositories", v(metrics?.authorizedRepositories)],
    ["Patch attempts", v(metrics?.patchAttempts)],
    ["Verified patches", v(metrics?.verifiedPatches)],
    ["PRs opened", v(metrics?.prsOpened)],
    ["PRs merged", v(metrics?.prsMerged)],
    ["Median time to patch", v(metrics?.medianTimeToPatchMs, formatDuration)],
    ["Success rate", v(metrics?.successRate, (n) => `${Math.round(n * 100)}%`)],
    ["Compute / merge", v(metrics?.computePerMerge)],
  ];
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-4">
      {items.map(([k, val]) => (
        <div key={k} className="bg-ink p-5">
          <dt className="eyebrow text-[10px]!">{k}</dt>
          <dd className="mt-2 font-mono text-2xl tracking-tight">{val}</dd>
        </div>
      ))}
    </dl>
  );
}
