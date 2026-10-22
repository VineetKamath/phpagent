import { describe, it, expect, beforeEach } from "vitest";
import { __reset, subscribeConfig } from "@/lib/store";
import { POST } from "@/app/api/internal/ca/route";
import { GET } from "@/app/api/v1/token/route";

const TOKEN = "t".repeat(32);
const ADDR = "So11111111111111111111111111111111111111112";
const call = (body: unknown, auth = `Bearer ${TOKEN}`) =>
  POST(new Request("http://x/api/internal/ca", { method: "POST", headers: { authorization: auth, "content-type": "application/json" }, body: JSON.stringify(body) }));

describe("runtime contract address (npm run ca)", () => {
  beforeEach(() => {
    __reset();
    delete process.env.DATABASE_URL;
    process.env.INTERNAL_API_TOKEN = TOKEN;
  });

  it("requires the bearer token", async () => {
    expect((await call({ address: ADDR }, "Bearer wrong")).status).toBe(401);
    expect((await call({ address: ADDR }, "")).status).toBe(401);
  });

  it("rejects anything that is not a public address, including an 88-char secret key", async () => {
    expect((await call({ address: "5".repeat(88) })).status).toBe(422);
    expect((await call({ address: "not-an-address" })).status).toBe(422);
    expect((await call({ address: 42 })).status).toBe(400);
  });

  it("persists, serves on /api/v1/token, and pushes a live config event", async () => {
    const pushed: [string, string][] = [];
    const off = subscribeConfig((k, v) => pushed.push([k, v]));
    const r = await call({ address: ADDR });
    off();
    expect(r.status).toBe(200);
    expect(pushed).toEqual([["contract_address", ADDR]]);
    const j = await (await GET()).json();
    expect(j.contractAddress).toBe(ADDR);
    expect(j.source).toBe("database");
    expect(j.explorerUrl).toContain(ADDR);
  });

  it("clears back to NOT LAUNCHED with an empty string", async () => {
    await call({ address: ADDR });
    await call({ address: "" });
    expect((await (await GET()).json()).contractAddress).toBeNull();
  });
});
