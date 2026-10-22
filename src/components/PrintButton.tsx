"use client";
export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="rounded-full border border-[#ccc] px-4 py-2 font-mono text-xs">
      Print / Save as PDF
    </button>
  );
}
