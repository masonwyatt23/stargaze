"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { Logo } from "@/components/logo";

type ExitControlsProps = {
  currentIndex: number;
  total: number;
  currentTitle: string;
};

/**
 * Sticky top control bar for the launch wall.
 *
 *   [ Stargaze logo ]   01 / 24 · {currentTitle}   [ ✕ Close ]
 *
 * Backdrop-blurred, semi-transparent, sits above every launch section.
 * Both the logo and the close button return the user to `/`.
 */
export function ExitControls({
  currentIndex,
  total,
  currentTitle,
}: ExitControlsProps) {
  const indexLabel = String(currentIndex + 1).padStart(2, "0");
  const totalLabel = String(Math.max(total, 1)).padStart(2, "0");

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50">
      <div className="pointer-events-auto flex items-center justify-between gap-4 border-b border-border/30 bg-background/60 px-4 py-3 backdrop-blur-md md:px-6">
        <div className="flex shrink-0 items-center">
          <Logo size="sm" />
        </div>

        <div className="hidden min-w-0 flex-1 items-center justify-center gap-2 md:flex">
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground/80">
            {indexLabel} / {totalLabel}
          </span>
          {currentTitle ? (
            <>
              <span className="text-muted-foreground/40" aria-hidden>
                ·
              </span>
              <span className="truncate text-sm font-medium text-foreground/90">
                {currentTitle}
              </span>
            </>
          ) : null}
        </div>

        <Link
          href="/"
          aria-label="Close launches"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border/40 bg-card/40 px-3 py-1.5 text-xs font-medium text-foreground/90 transition-colors hover:border-primary/40 hover:bg-card/70 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <X className="size-3.5" aria-hidden />
          <span>Close</span>
        </Link>
      </div>

      {/* Mobile-only secondary line: the index/title pair lives below the
          main bar so the logo + close button get the full top line. */}
      <div className="pointer-events-auto flex items-center justify-center gap-2 border-b border-border/20 bg-background/40 px-4 py-1.5 backdrop-blur-sm md:hidden">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/80">
          {indexLabel} / {totalLabel}
        </span>
        {currentTitle ? (
          <>
            <span className="text-muted-foreground/40" aria-hidden>
              ·
            </span>
            <span className="truncate text-xs font-medium text-foreground/90">
              {currentTitle}
            </span>
          </>
        ) : null}
      </div>
    </header>
  );
}
