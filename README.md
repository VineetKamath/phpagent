# Patch Agent

An autonomous, permissioned defensive agent. It watches public vulnerability disclosures, finds opted-in open-source repositories that pin affected versions, prepares deterministic fixes, opens pull requests, tracks CI and merges, and publishes verifiable evidence of every action.

The launch case is **PHP2Shell** (CVE-2026-109618, CVE-2026-109619): memory-safety vulnerabilities in the PHP runtime, disclosed 21 Oct 2026 and fixed in 8.5.12 / 8.4.27 / 8.3.36 / 8.2.35. These facts were confirmed against NVD and php.net.

The name, wallet and links are all set in [`src/content/brand.ts`](src/content/brand.ts).

## How it runs

```
node-cron (every 15 min, in-process)  ─┐
GitHub Actions → /api/internal/run    ─┼─► runAgent()  (single-flight)
installation_repositories.added hook  ─┘      │
                                              ├─ ingestAdvisories()  NVD + GHSA + CISA KEV → SourceRecord (raw-hash diff)
                                              ├─ GET /app/installations → token → /installation/repositories
                                              └─ per repo:
                                                   git tree → .patchbot? → Dockerfile / *.dockerfile / compose*.yml /
                                                   .github/workflows/*.yml / composer.json   (≤ 40 files, ≤ 256 KB each)
                                                   planFile → validateChange → mayWrite
                                                   change → idempotency check → branch patch-agent/* → commit → PR
                                                   review → review.required (no PR)

GitHub webhooks → /api/webhooks/github
  installation, installation_repositories → RepositoryAuthorization
  check_suite, check_run (patch-agent/*)  → Patch.ci, patch.tests.passed | patch.tests.failed
  pull_request closed                     → Patch.stage merged | closed, mergedAt, commitSha
```

Every transition is written to Postgres as a REAL `AgentEvent` before it goes out on the in-process SSE bus (`/api/v1/stream`). PR events carry the PR URL as `verificationUrl`; advisory, match and generation events carry the NVD URL; CI events carry the PR checks URL.

**Idempotency.** A Patch's id is a fingerprint of the repository, the campaign and the exact edits. The agent skips any fingerprint already in `pr_opened`, `merged`, `closed`, `review_required` or `policy_blocked`. It also skips any repository that already has an open `patch-agent/*` PR whose title names a tracked CVE, so a database reset cannot produce duplicate PRs.

**One PR per repository per campaign.** Both PHP2Shell CVEs have the same fix, so they share one PR (`Patch.cveIds` lists both) rather than two identical ones.

**Failures.** Errors become `agent.error` events. A failure that keeps repeating is recorded only when its message changes. A failure in one repository never stops the rest of the run.

**Rate limiting.** GitHub calls are serialised and spaced by `GITHUB_MIN_INTERVAL_MS` (default 250 ms). A 403/429 with a reset under 60 s is waited out and retried.

## What `/status` reports honestly

| Service | `operational` only when |
|---|---|
| Database | `SELECT 1` succeeds against `DATABASE_URL` |
| Orchestration worker | App configured **and** the last run finished without errors in the past 35 min |
| GitHub App | `GET /app` with the App JWT succeeds |
| GitHub writer | App configured **and** `GITHUB_WRITES_ENABLED=true` |
| CI verifier | App configured, webhook secret set, App probe ok |
| CVE ingestion / GitHub reader / KEV | live probe succeeds |
| Treasury RPC | wallet configured and RPC reachable |

Repository tests run in the repository's own CI. This server never executes repository code.

## Create the GitHub App

GitHub → Settings → Developer settings → GitHub Apps → **New GitHub App**.

- **Homepage URL:** your `NEXT_PUBLIC_SITE_URL`
- **Webhook URL:** `https://<your-domain>/api/webhooks/github`
- **Webhook secret:** a random string (also set as `GITHUB_WEBHOOK_SECRET`)
- **Repository permissions:**
  - Metadata: **Read-only**
  - Contents: **Read and write**
  - Pull requests: **Read and write**
  - Checks: **Read-only**
  - Nothing else.
- **Subscribe to events:** Installation (always on), Installation repositories, Pull request, Check suite, Check run
- **Where can this App be installed:** Any account

After creating it, note the **App ID**, generate a **private key** (.pem) and copy the public install link (`https://github.com/apps/<slug>/installations/new`).

## Environment

| Var | Notes |
|---|---|
| `DATABASE_URL` | Neon connection string, `?sslmode=require` |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL, used in PR bodies and llms.txt |
| `GITHUB_APP_ID` | App ID |
| `GITHUB_APP_PRIVATE_KEY` | PEM contents. Literal `\n` sequences are accepted |
| `GITHUB_WEBHOOK_SECRET` | Same value as in the App settings |
| `GITHUB_WRITES_ENABLED` | `true` to allow branch/commit/PR creation. Leave `false` for a dry run (patches are planned and recorded, no PR) |
| `NEXT_PUBLIC_GITHUB_APP_URL` | Public install link, shown on /protect |
| `INTERNAL_API_TOKEN` | ≥ 16 chars, bearer for `POST /api/internal/run` |
| `DEMO_MODE` | Must be `false` (or unset) in production |
| `SCHEDULER_ENABLED` | `true` (default). Single instance only |
| `NVD_API_KEY`, `GITHUB_TOKEN` | Optional, raise read rate limits |
| `TREASURY_WALLET`, `SOLANA_RPC_URL` | Optional, public address only |

