import type { Metadata } from "next";
import { brand } from "@/content/brand";
import { PageHead } from "@/components/ui";
import { TrustBoundaries } from "@/components/TrustBoundaries";

export const metadata: Metadata = { title: "Security", description: "Defensive-only operation, authorization model, trust boundaries and responsible disclosure.", alternates: { canonical: "/security" } };

const SECTIONS: [string, string[]][] = [
  ["Defensive-only operation", ["The system produces version updates for repositories that opted in. It has no endpoint, model prompt or code path that generates exploits, payloads or proofs of concept, and it does not scan hosts, URLs or networks."]],
  ["Authorization model", ["A write requires a GitHub App installation on the specific repository. A .patchbot policy can only narrow what is allowed, never widen it. Removing the App immediately revokes access.", "No unsolicited pull requests. No pushes to default branches."]],
  ["Repository trust boundary", ["All repository content (README, issues, comments, source, package metadata, commit messages) is untrusted data. It is parsed by deterministic code with fixed regular expressions and schemas, not passed to a model as instructions.", "The .patchbot schema is strict: unknown keys are rejected and there is no field that accepts a command."]],
  ["AI safety", ["Version remediation in phase 1 is deterministic code, so no model output reaches a repository. If model-assisted patches are added, their output goes through the same file allowlist, diff-size, secret and dangerous-content checks, and requires CI plus human review by default."]],
  ["Secret handling", ["The GitHub App private key and webhook secret live only in server environment variables and are never sent to the browser. Installation tokens are short-lived and scoped to one installation.", "The treasury is configured with a public address only. No signing key exists in this codebase or deployment."]],
  ["Webhook validation", ["Every GitHub webhook is verified with HMAC-SHA256 (X-Hub-Signature-256) using a constant-time comparison. Unsigned or mis-signed requests are rejected with 401 before parsing."]],
  ["Patch isolation", ["No repository code runs on this server. Tests run in the target repository's own CI on the PR branch. A future dedicated runner must be ephemeral, with no host filesystem access, no production secrets, no wallet keys, egress restricted to package registries, CPU, memory and time limits, and destruction after each run."]],
  ["Responsible disclosure", [`Report vulnerabilities in this project to ${brand.securityContact}. Please include reproduction steps and allow reasonable time for a fix before public disclosure. We do not pursue good-faith researchers.`]],
];

export default function Security() {
  return (
    <>
      <PageHead eyebrow="/security" title="Security model." meta={[["posture","defensive only"],["repo_content","data, never instruction"],["webhooks","HMAC-SHA256"],["exploits","never generated"]]}>Every boundary the agent enforces, and what it refuses to do.</PageHead>
      <div className="mx-auto mt-12 max-w-[1560px] px-4 md:px-8"><TrustBoundaries /></div>
      <div className="prose-ed mx-auto mt-12 max-w-[1560px] px-4 md:px-8 reveal">
        {SECTIONS.map(([h, ps]) => (
          <section key={h}>
            <h3>{h}</h3>
            {ps.map((p) => <p key={p}>{p}</p>)}
          </section>
        ))}
      </div>
    </>
  );
}
