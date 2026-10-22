import type { Metadata } from "next";
import { brand } from "@/content/brand";
import { LiveConsole } from "@/components/LiveConsole";
import { PageHead } from "@/components/ui";

export const metadata: Metadata = { title: "Live operations", description: "Structured, real-time event stream from the patch agent.", alternates: { canonical: "/live" } };

export default function Live() {
  return (
    <>
      <PageHead eyebrow="/live" title="Live operations." meta={[["transport","SSE"],["endpoint","/api/v1/stream"],["persisted","before broadcast"],["labels","REAL | DEMO"]]}>
        Every agent action as a structured record, streamed over Server-Sent Events from <code className="font-mono text-sm">/api/v1/stream</code>. Expand a row to see the full record. Each row is labelled REAL or DEMO.
      </PageHead>
      <div className="mx-auto mt-12 max-w-[1560px] px-4 md:px-8 reveal">
        <LiveConsole version={brand.version} />
      </div>
    </>
  );
}
