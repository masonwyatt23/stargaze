/**
 * Server-safe URL param parsers for the feed filter system.
 *
 * These were previously defined inside "use client" components (sort-select,
 * oss-toggle, language-select), which Next.js refuses to call from a server
 * component — server code cannot invoke client-side functions, only render
 * client components or pass them as props.
 *
 * Pure string utilities — no React, no hooks. Safe to import from anywhere.
 */

export type SortValue = "trending" | "fresh" | "popular" | "alpha";
export type OssState = "any" | "true" | "false";

/** Validate `?sort=` URL value, fall back to "trending". */
export function parseSortParam(raw: string | null | undefined): SortValue {
  if (raw === "fresh" || raw === "popular" || raw === "alpha" || raw === "trending") {
    return raw;
  }
  return "trending";
}

/** Validate `?oss=` URL value, fall back to "any". */
export function parseOssParam(raw: string | null | undefined): OssState {
  if (raw === "true" || raw === "false") return raw;
  return "any";
}

/** Trim + null-coalesce the `?lang=` URL value. Treats empty / "any" as null. */
export function parseLanguageParam(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.toLowerCase() === "any") return null;
  // Cap to a reasonable length so a malicious URL can't bloat the SQL.
  return trimmed.slice(0, 40);
}
