// Single source for the architecture diagram and the /architecture text, so the picture and the docs never drift.
export type Zone = { id: string; label: string; note: string; x: number; y: number; w: number; h: number; tone: "untrusted" | "trusted" | "external" | "public" };
export type ArchNode = { id: string; zone: string; x: number; y: number; w: number; h: number; title: string; sub: string; does: string; input: string; output: string; trust: string };

export const zones: Zone[] = [
  { id: "sources", label: "PUBLIC SOURCES", note: "untrusted input", x: 16, y: 56, w: 228, h: 412, tone: "untrusted" },
  { id: "triggers", label: "TRIGGERS", note: "when work starts", x: 16, y: 488, w: 228, h: 252, tone: "external" },
  { id: "agent", label: "AGENT · THIS SERVER", note: "trusted code · no repo code runs here", x: 272, y: 56, w: 604, h: 684, tone: "trusted" },
  { id: "github", label: "GITHUB · OPTED-IN REPOS", note: "repo content is data, never instruction", x: 904, y: 56, w: 320, h: 476, tone: "untrusted" },
  { id: "public", label: "PUBLIC EVIDENCE", note: "anyone can verify", x: 904, y: 552, w: 320, h: 188, tone: "public" },
];

const S = (id: string, zone: string, x: number, y: number, title: string, sub: string, does: string, input: string, output: string, trust: string, w = 260, h = 66): ArchNode => ({ id, zone, x, y, w, h, title, sub, does, input, output, trust });

