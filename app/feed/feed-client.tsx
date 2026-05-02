"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Layers, Star } from "lucide-react";
import { toast } from "sonner";
import { AccessRequestModal } from "@/components/access-request-modal";
import { AutoStarExplainer } from "@/components/auto-star-explainer";
import { Button } from "@/components/ui/button";
import { SwipeButtons } from "@/components/swipe-buttons";
import { SwipeDeck } from "@/components/swipe-deck";
import type { FeedProject } from "@/lib/types/db";

type FeedClientProps = {
  projects: FeedProject[];
  autoStarEnabled: boolean;
};

/**
 * Hosts the swipe deck + buttons. Posts each swipe to /api/swipe.
 * Handles auto-star toast and access-request modal for closed-source picks.
 */
export function FeedClient({ projects, autoStarEnabled }: FeedClientProps) {
  const initial = useMemo(() => projects, [projects]);
  const [remaining, setRemaining] = useState(initial);
  const [pendingAccess, setPendingAccess] = useState<FeedProject | null>(null);
  const [autoStarSwipeSignal, setAutoStarSwipeSignal] = useState(0);
  const top = remaining[0];

  const popTop = useCallback(() => {
    setRemaining((prev) => prev.slice(1));
  }, []);

  const handleSwipe = useCallback(
    async (project: FeedProject, direction: "right" | "left") => {
      if (!project) return;

      // Fire-and-forget the API call. Optimistic UX: pop the card first.
      popTop();

      try {
        const res = await fetch("/api/swipe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            projectId: project.id,
            direction,
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          if (res.status === 429) {
            toast.error("Slow down, star-slinger.", {
              description: "You've hit today's swipe limit. Come back later.",
            });
          } else if (res.status === 401) {
            toast.error("Sign in to keep swiping.");
          } else {
            toast.error("Couldn't record that swipe.", {
              description: body?.error ?? "Try again in a moment.",
            });
          }
          return;
        }

        if (direction === "right") {
          if (project.is_open_source) {
            if (autoStarEnabled) {
              toast.success(`★ Starred ${project.title}`, {
                description: `@${project.creator.github_username} just got a boost.`,
              });
              setAutoStarSwipeSignal((n) => n + 1);
            } else {
              toast.success(`Saved ${project.title}`, {
                description:
                  "Auto-star is off — toggle it in Settings to lift makers.",
              });
            }
          } else {
            // Closed-source: open the access-request modal.
            setPendingAccess(project);
          }
        }
      } catch (err) {
        toast.error("Network blip — swipe not saved.", {
          description: err instanceof Error ? err.message : undefined,
        });
      }
    },
    [popTop, autoStarEnabled],
  );

  // Wrapper for the tap-to-swipe buttons (which only know direction).
  const handleButtonSwipe = useCallback(
    (direction: "right" | "left") => {
      if (!top) return;
      void handleSwipe(top, direction);
    },
    [top, handleSwipe],
  );

  // Empty state.
  if (!top) {
    return <EmptyDeck />;
  }

  return (
    <>
      <div className="relative w-full">
        <SwipeDeck
          projects={remaining}
          onSwipe={handleSwipe}
          onCardTap={() => {
            // Tap-to-open detail sheet hook — currently no-op; the swipe
            // deck owns its own detail-sheet state.
          }}
        />
      </div>

      <SwipeButtons
        onSwipe={handleButtonSwipe}
        className="mt-8"
        disabled={!top}
      />

      <p className="mt-6 text-center text-xs text-muted-foreground">
        ← skip ✕ &nbsp;·&nbsp; star → 🌟 &nbsp;·&nbsp; tap card to read more
      </p>

      <AccessRequestModal
        project={pendingAccess}
        onSubmit={async ({ email, message }) => {
          if (!pendingAccess) return;
          const res = await fetch("/api/access-request", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              projectId: pendingAccess.id,
              email,
              message,
            }),
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body?.error ?? "Failed to send request");
          }
          setPendingAccess(null);
        }}
        onClose={() => setPendingAccess(null)}
      />

      <AutoStarExplainer
        triggeredByFirstSwipe
        swipeSignal={autoStarSwipeSignal}
      />
    </>
  );
}

function EmptyDeck() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/40 p-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/30">
        <Star className="h-7 w-7 fill-primary text-primary" />
      </div>
      <h2 className="mt-4 text-xl font-semibold">You&apos;re all caught up.</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        No more new projects today. Come back tomorrow — or ship one yourself
        and seed the deck.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button asChild>
          <Link href="/projects/new">Submit a project</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/leaderboard">
            <Layers className="h-4 w-4" />
            See leaderboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
