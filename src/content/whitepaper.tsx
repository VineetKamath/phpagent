import { Cite } from "@/components/ui";
import { php2shell } from "./php2shell";

export const paper = {
  title: "Autonomous Patching: Closing the AI-Accelerated Vulnerability Window",
  subtitle: "A defensive agent for turning public software disclosures into verifiable patches.",
  version: "0.1 · October 2026",
};

const Flow = ({ steps }: { steps: string[] }) => (
  <ol className="my-8 flex flex-col gap-2 font-mono text-xs md:flex-row md:flex-wrap md:items-center">
    {steps.map((s, i) => (
      <li key={s} className="flex items-center gap-2">
        <span className="rounded-full border border-line px-3 py-1.5">{s}</span>
        {i < steps.length - 1 && <span aria-hidden className="text-dim">→</span>}
      </li>
    ))}
  </ol>
);

export const sections: { id: string; title: string; body: React.ReactNode }[] = [
  {
    id: "abstract",
    title: "Abstract",
    body: (
      <>
        <p>Software vulnerabilities become public. Attackers learn about them at the same moment as everyone else. Maintainers then have to work out whether they are exposed, prepare a fix, test it and deploy it. Each of those steps takes time, and the time between public disclosure and a deployed fix is when systems are most at risk.</p>
        <p>AI is making vulnerability discovery and analysis faster. If discovery speeds up and remediation does not, that window gets more dangerous. This paper proposes an autonomous, permissioned patching agent. It watches public advisories, finds opted-in open-source repositories that pin affected versions, prepares deterministic fixes, tests them in the repository&apos;s own CI, opens pull requests, and publishes evidence of every action.</p>
      </>
    ),
  },
  {
    id: "why",
    title: "Why this exists",
    body: (
      <>
        <p>Every vulnerability follows roughly the same lifecycle:</p>
        <Flow steps={["Bug exists", "Discovery", "Coordinated disclosure", "Patch release", "Public knowledge", "Maintainer response", "Real-world remediation"]} />
        <p>The dangerous interval runs from <em>public knowledge</em> to <em>real-world remediation</em>. In plain terms: once a problem is announced, anyone can read about it, but the fix only protects a website after its maintainer has applied the update. That gap is the vulnerability window. The aim of this project is to make it shorter.</p>
      </>
    ),
  },
  {
    id: "php2shell",
    title: "PHP2Shell: the wake-up call",
    body: (
      <>
        <p>On 21 October 2026 the PHP project published critical security releases addressing {php2shell.cves.map((c, i) => <span key={c.id}>{i ? " and " : ""}<code>{c.id}</code><Cite id={c.sourceId} /></span>)}.</p>
        <p>The affected behaviour was in PHP core (php-src), the runtime that executes PHP applications, not in a single framework or plugin<Cite id="php-src-advisories" />. A runtime vulnerability is inherited by every application running on an affected build, however carefully that application was written.</p>
        <p>That creates an affected-version problem: maintainers need to know which runtime they actually deploy (a container base image, a distribution package, a CI image), not only which PHP version their code supports. Fixed releases for supported branches at disclosure<Cite id="php-changelog-8" />:</p>
        <ul>{Object.entries(php2shell.fixed).map(([b, v]) => <li key={b}><code>PHP {v}</code> for the {b} branch</li>)}</ul>
        <p>Branches older than 8.2 are outside upstream security support<Cite id="php-supported" />. They should not be described as receiving ordinary upstream fixes. Users need to migrate to a supported branch or rely on vendor-maintained packages.</p>
      </>
    ),
  },
  {
    id: "how",
    title: "How PHP2Shell worked: a safe explanation",
    body: (
      <>
        <p>PHP processes each web request using internal runtime state and memory allocated for that request. When the request finishes, the memory is supposed to be cleaned so the next request starts fresh.</p>
        <Flow steps={["Request", "Worker", "Request memory", "Application", "Cleanup", "Response"]} />
        <p>Some abnormal termination paths, such as certain fatal errors and out-of-memory conditions, could leave internal state inconsistent. A later request handled by the same worker could then interact with state that should have been reset. Memory-safety failures like this can have severe consequences, including disclosure of sensitive memory and, in some environments, code execution.</p>
        <p>This paper deliberately leaves out triggering conditions, request construction and memory-layout details. None of them are needed to understand or carry out the defensive response, which is to update.</p>
      </>
    ),
  },
  {
    id: "ai",
    title: "Why AI matters",
    body: (
      <>
        <p>AI-assisted security research can cut the time needed to understand large codebases and reason about difficult bug classes. Public accounts of PHP2Shell describe such assistance. Specific attributions will be cited once their primary sources are confirmed<Cite id="research-pending" />.</p>
        <p>That creates offensive risk and defensive opportunity at once. The right response is not just &ldquo;AI is dangerous.&rdquo; It is: <strong>defense must scale with discovery.</strong></p>
      </>
    ),
  },
  {
    id: "bottleneck",
    title: "The patching bottleneck",
    body: (
      <>
        <p>After a disclosure, each maintainer independently has to:</p>
        <ul>{["read the advisory", "understand which packages are affected", "inventory their repositories", "determine actual exposure", "identify the safe version", "modify the dependency or image", "run tests", "review compatibility", "open a pull request", "review it", "merge", "deploy"].map((s) => <li key={s}>{s}</li>)}</ul>
        <p>Across thousands of projects, most of whose maintainers are volunteers, the same mechanical work gets repeated thousands of times. Much of it is deterministic, and deterministic work can be automated safely.</p>
      </>
    ),
  },
  {
    id: "agent",
    title: "The proposed agent",
    body: (
      <>
        <Flow steps={["Ingestion", "Normalization", "Version reasoning", "Repository matching", "Authorization", "Patch generation", "Testing", "PR submission", "Verification", "Public proof"]} />
        <p>Advisories come from NVD, GitHub Security Advisories and CISA KEV and are normalized into one schema that keeps provenance for each provider. Version reasoning compares affected ranges against authoritative fixed releases. Matching inspects only files in opted-in repositories. Every state transition is stored as an event and streamed publicly.</p>
      </>
    ),
  },
  {
    id: "authorization",
    title: "Authorization model",
    body: (
      <>
        <p>The agent writes only to repositories that explicitly opted in by installing the GitHub App. A <code>.patchbot</code> file can narrow its behaviour further: which severities, which patch types, whether PRs are drafts, and whether CI and human review are required.</p>
        <ul>
          <li><strong>No mass unsolicited pull requests.</strong></li>
          <li>No modification of repositories without authorization.</li>
          <li>No scanning of arbitrary hosts or private systems.</li>
          <li>No pushes to default branches.</li>
        </ul>
      </>
    ),
  },
  {
    id: "safe-patching",
    title: "Safe patching",
    body: (
      <>
        <p>The first patch categories are deterministic and low-risk:</p>
        <ul>{["Docker base-image version updates (php:X.Y.Z-variant)", "Compose file image updates", "CI image and php-version updates", "composer.json config.platform.php pins", "Lockfile refreshes (planned)", "Deterministic configuration migrations (planned)"].map((s) => <li key={s}>{s}</li>)}</ul>
        <p>Changes stay on the same branch, from a patch release to a later patch release. Cross-branch upgrades and source-code patches need a higher confidence threshold and, by default, human review.</p>
      </>
    ),
  },
  {
    id: "verification",
    title: "Verification",
    body: (
      <>
        <p>A patch is not trusted just because it was generated automatically. Every patch passes through:</p>
        <Flow steps={["Static validation", "Build", "Test", "CI", "Policy", "Human review (if configured)", "Merge verification"]} />
        <p>Static validation enforces a file allowlist, an unchanged line count, a diff-size limit, secret detection and dangerous-content detection. A merge is recorded only from a signed GitHub webhook.</p>
      </>
    ),
  },
  {
    id: "proof",
    title: "Proof of work",
    body: (
      <>
        <p>This is not blockchain proof-of-work. Here &ldquo;proof&rdquo; means engineering output that anyone can verify independently: the GitHub pull request, the commit, the CI result, the merge timestamp, the advisory source, the repository&apos;s authorization and, for funding, the transaction signature.</p>
        <p>The public ledger contains only REAL records that carry an external verification URL. Simulated development data is structurally excluded from it.</p>
      </>
    ),
  },
  {
    id: "funding",
    title: "Self-funding infrastructure",
    body: (
      <>
        <p>Protocol or creator fees may be routed to a publicly visible operational treasury. That treasury may pay for inference, compute, database, indexing, RPC, storage and monitoring.</p>
        <p>Any associated token is not equity and is not marketed as an investment. This project promises no yield, no appreciation and no returns.</p>
      </>
    ),
  },
  {
    id: "wallet",
    title: "The agent wallet",
    body: (
      <>
        <p>The wallet is publicly readable, and the website never holds its private signing key. The treasury page shows inflows, expenses and runway, read directly from the chain.</p>
        <p><strong>Runway</strong> = liquid operational assets ÷ rolling 30-day average daily infrastructure cost. Speculative future income is never counted. Until 30 days of categorised expenses exist, runway is shown as unavailable rather than estimated.</p>
      </>
    ),
  },
  {
    id: "threat-model",
    title: "Threat model",
    body: (
      <ul>
        {[
          ["Malicious repositories", "Repository content is parsed by deterministic code and never executed on agent infrastructure."],
          ["Prompt injection in source files", "Phase 1 sends no repository content to a model. See §15."],
          ["Malicious .patchbot configuration", "A strict schema rejects unknown keys, has no command fields, blocks YAML aliases and caps file size."],
          ["Dependency confusion", "Only the official php image and versions from php.net release data are proposed."],
          ["Webhook spoofing", "HMAC-SHA256 verification with constant-time comparison."],
          ["GitHub token compromise", "Short-lived, installation-scoped tokens and least-privilege permissions. Writes can be disabled with one flag."],
          ["Supply-chain poisoning", "Changes are limited to version identifiers. Diffs that add URLs, scripts or commands are rejected."],
          ["False CVE matches", "Only explicit three-part pins are matched. Anything ambiguous goes to human review."],
          ["Unsafe generated patches", "File allowlist, diff limits and content checks before CI."],
          ["Secret exposure", "Secret-pattern scanning on every diff. Keys exist only in server environment variables."],
          ["Model hallucinations", "Deterministic generation in phase 1. Any future model output is treated as an untrusted proposal."],
          ["Treasury spoofing", "Balances are read from chain RPC and linked to a public explorer, never typed in by hand."],
        ].map(([t, m]) => <li key={t}><strong>{t}.</strong> {m}</li>)}
      </ul>
    ),
  },
  {
    id: "prompt-injection",
    title: "Prompt-injection defense",
    body: (
      <>
        <p>Repositories contain untrusted data. The agent treats all repository content as data, never as instruction. Text in a README, issue, comment, source file, package manifest or commit message that tries to change the agent&apos;s behaviour has no effect.</p>
        <p>Isolation is structural. The phase-1 matcher and patcher are fixed code with fixed patterns. If a model is introduced, it will get repository content only inside clearly delimited data fields, its output must parse into a strict schema (file, line, from-version, to-version), and that output goes through the same safety validator as deterministic patches.</p>
      </>
    ),
  },
  {
    id: "failure",
    title: "Failure modes",
    body: (
      <>
        <p>The system can misclassify exposure, fail tests, propose an upgrade that is incompatible with a project, suffer upstream API downtime, lack authorization, or meet a build system it does not support.</p>
        <p>In every case it fails safe: no PR is opened, the attempt is recorded with its reason, and where appropriate the status becomes HUMAN REVIEW REQUIRED. Outages show up on /status rather than being hidden.</p>
      </>
    ),
  },
  {
    id: "economics",
    title: "Economics",
    body: (
      <>
        <p>Operating economics are reported per unit: cost per repository analysis, per patch attempt, per successful patch and per merged patch. These figures are computed only from recorded expenses and recorded outcomes. Where no data exists, none is shown.</p>
        <p>This paper makes no token-price projections.</p>
      </>
    ),
  },
  {
    id: "roadmap",
    title: "Roadmap",
    body: (
      <ul>
        <li><strong>Phase 0: PHP2Shell demonstration.</strong> Status: IN PROGRESS. Educational site, fixed-version data, deterministic patcher, public endpoints.</li>
        <li><strong>Phase 1: Deterministic dependency remediation.</strong> Status: IMPLEMENTED. Scheduled worker, GitHub App PR flow, CI and merge tracking are built. Whether they are operating right now is reported live on /status.</li>
        <li><strong>Phase 2: Multiple ecosystems.</strong> Status: PLANNED.</li>
        <li><strong>Phase 3: Repository-specific patch generation.</strong> Status: PLANNED.</li>
        <li><strong>Phase 4: Organization-level fleet protection.</strong> Status: PLANNED.</li>
      </ul>
    ),
  },
  {
    id: "limitations",
    title: "Limitations",
    body: (
      <ul>
        <li>Updating a pinned version in a repository does not update running deployments. Operators still have to redeploy.</li>
        <li>Runtimes installed from OS packages (apt, yum, apk) or managed hosting are not visible from a repository.</li>
        <li>Phase 1 handles only explicit PHP version pins. It does not analyse application code.</li>
        <li>Without a configured database the ledger is held in memory and lost on restart. /status reports this.</li>
        <li>Coverage depends on opt-in. Most projects will not be covered.</li>
        <li>Third-party research claims are cited only once confirmed.</li>
      </ul>
    ),
  },
  {
    id: "conclusion",
    title: "Conclusion",
    body: (
      <>
        <p>AI shortens the path from source code to vulnerability discovery. Defense has to shorten the path from disclosure to remediation.</p>
        <p>The objective is not autonomous exploitation. It is autonomous repair: permissioned, tested, and publicly verifiable.</p>
      </>
    ),
  },
];
