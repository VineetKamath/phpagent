import { createHash } from "node:crypto";
import { listEvents } from "./store";

/** The proof ledger is REAL-only regardless of DEMO_MODE, and requires an external verification URL. */
export async function listProof() {
  return (await listEvents("REAL", 2000))
    .filter((e) => e.verificationUrl)
    .map((e) => ({
      id: e.id,
      kind: e.eventType,
      timestamp: e.timestamp,
      source_provider: e.source,
      cve_id: e.cveId,
      repository: e.repositoryId,
      github_url: e.verificationUrl?.startsWith("https://github.com/") ? e.verificationUrl : null,
      source_url: e.verificationUrl,
      commit_sha: (e.metadata.commitSha as string) ?? null,
      transaction_signature: (e.metadata.signature as string) ?? null,
      data_hash: "sha256:" + createHash("sha256").update(JSON.stringify(e)).digest("hex"),
    }));
}
