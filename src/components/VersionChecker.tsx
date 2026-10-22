"use client";
import { useId, useState } from "react";
import { checkPhpVersion } from "@/lib/version";

const BRANCHES = ["8.5", "8.4", "8.3", "8.2", "older"];

/** Local comparison only. No URL input, no scanning, no network request. */
export function VersionChecker({ fixed }: { fixed: Record<string, string> }) {
  const [branch, setBranch] = useState("8.4");
  const [patch, setPatch] = useState("");
  const id = useId();
  const input = branch === "older" ? patch : `${branch}.${patch || "0"}`;
  const r = patch || branch === "older" ? checkPhpVersion(input, fixed) : null;

  return (
    <div className="rounded-2xl border border-line bg-ink-2 p-5 md:p-8">
      <p className="eyebrow">What version are you on?</p>
      <fieldset className="mt-5">
        <legend className="sr-only">PHP branch</legend>
        <div className="flex flex-wrap gap-2">
          {BRANCHES.map((b) => (
            <button
              key={b}
              type="button"
              aria-pressed={branch === b}
              onClick={() => { setBranch(b); setPatch(""); }}
              className={`rounded-full border px-4 py-1.5 font-mono text-sm transition-colors ${branch === b ? "border-php bg-php/10 text-paper" : "border-line text-steel hover:text-paper"}`}
            >
              {b === "older" ? "older" : `${b}.x`}
            </button>
          ))}
        </div>
      </fieldset>
      <label htmlFor={id} className="mt-6 block text-sm text-steel">
        {branch === "older" ? "Full version (e.g. 8.1.30)" : `Patch number: PHP ${branch}.?`}
      </label>
      <div className="mt-2 flex items-center gap-1 font-mono text-2xl">
        {branch !== "older" && <span className="text-dim">{branch}.</span>}
        <input
          id={id}
          inputMode={branch === "older" ? "decimal" : "numeric"}
          value={patch}
          maxLength={branch === "older" ? 12 : 3}
          onChange={(e) => setPatch(e.target.value.replace(branch === "older" ? /[^\d.]/g : /\D/g, ""))}
          placeholder={branch === "older" ? "8.1.30" : "26"}
          className="w-40 border-b border-line bg-transparent py-1 outline-none placeholder:text-dim focus:border-php"
        />
      </div>
      <div aria-live="polite" className="mt-8 min-h-[92px]">
        {r && r.status !== "INVALID" && (
          <dl className="grid grid-cols-2 gap-6 md:grid-cols-3">
            <div><dt className="eyebrow">You entered</dt><dd className="mt-1 font-mono">PHP {r.entered}</dd></div>
            {"fixedIn" in r && <div><dt className="eyebrow">PHP2Shell security release</dt><dd className="mt-1 font-mono">PHP {r.fixedIn}</dd></div>}
            <div>
              <dt className="eyebrow">Status</dt>
              <dd className={`mt-1 font-mono font-medium ${r.status === "PATCHED" ? "text-ok" : r.status === "UPDATE_REQUIRED" ? "text-crit" : "text-amber"}`}>
                {r.status.replace("_", " ")}
              </dd>
            </div>
            {r.status === "UNSUPPORTED" && <p className="col-span-full text-sm text-steel">{r.note}</p>}
          </dl>
        )}
        {r?.status === "INVALID" && <p className="text-sm text-amber">Enter a version like 8.1.30.</p>}
      </div>
      <p className="mt-4 text-xs text-dim">Runs entirely in your browser against the published fixed-version table. Nothing is sent anywhere.</p>
    </div>
  );
}
