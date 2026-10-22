import type { Metadata } from "next";
import Link from "next/link";
import { nodes, zones } from "@/content/architecture";
import { ArchitectureDiagram } from "@/components/ArchitectureDiagram";
import { SequenceDiagram, StateMachine } from "@/components/Diagrams";
import { RuntimeStack3D } from "@/components/RuntimeStack3D";
import { TrustBoundaries } from "@/components/TrustBoundaries";

export const metadata: Metadata = {
  title: "Architecture",
  description: "How the agent works: components, trust boundaries, one run end to end, the patch state machine and the data model.",
  alternates: { canonical: "/architecture" },
};

const d = (i: number) => ({ "--i": i }) as React.CSSProperties;

const STACK: [string, string, string][] = [
  ["Web", "Next.js 15 · React 19 · Tailwind 4", "Server-rendered pages so crawlers and AI evaluators can read everything without running JS."],
  ["Realtime", "Server-Sent Events", "One in-process bus; every event is persisted before it is broadcast."],
  ["Data", "Postgres (Neon) · Prisma 6", "15 tables. Events, patches, source records with raw hashes, authorizations."],
  ["Scheduling", "node-cron · external cron", "*/15 in-process plus a bearer-protected backup trigger; single-flight runs."],
  ["GitHub", "GitHub App · REST v3", "JWT → installation tokens. Serialised, spaced calls with rate-limit back-off."],
  ["Advisories", "NVD 2.0 · GHSA · CISA KEV · php.net", "Merged into one schema, provenance kept per provider."],
  ["Validation", "zod · yaml (aliases off)", "Strict .patchbot schema; unknown keys rejected; no command fields exist."],
  ["Treasury", "Solana JSON-RPC (read-only)", "Public address only. No key material anywhere in the codebase."],
];

const TABLES: [string, string][] = [
  ["AgentEvent", "id · timestamp · eventType · dataMode · message · cveId · repositoryId · patchId · metadata · verificationUrl"],
  ["Patch", "id (fingerprint) · stage · repository · cveIds · changes · branch · prUrl · commitSha · ci · detected/matched/generated/prOpened/merged"],
  ["CVE / SourceRecord", "id · severity · cvss · firstSeenAt ⟶ provider · providerRecordId · sourceUrl · retrievedAt · rawHash"],
  ["Repository / Authorization", "owner/repo · installationId ⟶ source (github-app | patchbot) · active · policy · granted/revoked"],
  ["TreasuryTransaction / ComputeExpense", "signature · direction · lamports ⟶ category · amount · period · evidence"],
];

export default function Architecture() {
  return (
    <>
      <section className="relative isolate overflow-hidden">
        <div className="grid-bg absolute inset-0 -z-10" />
        <div className="glow-php absolute inset-0 -z-10 opacity-80" />
        <div className="mx-auto grid max-w-[1560px] items-center gap-8 px-4 py-16 md:px-8 lg:grid-cols-[1.1fr_1fr] lg:py-24">
          <div>
            <p className="eyebrow load">/architecture</p>
            <h1 className="display mt-6">
              <span className="mask-load"><span>How the agent</span></span>
              <span className="mask-load" style={d(1)}><span className="text-grad">actually works.</span></span>
            </h1>
            <p className="load mt-8 max-w-xl text-lg leading-relaxed text-steel" style={d(2)}>
              Five zones, twenty-six components, one rule: content from the outside world is data, never instruction. Every arrow below is a real call in the codebase, and every record it produces is persisted before anyone sees it.
            </p>
            <div className="load mt-8 flex flex-wrap gap-2 font-mono text-[11px]" style={d(3)}>
              {zones.map((z) => <span key={z.id} className="rounded-full border border-line bg-ink/50 px-3 py-1.5 text-steel">{z.label}</span>)}
            </div>
          </div>
          <div className="load" style={d(2)}><RuntimeStack3D auto className="h-[44vh] [--s:clamp(180px,26vw,300px)]" /></div>
        </div>
      </section>

      <Block n="01" title="System map" lead="Hover any component to see its inputs, outputs and the trust boundary it enforces. Dashed zones hold untrusted data; the solid zone is the only place code runs.">
        <ArchitectureDiagram />
      </Block>

      <Block n="02" title="One run, end to end" lead="From a scheduler tick to a verified merge. Steps 01 to 09 happen inside a single run; 10 to 15 arrive later as signed webhooks.">
        <SequenceDiagram />
      </Block>

      <Block n="03" title="Patch state machine" lead="A patch's id is a fingerprint of repository, campaign and exact edits. Any fingerprint in a terminal state is skipped on later runs, which is what makes the worker idempotent.">
        <StateMachine />
      </Block>

      <Block n="04" title="Trust boundaries" lead="Where each kind of input is allowed to go, and what stops it going further.">
        <TrustBoundaries />
      </Block>

      <Block n="05" title="Technology" lead="Boring, inspectable choices. No WebGL, no model in the write path.">
        <dl className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-2">
          {STACK.map(([k, v, why], i) => (
            <div key={k} className="reveal bg-ink-2 p-5" style={d(i % 4)}>
              <dt className="eyebrow">{k}</dt>
              <dd className="mt-2 font-mono text-sm text-paper">{v}</dd>
              <dd className="mt-1 text-sm text-steel">{why}</dd>
            </div>
          ))}
        </dl>
      </Block>

      <Block n="06" title="Data model" lead="Everything the public pages show is a query over these tables. See prisma/schema.prisma.">
        <ul className="divide-y divide-line rounded-2xl border border-line bg-ink-2">
          {TABLES.map(([t, f]) => (
            <li key={t} className="reveal grid gap-1 px-5 py-4 md:grid-cols-[280px_1fr]">
              <span className="font-mono text-sm text-php">{t}</span>
              <span className="font-mono text-xs leading-relaxed text-steel">{f}</span>
            </li>
          ))}
        </ul>
      </Block>

      <Block n="07" title="Every component, in text" lead="The same information as the system map, for screen readers, crawlers and anyone who prefers a list.">
        <div className="grid gap-x-10 md:grid-cols-2">
          {nodes.map((n) => (
            <div key={n.id} className="border-b border-line py-4">
              <p className="font-medium">{n.title} <span className="font-mono text-xs text-php">{n.sub}</span></p>
              <p className="mt-1 text-sm text-steel">{n.does} <span className="text-dim">{n.trust}</span></p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-sm text-steel">Next: <Link className="text-php hover:underline" href="/methodology">methodology</Link> · <Link className="text-php hover:underline" href="/security">security model</Link> · <a className="text-php hover:underline" href="/status.json">live status</a></p>
      </Block>
    </>
  );
}

function Block({ n, title, lead, children }: { n: string; title: string; lead: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-[1560px] px-4 pt-20 md:px-8 md:pt-24">
      <div className="grid gap-4 md:grid-cols-[1fr_1.2fr] md:items-end">
        <div>
          <p className="eyebrow reveal flex items-center gap-3"><span className="h-px w-8 bg-php" />{n}</p>
          <h2 className="h-section reveal mt-4" style={d(1)}>{title}</h2>
        </div>
        <p className="reveal max-w-xl text-steel md:justify-self-end" style={d(2)}>{lead}</p>
      </div>
      <div className="reveal mt-8" style={d(2)}>{children}</div>
    </section>
  );
}
