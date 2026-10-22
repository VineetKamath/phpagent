import { AgentEvent, Patch, type DataMode } from "./types";
import type { NormalizedCve } from "./types";

/**
 * Ledger store. Postgres (Prisma) when DATABASE_URL is set, in-memory otherwise.
 * Invariants:
 *  - DEMO records are rejected before reaching any backend unless DEMO_MODE=true.
 *  - REAL reads never return DEMO records.
 *  - Every record is persisted before it is emitted on the in-process SSE bus.
 */
export type Provenance = NormalizedCve["provenance"][number];
export type CveRow = { id: string; summary: string; severity: string | null; cvss: number | null; published: string | null; modified: string | null };

export interface Backend {
  kind: "postgres" | "memory";
  insertEvent(e: AgentEvent): Promise<void>;
  savePatch(p: Patch): Promise<void>;
  events(mode: ReadMode, limit: number): Promise<AgentEvent[]>;
  patches(mode: ReadMode): Promise<Patch[]>;
  patch(id: string): Promise<Patch | null>;
  patchByBranch(repo: string, branch: string): Promise<Patch | null>;
  sourceSeen(cveId: string, p: Provenance): Promise<boolean>;
  saveSource(cve: CveRow, p: Provenance): Promise<void>;
  cveFirstSeen(id: string): Promise<string | null>;
  saveAuthorization(repo: string, installationId: number | null, source: string, active: boolean, policy: unknown): Promise<void>;
  getSetting(key: string): Promise<{ value: string; updatedAt: string } | null>;
  setSetting(key: string, value: string): Promise<void>;
  ping(): Promise<void>;
}

/** "REAL" → real records only; "ALL" → real and demo (only reachable in DEMO_MODE). */
export type ReadMode = "REAL" | "ALL";
const keep = (mode: ReadMode) => (r: { dataMode: DataMode }) => mode === "ALL" || r.dataMode === "REAL";

type Listener = (e: AgentEvent) => void;
type ConfigListener = (key: string, value: string) => void;
type Mem = { settings: Map<string, { value: string; updatedAt: string }>; configListeners: Set<ConfigListener>; events: AgentEvent[]; patches: Map<string, Patch>; sources: Set<string>; cves: Map<string, string>; auth: Map<string, { active: boolean; at: string }>; listeners: Set<Listener>; backend?: Backend };
const g = globalThis as unknown as { __ledger?: Mem };
const mem: Mem = (g.__ledger ??= { settings: new Map(), configListeners: new Set(), events: [], patches: new Map(), sources: new Set(), cves: new Map(), auth: new Map(), listeners: new Set() });

const memoryBackend: Backend = {
  kind: "memory",
  async insertEvent(e) {
    mem.events.push(e);
    if (mem.events.length > 5000) mem.events.splice(0, mem.events.length - 5000);
  },
  async savePatch(p) {
    mem.patches.set(p.id, p);
  },
  async events(mode, limit) {
    return mem.events.filter(keep(mode)).slice(-limit).reverse();
  },
  async patches(mode) {
    return [...mem.patches.values()].filter(keep(mode)).sort((a, b) => (b.timeline.detectedAt ?? "").localeCompare(a.timeline.detectedAt ?? ""));
  },
  async patch(id) {
    return mem.patches.get(id) ?? null;
  },
  async patchByBranch(repo, branch) {
    return [...mem.patches.values()].find((p) => p.repository === repo && p.branch === branch) ?? null;
  },
  async sourceSeen(cveId, p) {
    return mem.sources.has(`${cveId}|${p.provider}|${p.providerRecordId}|${p.rawHash}`);
  },
  async saveSource(cve, p) {
    if (!mem.cves.has(cve.id)) mem.cves.set(cve.id, new Date().toISOString());
    mem.sources.add(`${cve.id}|${p.provider}|${p.providerRecordId}|${p.rawHash}`);
  },
  async cveFirstSeen(id) {
    return mem.cves.get(id) ?? null;
  },
  async saveAuthorization(repo, _i, source, active) {
    mem.auth.set(`${repo}|${source}`, { active, at: new Date().toISOString() });
  },
  async getSetting(key) {
    return mem.settings.get(key) ?? null;
  },
  async setSetting(key, value) {
    mem.settings.set(key, { value, updatedAt: new Date().toISOString() });
  },
  async ping() {},
};

function backend(): Backend {
  if (mem.backend) return mem.backend;
  if (process.env.DATABASE_URL) {
    // Loaded lazily so memory mode never initialises a Prisma client.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mem.backend = (require("./store-prisma") as typeof import("./store-prisma")).prismaBackend;
  } else mem.backend = memoryBackend;
  return mem.backend;
}

export function isDemoEnv(): boolean {
  return process.env.DEMO_MODE === "true";
}

function assertWritable(mode: DataMode) {
  if (mode === "DEMO" && !isDemoEnv()) throw new Error("DEMO records may not be written outside DEMO_MODE");
}

export async function appendEvent(e: AgentEvent): Promise<void> {
  const parsed = AgentEvent.parse(e);
  assertWritable(parsed.dataMode);
  await backend().insertEvent(parsed);
  for (const l of mem.listeners) l(parsed);
}

export async function upsertPatch(p: Patch): Promise<void> {
  const parsed = Patch.parse(p);
  assertWritable(parsed.dataMode);
  await backend().savePatch(parsed);
}

export const listEvents = (mode: ReadMode, limit = 200) => backend().events(mode, limit);
export const listPatches = (mode: ReadMode) => backend().patches(mode);
export async function getPatch(id: string, mode: ReadMode = "REAL"): Promise<Patch | undefined> {
  const p = await backend().patch(id);
  return p && keep(mode)(p) ? p : undefined;
}
export async function getPatchByBranch(repo: string, branch: string): Promise<Patch | undefined> {
  const p = await backend().patchByBranch(repo, branch);
  return p && p.dataMode === "REAL" ? p : undefined;
}
export const hasSource = (cveId: string, p: Provenance) => backend().sourceSeen(cveId, p);
export const recordSource = (cve: CveRow, p: Provenance) => backend().saveSource(cve, p);
export const cveFirstSeen = (id: string) => backend().cveFirstSeen(id);
export const recordAuthorization = (repo: string, installationId: number | null, source: "github-app" | "patchbot", active: boolean, policy: unknown = null) =>
  backend().saveAuthorization(repo, installationId, source, active, policy);
export const pingDatabase = () => backend().ping();
export const getSetting = (key: string) => backend().getSetting(key);

/** Persist first, then notify open SSE streams so every page updates without a reload. */
export async function setSetting(key: string, value: string): Promise<void> {
  await backend().setSetting(key, value);
  for (const l of mem.configListeners) l(key, value);
}

export function subscribeConfig(l: ConfigListener): () => void {
  mem.configListeners.add(l);
  return () => {
    mem.configListeners.delete(l);
  };
}

export function subscribe(l: Listener): () => void {
  mem.listeners.add(l);
  return () => {
    mem.listeners.delete(l);
  };
}

export function persistence(): "postgres" | "memory" {
  return process.env.DATABASE_URL ? "postgres" : "memory";
}

/** Tests only. */
export function __reset() {
  mem.events.length = 0;
  mem.patches.clear();
  mem.sources.clear();
  mem.cves.clear();
  mem.auth.clear();
  mem.settings.clear();
  mem.backend = undefined;
}
export function __setBackend(b: Backend | undefined) {
  mem.backend = b;
}
