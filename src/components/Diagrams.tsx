/** Server-rendered SVG diagrams. Lines draw in on scroll via the .draw class. */

const LANES = ["Scheduler", "Agent", "NVD / GHSA", "Postgres", "GitHub API", "Repo CI", "Public"];
const MSGS: [number, number, string, ("ok" | "warn" | "php")?][] = [
  [0, 1, "tick · */15 or backup cron"],
  [1, 2, "GET cve record"],
  [2, 1, "record + raw hash"],
  [1, 3, "SourceRecord if hash is new → advisory.ingested"],
  [1, 4, "installations → token → repositories"],
  [1, 4, "git tree + blobs (≤ 40 files)"],
  [1, 1, "planFile → validateChange → mayWrite"],
  [1, 4, "branch patch-agent/* · commit · PR", "php"],
  [1, 3, "Patch(pr_opened) + pr.opened"],
  [1, 6, "SSE + /proof (after persist)"],
  [4, 5, "run checks on PR branch"],
  [4, 1, "check_suite webhook (HMAC)"],
  [1, 3, "Patch.ci = passed/total", "ok"],
  [4, 1, "pull_request closed · merged"],
  [1, 6, "pr.merged + merge sha → /proof", "ok"],
];

export function SequenceDiagram() {
  const W = 1180, lane = (i: number) => 70 + i * ((W - 140) / (LANES.length - 1)), top = 64, step = 42, H = top + MSGS.length * step + 40;
  const color = (t?: string) => (t === "ok" ? "#62c99a" : t === "php" ? "#a9b0ff" : "#8892bf");
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-ink/60">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[900px]" role="img" aria-label="Sequence of one agent run from scheduler tick to verified merge">
        <defs><marker id="sq" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8z" fill="#8892bf" /></marker></defs>
        {LANES.map((l, i) => (
          <g key={l}>
            <rect x={lane(i) - 62} y={14} width={124} height={30} rx={15} fill="#1b1e34" stroke={i === 1 ? "#777bb4" : "#2a2e4b"} />
            <text x={lane(i)} y={34} textAnchor="middle" fill="#eef0fb" fontSize="12" className="font-mono">{l}</text>
            <line x1={lane(i)} y1={46} x2={lane(i)} y2={H - 10} stroke={i === 1 ? "#4f5b93" : "#2a2e4b"} strokeDasharray="3 5" />
          </g>
        ))}
        <rect x={lane(1) - 6} y={top - 8} width={12} height={MSGS.length * step} rx={4} fill="#4f5b93" opacity=".35" />
        {MSGS.map(([a, b, t, tone], i) => {
          const y = top + i * step + 14;
          const self = a === b;
          const x1 = lane(a), x2 = lane(b);
          return (
            <g key={i} className="draw" style={{ ["--i" as string]: i }}>
              {self ? (
                <path d={`M${x1 + 6} ${y - 6} h46 v16 h-40`} fill="none" stroke={color(tone)} strokeWidth="1.4" markerEnd="url(#sq)" />
              ) : (
                <line x1={x1 + (x2 > x1 ? 6 : -6)} y1={y} x2={x2 + (x2 > x1 ? -8 : 8)} y2={y} stroke={color(tone)} strokeWidth="1.4" markerEnd="url(#sq)" />
              )}
              <text x={self ? x1 + 60 : (x1 + x2) / 2} y={y - 7} textAnchor={self ? "start" : "middle"} fill="#c9ccdf" fontSize="11.5">
                <tspan fill="#62678f" className="font-mono">{String(i + 1).padStart(2, "0")} </tspan>{t}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

const STATES: { id: string; x: number; y: number; label: string; tone: string }[] = [
  { id: "planned", x: 40, y: 120, label: "planned", tone: "#8892bf" },
  { id: "generated", x: 230, y: 120, label: "generated", tone: "#8892bf" },
  { id: "pr_opened", x: 430, y: 120, label: "pr_opened", tone: "#a9b0ff" },
  { id: "merged", x: 650, y: 60, label: "merged", tone: "#62c99a" },
  { id: "closed", x: 650, y: 180, label: "closed", tone: "#9a9fc4" },
  { id: "failed", x: 230, y: 240, label: "failed → retry", tone: "#ef6a63" },
  { id: "review_required", x: 40, y: 10, label: "review_required", tone: "#f0b45a" },
  { id: "policy_blocked", x: 230, y: 10, label: "policy_blocked", tone: "#f0b45a" },
];
const T: [string, string, string][] = [
  ["planned", "generated", "validated"],
  ["generated", "pr_opened", "writes on"],
  ["pr_opened", "merged", "webhook"],
  ["pr_opened", "closed", "webhook"],
  ["generated", "failed", "API error"],
];

export function StateMachine() {
  const at = (id: string) => STATES.find((s) => s.id === id)!;
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-ink/60 p-2">
      <svg viewBox="0 0 820 300" className="w-full min-w-[640px]" role="img" aria-label="Patch state machine">
        <defs><marker id="sm" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8z" fill="#8892bf" /></marker></defs>
        {T.map(([a, b, l], i) => {
          const A = at(a), B = at(b);
          const x1 = A.x + 150, y1 = A.y + 22, x2 = B.x, y2 = B.y + 22;
          const vertical = Math.abs(B.x - A.x) < 10;
          const d = vertical ? `M${A.x + 75} ${A.y + 44} V${B.y}` : `M${x1} ${y1} C${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2 - 4} ${y2}`;
          return (
            <g key={i} className="draw" style={{ ["--i" as string]: i }}>
              <path d={d} fill="none" stroke="#8892bf" strokeWidth="1.4" markerEnd="url(#sm)" />
              <text x={vertical ? A.x + 84 : (x1 + x2) / 2} y={vertical ? (A.y + 44 + B.y) / 2 + 4 : (y1 + y2) / 2 - 8} textAnchor={vertical ? "start" : "middle"} fill="#62678f" fontSize="11" className="font-mono">{l}</text>
            </g>
          );
        })}
        <path d="M505 120 c0 -36 70 -36 70 0" fill="none" stroke="#62c99a" strokeWidth="1.2" markerEnd="url(#sm)" />
        <text x="540" y="76" textAnchor="middle" fill="#62c99a" fontSize="11" className="font-mono">ci passed/failed</text>
        {STATES.map((s) => (
          <g key={s.id}>
            <rect x={s.x} y={s.y} width={150} height={44} rx={22} fill="#131525" stroke={s.tone} />
            <text x={s.x + 75} y={s.y + 27} textAnchor="middle" fill={s.tone} fontSize="12.5" className="font-mono">{s.label}</text>
          </g>
        ))}
        <text x="40" y="290" fill="#62678f" fontSize="11" className="font-mono">review_required / policy_blocked are terminal: no PR is ever opened from them.</text>
      </svg>
    </div>
  );
}
