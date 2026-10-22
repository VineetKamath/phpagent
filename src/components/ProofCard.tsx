import Link from "next/link";
import type { Patch } from "@/lib/types";
import { formatDuration, timeToMerge, timeToPatch } from "@/lib/metrics";
import { Badge, KV, fmtTime } from "./ui";

const stageLabel: Record<Patch["stage"], string> = {
  planned: "PLANNED", generated: "GENERATED", tested: "TESTS PASSED", pr_opened: "PR OPEN", merged: "MERGED", failed: "FAILED", review_required: "HUMAN REVIEW REQUIRED", closed: "CLOSED", policy_blocked: "BLOCKED BY POLICY",
};

export function ProofCard({ p, compact = false }: { p: Patch; compact?: boolean }) {
  const demo = p.dataMode === "DEMO";
  const ci = p.ci ? `${p.ci.passed}/${p.ci.total} ${p.ci.passed === p.ci.total ? "PASSING" : "FAILING"}` : "n/a";
  return (
    <article className={`rounded-2xl border bg-ink-2 ${demo ? "border-amber/25" : "border-line"} ${compact ? "p-4" : "p-6"}`}>
      <header className="flex items-center justify-between gap-3">
        <span className="eyebrow">Patch · {stageLabel[p.stage]}</span>
        <Badge label={demo ? "DEMO" : "REAL"} />
      </header>
      <p className="mt-4 font-mono text-sm text-steel">{p.file}</p>
      <p className="mt-1 break-all font-mono text-base md:text-lg">
        <span className="text-dim line-through decoration-crit/60">{p.change.from}</span> <span className="text-dim">→</span> <span className="text-ok">{p.change.to}</span>
      </p>
      <dl className={`mt-6 grid gap-x-6 gap-y-4 ${compact ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4"}`}>
        <KV k="CVE" v={<Link className="hover:text-php" href={`/cve/${p.cveId}`}>{p.cveId}</Link>} />
        <KV k="Repository" v={<Link className="hover:text-php" href={`/repo/${p.repository}`}>{p.repository}</Link>} />
        <KV k="PR" v={p.prUrl ? <a className="hover:text-php" href={p.prUrl} target="_blank" rel="noopener noreferrer">#{p.prNumber}</a> : p.prNumber ? `#${p.prNumber}${demo ? " (sim)" : ""}` : "n/a"} />
        <KV k="Commit" v={p.commitSha ? p.commitSha.slice(0, 7) : "n/a"} />
        <KV k="CI" v={<span className={p.ci && p.ci.passed !== p.ci.total ? "text-amber" : ""}>{ci}</span>} />
        {!compact && <KV k="Opened" v={fmtTime(p.timeline.prOpenedAt)} />}
        {!compact && <KV k="Merged" v={fmtTime(p.timeline.mergedAt)} />}
        <KV k="Time to patch" v={formatDuration(timeToPatch(p))} />
        {!compact && <KV k="Time to merge" v={formatDuration(timeToMerge(p))} />}
      </dl>
      <footer className="mt-6 border-t border-line pt-4 text-sm">
        {p.prUrl && !demo ? (
          <a href={p.prUrl} target="_blank" rel="noopener noreferrer" className="text-php hover:underline">Verify on GitHub →</a>
        ) : (
          <span className="text-dim">{demo ? "Simulated record: nothing to verify on GitHub" : "No public PR yet"}</span>
        )}
      </footer>
    </article>
  );
}
