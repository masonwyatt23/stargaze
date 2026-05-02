"use client";

/**
 * Sticky-ish banner shown above the feed when the current user has
 * curator-imported projects they can claim.
 *
 * TODO(integration): The feed page (`app/feed/page.tsx`) is owned by the
 * personalized-feed agent — to avoid a merge conflict we don't import this
 * banner there directly. Instead the page mounts <ClaimBannerLoader />
 * (a lightweight client wrapper that fetches /api/claim/count) which then
 * renders this banner. If/when the feed agent is happy to take a server
 * prop, swap to a direct mount with `claimableCount` from the page.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "stargaze:claim-banner-dismissed-v1";
const SUPPRESS_DAYS = 7;

type Props = {
  count: number;
  /** Optional sample of project titles for the teaser line. */
  sample?: string[];
  className?: string;
};

export function ClaimBanner({ count, sample, className }: Props) {
  // `null` = pre-hydration (we haven't checked localStorage yet).
  // `false` = hydrated, banner should render. `true` = hydrated, dismissed.
  const [hiddenState, setHiddenState] = useState<boolean | null>(null);

  useEffect(() => {
    let dismissed = false;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const dismissedAt = Number.parseInt(raw, 10);
        if (Number.isFinite(dismissedAt)) {
          const ageDays = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
          if (ageDays < SUPPRESS_DAYS) dismissed = true;
        }
      }
    } catch {
      // localStorage may be unavailable (private mode) — fail open.
    }
    // Synchronizing React state with an external system (localStorage) on
    // mount is exactly what an effect is for; the lint rule's general
    // warning doesn't apply here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHiddenState(dismissed);
  }, []);

  if (count <= 0) return null;
  // Until hydration we render the banner so SSR + first paint match;
  // localStorage check happens on the client and may hide it shortly after.
  if (hiddenState === true) return null;

  function dismiss() {
    setHiddenState(true);
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  }

  const teaser = sample && sample.length > 0
    ? sample.slice(0, 2).join(", ") + (sample.length > 2 ? "…" : "")
    : null;

  const noun = count === 1 ? "project" : "projects";

  return (
    <div
      role="region"
      aria-label="Claim your projects"
      className={cn(
        "relative mb-4 overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-4 shadow-sm",
        className,
      )}
    >
      <div className="flex items-start gap-3 pr-7">
        <span
          aria-hidden
          className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary"
        >
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-sm font-medium leading-snug">
            We found{" "}
            <span className="text-primary">
              {count} {noun}
            </span>{" "}
            of yours imported by Stargaze Editorial.
          </p>
          {teaser ? (
            <p className="line-clamp-1 text-xs text-muted-foreground">
              {teaser}
            </p>
          ) : null}
          <Link
            href="/claim"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Claim {count === 1 ? "it" : "them"}
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>

      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss for a week"
        className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
