"use client";
import { useEffect, useState } from "react";
import { onConfigChange } from "./useAgentStream";

/**
 * Contract address from the server (database, set with `npm run ca`), updated live over SSE.
 * Never a placeholder that looks real: until one is set it reads NOT LAUNCHED.
 */
export function ContractChip({ initial, network }: { initial: string; network: string }) {
  const [address, setAddress] = useState(initial);
  const [copied, setCopied] = useState(false);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/v1/token")
      .then((r) => r.json())
      .then((j) => alive && setAddress(j.contractAddress ?? ""))
      .catch(() => {});
    const off = onConfigChange((key, value) => {
      if (key !== "contract_address") return;
      setAddress(value);
      setFlash(true);
      setTimeout(() => setFlash(false), 2500);
    });
    return () => {
      alive = false;
      off();
    };
  }, []);

  if (!address) {
    return (
      <span title="No token contract has been published. Any address claiming to be this project's is not ours." className="flex items-center gap-2 rounded-full border border-line bg-ink-2 px-3 py-1 font-mono text-[10px] tracking-[0.12em] text-dim">
        <span className="text-php">CA</span> <span className="sm:hidden">TBA</span><span className="hidden sm:inline">NOT LAUNCHED</span>
      </span>
    );
  }
  const short = `${address.slice(0, 4)}…${address.slice(-4)}`;
  return (
    <span className={`flex items-center gap-1 rounded-full border py-1 pl-3 pr-1 font-mono text-[10px] tracking-[0.08em] transition-all duration-700 ${flash ? "border-ok bg-ok/15 shadow-[0_0_24px_rgba(98,201,154,.45)]" : "border-php-deep bg-php-deep/15"}`}>
      <span className="text-php">CA</span>
      <a href={`https://explorer.solana.com/address/${address}`} target="_blank" rel="noopener noreferrer" className="text-paper hover:underline" title={`${address} (${network})`}>
        <span className="sm:hidden">{short}</span>
        <span className="hidden sm:inline">{`${address.slice(0, 6)}…${address.slice(-6)}`}</span>
      </a>
      <button
        type="button"
        onClick={() => navigator.clipboard?.writeText(address).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {})}
        className="ml-1 rounded-full bg-php-deep/40 px-2 py-0.5 text-paper hover:bg-php-deep"
        aria-label="Copy contract address"
      >
        {copied ? "COPIED" : "COPY"}
      </button>
    </span>
  );
}
