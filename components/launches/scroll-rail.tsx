"use client";

import { cn } from "@/lib/utils";

type ScrollRailProps = {
  total: number;
  currentIndex: number;
  onJump: (index: number) => void;
};

/**
 * Right-edge vertical pagination rail. One small dot per launch — the
 * active dot glows brand-yellow + scales 1.5x. Click any dot to scroll
 * the launches container to that section. Hidden on mobile (the top
 * progress bar carries that affordance there).
 */
export function ScrollRail({
  total,
  currentIndex,
  onJump,
}: ScrollRailProps) {
  if (total <= 1) return null;

  return (
    <nav
      aria-label="Launch pagination"
      className="pointer-events-auto fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center gap-2 rounded-full border border-border/30 bg-background/40 px-1.5 py-3 backdrop-blur-md md:flex"
    >
      {Array.from({ length: total }).map((_, i) => {
        const active = i === currentIndex;
        const label = `Jump to launch ${i + 1} of ${total}`;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onJump(i)}
            aria-label={label}
            aria-current={active ? "true" : undefined}
            className={cn(
              "block rounded-full transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              active
                ? "h-2.5 w-2.5 scale-150 bg-primary shadow-[0_0_10px_hsl(47_96%_58%/0.6)]"
                : "h-1.5 w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground/80",
            )}
          />
        );
      })}
    </nav>
  );
}
