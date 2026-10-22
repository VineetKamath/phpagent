import type { Metadata } from "next";
import Link from "next/link";
import { php2shell } from "@/content/php2shell";
import { sources } from "@/content/sources";
import { getReleaseTable } from "@/lib/php-releases";
import { LifecycleExplainer } from "@/components/LifecycleExplainer";
import { VersionStack } from "@/components/VersionStack";
import { VersionChecker } from "@/components/VersionChecker";
import { Badge, Cite, PageHead } from "@/components/ui";
import { RuntimeStack3D } from "@/components/RuntimeStack3D";

export const revalidate = 600;
export const metadata: Metadata = {
  title: "PHP2Shell: case study",
  description: "What happened in the PHP runtime, why core-runtime bugs matter, which versions are fixed and what maintainers should do.",
  alternates: { canonical: "/research/php2shell" },
};

const ld = { "@context": "https://schema.org", "@type": "TechArticle", headline: "PHP2Shell: a core-runtime vulnerability case study", dateModified: "2026-10-22", about: php2shell.cves.map((c) => c.id) };

function Part({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="reveal grid gap-6 border-t border-line pt-12 md:grid-cols-[200px_1fr] md:gap-16">
      <div><p className="eyebrow">{n}</p><h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">{title}</h2></div>
      <div className="prose-ed [&>p:first-child]:mt-0">{children}</div>
    </section>
  );
}

export default async function Php2Shell() {
  const table = await getReleaseTable();
  return (
    <>
    <PageHead eyebrow="Research · case study" title={<>PHP2Shell.</>} aside={<div className="load"><RuntimeStack3D auto className="h-[40vh] [--s:clamp(170px,24vw,280px)]" /></div>}>
      A memory-safety failure in the runtime that sits beneath a large share of the web, and what a fast, permissioned defensive response looks like.
      <span className="mt-5 flex flex-wrap items-center gap-3 font-mono text-xs"><Badge label={php2shell.verification} />{php2shell.cves.map((c) => <Link key={c.id} href={`/cve/${c.id}`} className="rounded-full border border-line px-3 py-1 text-paper hover:border-php">{c.id} · {c.cvssV4}</Link>)}</span>
    </PageHead>
    <article className="mx-auto max-w-[1560px] px-4 pt-6 md:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />

      <div className="mt-10 space-y-16">
        <Part n="01" title="Disclosure">
          <p>On 21 October 2026, PHP published security releases for every supported branch, addressing {php2shell.cves.map((c, i) => <span key={c.id}>{i ? " and " : ""}<Link href={`/cve/${c.id}`}>{c.id}</Link><Cite id={c.sourceId} /></span>)}, each scored CVSS v4 {php2shell.cves[0].cvssV4}<Cite id="php-changelog-8" />.</p>
          <p>Identifiers and scores were confirmed against NVD and fixed versions against the php.net release index on 22 October 2026. The CVE pages query providers live and show what they return.</p>
        </Part>
        <Part n="02" title="The PHP runtime">
          <p>A PHP web application runs inside a runtime: typically PHP-FPM, a pool of long-lived worker processes. Each worker handles one request at a time, allocates memory for it, runs the application code, then resets before taking the next request.</p>
        </Part>
        <section className="border-t border-line pt-12"><p className="eyebrow mb-10">03 · What went wrong</p><LifecycleExplainer /></section>
        <Part n="04" title="Why core-runtime bugs matter">
          <p>A plugin vulnerability affects sites that installed that plugin. A runtime vulnerability affects every application running on an affected build, whatever its framework and however good its code. Exposure depends on which PHP build is deployed, which is often decided by a base image or OS package rather than by the application&apos;s developers.</p>
          <p>For scale: W3Techs reports PHP as the most common server-side language among websites whose server-side language it can identify<Cite id="w3techs-php" />. That measures detectable websites, not the whole Internet, and not how many are running an affected version.</p>
        </Part>
        <Part n="05" title="AI-assisted discovery">
          <p>Public accounts associate this discovery with AI-assisted research. We will attribute specific roles only after confirming primary sources<Cite id="research-pending" />. Either way, the general point stands: discovery is getting cheaper, so remediation needs to get faster.</p>
        </Part>
        <Part n="06" title="Coordinated response">
          <p>Fixes shipped as coordinated releases across supported branches at disclosure<Cite id="php-src-advisories" />. Downstream, official container images<Cite id="docker-php" /> and distribution packages then publish rebuilt artifacts. Every downstream step adds delay before an individual deployment is fixed.</p>
        </Part>
        <section className="border-t border-line pt-12">
          <p className="eyebrow mb-10">07 · Fixed versions</p>
          <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr]"><VersionStack table={table} /><VersionChecker fixed={table.fixed} /></div>
        </section>
        <Part n="08" title="What maintainers should do">
          <ul>
            <li>Update to the fixed release for your branch ({Object.values(php2shell.fixed).join(", ")}).</li>
            <li>Check where your runtime actually comes from: Dockerfile base image, compose file, CI image, OS package or hosting provider.</li>
            <li>Rebuild and redeploy images. Pinning a new version in a repository does nothing until it is deployed.</li>
            <li>If you are on 8.1 or older, plan a migration to a supported branch or confirm that your vendor backports fixes.</li>
          </ul>
        </Part>
        <Part n="09" title="How our agent would respond">
          <p>For each opted-in repository, the agent finds explicit pins such as <code>FROM php:8.4.26-fpm</code> and prepares an in-place bump to <code>8.4.27</code>. It validates the diff, lets the repository&apos;s CI run, and opens a PR on a new branch. Floating tags are left alone, and unsupported branches are marked HUMAN REVIEW REQUIRED. See <Link href="/methodology">methodology</Link>.</p>
        </Part>
        <Part n="10" title="Sources">
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            {sources.map((s) => <li key={s.id}>{s.url && s.verified ? <a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a> : s.title}: {s.publisher}{s.verified ? "" : " (verifying)"}</li>)}
          </ol>
        </Part>
      </div>
    </article>
    </>
  );
}
