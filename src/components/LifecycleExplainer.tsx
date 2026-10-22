"use client";
import { useState } from "react";

const STEPS = ["Browser", "Web server", "PHP worker", "Request memory", "Application", "Memory cleaned", "Response"];

const FRAMES = [
  {
    t: "Normal request",
    body: "A request arrives, a PHP worker takes it, allocates memory for that one request, runs the application, then cleans the memory before the next request. Each request should start from a clean state.",
  },
  {
    t: "The problem",
    body: "Certain fatal-error and out-of-memory conditions could leave internal PHP state in an unsafe condition. A later request handled by the same worker could encounter state that should no longer have been usable.",
  },
  {
    t: "Why it mattered",
    body: "That is a memory-safety failure. Depending on the affected path and environment, the disclosed vulnerabilities could allow severe outcomes, including exposure of sensitive memory and remote code execution.",
  },
  {
    t: "The fix",
    body: "PHP released patched versions for supported branches. The correct defensive action is to update to a fixed release. Unsupported branches need migration or vendor-maintained packages.",
  },
];

export function LifecycleExplainer() {
  const [f, setF] = useState(0);
  return (
    <div className="grid gap-10 md:grid-cols-[1fr_1.1fr] md:gap-16">
      <div>
        <div role="tablist" aria-label="PHP2Shell explained" className="flex flex-wrap gap-2">
          {FRAMES.map((fr, i) => (
            <button
              key={fr.t}
              role="tab"
              aria-selected={f === i}
              aria-controls={`frame-${i}`}
              onClick={() => setF(i)}
              className={`rounded-full border px-3 py-1 font-mono text-xs transition-colors ${f === i ? "border-php text-paper" : "border-line text-steel hover:text-paper"}`}
            >
              {String(i + 1).padStart(2, "0")} {fr.t}
            </button>
          ))}
        </div>
        {FRAMES.map((fr, i) => (
          <div key={fr.t} id={`frame-${i}`} role="tabpanel" hidden={f !== i} className="rise mt-8">
            <h3 className="text-3xl font-semibold tracking-tight md:text-4xl">{fr.t}</h3>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-steel">{fr.body}</p>
          </div>
        ))}
        <p className="mt-8 text-xs text-dim">Conceptual explanation only. No payloads, request crafting or exploitation steps are published here.</p>
      </div>

      <ol aria-hidden className="relative space-y-2">
        {STEPS.map((s, i) => {
          const isMem = i === 3 || i === 5;
          const bad = (f === 1 || f === 2) && i === 5;
          const stale = (f === 1 || f === 2) && i === 3;
          const fixed = f === 3;
          return (
            <li key={s} className="flex items-center gap-4">
              <span className="w-6 text-right font-mono text-[10px] text-dim">0x{(i + 1).toString(16).padStart(2, "0")}</span>
              <span
                className={`flex-1 rounded-full border px-4 py-2.5 font-mono text-sm transition-all duration-500 ${
                  bad ? "border-crit/70 text-crit" : stale ? "border-amber/70 bg-amber/5 text-amber" : fixed && isMem ? "border-ok/60 text-ok" : "border-line text-paper"
                }`}
              >
                {bad ? "Memory NOT fully reset" : stale && f === 2 ? "Stale state reused by later request" : s}
              </span>
            </li>
          );
        })}
        <li className="pt-4 font-mono text-xs tracking-[0.12em]">
          {f === 0 && <span className="text-steel">STATE CLEAN</span>}
          {(f === 1 || f === 2) && <span className="text-amber">UNSAFE STATE DETECTED</span>}
          {f === 3 && <span className="text-ok">PATCH APPLIED · SAFE RUNTIME VERSION</span>}
        </li>
      </ol>
    </div>
  );
}
