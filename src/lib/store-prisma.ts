import { PrismaClient, Prisma, type Patch as PatchRow, type AgentEvent as EventRow } from "@prisma/client";
import type { AgentEvent, Patch } from "./types";
import type { Backend } from "./store";

const g = globalThis as unknown as { __prisma?: PrismaClient };
export const prisma = (g.__prisma ??= new PrismaClient());

const iso = (d: Date | null) => (d ? d.toISOString() : null);
const date = (s: string | null) => (s ? new Date(s) : null);

function toEvent(r: EventRow): AgentEvent {
  return {
    id: r.id,
    timestamp: r.timestamp.toISOString(),
    eventType: r.eventType as AgentEvent["eventType"],
    status: r.status as AgentEvent["status"],
    environment: r.environment,
    dataMode: r.dataMode,
    source: r.source,
    message: r.message,
    cveId: r.cveId,
    repositoryId: r.repositoryId,
    patchId: r.patchId,
    metadata: (r.metadata ?? {}) as Record<string, unknown>,
    verificationUrl: r.verificationUrl,
  };
}

function toPatch(r: PatchRow): Patch {
  return {
    id: r.id,
    dataMode: r.dataMode,
    cveId: r.cveId,
    cveIds: r.cveIds,
    repository: r.repositoryId,
    file: r.file,
    change: { from: r.fromVersion, to: r.toVersion },
    changes: r.changes as Patch["changes"],
    branch: r.branch,
    ciUrl: r.ciUrl,
    stage: r.stage as Patch["stage"],
    ci: r.ciTotal != null ? { passed: r.ciPassed ?? 0, total: r.ciTotal } : null,
    prNumber: r.prNumber,
    prUrl: r.prUrl,
    commitSha: r.commitSha,
    timeline: {
      disclosedAt: r.disclosedAt.toISOString(),
      detectedAt: iso(r.detectedAt),
      matchedAt: iso(r.matchedAt),
      generatedAt: iso(r.generatedAt),
      testsPassedAt: iso(r.testsPassedAt),
      prOpenedAt: iso(r.prOpenedAt),
      mergedAt: iso(r.mergedAt),
    },
  };
}

const modeWhere = (mode: "REAL" | "ALL") => (mode === "REAL" ? { dataMode: "REAL" as const } : {});

export const prismaBackend: Backend = {
  kind: "postgres",
  async insertEvent(e) {
    await prisma.agentEvent.create({
      data: { ...e, timestamp: new Date(e.timestamp), metadata: e.metadata as Prisma.InputJsonValue },
    });
  },
  async savePatch(p) {
    const fields = {
      dataMode: p.dataMode,
      cveIds: p.cveIds,
      file: p.file,
      fromVersion: p.change.from,
      toVersion: p.change.to,
      changes: p.changes as Prisma.InputJsonValue,
      stage: p.stage,
      branch: p.branch,
      prNumber: p.prNumber,
      prUrl: p.prUrl,
      commitSha: p.commitSha,
      ciPassed: p.ci?.passed ?? null,
      ciTotal: p.ci?.total ?? null,
      ciUrl: p.ciUrl,
      disclosedAt: new Date(p.timeline.disclosedAt),
      detectedAt: date(p.timeline.detectedAt),
      matchedAt: date(p.timeline.matchedAt),
      generatedAt: date(p.timeline.generatedAt),
      testsPassedAt: date(p.timeline.testsPassedAt),
      prOpenedAt: date(p.timeline.prOpenedAt),
      mergedAt: date(p.timeline.mergedAt),
    };
    await prisma.patch.upsert({
      where: { id: p.id },
      update: fields,
      create: {
        id: p.id,
        ...fields,
        cve: { connectOrCreate: { where: { id: p.cveId }, create: { id: p.cveId, summary: "" } } },
        repository: { connectOrCreate: { where: { id: p.repository }, create: { id: p.repository, dataMode: p.dataMode } } },
      },
    });
  },
  async events(mode, limit) {
    return (await prisma.agentEvent.findMany({ where: modeWhere(mode), orderBy: { timestamp: "desc" }, take: limit })).map(toEvent);
  },
  async patches(mode) {
    return (await prisma.patch.findMany({ where: modeWhere(mode), orderBy: { detectedAt: "desc" }, take: 500 })).map(toPatch);
  },
  async patch(id) {
    const r = await prisma.patch.findUnique({ where: { id } });
    return r ? toPatch(r) : null;
  },
  async patchByBranch(repo, branch) {
    const r = await prisma.patch.findFirst({ where: { repositoryId: repo, branch } });
    return r ? toPatch(r) : null;
  },
  async sourceSeen(cveId, p) {
    return (await prisma.sourceRecord.count({ where: { cveId, provider: p.provider, providerRecordId: p.providerRecordId, rawHash: p.rawHash } })) > 0;
  },
  async saveSource(cve, p) {
    const fields = { summary: cve.summary, severity: cve.severity, cvss: cve.cvss, publishedAt: date(cve.published), modifiedAt: date(cve.modified) };
    await prisma.cVE.upsert({ where: { id: cve.id }, update: fields, create: { id: cve.id, ...fields } });
    await prisma.sourceRecord.create({
      data: { cveId: cve.id, provider: p.provider, providerRecordId: p.providerRecordId, sourceUrl: p.sourceUrl, retrievedAt: new Date(p.retrievedAt), rawHash: p.rawHash, publishedAt: date(cve.published), modifiedAt: date(cve.modified) },
    });
  },
  async cveFirstSeen(id) {
    const r = await prisma.cVE.findUnique({ where: { id }, select: { firstSeenAt: true } });
    return iso(r?.firstSeenAt ?? null);
  },
  async saveAuthorization(repo, installationId, source, active, policy) {
    await prisma.repository.upsert({ where: { id: repo }, update: { installationId }, create: { id: repo, installationId, dataMode: "REAL" } });
    const now = new Date();
    await prisma.repositoryAuthorization.upsert({
      where: { repositoryId_source: { repositoryId: repo, source } },
      update: { active, policy: (policy ?? Prisma.JsonNull) as Prisma.InputJsonValue, ...(active ? { grantedAt: now, revokedAt: null } : { revokedAt: now }) },
      create: { repositoryId: repo, source, active, policy: (policy ?? Prisma.JsonNull) as Prisma.InputJsonValue, grantedAt: now, revokedAt: active ? null : now },
    });
  },
  async ping() {
    await prisma.$queryRaw`SELECT 1`;
  },
};
