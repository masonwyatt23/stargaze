"use client";

import { Star, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type SwipeButtonsProps = {
  onSwipe: (direction: "right" | "left") => void;
  disabled?: boolean;
  className?: string;
};

/**
 * Big round Skip / Save buttons that sit below the deck. Tap-friendly target
 * size for mobile; visible focus rings; full keyboard reachable.
 */
export function SwipeButtons({ onSwipe, disabled, className }: SwipeButtonsProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-6 sm:gap-8",
        className,
      )}
    >
      <button
        type="button"
        aria-label="Skip this project (left arrow or X key)"
        disabled={disabled}
        onClick={() => onSwipe("left")}
        className={cn(
          "group relative flex h-14 w-14 items-center justify-center rounded-full sm:h-16 sm:w-16",
          "border border-border bg-card text-muted-foreground shadow-lg shadow-black/30",
          "transition-all duration-150",
          "hover:border-destructive/60 hover:text-destructive hover:shadow-destructive/20 hover:scale-105",
          "active:scale-95",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100",
        )}
      >
        <X className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.5} />
      </button>

      <button
        type="button"
        aria-label="Save and star this project (right arrow or S key)"
        disabled={disabled}
        onClick={() => onSwipe("right")}
        className={cn(
          "group relative flex h-[72px] w-[72px] items-center justify-center rounded-full sm:h-20 sm:w-20",
          "bg-primary text-primary-foreground shadow-xl shadow-primary/30",
          "transition-all duration-150",
          "hover:scale-110 hover:shadow-primary/50",
          "active:scale-95",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100",
        )}
      >
        <Star
          className="h-8 w-8 fill-primary-foreground sm:h-9 sm:w-9"
          strokeWidth={2}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full bg-primary/40 blur-xl transition-opacity duration-300 group-hover:opacity-100 opacity-0"
        />
      </button>
    </div>
  );
}
