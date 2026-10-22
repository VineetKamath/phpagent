#!/usr/bin/env node
// `npm run db:migrate`: prisma migrate deploy over a DIRECT connection.
// Prisma takes a Postgres advisory lock while migrating, which a transaction pooler
// (Neon "-pooler" hosts, PgBouncer) cannot hold, so it times out (P1002).
// The app keeps using the pooled DATABASE_URL at runtime; only migrations go direct.
// Override with DIRECT_DATABASE_URL if your provider uses a different scheme.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd(), false, { info() {}, error: console.error });

const raw = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
if (!raw) {
  console.error("DATABASE_URL is not set: add it in Render → Environment (or .env locally).");
  process.exitCode = 1;
} else {
  const url = new URL(raw);
  if (!process.env.DIRECT_DATABASE_URL && url.hostname.includes("-pooler.")) {
    url.hostname = url.hostname.replace("-pooler.", ".");
    console.log(`[migrate] pooled host detected; migrating over the direct host ${url.hostname}`);
  }
  const cmd = process.argv[2] === "status" ? ["migrate", "status"] : ["migrate", "deploy"];
  // Run the Prisma CLI with this Node directly: no shell, so no argument concatenation.
  const r = spawnSync(process.execPath, [require.resolve("prisma/build/index.js"), ...cmd], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url.toString() },
  });
  process.exitCode = r.status ?? 1;
}
