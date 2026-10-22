# phpagent-si GitHub App demonstration corpus

These are ten self-contained PHP showcase applications. Each has an intentionally pinned PHP version below the supported security release for its branch. They demonstrate phpagent-si discovering installed repositories, creating a `patch-agent/*` branch, and opening a reviewable PR.

The applications exercise Dockerfiles, Docker Compose, Composer platform pins, and GitHub Actions pins. They do not contain credentials, deployment targets, or application data.

## Demonstration plan

1. Publish each directory as its own **private** GitHub repository.
2. Install `phpagent-si` only on the first two repositories and trigger `/api/internal/run`.
3. Review the generated PRs and CI results.
4. Add another two repositories every 30 minutes. This provides a real staged demonstration over several hours, without pretending the agent needs hours to scan a repository.

Run `publish-projects.ps1` from this directory after authenticating `gh` to create the private repositories under one GitHub owner.
