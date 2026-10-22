import Link from "next/link";
import { brand } from "@/content/brand";
import { php2shell } from "@/content/php2shell";
import { getReleaseTable } from "@/lib/php-releases";
import { RuntimeStack3D } from "@/components/RuntimeStack3D";
import { ScrollStory } from "@/components/ScrollStory";
import { HeroStatus } from "@/components/HeroStatus";
import { VersionStack } from "@/components/VersionStack";
import { VersionChecker } from "@/components/VersionChecker";
import { Pipeline } from "@/components/Pipeline";
import { AgentTheater } from "@/components/AgentTheater";
import { PatcherPlayground } from "@/components/PatcherPlayground";
import { ArchitectureDiagram } from "@/components/ArchitectureDiagram";
import { SequenceDiagram } from "@/components/Diagrams";
import { MetricsStrip } from "@/components/LiveWork";
import { Badge, Cite, Section } from "@/components/ui";

export const revalidate = 600;
const d = (i: number) => ({ "--i": i }) as React.CSSProperties;

export default async function Home() {
  const table = await getReleaseTable();
  return (
    <>
      {/* HERO */}
      <section className="relative isolate overflow-hidden">
        <div className="grid-bg absolute inset-0 -z-10" />
        <div className="glow-php absolute inset-0 -z-10" />
        <div className="mx-auto grid min-h-[calc(100svh-3.5rem)] max-w-[1560px] content-center gap-8 px-4 py-10 md:px-8 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          <div>
            <p className="eyebrow load flex items-center gap-2 text-php!"><span className="h-1.5 w-1.5 rounded-full bg-ok pulse" /> {brand.shortName} AGENT · {php2shell.name} RESPONSE</p>
            <h1 className="display mt-7">
              <span className="mask-load" style={d(0)}><span>Software breaks.</span></span>
              <span className="mask-load" style={d(1)}><span className="text-grad">The patch</span></span>
              <span className="mask-load" style={d(2)}><span className="text-grad">shouldn&apos;t wait.</span></span>
            </h1>
            <p className="load mt-8 max-w-xl text-lg leading-relaxed text-steel md:text-xl" style={d(4)}>
              PHP2Shell broke the runtime under a large share of the web. This agent watches the advisories, finds opted-in repositories still pinning a vulnerable PHP, and opens a tested pull request. Every step is public.
            </p>
            <div className="load mt-9 flex flex-wrap gap-3" style={d(5)}>
              <Link href="/check" className="rounded-full bg-paper px-6 py-3 text-sm font-semibold text-ink shadow-[0_10px_40px_-10px_rgba(255,255,255,.45)] transition hover:bg-php-glow">Check a public repo</Link>
              <Link href="#watch" className="rounded-full bg-php-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_40px_-10px_rgba(119,123,180,.9)] transition hover:bg-php-glow hover:text-ink">Watch it work</Link>
              <Link href="/architecture" className="rounded-full border border-line bg-ink/40 px-6 py-3 text-sm font-medium backdrop-blur transition hover:border-php">See the architecture</Link>
              <Link href="/research/php2shell" className="px-2 py-3 text-sm text-steel hover:text-paper">PHP2Shell case →</Link>
            </div>
            <p className="load mt-4 font-mono text-xs text-steel" style={d(6)}>No installation needed for a public check. Results are read-only and never create a pull request.</p>
          </div>
          <div className="load floaty" style={d(3)}>
            <RuntimeStack3D auto className="h-[46vh] [--s:clamp(190px,30vw,340px)] lg:h-[64vh]" />
          </div>
          <div className="load lg:col-span-2" style={d(6)}><HeroStatus /></div>
        </div>
      </section>

      {/* SCROLL STORY */}
      <ScrollStory />

      {/* INCIDENT */}
      <section className="band">
        <div className="mx-auto max-w-[1560px] px-4 py-20 md:px-8 md:py-28">
          <p className="eyebrow reveal flex items-center gap-3"><span className="h-px w-8 bg-php" />01 · The incident</p>
          <div className="mt-6 grid gap-12 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <h2 className="h-section reveal max-w-[13ch]" style={d(1)}>One bug class. <span className="text-php">A foundation of the web.</span></h2>
              <div className="prose-ed reveal" style={d(2)}>
                <p>W3Techs reports PHP as the most common server-side language among websites whose server-side language it can detect<Cite id="w3techs-php" />. That measures detectable websites, not the whole Internet.</p>
                <p>PHP2Shell is a set of vulnerabilities in the <strong className="text-paper">PHP runtime itself</strong>, not in one plugin or framework. A well-written application still inherits exposure from the runtime underneath it.</p>
              </div>
            </div>
            <dl className="reveal grid grid-cols-2 gap-px self-start overflow-hidden rounded-2xl border border-line bg-line" style={d(2)}>
              {php2shell.cves.map((c) => (
                <div key={c.id} className="bg-ink-2 p-6">
                  <dt className="font-mono text-sm"><Link href={`/cve/${c.id}`} className="hover:text-php">{c.id}</Link><Cite id={c.sourceId} /></dt>
                  <dd className="mt-5 font-mono text-5xl tracking-tight text-crit md:text-6xl">{c.cvssV4}</dd>
                  <dd className="eyebrow mt-1">CVSS v4 · critical</dd>
                </div>
              ))}
              <div className="col-span-2 flex items-center justify-between bg-ink-2 p-6">
                <div><dt className="eyebrow">Disclosed</dt><dd className="mt-2 font-mono text-2xl">21 OCT 2026</dd></div>
                <Badge label={php2shell.verification} />
              </div>
            </dl>
          </div>
          <div className="mt-16 grid gap-10 lg:grid-cols-[1.3fr_1fr]">
            <div className="reveal"><p className="eyebrow mb-5">PHP release branches</p><VersionStack table={table} /></div>
            <div className="reveal" style={d(1)}><VersionChecker fixed={table.fixed} /></div>
          </div>
        </div>
      </section>

      {/* AI */}
      <section className="mx-auto max-w-[1560px] px-4 py-24 md:px-8 md:py-32">
        <p className="eyebrow reveal flex items-center gap-3"><span className="h-px w-8 bg-php" />02 · The AI inflection</p>
        <h2 className="display mt-6 max-w-[15ch] text-[clamp(44px,7.5vw,128px)]!">
          <span className="mask"><span>Discovery got faster.</span></span>
          <span className="mask" style={d(1)}><span className="text-grad">Patching has to follow.</span></span>
        </h2>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {[
            ["Find", "AI-assisted research shortens the path from source code to a credible bug report, even in runtimes that survived years of scrutiny."],
            ["Disclose", "Coordinated releases ship fixes, but disclosure also tells everyone where to look."],
            ["Repair", "Thousands of repositories each have to notice, bump, test and merge. That last mile is mechanical, and this agent automates it."],
          ].map(([k, v], i) => (
            <div key={k} className="reveal rounded-2xl border border-line bg-ink-2/60 p-6" style={d(i)}>
              <p className="font-mono text-xs text-php">0{i + 1} · {k.toUpperCase()}</p>
              <p className="mt-3 leading-relaxed text-steel">{v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WATCH */}
      <section id="watch" className="band scroll-mt-14">
        <div className="mx-auto max-w-[1560px] px-4 py-20 md:px-8 md:py-28">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow reveal flex items-center gap-3"><span className="h-px w-8 bg-php" />03 · Watch it work</p>
              <h2 className="h-section reveal mt-5 max-w-[14ch]" style={d(1)}>What it&apos;s fixing. Why. <span className="text-php">Live.</span></h2>
            </div>
            <Link href="/live" className="reveal font-mono text-xs text-php hover:underline">FULL EVENT STREAM →</Link>
          </div>
          <div className="reveal mt-10" style={d(2)}><AgentTheater /></div>
          <div className="reveal mt-6" style={d(3)}><MetricsStrip /></div>
          <div className="mt-16">
            <p className="eyebrow reveal">Try the patcher · the production code, running in your browser</p>
            <div className="reveal mt-5" style={d(1)}><PatcherPlayground /></div>
          </div>
        </div>
      </section>

      {/* START HERE */}
      <section className="mx-auto max-w-[1560px] px-4 py-24 md:px-8 md:py-32">
        <p className="eyebrow reveal flex items-center gap-3"><span className="h-px w-8 bg-php" />04 · Start here</p>
        <h2 className="h-section reveal mt-5 max-w-[16ch]" style={d(1)}>Check first. <span className="text-php">Protect with permission.</span></h2>
        <p className="reveal mt-5 max-w-2xl text-lg leading-relaxed text-steel" style={d(2)}>Use the public checker to see an explicit PHP runtime pin and a proposed version bump. Install the GitHub App only when you want phpagent to monitor a repository and open a pull request.</p>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <article className="reveal rounded-3xl border border-php/50 bg-gradient-to-br from-php-deep/35 to-ink-2 p-8" style={d(1)}>
            <p className="font-mono text-xs text-php">01 · READ-ONLY</p>
            <h3 className="mt-4 text-3xl font-semibold tracking-tight">Check a public repo</h3>
            <p className="mt-3 max-w-lg leading-relaxed text-steel">Paste <code className="font-mono text-sm text-paper">owner/repository</code>. The checker reads supported PHP pins and shows a proposed diff. It does not require an App install, make a branch, or create a pull request.</p>
            <Link href="/check" className="mt-7 inline-block rounded-full bg-paper px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-php-glow">Open public checker</Link>
          </article>
          <article className="reveal rounded-3xl border border-line bg-ink-2 p-8" style={d(2)}>
            <p className="font-mono text-xs text-ok">02 · AUTHORIZED</p>
            <h3 className="mt-4 text-3xl font-semibold tracking-tight">Protect your repository</h3>
            <p className="mt-3 max-w-lg leading-relaxed text-steel">Install the GitHub App on repositories you control. The agent scans only those selected repositories and can open a reviewable <code className="font-mono text-sm text-paper">patch-agent/*</code> pull request when a supported vulnerable pin is found.</p>
            <Link href="/protect" className="mt-7 inline-block rounded-full border border-line px-5 py-2.5 text-sm font-medium transition hover:border-php">Install GitHub App</Link>
          </article>
        </div>
      </section>

      {/* ARCHITECTURE */}
      <Section n="04 · Architecture" title={<>Every box is real code. <span className="text-php">Hover to inspect.</span></>}>
        <ArchitectureDiagram />
        <div className="mt-14">
          <p className="eyebrow mb-5">One run, end to end</p>
          <SequenceDiagram />
        </div>
        <p className="mt-6 text-sm text-steel"><Link href="/architecture" className="text-php hover:underline">Full architecture, trust boundaries and data model →</Link></p>
      </Section>

      {/* PIPELINE */}
      <Section n="05 · From disclosure to pull request" title={<>Eleven stages. <span className="text-php">Each one recorded.</span></>}>
        <Pipeline />
      </Section>

      {/* VERIFY / FUND / PAPER / OPT-IN */}
      <section className="mx-auto max-w-[1560px] px-4 pt-24 md:px-8 md:pt-32">
        <p className="eyebrow reveal flex items-center gap-3"><span className="h-px w-8 bg-php" />06 · Verify · fund · read · opt in</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="reveal rounded-3xl border border-line bg-ink-2 p-7">
            <h3 className="text-3xl font-semibold tracking-tight">Don&apos;t trust the agent. Verify it.</h3>
            <p className="mt-3 text-steel">REAL-only ledger. Every row links to GitHub or NVD. Simulated records can never enter it.</p>
            <pre className="mt-5 overflow-x-auto rounded-xl border border-line bg-ink p-4 font-mono text-[12px] leading-relaxed text-steel">{`[
  "kind"   => "pr.merged",
  "repo"   => "owner/repo",
  "url"    => "https://github.com/…/pull/…",
  "commit" => "<merge sha>",
  "mode"   => "REAL",
]`}</pre>
            <div className="mt-5 flex flex-wrap gap-4 font-mono text-xs"><Link className="text-php" href="/proof">/proof</Link><a className="text-php" href="/status.json">/status.json</a><a className="text-php" href="/project.json">/project.json</a><a className="text-php" href="/llms.txt">/llms.txt</a></div>
          </article>
          <article className="reveal rounded-3xl border border-line bg-ink-2 p-7" style={d(1)}>
            <h3 className="text-3xl font-semibold tracking-tight">Compute has a cost. Show the receipts.</h3>
            <p className="mt-3 text-steel">A public, read-only treasury pays for inference, database and RPC. No yield, no returns, no price claims.</p>
            <ol className="mt-6 flex flex-wrap items-center gap-2 font-mono text-xs">
              {["FEES", "TREASURY", "COMPUTE", "PATCH"].map((x, i) => <li key={x} className="flex items-center gap-2"><span className="rounded-full border border-php-deep bg-php-deep/15 px-4 py-2">{x}</span>{i < 3 && <span className="text-dim">→</span>}</li>)}
            </ol>
            <Link className="mt-6 inline-block text-sm text-php hover:underline" href="/treasury">Treasury →</Link>
          </article>
          <article className="reveal rounded-3xl border border-line bg-gradient-to-br from-php-deep/30 to-ink-2 p-7" style={d(2)}>
            <h3 className="text-3xl font-semibold tracking-tight">Autonomous patching: the whitepaper.</h3>
            <p className="mt-3 text-steel">Twenty sections on the authorization model, threat model, prompt-injection defense, failure modes and limitations.</p>
            <div className="mt-6 flex gap-3"><Link href="/whitepaper" className="rounded-full bg-paper px-5 py-2.5 text-sm font-medium text-ink">Read</Link><Link href="/whitepaper/print" className="rounded-full border border-line px-5 py-2.5 text-sm">PDF</Link></div>
          </article>
          <article className="reveal rounded-3xl border border-line bg-ink-2 p-7" style={d(3)}>
            <h3 className="text-3xl font-semibold tracking-tight">Opt in. Least privilege.</h3>
            <pre className="mt-4 overflow-x-auto rounded-xl border border-line bg-ink p-4 font-mono text-[12px] leading-relaxed">{`# .patchbot
version: 1
enabled: true
severity: [critical, high]
patches: { containers: true, dependencies: true }
verification: { require_ci: true }`}</pre>
            <Link className="mt-5 inline-block text-sm text-php hover:underline" href="/protect">Protect your repo →</Link>
          </article>
        </div>
      </section>
    </>
  );
}
