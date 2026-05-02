"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Star, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GithubIcon } from "@/components/icons/github-icon";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "stargaze:welcomed-to-feed-v1";
const SHOW_DELAY_MS = 600;

/**
 * Fires the first time a freshly-authed user lands on /feed. Different from
 * `<AutoStarExplainer>` — that one fires *after* the first OSS right-swipe.
 * This one fires *before* any swipes, so the user knows what they're about
 * to do.
 *
 * Persists once-ever via localStorage. Honors prefers-reduced-motion.
 */
export function FirstFeedWelcome() {
  const [open, setOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Detect reduced-motion preference at mount time.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mql.matches);
  }, []);

  // Open once with a small delay so the deck flashes behind the sheet first.
  useEffect(() => {
    if (typeof window === "undefined") return;

    let seen: string | null = null;
    try {
      seen = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      // localStorage can throw in private mode / strict iframes — fail open
      // and just don't show the sheet. Avoids breaking the feed.
      return;
    }

    if (seen === "1") return;

    const t = window.setTimeout(() => {
      setOpen(true);
      try {
        window.localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        // Ignored — see above.
      }
    }, SHOW_DELAY_MS);

    return () => window.clearTimeout(t);
  }, []);

  const handleClose = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="bottom"
        className={cn(
          "rounded-t-2xl",
          // Skip the slide-in animation entirely for users who prefer
          // reduced motion.
          reducedMotion &&
            "data-[state=open]:animate-none data-[state=closed]:animate-none data-[state=open]:duration-0 data-[state=closed]:duration-0",
        )}
      >
        <SheetHeader>
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 ring-1 ring-primary/30">
            <Star
              className="h-8 w-8 fill-primary text-primary"
              strokeWidth={1.5}
            />
          </div>
          <SheetTitle className="text-center text-2xl font-bold tracking-tight">
            You&apos;re in. Let&apos;s swipe.
          </SheetTitle>
          <SheetDescription className="text-center">
            Stargaze is a tap-and-swipe feed of indie projects shipped by real
            humans. Every right-swipe lifts a maker.
          </SheetDescription>
        </SheetHeader>

        {/* Mock card visual — gives the user a tiny preview of what they're
            about to interact with. */}
        <div className="my-6 flex justify-center">
          <MockCard reducedMotion={reducedMotion} />
        </div>

        {/* Three quick steps */}
        <ul className="my-2 space-y-3 text-sm">
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
            <span className="leading-relaxed text-foreground/90">
              <span className="font-medium text-foreground">
                Drag right or hit →
              </span>{" "}
              when you love a project. Skip with ← or the X.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <GithubIcon className="size-3.5" />
            </span>
            <span className="leading-relaxed text-foreground/90">
              <span className="font-medium text-foreground">
                We star the repo on your GitHub
              </span>{" "}
              automatically — that&apos;s the signal that powers the
              leaderboard.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Trophy className="h-3.5 w-3.5" />
            </span>
            <span className="leading-relaxed text-foreground/90">
              <span className="font-medium text-foreground">
                Top makers climb the weekly leaderboard
              </span>{" "}
              — ship something and seed the deck yourself.
            </span>
          </li>
        </ul>

        <SheetFooter className="mt-6">
          <Button onClick={handleClose} size="lg" className="w-full">
            Let&apos;s go
            <ArrowRight className="h-4 w-4" />
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Tiny faux project card — purely decorative. Mirrors the real card layout
 * just enough so the user recognizes it once the sheet closes. CSS-only
 * gentle wiggle to suggest "this is swipeable."
 */
function MockCard({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <div
      className={cn(
        "relative w-56 overflow-hidden rounded-xl border border-border/80 bg-card shadow-xl shadow-black/30 ring-1 ring-primary/10",
        !reducedMotion && "animate-[mock-card-tilt_3.6s_ease-in-out_infinite]",
      )}
      aria-hidden
    >
      <div className="aspect-[16/10] w-full bg-gradient-to-br from-primary/40 via-primary/15 to-transparent" />
      <div className="space-y-2 p-3">
        <div className="h-3 w-3/4 rounded bg-foreground/80" />
        <div className="h-2 w-full rounded bg-muted" />
        <div className="h-2 w-5/6 rounded bg-muted" />
        <div className="flex items-center gap-2 pt-1">
          <div className="h-5 w-5 rounded-full bg-muted" />
          <div className="h-2 w-16 rounded bg-muted" />
        </div>
      </div>
      {/* Inline keyframes — Tailwind v4 supports @theme but keeping this self-
          contained with a <style> tag avoids a config edit. */}
      <style>{`
        @keyframes mock-card-tilt {
          0%, 100% { transform: rotate(-1.5deg); }
          50% { transform: rotate(1.5deg); }
        }
      `}</style>
    </div>
  );
}