## Database

```bash
npm run db:migrate          # prisma migrate deploy (applies prisma/migrations)
npm run db:migrate:dev      # create a new migration after editing schema.prisma
```

## Deploy: Render (free) + Neon (free)

1. **Neon:** create a project at https://console.neon.tech in region **AWS US East 2 (Ohio)**, the same region as the Render service (`region: ohio` in render.yaml). Under Connect, turn **Connection pooling off** and copy that direct string (with `sslmode=require`) as `DATABASE_URL`. Prisma migrations need a direct connection.
2. **Render:** at https://dashboard.render.com choose New → Blueprint and pick this repo. `render.yaml` creates one free web service that runs `npm ci && npm run db:migrate && npm run build`, then `npm run start`.
3. Fill in the `sync: false` env vars (see `.env.example` for where each comes from). `INTERNAL_API_TOKEN` is generated for you; copy it from the Render dashboard.
4. **Scheduler:** in GitHub, open this repo's Settings → Secrets and variables → Actions and add:
   - `SITE_URL`: your Render URL, e.g. `https://phpagent.onrender.com`
   - `INTERNAL_API_TOKEN`: the same value as on Render

   `.github/workflows/agent-cron.yml` then wakes the service and triggers a run every 15 minutes. You can also run it by hand from the Actions tab.
   Each trigger also rechecks saved `/check` repositories whose last successful inspection is at least one hour old. The server uses the same hourly eligibility rule on its 15-minute timer, independently of GitHub App configuration. Configure the Actions secrets above to keep checks running when Render sleeps. Failed checks retain the prior findings and timestamp and are retried on a later trigger. Public checks inspect version declarations; they do not verify deployed servers or authorize patches.
5. Set the GitHub App webhook URL to `<SITE_URL>/api/webhooks/github`. When a dry run looks right, set `GITHUB_WRITES_ENABLED=true` and redeploy.

**Free-plan behaviour:**
- **Sleep:** the instance sleeps after about 15 idle minutes. The Actions schedule wakes it, but GitHub may delay scheduled runs by a few minutes.
- **Cold start:** the first request after sleep takes about a minute.
- **Webhooks while asleep:** GitHub waits 10 seconds for a webhook response, so one that arrives while the service is asleep can time out. CI and merge state is also re-read on the next webhook for that PR. To redeliver a missed one, open the App's Advanced tab → Recent Deliveries → Redeliver.
- **Worker status:** `/status` reports the worker as operational only after a clean run in the last 35 minutes, so expect DEGRADED right after a cold start until the next scheduled run.
- **One instance only:** the event bus and single-flight guard are in-process. The free plan is single-instance anyway.

## Contract address (CA) in the header

The CA is a runtime setting stored in Postgres, not a build-time value, so changing it needs no redeploy:

```bash
npm run ca -- <mint address>     # set it on https://phpagent.si
npm run ca                       # show the current value
npm run ca -- --clear            # back to "CA NOT LAUNCHED"
npm run ca -- <address> --local  # target http://localhost:3000 instead
```

- **Auth:** the command posts to `/api/internal/ca` with `INTERNAL_API_TOKEN` from your `.env`, which must match the server's value.
- **Validation:** only a Solana public address (32–44 base58 characters) is accepted. Private keys and typos are rejected.
- **Live update:** the server saves it, then pushes a `config` event on `/api/v1/stream`, so every open page updates its header within a second.
- **Public read:** `/api/v1/token` and `/project.json` expose the current value.

## Local development

```bash
npm install                     # runs prisma generate
cp .env.example .env.local
npm run dev                     # REAL mode; without DATABASE_URL the ledger is in-memory
DEMO_MODE=true npm run dev      # simulated events, labelled DEMO, never persisted outside demo mode
npm run agent:run               # trigger a run (needs INTERNAL_API_TOKEN)
```

## Honesty invariants (tested)

- DEMO records are rejected before reaching any backend unless `DEMO_MODE=true`. The test uses a spy backend to prove nothing is written.
- REAL reads never return DEMO records. `/proof` is REAL-only and needs external evidence for each entry.
- `/status` never reports `operational` for a service whose probe failed.

## Testing

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

`tests/agent.test.ts` runs the full worker against a mocked GitHub and NVD API. It checks that exactly one PR is opened (for `php:8.4.26-fpm`), floating tags are skipped, 8.1 is marked for review, an opted-out `.patchbot` is honoured, a second run is idempotent (also after local state loss), and CI and merge webhooks update the Patch.

E2E: `npx playwright install chromium && npm run build && npm run test:e2e`.

## Security

See [/security](src/app/security/page.tsx) and whitepaper §14–16. Repository content is data, never instruction: the README in the test fixture contains an injection attempt and has no effect, because no repository text reaches a model. The `.patchbot` schema has no command fields. Writes go only to `patch-agent/*` branches. No private keys for the treasury exist anywhere.
