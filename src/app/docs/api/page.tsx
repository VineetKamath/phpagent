import type { Metadata } from "next";
import { endpoints } from "@/lib/endpoints";
import { PageHead } from "@/components/ui";

export const metadata: Metadata = { title: "API", description: "Public read-only API documentation.", alternates: { canonical: "/docs/api" } };

export default function ApiDocs() {
  return (
    <>
      <PageHead eyebrow="/docs/api" title="Public API." meta={[["auth","none (read-only)"],["cors","*"],["spec","/openapi.json"],["stream","/api/v1/stream"]]}>
        All endpoints are unauthenticated GET requests that return JSON, with CORS open. The OpenAPI document is at <a className="font-mono text-sm text-php" href="/openapi.json">/openapi.json</a>. Records include <code className="font-mono text-sm">dataMode</code>.
      </PageHead>
      <ul className="mx-auto mt-12 max-w-[1560px] divide-y divide-line border-y border-line px-4 md:px-8 reveal">
        {endpoints.map(([p, d]) => (
          <li key={p} className="grid gap-1 py-4 md:grid-cols-[360px_1fr]">
            <code className="font-mono text-sm"><span className="text-ok">GET</span> {p}</code>
            <span className="text-sm text-steel">{d}</span>
          </li>
        ))}
        <li className="grid gap-1 py-4 md:grid-cols-[360px_1fr]">
          <code className="font-mono text-sm"><span className="text-amber">POST</span> /api/webhooks/github</code>
          <span className="text-sm text-steel">GitHub App webhook. Requires a valid X-Hub-Signature-256.</span>
        </li>
      </ul>
      <div className="mx-auto mt-12 max-w-[1560px] px-4 md:px-8 reveal">
        <p className="eyebrow">Stream example</p>
        <pre className="mt-3 overflow-x-auto rounded-2xl border border-line bg-ink-2 p-5 font-mono text-xs text-steel">{`const es = new EventSource("/api/v1/stream");
es.addEventListener("agent", (m) => {
  const e = JSON.parse(m.data); // AgentEvent
  console.log(e.dataMode, e.eventType, e.message);
});`}</pre>
      </div>
    </>
  );
}
