"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

type S = "loading" | "operational" | "degraded" | "down" | "error";
const label: Record<S, string> = { loading: "CHECKING", operational: "AGENT ONLINE", degraded: "DEGRADED", down: "OFFLINE", error: "STATUS UNAVAILABLE" };
const color: Record<S, string> = { loading: "bg-dim", operational: "bg-ok", degraded: "bg-amber", down: "bg-crit", error: "bg-dim" };

/** Derived from /api/v1/status: never hard-coded. */
export function AgentStatusDot() {
  const [s, setS] = useState<S>("loading");
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/v1/status")
        .then((r) => r.json())
        .then((j) => alive && setS(j.status))
        .catch(() => alive && setS("error"));
    load();
    const t = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  return (
    <Link href="/status" className="flex items-center gap-2 font-mono text-[11px] tracking-[0.12em] text-steel hover:text-paper">
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${color[s]} ${s === "operational" ? "pulse" : ""}`} />
      <span>{label[s]}</span>
    </Link>
  );
}
