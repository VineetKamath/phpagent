import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/content/brand";
import { paper, sections } from "@/content/whitepaper";
import { PageHead } from "@/components/ui";

export const metadata: Metadata = { title: "Whitepaper", description: paper.subtitle, alternates: { canonical: "/whitepaper" } };

const ld = { "@context": "https://schema.org", "@type": "TechArticle", headline: paper.title, description: paper.subtitle, publisher: { "@type": "Organization", name: brand.brandName }, dateModified: "2026-10-22" };

export default function Whitepaper() {
  return (
    <>
    <PageHead eyebrow={`Whitepaper · ${paper.version}`} title={paper.title} meta={[["sections", String(sections.length)], ["audience", "everyone"], ["exploit_details", "none"], ["pdf", "/whitepaper/print"]]}>
      {paper.subtitle}
      <span className="mt-5 flex gap-3"><Link href="#abstract" className="rounded-full bg-php-500 px-5 py-2.5 text-sm font-semibold text-white">Start reading</Link><Link href="/whitepaper/print" className="rounded-full border border-line px-5 py-2.5 text-sm text-paper">Print / PDF</Link></span>
    </PageHead>
    <article className="mx-auto max-w-[1560px] px-4 pt-14 md:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <div className="grid gap-16 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Contents" className="no-print hidden lg:block">
          <ol className="sticky top-24 space-y-1.5 font-mono text-xs text-steel">
            {sections.map((s, i) => <li key={s.id}><a className="hover:text-paper" href={`#${s.id}`}>{String(i + 1).padStart(2, "0")} {s.title}</a></li>)}
          </ol>
        </nav>
        <div className="prose-ed">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="reveal scroll-mt-24 border-t border-line pt-10 first:border-0 first:pt-0 [&+section]:mt-16">
              <p className="eyebrow">{String(i + 1).padStart(2, "0")}</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">{s.title}</h2>
              {s.body}
            </section>
          ))}
          <p className="mt-16 text-sm text-dim">Citations resolve to <Link href="/sources">/sources</Link>.</p>
        </div>
      </div>
    </article>
    </>
  );
}
