import { brand } from "@/content/brand";
import { json } from "@/lib/http";
import { endpoints } from "@/lib/endpoints";



export async function GET() {
  const paths: Record<string, unknown> = {};
  for (const [p, d] of endpoints) {
    const params = [...p.matchAll(/\{(\w+)\}/g)].map((m) => ({ name: m[1], in: "path", required: true, schema: { type: "string" } }));
    paths[p] = { get: { summary: d, parameters: params, responses: { "200": { description: "OK", content: { [p.endsWith("stream") ? "text/event-stream" : "application/json"]: {} } } } } };
  }
  return json(
    { openapi: "3.1.0", info: { title: `${brand.brandName} public API`, version: "1.0.0", description: "Public read-only API. All endpoints are unauthenticated GETs." }, servers: [{ url: brand.siteUrl }], paths },
    { maxAge: 3600 },
  );
}
