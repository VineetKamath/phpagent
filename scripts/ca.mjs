#!/usr/bin/env node
// Set the token contract address on the live site, no redeploy needed.
//
//   npm run ca -- <address>          set it on https://phpagent.si
//   npm run ca -- --clear            back to "NOT LAUNCHED"
//   npm run ca                       show the current value
//   add --local to target http://localhost:3000, or --url <site> for another deployment
//
// Uses INTERNAL_API_TOKEN from .env (must match the value on the target server).
// Exits via process.exitCode (not process.exit) to avoid a Node-on-Windows crash after fetch.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd(), false, { info() {}, error: console.error });

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const urlIdx = args.indexOf("--url");
const site = (urlIdx >= 0 ? args[urlIdx + 1] : flag("--local") ? "http://localhost:3000" : process.env.SITE_URL || "https://phpagent.si").replace(/\/$/, "");
const value = flag("--clear") ? "" : args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--url");

const show = (j) => console.log(j.contractAddress ? `CA ${j.contractAddress}\n   ${j.explorerUrl}` : "CA not set (header shows NOT LAUNCHED)");

async function main() {
  if (value === undefined) {
    const r = await fetch(`${site}/api/v1/token`);
    if (!r.ok) return fail(`${site}: HTTP ${r.status}`);
    return show(await r.json());
  }
  if (value && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) return fail("Not a Solana public address (32–44 base58 characters). Never paste a private key here.");
  const token = process.env.INTERNAL_API_TOKEN;
  if (!token) return fail("INTERNAL_API_TOKEN is not set in .env (it must match the server's value).");

  const r = await fetch(`${site}/api/internal/ca`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ address: value }),
  });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) return fail(`${site}: HTTP 401. The token in .env does not match INTERNAL_API_TOKEN on the server.`);
  if (!r.ok) return fail(`${site}: HTTP ${r.status} ${j.error ?? ""}`);
  console.log(`Updated on ${site}. Open pages refresh instantly.`);
  show(j);
}

function fail(msg) {
  console.error(msg);
  process.exitCode = 1;
}

main().catch((e) => fail(String(e)));
