"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

type SearchInputProps = {
  basePath: string;
  initialValue?: string | null;
  placeholder?: string;
  className?: string;
};

/**
 * URL-driven debounced search input. Updates `?q=` on the current
 * basePath with a 300ms debounce, preserving every other query param.
 * Clearing (clicking the X or emptying the input) removes `?q=` entirely.
 */
export function SearchInput({
  basePath,
  initialValue,
  placeholder = "Search projects",
  className,
}: SearchInputProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = React.useState<string>(initialValue ?? "");

  // Keep local state in sync if the URL changes externally (e.g. chip click).
  const urlQ = searchParams.get("q") ?? "";
  React.useEffect(() => {
    setValue(urlQ);
  }, [urlQ]);

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushUrl = React.useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmed = next.trim();
      if (trimmed.length === 0) {
        params.delete("q");
      } else {
        params.set("q", trimmed);
      }
      const qs = params.toString();
      router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
    },
    [basePath, router, searchParams],
  );

  const onChange = (next: string) => {
    setValue(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => pushUrl(next), 300);
  };

  const onClear = () => {
    setValue("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    pushUrl("");
  };

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className={cn("relative w-full", className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        type="search"
        inputMode="search"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search projects"
        className={cn(
          "flex h-10 w-full rounded-full border border-border/60 bg-background/70 pl-9 pr-9 text-sm shadow-sm",
          "placeholder:text-muted-foreground",
          "ring-offset-background transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      />
      {value.length > 0 ? (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground",
            "hover:bg-secondary hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
