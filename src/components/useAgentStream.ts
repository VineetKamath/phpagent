"use client";
import { useEffect, useState } from "react";
import type { AgentEvent } from "@/lib/types";

export type StreamState = "connecting" | "live" | "reconnecting";

/** One shared EventSource per page; every component reads the same stream. */
type Sub = (events: AgentEvent[], state: StreamState) => void;
let es: EventSource | null = null;
let events: AgentEvent[] = [];
let state: StreamState = "connecting";
const subs = new Set<Sub>();
const emit = () => subs.forEach((s) => s(events, state));

function connect() {
  if (es) return;
  es = new EventSource("/api/v1/stream");
  es.addEventListener("hello", () => {
    state = "live";
    emit();
  });
  es.addEventListener("agent", (m) => {
    const e = JSON.parse((m as MessageEvent).data) as AgentEvent;
    if (events.some((x) => x.id === e.id)) return;
    events = [e, ...events].slice(0, 200);
    emit();
  });
  es.onerror = () => {
    state = "reconnecting";
    emit();
  };
}

export function useAgentStream() {
  const [snap, setSnap] = useState<{ events: AgentEvent[]; state: StreamState }>({ events, state });
  useEffect(() => {
    const s: Sub = (e, st) => setSnap({ events: e, state: st });
    subs.add(s);
    connect();
    s(events, state);
    return () => {
      subs.delete(s);
      if (!subs.size && es) {
        es.close();
        es = null;
        state = "connecting";
      }
    };
  }, []);
  return snap;
}
