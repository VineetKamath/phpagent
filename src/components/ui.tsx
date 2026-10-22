import Link from "next/link";
import { sourceById } from "@/content/sources";

export type Label = "REAL" | "DEMO" | "SIMULATED" | "VERIFYING" | "UNAVAILABLE" | "STALE" | "LIVE" | "SEED" | "VERIFIED";
const tone: Record<Label, string> = {
  REAL: "border-ok/40 text-ok",
  LIVE: "border-ok/40 text-ok",
  VERIFIED: "border-ok/40 text-ok",
  DEMO: "border-amber/50 text-amber bg-amber/5",
  SIMULATED: "border-amber/50 text-amber bg-amber/5",
  VERIFYING: "border-php/50 text-php",
  SEED: "border-php/40 text-php",
  STALE: "border-amber/40 text-amber",
  UNAVAILABLE: "border-line text-steel",
};

export function Badge({ label, className = "" }: { label: Label; className?: string }) {
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-[0.12em] ${tone[label]} ${className}`}>{label}</span>;
}

const sTone: Record<string, string> = {
  operational: "text-ok", degraded: "text-amber", unavailable: "text-crit", down: "text-crit", disabled: "text-steel", not_configured: "text-steel", demo: "text-amber",
};
export function StatusText({ s }: { s: string }) {
  return <span className={`font-mono text-xs tracking-[0.1em] ${sTone[s] ?? "text-steel"}`}>{s.replace("_", " ").toUpperCase()}</span>;
}

/** Inline citation. Unverified sources render as VERIFYING and are not linked. */
export function Cite({ id, n }: { id: string; n?: number }) {
  const s = sourceById(id);
  if (!s) return null;
  const mark = <sup className="ml-0.5 font-mono text-[10px] text-php">[{n ?? s.id}]</sup>;
  return s.url && s.verified ? (
    <a href={s.url} target="_blank" rel="noopener noreferrer" title={`${s.publisher}: ${s.title}`} className="no-underline!">{mark}</a>
  ) : (
    <Link href="/sources" title={`${s.title}: verification pending`}>{mark}<span className="sr-only"> (verification pending)</span></Link>
  );
}

export function Section({ n, title, children, id }: { n: string; title: React.ReactNode; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="mx-auto max-w-[1560px] px-4 pt-24 md:px-8 md:pt-32">
      <p className="eyebrow reveal flex items-center gap-3"><span className="h-px w-8 bg-php" />{n}</p>
      <h2 className="h-section reveal mt-5 max-w-[16ch]" style={{ "--i": 1 } as React.CSSProperties}>{title}</h2>
      <div className="reveal mt-10" style={{ "--i": 2 } as React.CSSProperties}>{children}</div>
    </section>
  );
}

/** Page hero band shared by every inner page. `meta` renders as a PHP array of real facts about the page. */
export function PageHead({ eyebrow, title, children, meta, aside }: { eyebrow: string; title: React.ReactNode; children?: React.ReactNode; meta?: [string, React.ReactNode][]; aside?: React.ReactNode }) {
  const d = (i: number) => ({ "--i": i }) as React.CSSProperties;
  return (
    <header className="relative isolate overflow-hidden border-b border-line">
      <div className="grid-bg absolute inset-0 -z-10" />
      <div className="glow-php absolute inset-0 -z-10 opacity-80" />
      <div className="mx-auto grid max-w-[1560px] items-center gap-10 px-4 py-14 md:px-8 md:py-20 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <p className="eyebrow load flex items-center gap-3 text-php!"><span className="h-px w-8 bg-php" />{eyebrow}</p>
          <h1 className="mt-6 text-[clamp(36px,4.8vw,80px)] font-semibold leading-[0.98] tracking-[-0.04em]">
            <span className="mask-load" style={d(1)}><span>{title}</span></span>
          </h1>
          {children && <div className="load mt-7 max-w-2xl text-lg leading-relaxed text-steel" style={d(3)}>{children}</div>}
        </div>
        {aside ?? (meta && (
          <pre className="load w-full overflow-x-auto rounded-2xl border border-line bg-ink/70 p-5 font-mono text-[13px] leading-[1.9] shadow-[0_30px_80px_-40px_rgba(119,123,180,.6)] backdrop-blur lg:justify-self-end lg:max-w-md" style={d(4)}>
            <span className="block text-dim">{"<?php"}</span>
            <span className="block text-steel">$page = [</span>
            {meta.map(([k, v]) => (
              <span key={k} className="block pl-5">
                <span className="text-php-glow">&quot;{k}&quot;</span> <span className="text-dim">=&gt;</span> <span className="text-ok">{v}</span><span className="text-dim">,</span>
              </span>
            ))}
            <span className="text-steel">];</span>
          </pre>
        ))}
      </div>
    </header>
  );
}

export function KV({ k, v, mono = true }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="eyebrow text-[10px]!">{k}</dt>
      <dd className={`mt-1 truncate ${mono ? "font-mono text-sm" : ""}`}>{v}</dd>
    </div>
  );
}

export const fmtTime = (iso: string | null) => (iso ? new Date(iso).toISOString().replace("T", " ").slice(0, 19) + "Z" : "n/a");
