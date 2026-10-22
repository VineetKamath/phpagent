# Launch checklist

Work top to bottom. Don't announce anything until step 6 passes.

## 1. Infrastructure
- [ ] Neon database created; `DATABASE_URL` set on Render
- [ ] Render blueprint deployed (free web service)
- [ ] GitHub repo secrets `SITE_URL` and `INTERNAL_API_TOKEN` set; Actions → agent-run → Run workflow succeeds
- [ ] `DEMO_MODE` is `false`
- [ ] `/status` shows **Database: OPERATIONAL**

## 2. Create the GitHub App
- [ ] Permissions: Metadata **read**, Contents **write**, Pull requests **write**, Checks **read**. Nothing else
- [ ] Events: Installation repositories, Pull request, Check suite, Check run (Installation is always on)
- [ ] Webhook URL `https://<domain>/api/webhooks/github` with a secret
- [ ] `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET`, `NEXT_PUBLIC_GITHUB_APP_URL` set
- [ ] `/status` shows **GitHub App: OPERATIONAL**
- [ ] Leave `GITHUB_WRITES_ENABLED=false` for now

## 3. Test repository
- [ ] Create a repo you own, e.g. `<you>/php2shell-canary`
- [ ] Add a `Dockerfile`: `FROM php:8.4.26-fpm`
- [ ] Add a CI workflow that runs on `pull_request` (even a trivial one), so check runs exist
- [ ] Optionally add `.patchbot` (see /protect)
- [ ] Install the App on **only** this repository

## 4. Dry run (writes disabled)
- [ ] `curl -X POST -H "Authorization: Bearer $INTERNAL_API_TOKEN" https://<domain>/api/internal/run`
- [ ] Response lists `repositories: 1` and `errors: []`
- [ ] `/live` shows `advisory.ingested`, `match.evaluated` and `patch.generated`, plus an `agent.error` saying writes are disabled
- [ ] No PR exists on GitHub

## 5. Real run
- [ ] Set `GITHUB_WRITES_ENABLED=true` and redeploy
- [ ] Trigger the run again
- [ ] A PR appears on a `patch-agent/*` branch with the diff `8.4.26 → 8.4.27`, the CVE links and the verification notes
- [ ] The default branch is untouched
- [ ] Trigger once more: **no second PR** (idempotency)
- [ ] After CI finishes, `/live` shows `patch.tests.passed` with the real check count

## 6. Merge and verify
- [ ] Merge the PR on GitHub
- [ ] `/proof` lists `pr.opened`, `patch.tests.passed` and `pr.merged`, each linking to GitHub, with the merge commit SHA
- [ ] `/patches` shows the patch as MERGED with time to patch and time to merge
- [ ] `/status.json` → `capabilities.githubWrite: true`, `autonomousWorker: true`, `ledger.realPrsOpened ≥ 1`
- [ ] The Actions tab shows agent-run succeeding about every 15 minutes, and **Orchestration worker** is OPERATIONAL after a run
- [ ] Restart the Render service: the records are still on `/proof` (persistence)

## 7. Before widening scope
- [ ] Uninstall the App from the canary and confirm `policy.denied` is recorded
- [ ] Review the PR body wording and the /protect copy
- [ ] Publish the App install link
