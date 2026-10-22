"use client";
import { useEffect, useRef, useState } from "react";
import { RuntimeStack3D, type Phase } from "./RuntimeStack3D";

const STEPS: { k: string; t: string; body: string; phase: Phase; focus: number | null }[] = [
  { k: "01 · Request", t: "A request enters the stack.", body: "The browser hits the web server, which hands the request to PHP-FPM over FastCGI. One worker takes it, so every request runs in an isolated worker process.", phase: "normal", focus: 3 },
  { k: "02 · Execute", t: "PHP allocates memory for that request.", body: "The Zend Engine compiles the script to opcodes (cached by OPcache) and runs them, allocating from the per-request heap. When the request ends, that memory should be reset.", phase: "normal", focus: 1 },
  { k: "03 · PHP2Shell", t: "A fatal error leaves memory unsafe.", body: "Certain out-of-memory and fatal-error paths could leave request memory in an uninitialised state. The next request served by the same worker could then read or act on it. That is a memory-safety bug in the runtime, so every app on top inherits it.", phase: "fault", focus: null },
  { k: "04 · Patch", t: "The fix lives in the bottom layer.", body: "Application code doesn't change. The container image does: php:8.4.26-fpm becomes php:8.4.27-fpm. That one deterministic line is exactly what the agent opens a pull request for.", phase: "patched", focus: 0 },
];

/** Sticky scroll-driven explanation. Text stays in the DOM for crawlers and screen readers. */
export function ScrollStory() {
  const ref = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const total = r.height - window.innerHeight;
        setP(Math.min(1, Math.max(0, -r.top / Math.max(1, total))));
      });
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      cancelAnimationFrame(raf);
    };
  }, []);
  const step = Math.min(STEPS.length - 1, Math.floor(p * STEPS.length));
  const s = STEPS[step];

  return (
    <section ref={ref} className="relative h-[280vh]" aria-label="How a PHP request works, and where PHP2Shell broke it">
      <div className="sticky top-14 flex h-[calc(100vh-3.5rem)] items-center overflow-hidden">
        <div className="grid-bg absolute inset-0" />
        <div className="glow-php absolute inset-0 opacity-70" />
        <div className="relative mx-auto grid w-full max-w-[1560px] items-center gap-6 px-4 md:grid-cols-[1fr_1.1fr] md:px-8">
          <div className="order-2 md:order-1">
            <div className="mb-6 flex gap-1.5" aria-hidden>
              {STEPS.map((_, i) => <span key={i} className={`h-1 flex-1 rounded-full transition-colors duration-500 ${i <= step ? (STEPS[i].phase === "fault" ? "bg-amber" : STEPS[i].phase === "patched" ? "bg-ok" : "bg-php") : "bg-line"}`} />)}
            </div>
            <ol className="relative min-h-[260px] md:min-h-[300px]">
              {STEPS.map((x, i) => (
                <li key={x.k} className="absolute inset-0 transition-all duration-700" style={{ opacity: i === step ? 1 : 0, transform: `translateY(${(i - step) * 24}px)` }} aria-current={i === step ? "step" : undefined}>
                  <p className={`font-mono text-xs tracking-[0.14em] ${x.phase === "fault" ? "text-amber" : x.phase === "patched" ? "text-ok" : "text-php"}`}>{x.k}</p>
                  <h3 className="mt-4 text-[clamp(30px,4.2vw,60px)] font-semibold leading-[0.98] tracking-[-0.035em]">{x.t}</h3>
                  <p className="mt-5 max-w-lg text-base leading-relaxed text-steel md:text-lg">{x.body}</p>
                </li>
              ))}
            </ol>
            <p className="mt-4 font-mono text-[10px] text-dim">conceptual model · no exploit details</p>
          </div>
          <RuntimeStack3D className="order-1 h-[42vh] [--s:clamp(180px,26vw,330px)] md:order-2 md:h-[70vh]" phase={s.phase} focus={s.focus} spread={Math.min(1, p * 2.4)} />
        </div>
      </div>
    </section>
  );
}
