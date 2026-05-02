"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export type LeaderboardTab = {
  value: string; // "all" or a category value
  label: string;
};

const DEFAULT_TABS: LeaderboardTab[] = [
  { value: "all", label: "All" },
  { value: "ai-tool", label: "AI" },
  { value: "dev-utility", label: "Dev tools" },
  { value: "game", label: "Games" },
  { value: "saas", label: "SaaS" },
  { value: "other", label: "Other" },
];

type LeaderboardTabsProps = {
  active: string; // "all" | category value
  basePath?: string;
  tabs?: LeaderboardTab[];
  className?: string;
};

/**
 * Tab strip across the top of /leaderboard. Each tab is a Link with
 * `?cat=<value>` so the active tab is URL-driven and shareable. The
 * "All" tab clears the param.
 */
export function LeaderboardTabs({
  active,
  basePath = "/leaderboard",
  tabs = DEFAULT_TABS,
  className,
}: LeaderboardTabsProps) {
  const searchParams = useSearchParams();

  const buildHref = (value: string): string => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("cat");
    } else {
      params.set("cat", value);
    }
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <div
      role="tablist"
      aria-label="Leaderboard category"
      className={cn(
        "relative -mx-4 flex items-center gap-1 overflow-x-auto px-4 pb-2",
        "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {tabs.map((t) => {
        const isActive = t.value === active;
        return (
          <Link
            key={t.value}
            href={buildHref(t.value)}
            role="tab"
            aria-selected={isActive}
            scroll={false}
            className={cn(
              "relative shrink-0 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            <span
              aria-hidden
              className={cn(
                "absolute inset-x-2 -bottom-px h-0.5 rounded-full transition-all",
                isActive
                  ? "bg-primary shadow-[0_0_12px_hsl(47_96%_58%/0.55)]"
                  : "bg-transparent",
              )}
            />
          </Link>
        );
      })}
    </div>
  );
}
