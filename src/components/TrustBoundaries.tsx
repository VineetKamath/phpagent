const d = (i: number) => ({ "--i": i }) as React.CSSProperties;

/** Where each kind of untrusted input may go, and what stops it. Shared by /architecture and /security. */
export function TrustBoundaries() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {[
        ["Repository content", "crit", "Parsed by fixed regexes and a strict schema. Never executed, never sent to a model, never rendered as HTML. A README saying “ignore previous instructions” changes nothing (tested)."],
        ["Advisory text", "amber", "Control characters stripped, length capped, rendered as plain text. Raw hash stored so changes are detectable."],
        ["Webhooks", "php", "HMAC-SHA256 over the raw body with constant-time comparison before JSON is parsed. Only patch-agent/* branches are acted on."],
        ["Writes to GitHub", "ok", "Only after installation + policy + validator. New branch only, never the default branch. One flag disables all writes."],
      ].map(([t, tone, b], i) => (
        <div key={t} className="reveal rounded-2xl border border-line bg-ink-2 p-6" style={d(i)}>
          <span className={`inline-block h-1.5 w-8 rounded-full ${tone === "crit" ? "bg-crit" : tone === "amber" ? "bg-amber" : tone === "ok" ? "bg-ok" : "bg-php"}`} />
          <h3 className="mt-4 text-xl font-semibold tracking-tight">{t}</h3>
          <p className="mt-2 text-sm leading-relaxed text-steel">{b}</p>
        </div>
      ))}
    </div>
  );
}
