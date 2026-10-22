import { z } from "zod";

export const DataMode = z.enum(["REAL", "DEMO"]);
export type DataMode = z.infer<typeof DataMode>;

export const EventType = z.enum([
  "advisory.ingested",
  "advisory.normalized",
  "match.evaluated",
  "policy.authorized",
  "policy.denied",
  "patch.planned",
  "patch.generated",
  "patch.rejected",
  "patch.tests.passed",
  "patch.tests.failed",
  "pr.opened",
  "pr.merged",
  "pr.closed",
  "review.required",
  "treasury.inflow",
  "treasury.expense",
  "agent.run",
  "agent.error",
]);
export type EventType = z.infer<typeof EventType>;

export const AgentEvent = z.object({
  id: z.string(),
  timestamp: z.string(),
  eventType: EventType,
  status: z.enum(["ok", "warn", "error"]),
  environment: z.string(),
  dataMode: DataMode,
  source: z.string(),
  message: z.string(),
  cveId: z.string().nullable(),
  repositoryId: z.string().nullable(),
  patchId: z.string().nullable(),
  metadata: z.record(z.unknown()),
  verificationUrl: z.string().url().nullable(),
});
export type AgentEvent = z.infer<typeof AgentEvent>;

export const PatchStage = z.enum(["planned", "generated", "tested", "pr_opened", "merged", "failed", "review_required", "closed", "policy_blocked"]);
export type PatchStage = z.infer<typeof PatchStage>;

export const Patch = z.object({
  id: z.string(),
  dataMode: DataMode,
  cveId: z.string(),
  cveIds: z.array(z.string()),
  repository: z.string(),
  file: z.string(),
  change: z.object({ from: z.string(), to: z.string() }),
  changes: z.array(z.object({ path: z.string(), line: z.number(), from: z.string(), to: z.string() })),
  branch: z.string().nullable(),
  ciUrl: z.string().url().nullable(),
  stage: PatchStage,
  ci: z.object({ passed: z.number(), total: z.number() }).nullable(),
  prNumber: z.number().nullable(),
  prUrl: z.string().url().nullable(),
  commitSha: z.string().nullable(),
  timeline: z.object({
    disclosedAt: z.string(),
    detectedAt: z.string().nullable(),
    matchedAt: z.string().nullable(),
    generatedAt: z.string().nullable(),
    testsPassedAt: z.string().nullable(),
    prOpenedAt: z.string().nullable(),
    mergedAt: z.string().nullable(),
  }),
});
export type Patch = z.infer<typeof Patch>;

export type NormalizedCve = {
  id: string;
  summary: string;
  severity: string | null;
  cvss: number | null;
  published: string | null;
  modified: string | null;
  affected: { ecosystem: string; package: string; ranges: string[] }[];
  provenance: {
    provider: "nvd" | "ghsa" | "cisa-kev" | "php" | "seed";
    providerRecordId: string;
    sourceUrl: string;
    retrievedAt: string;
    rawHash: string;
  }[];
};
