"use client";

import { useState } from "react";

type Result = { repository: string; url: string; defaultBranch: string; scannedFiles: number; changes: { path: string; edits: { line: number; from: string; to: string }[] }[]; reviews: { path: string; reason: string }[] };

export function PublicRepoCheck() {
  const [repository, setRepository] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(""); setResult(null);
    const r = await fetch(`/api/v1/public-check?repo=${encodeURIComponent(repository.trim())}`);
    const body = await r.json(); setLoading(false);
    if (!r.ok) return setError(body.error ?? "check failed");
    setResult(body);
  }
  return <div className="rounded-2xl border border-line bg-ink-2 p-6">
    <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
      <label className="sr-only" htmlFor="public-repo">Public GitHub repository</label>
      <input id="public-repo" value={repository} onChange={(e) => setRepository(e.target.value)} placeholder="owner/repository" required pattern="[A-Za-z0-9-]+/[A-Za-z0-9._-]+" className="min-w-0 flex-1 rounded-xl border border-line bg-ink px-4 py-3 font-mono text-sm outline-none focus:border-php" />
      <button disabled={loading} className="rounded-xl bg-paper px-5 py-3 text-sm font-medium text-ink disabled:opacity-60">{loading ? "Checking..." : "Check public repo"}</button>
    </form>
    <p className="mt-3 text-xs text-dim">Read-only. Public repositories only. No records, branches, pull requests, or source-code changes are made.</p>
    {error && <p className="mt-5 font-mono text-sm text-crit">{error}</p>}
    {result && <div className="mt-6 space-y-4 text-sm"><p><a href={result.url} target="_blank" rel="noreferrer" className="font-mono text-php hover:underline">{result.repository}</a> · branch {result.defaultBranch} · {result.scannedFiles} eligible file(s) inspected</p>
      {result.changes.length === 0 && <p className="text-steel">No explicit vulnerable PHP pin was found.</p>}
      {result.changes.map((change) => <div key={change.path} className="rounded-xl border border-ok/40 bg-ok/5 p-4"><p className="font-mono text-ok">Proposed patch · {change.path}</p>{change.edits.map((edit, i) => <p key={i} className="mt-2 font-mono text-xs text-steel"><span className="text-crit">- {edit.from}</span><br /><span className="text-ok">+ {edit.to}</span></p>)}</div>)}
      {result.reviews.map((review) => <p key={review.path} className="text-amber">{review.path}: {review.reason}</p>)}
    </div>}
  </div>;
}
