import { php2shell } from "@/content/php2shell";

export type Semver = [number, number, number];

export function parseVersion(v: string): Semver | null {
  const m = /^\s*v?(\d+)\.(\d+)(?:\.(\d+))?/.exec(v);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3] ?? 0)];
}

export function compare(a: Semver, b: Semver): number {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

export type CheckResult =
  | { status: "PATCHED"; entered: string; fixedIn: string }
  | { status: "UPDATE_REQUIRED"; entered: string; fixedIn: string }
  | { status: "UNSUPPORTED"; entered: string; note: string }
  | { status: "INVALID"; entered: string };

/** Compare a user-entered PHP version against the fixed-release table. No network, no scanning. */
export function checkPhpVersion(input: string, fixed: Record<string, string> = php2shell.fixed): CheckResult {
  const v = parseVersion(input);
  if (!v) return { status: "INVALID", entered: input };
  const entered = v.join(".");
  const fix = fixed[`${v[0]}.${v[1]}`];
  if (!fix) {
    return {
      status: "UNSUPPORTED",
      entered,
      note: "This branch receives no upstream security fixes. Migrate to a supported branch or obtain fixes from your OS or vendor.",
    };
  }
  const fv = parseVersion(fix)!;
  return compare(v, fv) >= 0 ? { status: "PATCHED", entered, fixedIn: fix } : { status: "UPDATE_REQUIRED", entered, fixedIn: fix };
}
