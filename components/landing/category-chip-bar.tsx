"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export type CategoryChip = {
  value: string;
  label: string;
  count?: number;
};

type CategoryChipBarProps = {
  categories: CategoryChip[];
  active: string | null;
  basePath: string;
  className?: string;
  /** Param name used in the URL. Defaults to "cat". */
  param?: string;
  /** Label rendered for the "all" chip. Defaults to "All". */
  allLabel?: string;
};

/**
 * Horizontal scroll-snap chip strip. Each chip is a Link that updates the
 * `?<param>=` query param while preserving every other param. The "All"
 * chip clears the param entirely.
 */
export function CategoryChipBar({
  categories,
  active,
  basePath,
  className,
  param = "cat",
  allLabel = "All",
}: CategoryChipBarProps) {
  const searchParams = useSearchParams();

  const buildHref = (value: string | null): string => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === "all") {
      params.delete(param);
    } else {
      params.set(param, value);
    }
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const isActive = (value: string | null) =>
    value === null ? active === null || active === "all" : active === value;

  return (
    <div
      role="tablist"
      aria-label="Filter by category"
      className={cn(
        "flex w-full items-center gap-2 overflow-x-auto",
        "scroll-smooth snap-x snap-mandatory",
        "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      <Chip
        href={buildHref(null)}
        active={isActive(null)}
        label={allLabel}
      />
      {categories.map((c) => (
        <Chip
          key={c.value}
          href={buildHref(c.value)}
          active={isActive(c.value)}
          label={c.label}
          count={c.count}
        />
      ))}
    </div>
  );
}

function Chip({
  href,
  active,
  label,
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  count?: number;
}) {
  return (
    <Link
      href={href}
      role="tab"
      aria-selected={active}
      scroll={false}
      className={cn(
        "shrink-0 snap-start rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
        "ring-1 ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "bg-primary text-primary-foreground ring-primary/40 shadow-[0_0_18px_hsl(47_96%_58%/0.25)]"
          : "bg-card text-muted-foreground ring-border/60 hover:bg-secondary hover:text-foreground",
      )}
    >
      <span>{label}</span>
      {typeof count === "number" && count > 0 ? (
        <span
          className={cn(
            "ml-1.5 rounded-full px-1.5 py-px text-[10px] font-mono tabular-nums",
            active
              ? "bg-primary-foreground/15 text-primary-foreground"
              : "bg-secondary text-muted-foreground",
          )}
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}
