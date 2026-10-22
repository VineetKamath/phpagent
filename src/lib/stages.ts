import type { EventType } from "./types";

export const STAGES: { name: string; events: EventType[]; body: string }[] = [
  { name: "Public advisory", events: ["advisory.ingested"], body: "Advisories are pulled from NVD, GitHub Security Advisories and CISA KEV. Each record keeps its provider, record ID, source URL, retrieval time and a hash of the raw response." },
  { name: "Normalize", events: ["advisory.normalized"], body: "Provider records are merged into one schema: identifier, severity, affected packages and version ranges. Text is stored as plain data and never rendered as HTML." },
  { name: "Understand affected versions", events: [], body: "Affected ranges are compared against the authoritative fixed-release table. For PHP2Shell that means the php.net security releases per supported branch." },
  { name: "Search index", events: [], body: "Only repositories that have opted in are indexed. The agent reads Dockerfiles, compose files, CI workflows and composer.json." },
  { name: "Match repositories", events: ["match.evaluated"], body: "A repository matches when a file pins an affected PHP version explicitly. Floating tags and ambiguous constraints are not treated as matches." },
  { name: "Check authorization", events: ["policy.authorized", "policy.denied"], body: "Writes require the GitHub App to be installed on the repository and, if present, a valid .patchbot policy that allows this severity and patch type." },
  { name: "Generate defensive change", events: ["patch.planned", "patch.generated", "patch.rejected"], body: "A deterministic, in-place version bump to the first fixed release on the same branch. Anything else becomes HUMAN REVIEW REQUIRED. The change must pass the file allowlist, diff-size limit and secret and dangerous-content checks." },
  { name: "Test", events: ["patch.tests.passed", "patch.tests.failed"], body: "Tests run in the repository's own CI on the PR branch, never on this server. A failure stops the pipeline." },
  { name: "Open PR", events: ["pr.opened"], body: "The change is committed to a new patch-agent/* branch and opened as a pull request. The default branch is never pushed to." },
  { name: "Monitor", events: ["review.required"], body: "Check runs and review state are observed through the GitHub App until the PR is merged or closed." },
  { name: "Verify merge", events: ["pr.merged", "pr.closed"], body: "A merge is recorded only from a signed GitHub webhook, with the PR URL and merge commit SHA as evidence." },
];
