/**
 * Tasteful structured logger for API routes.
 *
 * Emits a single JSON line per call so Vercel's runtime log indexer can
 * search/filter by `event`, `level`, or any meta field. Not a Sentry-grade
 * solution — just enough structure that production grepping doesn't suck.
 *
 * Usage:
 *   log({ level: "error", event: "github.star.failed", projectId, error: err.message });
 */
export function log(entry: {
  level: "info" | "warn" | "error";
  event: string;
  [k: string]: unknown;
}) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...entry });
  if (entry.level === "error") console.error(line);
  else if (entry.level === "warn") console.warn(line);
  else console.log(line);
}
