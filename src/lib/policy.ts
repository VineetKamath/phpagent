import { z } from "zod";
import { parse } from "yaml";

/**
 * .patchbot schema. Strict: unknown keys are rejected, so a repository cannot smuggle
 * in shell commands or behaviour flags. Test commands never come from this file.
 */
export const PatchbotPolicy = z
  .object({
    version: z.literal(1),
    enabled: z.boolean(),
    severity: z.array(z.enum(["critical", "high", "medium", "low"])).min(1).default(["critical", "high"]),
    patches: z
      .object({ dependencies: z.boolean().default(true), containers: z.boolean().default(true), ci: z.boolean().default(true) })
      .strict()
      .default({}),
    pull_requests: z.object({ enabled: z.boolean().default(true), draft: z.boolean().default(false) }).strict().default({}),
    verification: z
      .object({ require_ci: z.boolean().default(true), require_human_review: z.boolean().default(false) })
      .strict()
      .default({}),
  })
  .strict();
export type PatchbotPolicy = z.infer<typeof PatchbotPolicy>;

export type PolicyResult = { ok: true; policy: PatchbotPolicy } | { ok: false; error: string };

export function parsePolicy(src: string): PolicyResult {
  if (src.length > 8192) return { ok: false, error: "policy file too large" };
  let raw: unknown;
  try {
    raw = parse(src, { maxAliasCount: 0 });
  } catch (e) {
    return { ok: false, error: `invalid YAML: ${(e as Error).message}` };
  }
  const r = PatchbotPolicy.safeParse(raw);
  return r.success ? { ok: true, policy: r.data } : { ok: false, error: r.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ") };
}

export type Authorization = { source: "github-app" | "patchbot"; installed: boolean; policy: PatchbotPolicy | null };

/** A write is authorized only if the App is installed on the repo AND policy (if present) allows it. */
export function mayWrite(a: Authorization, severity: "critical" | "high" | "medium" | "low", kind: "dependencies" | "containers" | "ci"): boolean {
  if (!a.installed) return false;
  if (!a.policy) return a.source === "github-app";
  const p = a.policy;
  return p.enabled && p.pull_requests.enabled && p.severity.includes(severity) && p.patches[kind];
}
