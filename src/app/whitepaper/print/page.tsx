import type { Metadata } from "next";
import { brand } from "@/content/brand";
import { sources } from "@/content/sources";
import { paper, sections } from "@/content/whitepaper";
import { PrintButton } from "@/components/PrintButton";

export const metadata: Metadata = { title: "Whitepaper (print)", alternates: { canonical: "/whitepaper" }, robots: { index: false } };

export default function PrintPaper() {
  return (
    <div className="bg-white text-[#111] [&_.text-steel]:text-[#444] [&_.text-dim]:text-[#666] [&_.border-line]:border-[#ccc]">
      <article className="prose-ed mx-auto max-w-[760px] px-6 py-16 [&_p]:text-[#222]! [&_ul]:text-[#222]! [&_h2]:text-[#111]">
        <div className="no-print mb-10 flex justify-end"><PrintButton /></div>
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#666]">{brand.brandName} · {paper.version}</p>
        <h1 className="mt-6 text-5xl font-semibold leading-[1.02] tracking-tight">{paper.title}</h1>
        <p className="mt-6 text-xl text-[#444]!">{paper.subtitle}</p>
        <ol className="mt-12 columns-2 font-mono text-xs text-[#444]">
          {sections.map((s, i) => <li key={s.id}>{String(i + 1).padStart(2, "0")} {s.title}</li>)}
        </ol>
        {sections.map((s, i) => (
          <section key={s.id} className={`mt-14 ${i === 0 ? "print-break" : ""}`}>
            <h2 className="text-2xl font-semibold tracking-tight">{String(i + 1).padStart(2, "0")} · {s.title}</h2>
            {s.body}
          </section>
        ))}
        <section className="print-break mt-14">
          <h2 className="text-2xl font-semibold">Sources</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm">
            {sources.map((s) => <li key={s.id}>{s.publisher}, &ldquo;{s.title}&rdquo;{s.publishedAt ? `, ${s.publishedAt}` : ""}. {s.url ?? "URL pending"}. Accessed {s.accessedAt}.{s.verified ? "" : " [verification pending]"}</li>)}
          </ol>
        </section>
      </article>
    </div>
  );
}
