"use client";
import { useMemo, useState } from "react";
import { useAgentStream } from "./useAgentStream";
import { Badge } from "./ui";
import type { AgentEvent } from "@/lib/types";

const cat = (t: string) => t.split(".")[0].replace("advisory", "ADVISORY").replace("match", "MATCH").replace("policy", "POLICY").replace("patch", "PATCH").replace("pr", "GITHUB").replace("review", "REVIEW").replace("treasury", "TREASURY").toUpperCase();
const time = (iso: string) => new Date(iso).toISOString().slice(11, 23);

export function LiveConsole({ version }: { version: string }) {
  const { events, state } = useAgentStream();
  const [open, setOpen] = useState<string | null>(null);
  const freshness = events[0] ? Math.max(0, Math.round((Date.now() - new Date(events[0].timestamp).getTime()) / 1000)) : null;

  const lanes = useMemo(() => {
    const cves = [...new Set(events.map((e) => e.cveId).filter(Boolean))].slice(0, 4) as string[];
    const repos = [...new Set(events.map((e) => e.repositoryId).filter(Boolean))].slice(0, 5) as string[];
    return { cves, repos };
  }, [events]);

  return (
    <div>
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-4">
        {[
          ["Event stream", state === "live" ? "LIVE" : state.toUpperCase(), state === "live" ? "text-ok" : "text-amber"],
          ["Pipeline version", `v${version}`, ""],
          ["Data freshness", freshness == null ? "n/a" : `${freshness}s`, ""],
          ["Events received", String(events.length), ""],
        ].map(([k, v, c]) => (
          <div key={k} className="bg-ink-2 p-4">
            <dt className="eyebrow text-[10px]!">{k}</dt>
            <dd className={`mt-1 font-mono text-lg ${c}`}>{v}</dd>
          </div>
        ))}
      </dl>

      {/* trace: advisories → agent → repositories */}
      <div className="mt-8 hidden grid-cols-[1fr_160px_1fr] items-stretch gap-6 md:grid" aria-hidden>
        <div className="space-y-2">
          <p className="eyebrow">Advisories</p>
          {lanes.cves.length ? lanes.cves.map((c) => <div key={c} className="rounded-full border border-line px-3 py-1.5 font-mono text-xs">{c}</div>) : <p className="text-xs text-dim">none yet</p>}
        </div>
        <div className="relative grid place-items-center rounded-2xl border border-php/30 bg-php/5">
          <span className="font-mono text-xs text-php">agent</span>
          {events[0] && <span key={events[0].id} className="rise absolute bottom-3 font-mono text-[10px] text-steel">{events[0].eventType}</span>}
        </div>
        <div className="space-y-2">
          <p className="eyebrow">Repositories</p>
          {lanes.repos.length ? lanes.repos.map((r) => {
            const hit = events[0]?.repositoryId === r;
            return <div key={r} className={`truncate rounded-full border px-3 py-1.5 font-mono text-xs transition-colors ${hit ? "border-php text-paper" : "border-line text-steel"}`}>{r}</div>;
          }) : <p className="text-xs text-dim">none yet</p>}
        </div>
      </div>

      <ol className="mt-8 divide-y divide-line rounded-xl border border-line" aria-live="polite" aria-relevant="additions">
        {events.length === 0 && (
          <li className="p-8 text-center text-sm text-steel">
            {state === "live" ? "Connected. No agent events have been recorded yet." : "Connecting to event stream…"}
          </li>
        )}
        {events.slice(0, 60).map((e) => (
          <EventRow key={e.id} e={e} open={open === e.id} onToggle={() => setOpen(open === e.id ? null : e.id)} />
        ))}
      </ol>
    </div>
  );
}

function EventRow({ e, open, onToggle }: { e: AgentEvent; open: boolean; onToggle: () => void }) {
  return (
    <li className="rise">
      <button onClick={onToggle} aria-expanded={open} className="grid w-full grid-cols-[92px_1fr] items-baseline gap-x-4 gap-y-1 px-4 py-3 text-left hover:bg-ink-2 md:grid-cols-[110px_96px_1fr_auto]">
        <span className="font-mono text-[11px] text-dim">{time(e.timestamp)}</span>
        <span className={`font-mono text-[11px] tracking-[0.1em] ${e.status === "warn" ? "text-amber" : e.status === "error" ? "text-crit" : "text-php"}`}>{cat(e.eventType)}</span>
        <span className="col-span-2 min-w-0 break-words text-sm md:col-span-1">{e.message}</span>
        <Badge label={e.dataMode} className="col-start-2 w-fit md:col-start-auto" />
      </button>
      {open && (
        <pre className="overflow-x-auto bg-ink-2 px-4 py-3 font-mono text-[11px] leading-relaxed text-steel">{JSON.stringify(e, null, 2)}</pre>
      )}
    </li>
  );
}
