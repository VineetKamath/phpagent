import { subscribe, listEvents } from "@/lib/store";
import { readMode } from "@/lib/mode";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Server-Sent Events. Sends recent history, then live events, with a heartbeat every 15s. */
export async function GET(req: Request) {
  const mode = readMode(new URL(req.url).searchParams);
  const enc = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (event: string, data: unknown) => ctrl.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      send("hello", { mode, at: new Date().toISOString() });
      for (const e of (await listEvents(mode, 30).catch(() => [])).reverse()) send("agent", e);
      const unsub = subscribe((e) => {
        if (mode === "REAL" && e.dataMode !== "REAL") return;
        send("agent", e);
      });
      const hb = setInterval(() => ctrl.enqueue(enc.encode(`: hb ${Date.now()}\n\n`)), 15_000);
      cleanup = () => {
        unsub();
        clearInterval(hb);
      };
      req.signal.addEventListener("abort", () => {
        cleanup();
        try {
          ctrl.close();
        } catch {}
      });
    },
    cancel() {
      cleanup();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-store, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" },
  });
}
