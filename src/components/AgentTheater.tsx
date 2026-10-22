"use client";
import { useEffect, useState } from "react";
import { useAgentStream } from "./useAgentStream";
import { php2shell } from "@/content/php2shell";
import { formatDuration, timeToPatch } from "@/lib/metrics";
import type { Patch } from "@/lib/types";
import type { RunSummary } from "@/lib/agent";
import { Badge } from "./ui";

type AgentInfo = { running: boolean; lastRunAt: string | null; lastOk: boolean | null; lastSummary: RunSummary | null; schedulerEnabled: boolean; githubAppConfigured: boolean; githubWritesEnabled: boolean };
const t = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(11, 19) + "Z" : "n/a");

/**
 * Live transparency: what the agent is fixing, why, how far it got, and the proof.
 * Shows only recorded data; empty states say so.
 */
export function AgentTheater() {
  const { events, state } = useAgentStream();
  const [patches, setPatches] = useState<Patch[] | null>(null);
  const [agent, setAgent] = useState<AgentInfo | null>(null);
  const head = events[0]?.id;

  useEffect(() => {
    const id = setTimeout(() => {
      fetch("/api/v1/patches").then((r) => r.json()).then((j) => setPatches(j.patches)).catch(() => setPatches([]));
      fetch("/api/v1/agent").then((r) => r.json()).then(setAgent).catch(() => {});
    }, 200);
    return () => clearTimeout(id);
  }, [head]);

  const job = patches?.[0];
  const stages: [string, string | null, boolean?][] = job
    ? [
        ["Advisory detected", job.timeline.detectedAt],
        ["Pins matched", job.timeline.matchedAt],
        ["Patch generated + validated", job.timeline.generatedAt],
        ["Pull request opened", job.timeline.prOpenedAt],
        [job.ci ? `CI ${job.ci.passed}/${job.ci.total}` : "CI result", job.timeline.testsPassedAt, job.ci != null && job.ci.passed !== job.ci.total],
        [job.stage === "closed" ? "Closed without merge" : "Merged by maintainer", job.timeline.mergedAt],
      ]
    : [];
  const fixedFor = (to: string) => Object.values(php2shell.fixed).find((v) => to.includes(v));

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-ink-2/80 shadow-[0_40px_120px_-40px_rgba(119,123,180,.45)]">
      {/* telemetry bar */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line bg-night/60 px-5 py-3 font-mono text-[11px] tracking-[0.08em]">
        <span className="flex items-center gap-2"><span className={`h-1.5 w-1.5 rounded-full ${state === "live" ? "bg-ok pulse" : "bg-amber"}`} />STREAM {state.toUpperCase()}</span>
        <span className="text-steel">WORKER {agent ? (agent.running ? <span className="text-php-glow">RUNNING</span> : agent.githubAppConfigured ? "IDLE" : <span className="text-amber">NOT CONFIGURED</span>) : "…"}</span>
        <span className="text-steel">LAST RUN {t(agent?.lastRunAt ?? null)}</span>
        {agent?.lastSummary && <span className="text-steel">SCANNED {agent.lastSummary.repositories} REPOS · {agent.lastSummary.prsOpened.length} PR · {agent.lastSummary.errors.length} ERR</span>}
        <span className="text-steel">WRITES {agent?.githubWritesEnabled ? <span className="text-ok">ON</span> : "OFF"}</span>
        <span className="ml-auto text-dim">schedule */15 · single-flight</span>
      </div>

      <div className="grid lg:grid-cols-[1.35fr_1fr]">
        {/* current job */}
        <div className="border-b border-line p-5 md:p-7 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow">{job ? "Latest job" : "Current job"}</p>
            {job && <Badge label={job.dataMode === "DEMO" ? "DEMO" : "REAL"} />}
          </div>
          {!patches && <div className="mt-6 h-56 animate-pulse rounded-xl bg-ink-3" />}
          {patches && !job && (
            <div className="mt-6 rounded-xl border border-dashed border-line p-6">
              <p className="font-mono text-sm text-paper">NO JOB RECORDED YET</p>
              <p className="mt-2 text-sm leading-relaxed text-steel">
                A job starts when an opted-in repository pins an affected PHP version. When it does, this panel shows the repository, the exact diff, why it was chosen, each stage with its timestamp, and links to verify it on GitHub.
                {agent && !agent.githubAppConfigured && " The GitHub App is not configured on this deployment, so the worker is not running."}
              </p>
            </div>
          )}
          {job && (
            <>
              <p className="mt-4 break-all font-mono text-lg md:text-xl">{job.repository}</p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="eyebrow text-[10px]!">What · exact diff</p>
                  <pre className="mt-2 overflow-x-auto rounded-xl border border-line bg-ink p-3 font-mono text-[12px] leading-relaxed">
                    {(job.changes.length ? job.changes : [{ path: job.file, line: 0, from: job.change.from, to: job.change.to }]).map((c, i) => (
                      <span key={i} className="block"><span className="text-dim">{c.path}{c.line ? `:${c.line}` : ""}</span>{"\n"}<span className="text-crit">- {c.from}</span>{"\n"}<span className="text-ok">+ {c.to}</span>{"\n"}</span>
                    ))}
                  </pre>
                </div>
                <div>
                  <p className="eyebrow text-[10px]!">Why</p>
                  <ul className="mt-2 space-y-2 text-sm text-steel">
                    {(job.cveIds.length ? job.cveIds : [job.cveId]).map((c) => <li key={c}><a className="font-mono text-php hover:underline" href={`https://nvd.nist.gov/vuln/detail/${c}`} target="_blank" rel="noopener noreferrer">{c}</a> · CVSS v4 9.2</li>)}
                    <li>Rule: explicit pin on a supported branch below its fixed release{fixedFor(job.change.to) ? ` (${fixedFor(job.change.to)})` : ""}.</li>
                    <li>Same-branch bump only; validator passed (allowlist, ≤ 20 lines, no secrets, no shell).</li>
                  </ul>
                </div>
              </div>
              <ol className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {stages.map(([l, at, bad], i) => (
                  <li key={l} className={`rounded-xl border px-3 py-2.5 ${at ? (bad ? "border-amber/50 bg-amber/5" : "border-ok/40 bg-ok/5") : "border-line"}`}>
                    <p className="font-mono text-[10px] text-dim">{String(i + 1).padStart(2, "0")} · {t(at)}</p>
                    <p className={`mt-1 text-sm ${at ? "text-paper" : "text-dim"}`}>{l}</p>
                  </li>
                ))}
              </ol>
              <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
                {job.prUrl ? <a className="rounded-full bg-paper px-4 py-2 font-medium text-ink" href={job.prUrl} target="_blank" rel="noopener noreferrer">Open PR #{job.prNumber} on GitHub →</a> : <span className="text-dim">{job.dataMode === "DEMO" ? "Simulated: no GitHub PR" : "No PR yet"}</span>}
                {job.ciUrl && <a className="text-php hover:underline" href={job.ciUrl} target="_blank" rel="noopener noreferrer">CI checks →</a>}
                <span className="font-mono text-xs text-steel">time to patch {formatDuration(timeToPatch(job))}</span>
              </div>
            </>
          )}
        </div>

        {/* event feed */}
        <div className="p-5 md:p-7">
          <p className="eyebrow">Every transition</p>
          <ol className="mt-4 space-y-1">
            {events.length === 0 && <li className="text-sm text-dim">{state === "live" ? "Connected. Waiting for the next agent event." : "Connecting…"}</li>}
            {events.slice(0, 9).map((e) => (
              <li key={e.id} className="rise grid grid-cols-[64px_1fr] gap-3 rounded-lg px-2 py-1.5 hover:bg-ink-3">
                <span className="font-mono text-[10px] text-dim">{t(e.timestamp)}</span>
                <span className="min-w-0 text-[13px] leading-snug">
                  <span className={`font-mono text-[10px] tracking-[0.1em] ${e.status === "error" ? "text-crit" : e.status === "warn" ? "text-amber" : "text-php"}`}>{e.eventType}</span>
                  {e.dataMode === "DEMO" && <span className="ml-2 font-mono text-[9px] text-amber">DEMO</span>}
                  <span className="block break-words text-steel">{e.message}</span>
                  {e.verificationUrl && <a href={e.verificationUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-php hover:underline">verify →</a>}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
