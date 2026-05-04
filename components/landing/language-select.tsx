"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Code2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Curated list of common languages. We intentionally don't enumerate every
 * value present in the corpus — a fixed list keeps the dropdown short and
 * self-explanatory. Users with a niche language can still arrive via direct
 * `?lang=` URLs (the feed query is case-insensitive on this param).
 */
const LANGUAGES = [
  "TypeScript",
  "JavaScript",
  "Python",
  "Rust",
  "Go",
  "Swift",
  "Lua",
  "C++",
  "Ruby",
] as const;

type LanguageSelectProps = {
  basePath: string;
  active: string | null;
  className?: string;
};

/**
 * URL-driven language filter. Native `<select>` so it feels right on
 * mobile + accessible by default. Updates `?lang=` while preserving every
 * other param. "Any" clears the filter.
 */
export function LanguageSelect({
  basePath,
  active,
  className,
}: LanguageSelectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const onChange = (next: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "" || next === "any") {
      params.delete("lang");
    } else {
      params.set("lang", next);
    }
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
  };

  const current = active ?? "any";
  const display =
    active && active.length > 0
      ? active
      : "Any language";

  return (
    <label
      className={cn(
        "relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-card pl-3 pr-8 text-xs font-medium text-foreground",
        "ring-1 ring-inset ring-border/60 hover:bg-secondary hover:ring-border",
        "focus-within:ring-2 focus-within:ring-ring",
        "transition-colors",
        active ? "ring-primary/40 bg-primary/5 text-primary" : null,
        className,
      )}
    >
      <Code2
        aria-hidden
        className={cn(
          "h-3.5 w-3.5",
          active ? "text-primary" : "text-muted-foreground",
        )}
      />
      <select
        aria-label="Filter by language"
        value={current}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "absolute inset-0 cursor-pointer appearance-none bg-transparent pl-9 pr-7 text-xs font-medium text-transparent",
          "focus-visible:outline-none",
        )}
      >
        <option value="any" className="bg-card text-foreground">
          Any language
        </option>
        {LANGUAGES.map((l) => (
          <option key={l} value={l} className="bg-card text-foreground">
            {l}
          </option>
        ))}
      </select>
      <span className="pointer-events-none">{display}</span>
      <svg
        aria-hidden
        viewBox="0 0 12 12"
        className="pointer-events-none absolute right-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-muted-foreground"
      >
        <path
          d="M2 4.5L6 8.5L10 4.5"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
        />
      </svg>
    </label>
  );
}

// parseLanguageParam moved to lib/feed/filter-params.ts (server-safe).
export { parseLanguageParam } from "@/lib/feed/filter-params";
