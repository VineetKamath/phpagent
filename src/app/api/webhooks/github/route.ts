import { randomUUID } from "node:crypto";
import { verifyGithubSignature } from "@/lib/webhook";
import { appendEvent, getPatchByBranch, recordAuthorization, upsertPatch } from "@/lib/store";
import { installationToken, checkSummary, REPO_RE } from "@/lib/github";
import { runAgent } from "@/lib/agent";
import { json } from "@/lib/http";
import type { AgentEvent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ev = (e: Pick<AgentEvent, "eventType" | "message"> & Partial<AgentEvent>): AgentEvent => ({
  id: randomUUID(), timestamp: new Date().toISOString(), status: "ok", environment: process.env.DEPLOYMENT_ID ?? "production", dataMode: "REAL",
  source: "github-webhook", cveId: null, repositoryId: null, patchId: null, metadata: {}, verificationUrl: null, ...e,
});

type Payload = {
  action?: string;
  installation?: { id: number };
  repository?: { full_name: string };
  repositories?: { full_name: string }[];
  repositories_added?: { full_name: string }[];
  repositories_removed?: { full_name: string }[];
  pull_request?: { number: number; merged: boolean; merged_at: string | null; html_url: string; merge_commit_sha: string | null; head: { ref: string } };
  check_suite?: { head_branch: string | null; head_sha: string };
  check_run?: { head_sha: string; check_suite: { head_branch: string | null } };
};

async function authorizations(kind: string, p: Payload) {
  const inst = p.installation?.id ?? null;
  let list: { full_name: string }[] = [];
  let active = true;
  if (kind === "installation") {
    list = p.repositories ?? [];
    active = ["created", "unsuspend", "new_permissions_accepted"].includes(p.action ?? "");
    if (!active && !["deleted", "suspend"].includes(p.action ?? "")) return;
  } else if (p.action === "added") list = p.repositories_added ?? [];
  else if (p.action === "removed") {
    list = p.repositories_removed ?? [];
    active = false;
  } else return;
  const repos = list.map((r) => r.full_name).filter((r) => REPO_RE.test(r));
  for (const r of repos) {
    await recordAuthorization(r, inst, "github-app", active);
    await appendEvent(ev({ eventType: active ? "policy.authorized" : "policy.denied", status: active ? "ok" : "warn", message: `${r} ${active ? "installed" : "removed"} GitHub App`, repositoryId: r, metadata: { installationId: inst, action: p.action } }));
  }
  if (active && repos.length) void runAgent({ repos }).catch(() => {});
}

async function closed(p: Payload) {
  const pr = p.pull_request!;
  const repo = p.repository?.full_name ?? "";
  if (!REPO_RE.test(repo) || !pr.head.ref.startsWith("patch-agent/")) return;
  const patch = await getPatchByBranch(repo, pr.head.ref);
  if (patch) {
    await upsertPatch({
      ...patch,
      stage: pr.merged ? "merged" : "closed",
      commitSha: pr.merge_commit_sha ?? patch.commitSha,
      timeline: { ...patch.timeline, mergedAt: pr.merged ? (pr.merged_at ?? new Date().toISOString()) : null },
    });
  }
  await appendEvent(ev({
    eventType: pr.merged ? "pr.merged" : "pr.closed",
    status: pr.merged ? "ok" : "warn",
    message: `${repo}#${pr.number} ${pr.merged ? "merged" : "closed without merge"}`,
    repositoryId: repo,
    cveId: patch?.cveId ?? null,
    patchId: patch?.id ?? null,
    metadata: { commitSha: pr.merge_commit_sha ?? null, prNumber: pr.number },
    verificationUrl: pr.html_url,
  }));
}

async function checks(p: Payload) {
  const repo = p.repository?.full_name ?? "";
  const branch = p.check_suite?.head_branch ?? p.check_run?.check_suite.head_branch ?? "";
  const sha = p.check_suite?.head_sha ?? p.check_run?.head_sha;
  if (p.action !== "completed" || !REPO_RE.test(repo) || !branch.startsWith("patch-agent/") || !sha || !p.installation) return;
  const patch = await getPatchByBranch(repo, branch);
  if (!patch) return;
  const sum = await checkSummary(await installationToken(p.installation.id), repo, sha);
  if (!sum || (patch.ci?.passed === sum.passed && patch.ci?.total === sum.total)) return;
  const ok = sum.passed === sum.total;
  const ciUrl = patch.prUrl ? `${patch.prUrl}/checks` : `https://github.com/${repo}/commit/${sha}/checks`;
  await upsertPatch({ ...patch, ci: sum, ciUrl, timeline: { ...patch.timeline, testsPassedAt: ok ? new Date().toISOString() : patch.timeline.testsPassedAt } });
  await appendEvent(ev({
    eventType: ok ? "patch.tests.passed" : "patch.tests.failed",
    status: ok ? "ok" : "warn",
    message: `${repo}: CI ${sum.passed}/${sum.total} ${ok ? "passed" : "failures"}`,
    repositoryId: repo,
    cveId: patch.cveId,
    patchId: patch.id,
    verificationUrl: ciUrl,
    metadata: { headSha: sha, ...sum },
  }));
}

/** GitHub App webhook. Rejects anything without a valid HMAC signature. Records REAL events only. */
export async function POST(req: Request) {
  const body = await req.text();
  if (!verifyGithubSignature(process.env.GITHUB_WEBHOOK_SECRET, body, req.headers.get("x-hub-signature-256"))) {
    return json({ error: "invalid signature" }, { status: 401 });
  }
  const kind = req.headers.get("x-github-event") ?? "";
  const p = JSON.parse(body) as Payload;
  try {
    if (kind === "installation" || kind === "installation_repositories") await authorizations(kind, p);
    else if (kind === "pull_request" && p.action === "closed" && p.pull_request) await closed(p);
    else if (kind === "check_suite" || kind === "check_run") await checks(p);
  } catch (e) {
    await appendEvent(ev({ eventType: "agent.error", status: "error", message: `webhook ${kind}: ${String(e)}`.slice(0, 500) })).catch(() => {});
    return json({ error: "processing failed" }, { status: 500 });
  }
  return json({ ok: true });
}
