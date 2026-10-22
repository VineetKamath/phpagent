import type { ReleaseTable } from "@/lib/php-releases";
import { Badge, Cite } from "./ui";

const BRANCHES = ["8.5", "8.4", "8.3", "8.2", "8.1", "8.0", "7.x", "5.x"];

export function VersionStack({ table }: { table: ReleaseTable }) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <Badge label={table.source === "php.net" ? "LIVE" : "SEED"} />
        <span className="font-mono text-[11px] text-dim">
          {table.source === "php.net" ? `latest releases from php.net · ${table.retrievedAt.slice(0, 16)}Z` : "php.net unreachable: showing seed table"}
        </span>
      </div>
      <ol className="mt-6 divide-y divide-line border-y border-line">
        {BRANCHES.map((b) => {
          const fix = table.fixed[b];
          const latest = table.latest[b];
          return (
            <li key={b} className="grid grid-cols-[64px_1fr] items-center gap-4 py-4 md:grid-cols-[120px_1fr_1fr_1fr]">
              <span className="font-mono text-2xl tracking-tight md:text-3xl">{b}</span>
              {fix ? (
                <>
                  <span className="col-start-2 font-mono text-xs text-crit md:col-start-auto">VULNERABLE &lt; {fix}</span>
                  <span className="col-start-2 font-mono text-xs text-ok md:col-start-auto">PATCH RELEASED {fix}</span>
                  <span className="col-start-2 font-mono text-xs text-steel md:col-start-auto">{latest ? `latest on php.net: ${latest}` : "UPDATE REQUIRED below fix"}</span>
                </>
              ) : (
                <span className="col-start-2 font-mono text-xs text-steel md:col-span-3">UNSUPPORTED: no upstream fix; migrate or use vendor-maintained packages</span>
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-xs text-dim">
        Fixed versions per the PHP2Shell security releases <Cite id="php-changelog-8" /> · support status <Cite id="php-supported" />
      </p>
    </div>
  );
}
