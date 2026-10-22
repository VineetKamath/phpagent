import type { Patch } from "./types";

const ms = (a: string | null, b: string | null) => (a && b ? new Date(b).getTime() - new Date(a).getTime() : null);

export function formatDuration(msv: number | null): string {
  if (msv == null || msv < 0) return "n/a";
  const s = Math.round(msv / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (x: number) => String(x).padStart(2, "0");
  return h ? `${h}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
}

/** Time to patch = agent detection → PR opened. Time to merge = PR opened → merged. Only from recorded timestamps. */
export const timeToPatch = (p: Patch) => ms(p.timeline.detectedAt, p.timeline.prOpenedAt);
export const timeToMerge = (p: Patch) => ms(p.timeline.prOpenedAt, p.timeline.mergedAt);

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function computeMetrics(patches: Patch[]) {
  const attempts = patches.length;
  const opened = patches.filter((p) => p.prNumber != null).length;
  const merged = patches.filter((p) => p.stage === "merged").length;
  const verified = patches.filter((p) => p.ci && p.ci.passed === p.ci.total).length;
  const ttp = patches.map(timeToPatch).filter((x): x is number => x != null);
  return {
    authorizedRepositories: new Set(patches.map((p) => p.repository)).size,
    patchAttempts: attempts,
    verifiedPatches: verified,
    prsOpened: opened,
    prsMerged: merged,
    medianTimeToPatchMs: median(ttp),
    successRate: attempts ? merged / attempts : null,
    computePerMerge: null as number | null, // requires live expense tracking
  };
}
