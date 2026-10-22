"use client";
import { useMemo, useState } from "react";
import { zones, nodes, edges, type ArchNode } from "@/content/architecture";

const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
const zoneTone = {
  untrusted: { stroke: "#ef6a63", fill: "rgba(239,106,99,.035)" },
  external: { stroke: "#62678f", fill: "rgba(98,103,143,.05)" },
  trusted: { stroke: "#777bb4", fill: "rgba(119,123,180,.07)" },
  public: { stroke: "#62c99a", fill: "rgba(98,201,154,.05)" },
};

function path(a: ArchNode, b: ArchNode) {
  const ax = a.x + a.w / 2, ay = a.y + a.h / 2, bx = b.x + b.w / 2, by = b.y + b.h / 2;
  if (Math.abs(bx - ax) > Math.abs(by - ay)) {
    const sx = bx > ax ? a.x + a.w : a.x, ex = bx > ax ? b.x : b.x + b.w, mx = (sx + ex) / 2;
    return `M${sx} ${ay} C${mx} ${ay}, ${mx} ${by}, ${ex} ${by}`;
  }
  const sy = by > ay ? a.y + a.h : a.y, ey = by > ay ? b.y : b.y + b.h, my = (sy + ey) / 2;
  return `M${ax} ${sy} C${ax} ${my}, ${bx} ${my}, ${bx} ${ey}`;
}

export function ArchitectureDiagram() {
  const [sel, setSel] = useState("orch");
  const [hover, setHover] = useState<string | null>(null);
  const active = hover ?? sel;
  const linked = useMemo(() => new Set(edges.filter(([a, b]) => a === active || b === active).flatMap((e) => e)), [active]);
  const n = byId[active];

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <div className="overflow-x-auto rounded-2xl border border-line bg-ink/60">
        <svg viewBox="0 0 1240 760" className="w-full min-w-[980px]" role="img" aria-label="System architecture: public sources and triggers feed the agent, which reads opted-in GitHub repositories, opens pull requests and publishes evidence">
          <defs>
            <marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L8 4 L0 8z" fill="#8892bf" /></marker>
          </defs>
          {zones.map((z) => (
            <g key={z.id}>
              <rect x={z.x} y={z.y} width={z.w} height={z.h} rx="16" fill={zoneTone[z.tone].fill} stroke={zoneTone[z.tone].stroke} strokeOpacity=".45" strokeDasharray={z.tone === "trusted" ? "0" : "5 5"} />
              <text x={z.x + 14} y={z.y - 14} fill={zoneTone[z.tone].stroke} fontSize="11" letterSpacing="1.6" className="font-mono">{z.label}</text>
              <text x={z.x + z.w - 14} y={z.y - 14} textAnchor="end" fill="#62678f" fontSize="10" className="font-mono">{z.note}</text>
            </g>
          ))}
          {edges.map(([a, b]) => {
            const on = linked.has(a) && linked.has(b) && (a === active || b === active);
            const d = path(byId[a], byId[b]);
            return (
              <g key={a + b} style={{ opacity: on ? 1 : 0.28, transition: "opacity .3s" }}>
                <path d={d} fill="none" stroke="#4f5b93" strokeWidth="1.2" markerEnd="url(#arrow)" />
                <path d={d} fill="none" stroke={on ? "#a9b0ff" : "#8892bf"} strokeWidth={on ? 2 : 1.2} className="flow motion-reduce:hidden" />
              </g>
            );
          })}
          {nodes.map((x) => {
            const on = x.id === active;
            const near = linked.has(x.id);
            return (
              <g
                key={x.id}
                tabIndex={0}
                role="button"
                aria-label={`${x.title}: ${x.does}`}
                aria-pressed={sel === x.id}
                onMouseEnter={() => setHover(x.id)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(x.id)}
                onBlur={() => setHover(null)}
                onClick={() => setSel(x.id)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSel(x.id)}
                className="cursor-pointer outline-none"
                style={{ opacity: near || on ? 1 : 0.55, transition: "opacity .3s" }}
              >
                <rect x={x.x} y={x.y} width={x.w} height={x.h} rx="12" fill={on ? "#232531" : "#131525"} stroke={on ? "#a9b0ff" : near ? "#777bb4" : "#2a2e4b"} strokeWidth={on ? 1.6 : 1} />
                {on && <rect x={x.x - 4} y={x.y - 4} width={x.w + 8} height={x.h + 8} rx="15" fill="none" stroke="#a9b0ff" strokeOpacity=".25" strokeWidth="6" />}
                <text x={x.x + 14} y={x.y + (x.h > 60 ? 28 : 25)} fill="#eef0fb" fontSize="14" fontWeight="600">{x.title}</text>
                <text x={x.x + 14} y={x.y + (x.h > 60 ? 48 : 43)} fill="#9a9fc4" fontSize="11" className="font-mono">{x.sub}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <aside aria-live="polite" className="rounded-2xl border border-line bg-ink-2 p-6 xl:sticky xl:top-24 xl:self-start">
        <p className="eyebrow">{zones.find((z) => z.id === n.zone)?.label}</p>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight">{n.title}</h3>
        <p className="mt-1 font-mono text-xs text-php">{n.sub}</p>
        <p className="mt-4 text-sm leading-relaxed text-steel">{n.does}</p>
        <dl className="mt-5 space-y-3 border-t border-line pt-4 text-sm">
          <div><dt className="eyebrow text-[10px]!">Input</dt><dd className="mt-1 font-mono text-xs">{n.input}</dd></div>
          <div><dt className="eyebrow text-[10px]!">Output</dt><dd className="mt-1 font-mono text-xs">{n.output}</dd></div>
          <div><dt className="eyebrow text-[10px]!">Trust boundary</dt><dd className="mt-1 text-xs leading-relaxed text-steel">{n.trust}</dd></div>
        </dl>
        <p className="mt-5 text-[11px] text-dim">Hover or tab through nodes. Click to pin.</p>
      </aside>
    </div>
  );
}
