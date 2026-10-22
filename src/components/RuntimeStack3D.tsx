"use client";
import { useEffect, useRef, useState } from "react";

export type Phase = "normal" | "fault" | "patched";
type Props = { phase?: Phase; spread?: number; focus?: number | null; auto?: boolean; className?: string };

/**
 * Isometric CSS-3D model of a PHP request stack. Pure transforms (no WebGL).
 * Layer 0 is the container image, the layer the agent actually patches.
 */
const LAYERS = [
  { key: "container", label: "CONTAINER IMAGE", sub: (p: Phase) => (p === "patched" ? "php:8.4.27-fpm" : "php:8.4.26-fpm") },
  { key: "memory", label: "REQUEST MEMORY", sub: () => "zend_mm heap" },
  { key: "engine", label: "ZEND ENGINE", sub: () => "compile · opcache · execute" },
  { key: "fpm", label: "PHP-FPM POOL", sub: () => "pm = dynamic" },
  { key: "web", label: "WEB SERVER", sub: () => "nginx → fastcgi :9000" },
  { key: "request", label: "$request", sub: () => "GET /checkout" },
];
const AUTO: Phase[] = ["normal", "normal", "fault", "patched", "patched"];

export function RuntimeStack3D({ phase: phaseProp, spread: spreadProp, focus = null, auto = false, className = "" }: Props) {
  const [tick, setTick] = useState(0);
  const [tilt, setTilt] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!auto || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setTick((x) => x + 1), 2600);
    const onMove = (e: PointerEvent) => setTilt((e.clientX / window.innerWidth - 0.5) * 10);
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      clearInterval(t);
      window.removeEventListener("pointermove", onMove);
    };
  }, [auto]);

  const phase = phaseProp ?? AUTO[tick % AUTO.length];
  const spread = spreadProp ?? 0.6;
  const gap = 22 + spread * 64;

  return (
    <div ref={ref} className={`relative [perspective:1800px] ${className}`} aria-hidden>
      <div
        className="absolute left-1/2 top-1/2 [transform-style:preserve-3d]"
        style={{ transform: `translate(-50%, calc(-50% + ${gap * 2.1}px)) rotateX(58deg) rotateZ(${-40 + tilt}deg)`, transition: "transform .8s cubic-bezier(.2,.7,.2,1)", width: "var(--s)", height: "var(--s)", ["--gap" as string]: `${gap}px` }}
      >
        {LAYERS.map((l, i) => {
          const hot = (phase === "fault" && (l.key === "memory" || l.key === "container")) || focus === i;
          const ok = phase === "patched" && (l.key === "memory" || l.key === "container");
          const border = ok ? "rgba(98,201,154,.85)" : phase === "fault" && hot ? (l.key === "container" ? "rgba(239,106,99,.9)" : "rgba(240,180,90,.9)") : focus === i ? "rgba(169,176,255,.95)" : "rgba(136,146,191,.6)";
          const bg = ok ? "rgba(98,201,154,.10)" : phase === "fault" && hot ? "rgba(240,180,90,.10)" : `rgba(119,123,180,${0.07 + i * 0.025})`;
          return (
            <div
              key={l.key}
              className="absolute inset-0 rounded-[14px] [transform-style:preserve-3d]"
              style={{
                transform: `translateZ(${i * gap}px)`,
                transition: "transform 1s cubic-bezier(.2,.7,.2,1), border-color .6s, background .6s",
                border: `1px solid ${border}`,
                background: bg,
                boxShadow: `0 0 0 1px rgba(12,13,22,.6) inset, 0 ${18 + i * 4}px 50px rgba(0,0,0,.45)${hot || ok ? `, 0 0 40px ${ok ? "rgba(98,201,154,.25)" : "rgba(240,180,90,.22)"}` : ""}`,
              }}
            >
              <div className="absolute left-[7%] top-[7%] font-mono text-[11px] font-semibold leading-tight tracking-[0.14em] text-paper">
                {l.label}
                <div className={`mt-1 text-[10px] font-normal tracking-[0.06em] ${ok ? "text-ok" : phase === "fault" && l.key === "container" ? "text-crit" : "text-steel"}`}>{l.sub(phase)}</div>
              </div>
              {l.key === "fpm" && (
                <div className="absolute bottom-[10%] left-[7%] right-[7%] grid grid-cols-5 gap-[4%]">
                  {[1, 2, 3, 4, 5].map((w) => (
                    <div key={w} className={`aspect-square rounded-md border ${w === 3 && phase === "fault" ? "border-amber/80 bg-amber/20" : "border-php/50 bg-php/10"}`} />
                  ))}
                </div>
              )}
              {l.key === "memory" && (
                <div className="absolute bottom-[10%] left-[7%] right-[7%] grid grid-cols-8 gap-[3%]">
                  {Array.from({ length: 24 }, (_, c) => {
                    const bad = phase === "fault" && [5, 6, 13].includes(c);
                    return <div key={c} className={`h-2.5 rounded-sm transition-colors duration-700 ${bad ? "bg-crit/80" : ok ? "bg-ok/40" : c % 5 === 0 ? "bg-php/50" : "bg-php/20"}`} />;
                  })}
                </div>
              )}
              {l.key === "engine" && (
                <div className="absolute bottom-[12%] left-[7%] right-[7%] flex gap-[4%] font-mono text-[8px] text-steel">
                  {["lexer", "AST", "opcodes", "VM"].map((x) => <span key={x} className="flex-1 rounded border border-line bg-ink/40 py-1 text-center">{x}</span>)}
                </div>
              )}
              {l.key === "container" && (
                <div className="absolute bottom-[12%] left-[7%] right-[7%] font-mono text-[9px] text-steel">
                  <div className="rounded border border-line bg-ink/50 px-2 py-1.5">
                    FROM php:<span className={ok ? "text-ok" : phase === "fault" ? "text-crit" : "text-paper"}>{ok ? "8.4.27" : "8.4.26"}</span>-fpm
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {/* request packet travelling down the stack */}
        <div
          className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-php-glow shadow-[0_0_18px_4px_rgba(169,176,255,.7)] motion-reduce:hidden"
          style={{ ["--top" as string]: `${5 * gap}px`, animation: "descend 2.6s cubic-bezier(.5,0,.5,1) infinite" }}
        />
      </div>
    </div>
  );
}
