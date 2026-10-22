import { isDemoEnv, type ReadMode } from "./store";
import { ensureDemo } from "./demo";

type Params = URLSearchParams | Record<string, string | string[] | undefined> | undefined;

/** Demo data is readable only when the server runs with DEMO_MODE=true. `?demo=true` cannot enable it in production. */
export function readMode(params?: Params): ReadMode {
  if (!isDemoEnv()) return "REAL";
  ensureDemo();
  const v = params instanceof URLSearchParams ? params.get("demo") : params?.demo;
  return v === "false" ? "REAL" : "ALL";
}
