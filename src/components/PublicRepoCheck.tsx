"use client";

import { useEffect, useState } from "react";
import { Badge, KV, fmtTime } from "./ui";

type Result = { repository: string; url: string; defaultBranch: string; scannedFiles: number; checkedAt: string; changes: { path: string; edits: { line: number; from: string; to: string }[] }[]; reviews: { path: string; reason: string }[] };
const FILTERS = ["all", "affected", "review", "no pins found"] as const;
type Filter = typeof FILTERS[number];

function CheckCard({ entry }: { entry: Result }) {
  const affected = entry.changes.length > 0;
  const status = affected ? "Affected PHP pins" : entry.reviews.length ? "Human review required" : "No affected pins found";
  return <article className="rounded-2xl border border-line bg-ink-2 p-6">
    <header className="flex items-center justify-between gap-3">
      <span className={`eyebrow ${affected ? "text-crit!" : entry.reviews.length ? "text-amber!" : "text-steel!"}`}>Check · {status}</span>
      <Badge label="REAL" />
    </header>
    <h2 className="mt-4 break-all font-mono text-base md:text-lg"><a href={entry.url} target="_blank" rel="noopener noreferrer" className="hover:text-php">{entry.repository}</a></h2>
    <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
      <KV k="Branch" v={entry.defaultBranch} />
      <KV k="Files inspected" v={entry.scannedFiles} />
      <KV k="Affected files" v={entry.changes.length} />
      <KV k="Reviews" v={entry.reviews.length} />
    </dl>
    {entry.changes.length > 0 && <div className="mt-6 space-y-4">{entry.changes.map((change) => <div key={change.path}>
      <p className="break-all font-mono text-xs text-steel">{change.path}</p>
      {change.edits.map((edit, i) => <p key={i} className="mt-2 break-all font-mono text-sm"><span className="text-dim line-through decoration-crit/60">{edit.from}</span> <span className="text-dim">→</span> <span className="text-ok">{edit.to}</span></p>)}
    </div>)}</div>}
    {entry.reviews.length > 0 && <details className="mt-5 text-sm text-amber"><summary className="cursor-pointer">Review findings ({entry.reviews.length})</summary><ul className="mt-3 space-y-2">{entry.reviews.map((review) => <li key={review.path} className="break-words"><span className="font-mono text-xs">{review.path}</span>: {review.reason}</li>)}</ul></details>}
    <footer className="mt-6 border-t border-line pt-4 font-mono text-xs text-dim">
      <p>Last checked · {fmtTime(entry.checkedAt)}</p>
      <p className="mt-2">Hourly monitoring · checks version declarations, not deployed servers</p>
    </footer>
  </article>;
}

export function PublicRepoCheck() {
  const [repository, setRepository] = useState("");
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [history, setHistory] = useState<Result[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  async function loadHistory() {
    try {
      const r = await fetch("/api/v1/public-checks", { cache: "no-store" });
      if (!r.ok) throw new Error("Could not load repository checks. Please try again.");
      setHistory((await r.json()).checks);
      setHistoryError("");
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "Could not load repository checks.");
    } finally {
      setHistoryLoading(false);
    }
  }
  useEffect(() => {
    void loadHistory();
    const refresh = setInterval(() => void loadHistory(), 60_000);
    return () => clearInterval(refresh);
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const r = await fetch(`/api/v1/public-check?repo=${encodeURIComponent(repository.trim())}`);
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? "Check failed. Please try again.");
      setHistory((entries) => [body, ...entries.filter((entry) => entry.repository !== body.repository)]);
      setFilter("all");
      void loadHistory();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Check failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }
  const visible = history.filter((entry) => filter === "all" || (filter === "affected" && entry.changes.length > 0) || (filter === "review" && entry.reviews.length > 0) || (filter === "no pins found" && !entry.changes.length && !entry.reviews.length));
  return <>
    <div className="rounded-2xl border border-line bg-ink-2 p-6">
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="public-repo">Public GitHub repository</label>
        <input id="public-repo" value={repository} onChange={(e) => setRepository(e.target.value)} placeholder="owner/repository" required pattern="[A-Za-z0-9-]+/[A-Za-z0-9._-]+" className="min-w-0 flex-1 rounded-xl border border-line bg-ink px-4 py-3 font-mono text-sm outline-none focus:border-php" />
        <button disabled={loading} className="rounded-xl bg-paper px-5 py-3 text-sm font-medium text-ink disabled:opacity-60">{loading ? "Checking..." : "Check repository"}</button>
      </form>
      <p className="mt-3 text-xs text-dim">Public GitHub repositories. Saved repositories are scheduled for hourly checks; scheduled runs may be delayed. Patching requires the owner to authorize the GitHub App.</p>
      {error && <p role="alert" className="mt-5 font-mono text-sm text-crit">{error}</p>}
    </div>
    <section className="mt-10" aria-label="Repository check history">
      <nav aria-label="Check filters" className="flex flex-wrap gap-2 font-mono text-xs">{FILTERS.map((value) => <button key={value} onClick={() => setFilter(value)} aria-pressed={filter === value} className={`rounded-full border px-3 py-1 uppercase ${filter === value ? "border-php text-paper" : "border-line text-steel hover:text-paper"}`}>{value}</button>)}</nav>
      {historyError && <p role="alert" className="mt-5 text-sm text-crit">{historyError}</p>}
      {visible.length > 0 ? <div className="mt-10 grid items-start gap-4 lg:grid-cols-2">{visible.map((entry) => <CheckCard key={entry.repository} entry={entry} />)}</div> : <p className="mt-10 rounded-2xl border border-dashed border-line p-12 text-center font-mono text-sm text-steel">{historyLoading ? "LOADING REPOSITORY CHECKS" : historyError ? "REPOSITORY CHECKS UNAVAILABLE" : "NO CHECKS MATCH · submit a repository to start monitoring"}</p>}
    </section>
  </>;
}