export const nodes: ArchNode[] = [
  S("nvd", "sources", 36, 100, "NVD", "CVE API 2.0", "Authoritative CVE records: description, CVSS, references.", "CVE id", "JSON record", "Untrusted text, stored and rendered as plain text only.", 188, 58),
  S("ghsa", "sources", 36, 182, "GitHub Advisories", "/advisories?cve_id", "Ecosystem-level affected packages and version ranges.", "CVE id", "advisory JSON", "Untrusted; merged with provenance kept per provider.", 188, 58),
  S("kev", "sources", 36, 264, "CISA KEV", "known exploited feed", "Flags whether a CVE is known to be exploited in the wild.", "feed", "matching entry", "Untrusted; hashed per entry.", 188, 58),
  S("phpnet", "sources", 36, 346, "php.net releases", "releases JSON", "Latest release per branch. Confirms fixed versions exist.", "branch", "version list", "Never lowers a fixed version.", 188, 58),

  S("cron", "triggers", 36, 530, "node-cron", "*/15 * * * *", "In-process scheduler started from instrumentation.ts.", "clock", "runAgent()", "Single instance only.", 188, 54),
  S("backup", "triggers", 36, 600, "Backup cron", "POST /api/internal/run", "External cron with a bearer token, in case the in-process timer stalls.", "bearer token", "runAgent()", "Constant-time token check; 503 if unset.", 188, 54),
  S("hookin", "triggers", 36, 670, "Install webhook", "installation_repositories.added", "Runs immediately for newly added repositories.", "signed webhook", "runAgent({repos})", "HMAC-verified before parsing.", 188, 54),

  S("ingest", "agent", 296, 96, "Ingest + normalize", "providers.ts · lookupCve()", "Queries every provider, merges into one schema, diffs raw hashes against stored SourceRecords.", "provider records", "advisory.ingested / normalized events", "Provider failures become agent.error events; nothing is guessed."),
  S("releases", "agent", 592, 96, "Fixed-version table", "php-releases.ts", "Branch → first fixed release (8.5.12, 8.4.27, 8.3.36, 8.2.35), cross-checked with php.net.", "php.net + seed", "fixed map", "Seed table labelled as SEED when php.net is unreachable."),
  S("sched", "agent", 296, 206, "Single-flight runner", "runAgent()", "One run at a time. Overlapping triggers return immediately.", "trigger", "run summary + agent.run event", "Errors in one repo never stop the run."),
  S("orch", "agent", 296, 316, "Orchestrator", "agent.ts · processRepo()", "Lists installations, mints installation tokens, walks each repo's git tree (≤ 40 files, ≤ 256 KB).", "installation", "candidate files", "Only repos inside an App installation are ever read."),
  S("matcher", "agent", 592, 206, "Matcher / planner", "patcher.ts · planFile()", "Finds explicit php:X.Y.Z pins in Dockerfile, compose, CI and composer config.platform.php. Floating tags are ignored.", "file text + fixed map", "change | none | review", "Fixed regexes only. Repository text never reaches a model."),
  S("safety", "agent", 592, 316, "Safety validator", "safety.ts · validateChange()", "File allowlist, unchanged line count, ≤ 20 changed lines, secret and dangerous-content scan.", "proposed change", "ok | rejected(reasons)", "Rejected changes become patch.rejected events."),
  S("policy", "agent", 296, 426, "Policy gate", "policy.ts · mayWrite()", "App installed? .patchbot valid and enabled? Severity and patch type allowed?", "authorization + policy", "allow | policy_blocked", "Invalid .patchbot fails closed. Schema has no command fields."),
  S("writer", "agent", 592, 426, "PR writer", "github.ts · openPullRequest()", "Creates a patch-agent/* branch, one commit per file, opens a PR with the exact diff and sources.", "validated change", "PR url + commit sha", "Never pushes to the default branch. Disabled unless GITHUB_WRITES_ENABLED=true."),
  S("tracker", "agent", 296, 536, "CI + merge tracker", "webhooks/github · checkSummary()", "Aggregates check runs for agent branches; records merges and closes.", "check_suite / check_run / pull_request", "Patch.ci, stage, mergedAt", "Only branches under patch-agent/* are considered."),
  S("db", "agent", 592, 536, "Postgres (Neon)", "Prisma · 15 tables", "Events, patches, source records, authorizations. Every record is written before it is broadcast.", "records", "durable ledger", "DEMO rows are rejected before reaching the database."),
  S("bus", "agent", 296, 646, "Event bus → SSE", "/api/v1/stream", "In-process pub/sub fan-out to every open browser.", "persisted events", "text/event-stream", "Same events the ledger stores, nothing extra."),
  S("health", "agent", 592, 646, "Health probes", "health.ts", "Live probes of NVD, GitHub, App, RPC, plus SELECT 1 on Postgres and last worker run.", "probes", "status report", "Nothing is reported operational unless a probe passed."),

  S("inst", "github", 924, 96, "App installations", "/app/installations", "The opt-in list. Installation is the authorization.", "App JWT", "installation ids", "Least privilege: metadata r, contents rw, PRs rw, checks r.", 280, 58),
  S("tree", "github", 924, 172, "Repo tree + blobs", "git/trees · git/blobs", "Read-only fetch of candidate files and .patchbot.", "installation token", "file contents", "Content treated as data; prompt-injection text has no effect.", 280, 58),
  S("pr", "github", 924, 248, "patch-agent/* PR", "branch · commit · pull", "The only write the agent makes.", "validated diff", "pull request", "Maintainers review and merge; the agent never merges.", 280, 58),
  S("ci", "github", 924, 324, "Repository CI", "check runs", "The repo's own tests run on the PR branch, in the repo's own CI.", "PR branch", "check results", "No repository code executes on the agent's server.", 280, 58),
  S("hooks", "github", 924, 400, "Signed webhooks", "X-Hub-Signature-256", "Installation, PR, check_suite and check_run events back to the agent.", "GitHub", "HMAC-verified payloads", "Unsigned requests are rejected with 401.", 280, 58),

  S("proof", "public", 924, 596, "/proof", "REAL-only ledger", "Every action with an external link: PR, checks, NVD.", "events", "verifiable rows", "DEMO can never appear here.", 136, 56),
  S("statusj", "public", 1068, 596, "/status.json", "computed health", "Machine-readable service state and capabilities.", "probes", "JSON", "Computed per request (30 s cache).", 136, 56),
  S("live", "public", 924, 664, "/live", "SSE stream", "Watch transitions as they happen.", "event bus", "UI", "Read-only.", 136, 56),
  S("llms", "public", 1068, 664, "llms.txt", "for AI evaluators", "Plain facts and evidence URLs for external agents.", "status", "text", "No marketing.", 136, 56),
];

export const edges: [string, string][] = [
  ["nvd", "ingest"], ["ghsa", "ingest"], ["kev", "ingest"], ["phpnet", "releases"],
  ["cron", "sched"], ["backup", "sched"], ["hookin", "sched"],
  ["sched", "ingest"], ["sched", "orch"], ["orch", "inst"], ["orch", "tree"],
  ["releases", "matcher"], ["orch", "matcher"], ["matcher", "safety"], ["safety", "policy"], ["policy", "writer"],
  ["writer", "pr"], ["pr", "ci"], ["ci", "hooks"], ["hooks", "tracker"],
  ["ingest", "db"], ["writer", "db"], ["tracker", "db"], ["db", "bus"], ["db", "proof"], ["bus", "live"], ["health", "statusj"], ["health", "llms"],
];
