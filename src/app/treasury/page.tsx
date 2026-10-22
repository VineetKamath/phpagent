import type { Metadata } from "next";
import { getTreasury } from "@/lib/treasury";
import { Badge, PageHead, fmtTime } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Treasury", description: "Read-only infrastructure accounting for the agent's public wallet.", alternates: { canonical: "/treasury" } };

export default async function Treasury() {
  const t = await getTreasury();
  const live = t.state === "live" ? t : null;
  const cells: [string, string, string?][] = [
    ["Treasury balance", live ? `${live.balanceSol.toFixed(4)} SOL` : "n/a"],
    ["Fees received", "n/a", "categorisation not live"],
    ["Compute paid", "n/a", "categorisation not live"],
    ["Infrastructure paid", "n/a", "categorisation not live"],
    ["Runway", "UNAVAILABLE", "needs 30 days of recorded expenses"],
    ["Cost / patch", "n/a"],
    ["Cost / merge", "n/a"],
    ["Wallet", t.state === "unconfigured" ? "NOT SET" : t.state === "live" ? "READ-ONLY" : "UNREACHABLE", "public address only"],
  ];
  return (
    <>
      <PageHead eyebrow="/treasury" title={<>Compute has a cost. Show the receipts.</>} meta={[["keys_held","none"],["network","solana"],["runway","balance / 30d cost"],["yield","none"]]}>
        Infrastructure accounting for a public, read-only wallet. The website never holds a signing key. Nothing here is an offer, a yield or a promise of returns.
      </PageHead>
      <div className="mx-auto mt-12 max-w-[1560px] px-4 md:px-8 reveal">
        <div className="flex flex-wrap items-center gap-3">
          {t.state === "live" && <Badge label="LIVE" />}
          {t.state !== "live" && <Badge label="UNAVAILABLE" />}
          <span className="font-mono text-xs text-steel">
            {t.state === "unconfigured" && "No treasury wallet is configured. TREASURY DATA UNAVAILABLE."}
            {t.state === "unavailable" && `TREASURY DATA CURRENTLY UNAVAILABLE: ${t.error}`}
            {live && <>wallet <a className="text-php" href={`https://explorer.solana.com/address/${live.wallet}`} target="_blank" rel="noopener noreferrer">{live.wallet}</a> · {fmtTime(live.retrievedAt)}</>}
          </span>
        </div>

        <ol className="mt-12 flex flex-col gap-3 font-mono text-sm md:flex-row md:items-center" aria-label="Flow of funds">
          {["FEES", "TREASURY", "COMPUTE", "PATCH"].map((x, i) => (
            <li key={x} className="flex items-center gap-3"><span className="rounded-full border border-line px-5 py-2.5">{x}</span>{i < 3 && <span aria-hidden className="text-dim">→</span>}</li>
          ))}
        </ol>

        <dl className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-4">
          {cells.map(([k, v, note]) => (
            <div key={k} className="bg-ink-2 p-5">
              <dt className="eyebrow text-[10px]!">{k}</dt>
              <dd className="mt-2 font-mono text-xl">{v}</dd>
              {note && <dd className="mt-1 text-xs text-dim">{note}</dd>}
            </div>
          ))}
        </dl>

        <details className="mt-6 max-w-2xl text-sm text-steel">
          <summary className="cursor-pointer font-mono text-xs text-php">How runway is calculated</summary>
          <p className="mt-3 font-mono text-xs leading-relaxed">TREASURY LIQUID BALANCE ÷ 30-DAY AVERAGE DAILY OPERATING COST = RUNWAY (days). Speculative future income is never counted. Until 30 days of categorised expenses exist, runway is shown as UNAVAILABLE.</p>
        </details>

        {live && (
          <>
            <h2 className="eyebrow reveal mt-14 flex items-center gap-3"><span className="h-px w-8 bg-php" />Recent signatures</h2>
            <ul className="mt-4 divide-y divide-line border-y border-line font-mono text-xs">
              {live.signatures.length === 0 && <li className="py-4 text-steel">No transactions.</li>}
              {live.signatures.map((s) => (
                <li key={s.signature} className="flex flex-wrap justify-between gap-2 py-3">
                  <a className="break-all text-php" href={s.explorerUrl} target="_blank" rel="noopener noreferrer">{s.signature.slice(0, 32)}…</a>
                  <span className="text-dim">{fmtTime(s.blockTime)}{s.err ? " · failed" : ""}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}
