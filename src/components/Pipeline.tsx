"use client";
import { useState } from "react";
import { useAgentStream } from "./useAgentStream";
import { STAGES } from "@/lib/stages";



export function Pipeline() {
  const [sel, setSel] = useState(0);
  const { events } = useAgentStream();
  const last = events[0];
  const active = last ? STAGES.findIndex((s) => s.events.includes(last.eventType)) : -1;

  return (
    <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
      <ol className="relative">
        <span aria-hidden className="absolute bottom-4 left-[11px] top-4 w-px bg-line" />
        {STAGES.map((s, i) => (
          <li key={s.name}>
            <button
              onClick={() => setSel(i)}
              aria-expanded={sel === i}
              className={`group relative flex w-full items-center gap-5 py-3 text-left transition-colors ${sel === i ? "text-paper" : "text-steel hover:text-paper"}`}
            >
              <span className={`relative z-10 grid h-6 w-6 place-items-center rounded-full border bg-ink font-mono text-[9px] transition-colors ${active === i ? "border-php text-php" : sel === i ? "border-paper" : "border-line"}`}>
                {active === i && <span className="absolute inset-0 animate-ping rounded-full border border-php/50" />}
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-xl tracking-tight md:text-2xl">{s.name}</span>
            </button>
            <p className={`ml-11 max-w-md pb-3 text-sm leading-relaxed text-steel lg:hidden ${sel === i ? "" : "hidden"}`}>{s.body}</p>
          </li>
        ))}
      </ol>
      <div className="hidden lg:block">
        <div className="sticky top-28 rounded-2xl border border-line bg-ink-2 p-8">
          <p className="eyebrow">Stage {String(sel + 1).padStart(2, "0")}</p>
          <h3 className="mt-4 text-3xl font-semibold tracking-tight">{STAGES[sel].name}</h3>
          <p className="mt-4 leading-relaxed text-steel">{STAGES[sel].body}</p>
          {STAGES[sel].events.length > 0 && (
            <p className="mt-6 font-mono text-xs text-dim">events: {STAGES[sel].events.join(", ")}</p>
          )}
          <p className="mt-6 border-t border-line pt-4 font-mono text-[11px] text-dim">
            {last ? <>last event: {last.eventType} <span className={last.dataMode === "DEMO" ? "text-amber" : "text-ok"}>[{last.dataMode}]</span></> : "no events received yet"}
          </p>
        </div>
      </div>
    </div>
  );
}
