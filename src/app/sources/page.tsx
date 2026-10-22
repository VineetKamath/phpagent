import type { Metadata } from "next";
import { sources } from "@/content/sources";
import { Badge, PageHead } from "@/components/ui";

export const metadata: Metadata = { title: "Sources", description: "Every research source used by site content.", alternates: { canonical: "/sources" } };

export default function Sources() {
  return (
    <>
      <PageHead eyebrow="/sources" title="Sources." meta={[["total", String(sources.length)], ["verified", String(sources.filter((s) => s.verified).length)], ["order", "primary first"], ["api", "/api/v1/sources"]]}>Primary sources first. Entries marked VERIFYING have not yet been confirmed against the publisher and are not used as the basis for factual claims until they are.</PageHead>
      <ol className="mx-auto mt-12 max-w-[1560px] divide-y divide-line border-y border-line px-4 md:px-8 reveal">
        {sources.map((s) => (
          <li key={s.id} id={s.id} className="grid gap-2 py-5 md:grid-cols-[1fr_200px_110px_110px_100px] md:items-baseline md:gap-6">
            <div>
              {s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-php">{s.title}</a> : <span className="font-medium">{s.title}</span>}
              {s.note && <p className="mt-1 text-sm text-dim">{s.note}</p>}
            </div>
            <span className="text-sm text-steel">{s.publisher}</span>
            <span className="font-mono text-xs text-dim">{s.publishedAt ?? "n/a"}</span>
            <span className="font-mono text-xs text-dim">accessed {s.accessedAt}</span>
            <Badge label={s.verified ? "LIVE" : "VERIFYING"} className="w-fit" />
          </li>
        ))}
      </ol>
    </>
  );
}
