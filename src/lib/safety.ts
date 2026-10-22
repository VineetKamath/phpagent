import type { FileChange } from "./patcher";

export const ALLOWED_FILES = [/^Dockerfile$/, /(^|\/)Dockerfile$/, /\.dockerfile$/i, /(^|\/)(docker-)?compose[\w.-]*\.ya?ml$/, /^\.github\/workflows\/[\w.-]+\.ya?ml$/, /(^|\/)composer\.(json|lock)$/];
const MAX_CHANGED_LINES = 20;

const SECRET_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bxox[abp]-[A-Za-z0-9-]{10,}/,
];
const DANGEROUS = [/curl[^\n|]*\|\s*(ba)?sh/, /\bwget[^\n|]*\|\s*(ba)?sh/, /base64\s+-d/, /\beval\s*\(/, /\bnc\s+-e\b/, /chmod\s+\+s\b/];

export type SafetyVerdict = { ok: true } | { ok: false; reasons: string[] };

/** Every generated change must pass this before it can reach tests, let alone a PR. */
export function validateChange(c: FileChange): SafetyVerdict {
  const reasons: string[] = [];
  if (c.path.includes("..") || c.path.startsWith("/")) reasons.push("path traversal");
  if (!ALLOWED_FILES.some((r) => r.test(c.path))) reasons.push(`file not in allowlist: ${c.path}`);

  const before = c.before.split("\n");
  const after = c.after.split("\n");
  if (before.length !== after.length) reasons.push("line count changed (only in-place version edits are allowed)");
  const changed = after.filter((l, i) => l !== before[i]);
  if (changed.length > MAX_CHANGED_LINES) reasons.push(`diff too large: ${changed.length} lines`);
  for (const l of changed) {
    if (SECRET_PATTERNS.some((p) => p.test(l))) reasons.push("possible secret in diff");
    if (DANGEROUS.some((p) => p.test(l))) reasons.push("dangerous content in diff");
  }
  return reasons.length ? { ok: false, reasons } : { ok: true };
}
