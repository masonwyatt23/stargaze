"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "stargaze:auto-star-explained";

type AutoStarExplainerProps = {
  /** Imperative force-open via parent (Settings page "explain again" button). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** When true, mounts the controller that opens once on first OSS right-swipe. */
  triggeredByFirstSwipe?: boolean;
  /** Set this to a stable signal that increments on every OSS right-swipe. */
  swipeSignal?: number;
};

/**
 * Explains the auto-star behavior the first time a user right-swipes an
 * open-source project. Persists "explained" state to localStorage so it
 * never opens twice for the same user.
 */
export function AutoStarExplainer({
  open: controlledOpen,
  onOpenChange,
  triggeredByFirstSwipe,
  swipeSignal,
}: AutoStarExplainerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  // Open once when the first OSS right-swipe fires (if not controlled).
  useEffect(() => {
    if (!triggeredByFirstSwipe || isControlled) return;
    if (swipeSignal === undefined || swipeSignal <= 0) return;

    if (typeof window === "undefined") return;
    const seen = window.localStorage.getItem(STORAGE_KEY);
    if (seen === "1") return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInternalOpen(true);
    window.localStorage.setItem(STORAGE_KEY, "1");
  }, [triggeredByFirstSwipe, swipeSignal, isControlled]);

  const handleOpenChange = (next: boolean) => {
    if (isControlled) onOpenChange?.(next);
    else setInternalOpen(next);
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 ring-1 ring-primary/30">
            <Star className="h-7 w-7 fill-primary text-primary" strokeWidth={1.5} />
          </div>
          <SheetTitle className="text-center text-xl">
            You just starred a repo
          </SheetTitle>
          <SheetDescription className="text-center">
            Right-swiping an open-source project also{" "}
            <span className="font-medium text-foreground">
              stars it on GitHub
            </span>{" "}
            using the permission you granted at sign-in. That signal is what
            powers the maker leaderboard.
          </SheetDescription>
        </SheetHeader>

        <ul className="my-6 space-y-3 text-sm text-muted-foreground">
          <li className="flex items-start gap-3">
            <span className="mt-0.5 text-primary">→</span>
            <span>
              Stars happen instantly. We never post comments, follow, or fork.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 text-primary">→</span>
            <span>
              Toggle this off any time in{" "}
              <span className="font-medium text-foreground">Settings → Auto-star</span>.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 text-primary">→</span>
            <span>
              Skip a project? Nothing leaves your browser. No star, no signal.
            </span>
          </li>
        </ul>

        <SheetFooter>
          <Button onClick={() => handleOpenChange(false)} className="w-full">
            Got it
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
