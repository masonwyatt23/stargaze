"use client";

import * as React from "react";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";

type LeaderboardCountdownProps = {
  /** ISO timestamp of the next reset. */
  resetAt: string;
  className?: string;
};

/**
 * Live "this week resets in Xd Yh Zm" countdown for the leaderboard.
 * Ticks once per minute — never per-second to avoid layout thrash.
 */
export function LeaderboardCountdown({
  resetAt,
  className,
}: LeaderboardCountdownProps) {
  const target = React.useMemo(() => new Date(resetAt).getTime(), [resetAt]);
  const [now, setNow] = React.useState<number>(() => Date.now());

  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const remaining = Math.max(0, target - now);
  const totalMinutes = Math.floor(remaining / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const label =
    days > 0
      ? `${days}d ${hours}h`
      : hours > 0
        ? `${hours}h ${minutes}m`
        : `${minutes}m`;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-2.5 py-1 text-xs text-muted-foreground",
        className,
      )}
      aria-live="polite"
    >
      <Timer className="h-3.5 w-3.5 text-primary/80" aria-hidden />
      <span>
        Resets in <span className="font-mono tabular-nums text-foreground">{label}</span>
      </span>
    </div>
  );
}
