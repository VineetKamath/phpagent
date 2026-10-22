"use client";
import { useState } from "react";
import { planFile } from "@/lib/patcher";
import { validateChange } from "@/lib/safety";
import { php2shell } from "@/content/php2shell";

const SAMPLES: Record<string, string> = {
  Dockerfile: "FROM php:8.4.26-fpm-alpine\nRUN docker-php-ext-install pdo_mysql opcache\nCOPY . /var/www/html\n",
  "docker-compose.yml": "services:\n  app:\n    image: php:8.3.35-apache\n    ports: [\"8080:80\"]\n",
  ".github/workflows/ci.yml": "jobs:\n  test:\n    steps:\n      - uses: shivammathur/setup-php@v2\n        with:\n          php-version: '8.2.34'\n",
  "composer.json": '{\n  "require": { "php": "^8.2" },\n  "config": { "platform": { "php": "8.2.30" } }\n}\n',
  "Dockerfile (8.1)": "FROM php:8.1.30-apache\n",
};

/** Runs the production planner and validator on your input, in your browser. Nothing is sent. */
export function PatcherPlayground() {
  const [name, setName] = useState("Dockerfile");
  const [src, setSrc] = useState(SAMPLES.Dockerfile);
  const path = name.replace(" (8.1)", "");
  const plan = planFile(path, src, php2shell.fixed);
  const verdict = plan.kind === "change" ? validateChange(plan.change) : null;
  const before = src.split("\n");
  const after = plan.kind === "change" ? plan.change.after.split("\n") : before;

  return (
    <div className="grid overflow-hidden rounded-3xl border border-line bg-ink-2/80 lg:grid-cols-2">
      <div className="border-b border-line p-5 md:p-7 lg:border-b-0 lg:border-r">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Sample file">
          {Object.keys(SAMPLES).map((k) => (
            <button key={k} role="tab" aria-selected={name === k} onClick={() => { setName(k); setSrc(SAMPLES[k]); }} className={`rounded-full border px-3 py-1 font-mono text-[11px] ${name === k ? "border-php bg-php/10 text-paper" : "border-line text-steel hover:text-paper"}`}>{k}</button>
          ))}
        </div>
        <label htmlFor="pg" className="sr-only">File content</label>
        <textarea id="pg" value={src} onChange={(e) => setSrc(e.target.value)} spellCheck={false} rows={9} className="mt-4 w-full resize-y rounded-xl border border-line bg-ink p-4 font-mono text-[13px] leading-relaxed outline-none focus:border-php" />
        <p className="mt-2 text-[11px] text-dim">Edit freely. This is the same planFile() and validateChange() code the agent runs, executing in your browser.</p>
      </div>
      <div className="p-5 md:p-7" aria-live="polite">
        <div className="flex items-center gap-3">
          <span className={`rounded-full border px-3 py-1 font-mono text-[11px] tracking-[0.1em] ${plan.kind === "change" ? (verdict?.ok ? "border-ok/50 text-ok" : "border-crit/50 text-crit") : plan.kind === "review" ? "border-amber/50 text-amber" : "border-line text-steel"}`}>
            {plan.kind === "change" ? (verdict?.ok ? "PATCH · VALIDATED" : "PATCH · REJECTED") : plan.kind === "review" ? "HUMAN REVIEW REQUIRED" : "NO CHANGE"}
          </span>
          <span className="font-mono text-[11px] text-dim">{path}</span>
        </div>
        <pre className="mt-4 max-h-64 overflow-auto rounded-xl border border-line bg-ink p-4 font-mono text-[12.5px] leading-relaxed">
          {before.map((l, i) => after[i] !== l ? (
            <span key={i} className="block"><span className="block bg-crit/10 text-crit">- {l}</span><span className="block bg-ok/10 text-ok">+ {after[i]}</span></span>
          ) : <span key={i} className="block text-steel">  {l}</span>)}
        </pre>
        <ul className="mt-4 space-y-1.5 text-sm text-steel">
          {plan.kind !== "change" && <li>{plan.reason}.</li>}
          {plan.kind === "change" && plan.change.edits.map((e, i) => <li key={i}><span className="font-mono text-paper">{e.from}</span> → <span className="font-mono text-ok">{e.to}</span>{e.line ? ` (line ${e.line})` : ""}</li>)}
          {verdict && !verdict.ok && verdict.reasons.map((r) => <li key={r} className="text-crit">✕ {r}</li>)}
          {verdict?.ok && <li className="text-ok">✓ allowlisted file · in-place edit · ≤ 20 lines · no secrets · no shell</li>}
        </ul>
      </div>
    </div>
  );
}
