"use client";
import { useState } from "react";

/** Contract address from configuration only. Never a placeholder that looks real. */
export function ContractChip({ address, network }: { address: string; network: string }) {
  const [copied, setCopied] = useState(false);
  if (!address) {
    return (
      <span title="No token contract has been published. Any address claiming to be this project's is not ours." className="flex items-center gap-2 rounded-full border border-line bg-ink-2 px-3 py-1 font-mono text-[10px] tracking-[0.12em] text-dim">
        <span className="text-php">CA</span> <span className="sm:hidden">TBA</span><span className="hidden sm:inline">NOT LAUNCHED</span>
      </span>
    );
  }
  const short = `${address.slice(0, 4)}…${address.slice(-4)}`;
  return (
    <span className="flex items-center gap-1 rounded-full border border-php-deep bg-php-deep/15 py-1 pl-3 pr-1 font-mono text-[10px] tracking-[0.08em]">
      <span className="text-php">CA</span>
      <a href={`https://explorer.solana.com/address/${address}`} target="_blank" rel="noopener noreferrer" className="text-paper hover:underline" title={`${address} (${network})`}>
        <span className="sm:hidden">{short}</span>
        <span className="hidden sm:inline">{address.length > 20 ? `${address.slice(0, 8)}…${address.slice(-6)}` : address}</span>
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
