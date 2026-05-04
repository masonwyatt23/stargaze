"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { GithubIcon } from "@/components/icons/github-icon";
import { Button } from "@/components/ui/button";
import { SwipeDeck } from "@/components/swipe-deck";
import type { FeedProject } from "@/lib/types/db";

const SIGN_IN_AFTER = 5;

/**
 * Anonymous-only swipe deck. Wraps SwipeDeck with a no-op onSwipe (we don't
 * persist anonymous swipes) and surfaces a sign-in CTA the moment the visitor
 * has felt the loop. The CTA card replaces the deck after SIGN_IN_AFTER
 * swipes — sooner if the deck runs out first.
 */
export function TryDeck({ projects }: { projects: FeedProject[] }) {
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(false);

  const handleSwipe = useCallback(
    (_: FeedProject, __: "right" | "left") => {
      setCount((n) => {
        const next = n + 1;
        if (next >= SIGN_IN_AFTER) setDone(true);
        return next;
      });
    },
    [],
  );

  if (done || count >= projects.length) {
    return <SignInCta count={count} />;
  }

  return (
    <div className="w-full">
      <div className="relative mx-auto h-[520px] w-full max-w-md sm:h-[560px]">
        <SwipeDeck projects={projects} onSwipe={handleSwipe} />
      </div>
      <p className="mt-4 text-center font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        {count}/{SIGN_IN_AFTER} · drag, tap arrows, or use ← / →
      </p>
    </div>
  );
}

function SignInCta({ count }: { count: number }) {
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="relative overflow-hidden rounded-[2rem] border border-primary/40 bg-card/80 p-8 text-center shadow-2xl shadow-primary/10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-60"
          style={{
            background:
              "radial-gradient(circle at center, hsl(47 96% 58% / 0.20) 0%, transparent 65%)",
          }}
        />
        <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/30">
          <Star className="h-6 w-6 fill-primary" strokeWidth={0} />
        </div>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.32em] text-primary">
          ★ keep going
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
          {count >= SIGN_IN_AFTER
            ? "You've got the rhythm."
            : "That's the deck for now."}
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Sign in with GitHub to save the projects you swiped right on, and we
          star their repos on your behalf so makers feel the love.
        </p>

        <div className="mt-6 flex flex-col items-stretch gap-2">
          <Button asChild size="lg" className="gap-2">
            <Link href="/sign-in?redirect=/feed">
              <GithubIcon className="h-5 w-5" />
              Continue with GitHub
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/">← back to home</Link>
          </Button>
        </div>

        <ul className="mt-6 space-y-1.5 border-t border-border/60 pt-4 text-left text-xs text-muted-foreground">
          <li className="flex items-baseline gap-2">
            <span className="text-primary">★</span> Right-swipes auto-star the
            repo on GitHub
          </li>
          <li className="flex items-baseline gap-2">
            <span className="text-primary">★</span> Saved projects sync across
            devices
          </li>
          <li className="flex items-baseline gap-2">
            <span className="text-primary">★</span> Climb the weekly maker
            leaderboard with your own projects
          </li>
        </ul>
      </div>
    </div>
  );
}
