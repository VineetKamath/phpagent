import type { Metadata } from "next";
import { STAGES } from "@/lib/stages";
import { PageHead } from "@/components/ui";
import { StateMachine } from "@/components/Diagrams";

export const metadata: Metadata = { title: "Methodology", description: "How advisories enter, how matching, authorization and validation work, and how metrics are computed.", alternates: { canonical: "/methodology" } };

export default function Methodology() {
  return (
    <>
      <PageHead eyebrow="/methodology" title="Methodology." meta={[["matching","explicit pins only"],["confidence","deterministic"],["metrics","timestamps only"],["missing","n/a, never estimated"]]}>How each stage works, and exactly how every published number is computed.</PageHead>
      <div className="reveal mx-auto mt-12 max-w-[1560px] px-4 md:px-8">
        <p className="eyebrow mb-4">Patch state machine</p>
        <StateMachine />
      </div>
      <div className="prose-ed mx-auto mt-12 max-w-[1560px] px-4 md:px-8 reveal">
        <h3>Pipeline stages</h3>
        <ol className="mt-4 list-decimal space-y-3 pl-6 text-[#c9ccd8]">
          {STAGES.map((s) => <li key={s.name}><strong className="text-paper">{s.name}.</strong> {s.body}</li>)}
        </ol>

        <h3>Matching rules (phase 1)</h3>
        <ul>
          <li><code>Dockerfile</code>, <code>*.dockerfile</code>, compose files: <code>php:&lt;major&gt;.&lt;minor&gt;.&lt;patch&gt;[-variant]</code> with a full three-part version.</li>
          <li><code>.github/workflows/*.yml</code>: <code>php-version: X.Y.Z</code>.</li>
          <li><code>composer.json</code>: <code>config.platform.php</code> only. <code>require.php</code> is a compatibility constraint, not a deployed runtime, and is never rewritten.</li>
          <li>Floating tags (<code>php:8.4</code>, <code>php:latest</code>) are not changed: they already resolve upstream.</li>
          <li>Commented lines are ignored.</li>
          <li>Unsupported branches (8.1 and older) produce HUMAN REVIEW REQUIRED, never an automatic cross-branch upgrade.</li>
        </ul>

        <h3>Confidence</h3>
        <p>Phase 1 has two outcomes: a deterministic in-place bump on the same branch, or human review. There is no probabilistic confidence score, so none is shown.</p>

        <h3>Validation</h3>
        <ul>
          <li>File allowlist; no path traversal.</li>
          <li>Line count unchanged; at most 20 changed lines.</li>
          <li>Secret patterns (private keys, GitHub, AWS and Slack tokens) rejected.</li>
          <li>Dangerous content (pipe-to-shell, base64 decode, eval, setuid) rejected.</li>
          <li>Repository CI must pass when <code>verification.require_ci</code> is true (the default).</li>
        </ul>

        <h3>Metrics</h3>
        <ul>
          <li><strong className="text-paper">Time to patch</strong> = PR opened − agent detected the advisory.</li>
          <li><strong className="text-paper">Time to merge</strong> = merged − PR opened.</li>
          <li><strong className="text-paper">Median time to patch</strong> = median over patches with both timestamps.</li>
          <li><strong className="text-paper">Success rate</strong> = merged ÷ attempts.</li>
          <li><strong className="text-paper">Runway</strong> = liquid treasury balance ÷ 30-day average daily operating cost. Unavailable until 30 days of expenses are recorded.</li>
          <li>Missing data is shown as n/a. No values are estimated or compared against unsourced industry figures.</li>
        </ul>

        <h3>Data labelling</h3>
        <p>Every record carries <code>dataMode</code>: REAL or DEMO. DEMO records can be written only when the server runs with <code>DEMO_MODE=true</code>, live under the reserved <code>demo-org/</code> namespace, carry no GitHub URLs, SHAs or signatures, and are excluded from <code>/proof</code> in every environment. This invariant is covered by automated tests.</p>
      </div>
    </>
  );
}
