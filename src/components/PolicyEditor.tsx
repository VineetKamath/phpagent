"use client";
import { useState } from "react";
import { parsePolicy } from "@/lib/policy";

const DEFAULT = `version: 1
enabled: true

severity:
  - critical
  - high

patches:
  dependencies: true
  containers: true

pull_requests:
  enabled: true

verification:
  require_ci: true
`;

export function PolicyEditor() {
  const [src, setSrc] = useState(DEFAULT);
  const r = parsePolicy(src);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <label htmlFor="pb" className="eyebrow">.patchbot</label>
        <textarea
          id="pb"
          spellCheck={false}
          value={src}
          onChange={(e) => setSrc(e.target.value)}
          rows={18}
          className="mt-3 w-full resize-y rounded-2xl border border-line bg-ink-2 p-5 font-mono text-[13px] leading-relaxed outline-none focus:border-php"
        />
      </div>
      <div aria-live="polite">
        <p className="eyebrow">Validation</p>
        {r.ok ? (
          <>
            <p className="mt-3 font-mono text-sm text-ok">VALID POLICY</p>
            <pre className="mt-3 overflow-x-auto rounded-2xl border border-line p-5 font-mono text-xs text-steel">{JSON.stringify(r.policy, null, 2)}</pre>
          </>
        ) : (
          <p className="mt-3 break-words font-mono text-sm text-crit">{r.error}</p>
        )}
        <p className="mt-4 text-xs text-dim">Unknown keys are rejected. The schema has no field for commands: tests run in your own CI, never from this file.</p>
      </div>
    </div>
  );
}
