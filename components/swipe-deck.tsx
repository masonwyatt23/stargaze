"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
  type TapInfo,
} from "framer-motion";
import { Star, X } from "lucide-react";
import { toast } from "sonner";
import type { FeedProject } from "@/lib/types/db";
import { ProjectCard } from "@/components/project-card";
import { StarBurst } from "@/components/star-burst";
import { useSwipeKeyboard } from "@/hooks/use-swipe-keyboard";
import { cn } from "@/lib/utils";

export type SwipeDeckProps = {
  projects: FeedProject[];
  /**
   * Called whenever the user commits a swipe. The deck advances optimistically
   * and does not await this — fire-and-forget. If the parent throws, the deck
   * surfaces a toast and the next card is still shown (the visual swipe has
   * already completed and re-winding looks broken).
   */
  onSwipe: (
    project: FeedProject,
    direction: "right" | "left",
  ) => Promise<void> | void;
  /** Tap (not drag) on the top card calls this. Useful for opening a detail sheet. */
  onCardTap?: (project: FeedProject) => void;
  /** Render this when the deck runs out. Defaults to a brand-flavored card. */
  emptyState?: React.ReactNode;
  className?: string;
};

const SWIPE_DISTANCE_THRESHOLD = 120;
const SWIPE_VELOCITY_THRESHOLD = 500;
/** Off-screen target for the exit animation. Larger than any viewport. */
const EXIT_X = 1200;

type SwipeIntent = { direction: "right" | "left"; programmatic: boolean };

/**
 * The swipe deck. Renders the top 3 cards stacked. Top card is draggable and
 * keyboard-controllable. On commit, the top card flies off and the next slides
 * up. Right-swipes on OSS projects fire a star burst overlay.
 */
