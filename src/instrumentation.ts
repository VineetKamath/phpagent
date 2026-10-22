/** Next.js instrumentation hook. Node-only code lives in instrumentation-node.ts so the edge build never bundles node:crypto. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduler } = await import("./instrumentation-node");
    await startScheduler();
  }
}
