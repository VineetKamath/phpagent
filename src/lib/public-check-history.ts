import type { PublicCheck } from "./public-repo";

export type PublicCheckHistoryEntry = PublicCheck & { checkedAt: string };

type Row = PublicCheckHistoryEntry;
type DatabaseRow = {
  repository: string;
  url: string;
  defaultBranch: string;
  scannedFiles: number;
  changes: unknown;
  reviews: unknown;
  checkedAt: Date;
};
type ChecksDelegate = {
  upsert(args: { where: { repository: string }; update: Omit<DatabaseRow, "repository" | "checkedAt">; create: Omit<DatabaseRow, "checkedAt"> }): Promise<DatabaseRow>;
  findMany(args: { orderBy: { checkedAt: "desc" }; take: number }): Promise<DatabaseRow[]>;
};
type ChecksDatabase = { publicRepositoryCheck: ChecksDelegate };
const g = globalThis as unknown as { __publicCheckHistory?: Map<string, Row> };
const memory = (g.__publicCheckHistory ??= new Map<string, Row>());

function canUseDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * Records an actual completed public inspection. This never creates Patch,
 * RepositoryAuthorization, AgentEvent, a branch, or a pull request.
 */
export async function savePublicCheck(check: PublicCheck): Promise<PublicCheckHistoryEntry> {
  const checkedAt = new Date().toISOString();
  const entry = { ...check, checkedAt };
  if (!canUseDatabase()) {
    memory.set(entry.repository, entry);
    return entry;
  }
  // Lazy loading keeps local no-database development independent of Prisma.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { prisma } = require("./store-prisma") as typeof import("./store-prisma");
  const checks = prisma as unknown as ChecksDatabase;
  const row = await checks.publicRepositoryCheck.upsert({
    where: { repository: check.repository },
    update: { url: check.url, defaultBranch: check.defaultBranch, scannedFiles: check.scannedFiles, changes: check.changes, reviews: check.reviews },
    create: { repository: check.repository, url: check.url, defaultBranch: check.defaultBranch, scannedFiles: check.scannedFiles, changes: check.changes, reviews: check.reviews },
  });
  return { repository: row.repository, url: row.url, defaultBranch: row.defaultBranch, scannedFiles: row.scannedFiles, changes: row.changes as PublicCheck["changes"], reviews: row.reviews as PublicCheck["reviews"], checkedAt: row.checkedAt.toISOString() };
}

export async function listPublicChecks(limit = 30): Promise<PublicCheckHistoryEntry[]> {
  if (!canUseDatabase()) return [...memory.values()].sort((a, b) => b.checkedAt.localeCompare(a.checkedAt)).slice(0, limit);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { prisma } = require("./store-prisma") as typeof import("./store-prisma");
  const checks = prisma as unknown as ChecksDatabase;
  const rows = await checks.publicRepositoryCheck.findMany({ orderBy: { checkedAt: "desc" }, take: limit });
  return rows.map((row) => ({ repository: row.repository, url: row.url, defaultBranch: row.defaultBranch, scannedFiles: row.scannedFiles, changes: row.changes as PublicCheck["changes"], reviews: row.reviews as PublicCheck["reviews"], checkedAt: row.checkedAt.toISOString() }));
}
