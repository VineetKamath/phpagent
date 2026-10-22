import { checkPublicRepository } from "./public-repo";
import { listPublicChecks, savePublicCheck } from "./public-check-history";

const HOUR = 60 * 60 * 1000;
let running = false;

/** Recheck saved repositories once due. Failed checks retain their last successful findings. */
export async function recheckPublicRepositories(now = Date.now()) {
  if (running) return { checked: 0, errors: [] as string[], skippedRun: true };
  running = true;
  try {
    const due = (await listPublicChecks(null))
      .filter((entry) => now - Date.parse(entry.checkedAt) >= HOUR)
      .sort((a, b) => a.checkedAt.localeCompare(b.checkedAt));
    const errors: string[] = [];
    let checked = 0;
    // Bound outbound GitHub traffic while allowing independent repositories to progress.
    const worker = async () => {
      for (let entry = due.shift(); entry; entry = due.shift()) {
        try {
          await savePublicCheck(await checkPublicRepository(entry.repository));
          checked++;
        } catch (error) {
          errors.push(`${entry.repository}: ${String(error)}`);
        }
      }
    };
    await Promise.all([worker(), worker()]);
    return { checked, errors, skippedRun: false };
  } finally {
    running = false;
  }
}