export function SwipeDeck({
  projects,
  onSwipe,
  onCardTap,
  emptyState,
  className,
}: SwipeDeckProps) {
  const [index, setIndex] = useState(0);
  const [pendingSwipe, setPendingSwipe] = useState<SwipeIntent | null>(null);
  const [burstActive, setBurstActive] = useState(false);
  const burstTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup the burst timer on unmount.
  useEffect(
    () => () => {
      if (burstTimer.current) clearTimeout(burstTimer.current);
    },
    [],
  );

  const top = projects[index] ?? null;

  // Compute the next two cards (visible behind the top one).
  const visibleCards = useMemo(
    () => projects.slice(index, index + 3),
    [projects, index],
  );

  // ─── Drag plumbing for the top card ──────────────────────────────────────
  const x = useMotionValue(0);
  const rotate = useTransform(x, (v) => v * 0.06);
  const nopeOpacity = useTransform(x, [-160, -40, 0], [1, 0.2, 0]);
  const starOpacity = useTransform(x, [0, 40, 160], [0, 0.2, 1]);
  // Subtle scale-up of the second card as the top card moves out.
  const secondCardScale = useTransform(
    x,
    [-200, 0, 200],
    [0.97, 0.93, 0.97],
  );
  const secondCardY = useTransform(
    x,
    [-200, 0, 200],
    [12, 18, 12],
  );

  // Reset motion values when the top card changes.
  useEffect(() => {
    x.set(0);
  }, [index, x]);

  // ─── Commit logic ────────────────────────────────────────────────────────
  const commitSwipe = useCallback(
    (direction: "right" | "left", programmatic: boolean) => {
      if (!top || pendingSwipe) return;

      // Star burst on right-swipe on OSS only.
      if (direction === "right" && top.is_open_source) {
        setBurstActive(true);
        if (burstTimer.current) clearTimeout(burstTimer.current);
        burstTimer.current = setTimeout(() => setBurstActive(false), 700);
      }

      // Mark as exiting; AnimatePresence will animate the off-screen exit.
      setPendingSwipe({ direction, programmatic });

      // Fire onSwipe — fire-and-forget, surface errors via toast.
      Promise.resolve()
        .then(() => onSwipe(top, direction))
        .catch((err: unknown) => {
          toast.error("Couldn't save that swipe", {
            description:
              err instanceof Error ? err.message : "Please try again.",
          });
        });
    },
    [top, pendingSwipe, onSwipe],
  );

  // Called when the exit animation completes — actually advance the index.
  const handleExitComplete = useCallback(() => {
    setIndex((i) => i + 1);
    setPendingSwipe(null);
  }, []);

  // ─── Keyboard integration ────────────────────────────────────────────────
  useSwipeKeyboard({
    onRight: () => commitSwipe("right", true),
    onLeft: () => commitSwipe("left", true),
    disabled: !top || !!pendingSwipe,
  });

  // ─── Drag end handler ────────────────────────────────────────────────────
  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      const { offset, velocity } = info;
      const passDistance = Math.abs(offset.x) > SWIPE_DISTANCE_THRESHOLD;
      const passVelocity = Math.abs(velocity.x) > SWIPE_VELOCITY_THRESHOLD;
      if (passDistance || passVelocity) {
        commitSwipe(offset.x > 0 ? "right" : "left", false);
      } else {
        // Snap back — motion does this automatically because dragConstraints
        // are zeroed; no extra work needed.
      }
    },
    [commitSwipe],
  );

  // ─── Tap handler — distinguish from drag ─────────────────────────────────
  const handleTap = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, _info: TapInfo) => {
      if (!top) return;
      // TapInfo provides `point` (the up coordinate); we cross-check with the
      // motion x value to reject taps that ended after a drag.
      if (Math.abs(x.get()) < 8) {
        onCardTap?.(top);
      }
    },
    [onCardTap, top, x],
  );

  // ─── Empty state ─────────────────────────────────────────────────────────
  if (!top) {
    return (
      <div
        className={cn(
          // Default: phone gets viewport-aware height, desktop falls back to
          // the classic 3:4 portrait card. Caller can override with className.
          "relative mx-auto flex w-full max-w-md items-center justify-center",
          "h-[min(72dvh,640px)] md:h-auto md:aspect-[3/4]",
          className,
        )}
      >
        {emptyState ?? <DefaultEmptyState />}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-md",
        // Same dual-mode sizing — viewport-fit on phones, 3:4 portrait on
        // desktop. Caller can override with className.
        "h-[min(72dvh,640px)] md:h-auto md:aspect-[3/4]",
        className,
      )}
    >
      <StarBurst active={burstActive} />

      {/* Render in reverse so the top card is last in the DOM (above siblings). */}
      {visibleCards
        .map((project, depth) => ({ project, depth }))
        .reverse()
        .map(({ project, depth }) => {
          const isTop = depth === 0;
          const isExiting =
            isTop && pendingSwipe !== null;

          // Stack offsets — second card peeks below by ~18px and 7% smaller;
          // third by ~32px and 14% smaller.
          if (!isTop) {
            const baseScale = depth === 1 ? 0.93 : 0.86;
            const baseY = depth === 1 ? 18 : 32;
            return (
              <motion.div
                key={project.id}
                className="pointer-events-none absolute inset-0 origin-top"
                style={
                  depth === 1
                    ? { scale: secondCardScale, y: secondCardY }
                    : { scale: baseScale, y: baseY }
                }
                initial={{ scale: baseScale * 0.96, y: baseY + 12, opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 28 }}
              >
                <ProjectCard project={project} isTop={false} />
              </motion.div>
            );
          }

          return (
            <AnimatePresence
              key={project.id}
              mode="wait"
              onExitComplete={handleExitComplete}
            >
              {!isExiting && (
                <motion.div
                  key={project.id}
                  className="absolute inset-0 cursor-grab touch-pan-y active:cursor-grabbing"
                  style={{ x, rotate }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.7}
                  dragMomentum={false}
                  onDragEnd={handleDragEnd}
                  onTap={handleTap}
                  initial={{ scale: 0.97, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{
                    x:
                      pendingSwipe?.direction === "right" ? EXIT_X : -EXIT_X,
                    rotate:
                      pendingSwipe?.direction === "right" ? 25 : -25,
                    opacity: 0,
                    transition: {
                      type: "spring",
                      stiffness: 220,
                      damping: 28,
                      duration: 0.45,
                    },
                  }}
                  transition={{ type: "spring", stiffness: 280, damping: 32 }}
                  whileTap={{ cursor: "grabbing" }}
                  aria-label={`Project: ${project.title}. Swipe right or press right arrow to save and star. Swipe left or press left arrow to skip.`}
                  role="article"
                >
                  {/* NOPE / STAR overlays — fade in based on drag distance */}
                  <motion.div
                    style={{ opacity: nopeOpacity }}
                    className="pointer-events-none absolute left-5 top-5 z-30 -rotate-12 rounded-lg border-4 border-destructive px-4 py-1.5 text-2xl font-black uppercase tracking-wider text-destructive"
                  >
                    Nope
                  </motion.div>
                  <motion.div
                    style={{ opacity: starOpacity }}
                    className="pointer-events-none absolute right-5 top-5 z-30 flex rotate-12 items-center gap-2 rounded-lg border-4 border-primary px-4 py-1.5 text-2xl font-black uppercase tracking-wider text-primary"
                  >
                    <Star className="h-6 w-6 fill-primary" strokeWidth={0} />
                    <span>Star</span>
                  </motion.div>

                  <ProjectCard project={project} isTop onTap={() => onCardTap?.(project)} />
                </motion.div>
              )}
            </AnimatePresence>
          );
        })}

      {/* Screen-reader-only live region announcing the active card */}
      <div className="sr-only" aria-live="polite">
        {top
          ? `Showing ${top.title} by ${top.creator.display_name ?? top.creator.github_username}`
          : ""}
      </div>
    </div>
  );
}

/** Default empty-state card shown when the deck runs out. */
function DefaultEmptyState() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Star className="h-7 w-7 fill-current" strokeWidth={0} />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">You&apos;re all caught up</h3>
        <p className="text-sm text-muted-foreground">
          Check back soon — new indie projects ship every day.
        </p>
      </div>
    </div>
  );
}

// (Unused but exported so the icon tree-shakes to nothing if a parent re-uses it.)
export const _SwipeDeckIcons = { Star, X };
