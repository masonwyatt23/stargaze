"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown } from "lucide-react";

import { cn } from "@/lib/utils";

export type SortValue = "trending" | "fresh" | "popular" | "alpha";

const OPTIONS: Array<{ value: SortValue; label: string }> = [
  { value: "trending", label: "Trending" },
  { value: "fresh", label: "Fresh" },
  { value: "popular", label: "Popular" },
  { value: "alpha", label: "A–Z" },
];

type SortSelectProps = {
  basePath: string;
  active: SortValue;
  className?: string;
};

/**
 * URL-driven sort dropdown. Native `<select>` styled as a chip so it stays
 * accessible + mobile-friendly. Updates `?sort=` while preserving every
 * other query param.
 */
export function SortSelect({ basePath, active, className }: SortSelectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const onChange = (next: string) => {
    const params = new URLSearchParams(searchParams.toString());
    // "trending" is the default — drop the param when chosen so URLs stay tidy.
    if (next === "trending") {
      params.delete("sort");
    } else {
      params.set("sort", next);
    }
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
  };

  return (
    <label
      className={cn(
        "relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-card px-3 pl-3 pr-8 text-xs font-medium text-foreground",
        "ring-1 ring-inset ring-border/60 hover:bg-secondary hover:ring-border",
        "focus-within:ring-2 focus-within:ring-ring",
        "transition-colors",
        className,
      )}
    >
      <ArrowUpDown
        aria-hidden
        className="h-3.5 w-3.5 text-muted-foreground"
      />
      <span className="text-muted-foreground">Sort:</span>
      <select
        aria-label="Sort projects"
        value={active}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "absolute inset-0 cursor-pointer appearance-none bg-transparent pl-[5.4rem] pr-7 text-xs font-medium text-foreground",
          "focus-visible:outline-none",
        )}
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value} className="bg-card text-foreground">
            {o.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none ml-1 text-foreground">
        {OPTIONS.find((o) => o.value === active)?.label ?? "Trending"}
      </span>
      <svg
        aria-hidden
        viewBox="0 0 12 12"
        className="pointer-events-none absolute right-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-muted-foreground"
      >
        <path d="M2 4.5L6 8.5L10 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      </svg>
    </label>
  );
}

// parseSortParam moved to lib/feed/filter-params.ts so it can be called
// from server components (this file is "use client" — server code can't
// invoke client-side functions).
export { parseSortParam } from "@/lib/feed/filter-params";
