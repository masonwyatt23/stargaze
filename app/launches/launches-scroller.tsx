"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LaunchCard } from "@/components/launches/launch-card";
import { ExitControls } from "@/components/launches/exit-controls";
import { ScrollRail } from "@/components/launches/scroll-rail";
import type { LaunchProject } from "./page";

type LaunchesScrollerProps = {
  projects: LaunchProject[];
};

/**
 * The vertical scroll-snap container that owns the launch wall:
 *  - One `<section>` per project, each `100dvh`, scroll-snap-aligned.
 *  - IntersectionObserver tracks which section is in view (50% threshold)
 *    and lifts that index up to the exit controls + side rail.
 *  - URL hash is updated to `#01`, `#02`, … so a slide is shareable.
 *  - Arrow / PageUp / PageDown keys jump between sections.
 *  - Vertical scrollbar is hidden — the rail + bar are the affordances.
 */
export function LaunchesScroller({ projects }: LaunchesScrollerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Array<HTMLElement | null>>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const total = projects.length;

  /** Scroll a target section into view. Used by the rail + keyboard nav. */
  const scrollToIndex = useCallback(
    (i: number) => {
      const clamped = Math.max(0, Math.min(total - 1, i));
      const node = sectionRefs.current[clamped];
      if (!node) return;
      node.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    },
    [total],
  );

  /* ----- Initial hash → scroll to that section once on mount ----- */
  useEffect(() => {
    if (typeof window === "undefined" || total === 0) return;
    const hash = window.location.hash.replace("#", "");
    const n = parseInt(hash, 10);
    if (!Number.isFinite(n)) return;
    const idx = Math.max(0, Math.min(total - 1, n - 1));
    if (idx > 0) {
      // Defer a frame so the browser settles layout first.
      requestAnimationFrame(() => scrollToIndex(idx));
    }
  }, [total, scrollToIndex]);

  /* ----- IntersectionObserver: which section is in focus? ----- */
  useEffect(() => {
    if (typeof window === "undefined" || total === 0) return;

    const root = containerRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry with the highest intersectionRatio that is at
        // least 50%. Falls back to nothing — current index sticks.
        let best: IntersectionObserverEntry | null = null;
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          if (e.intersectionRatio < 0.5) continue;
          if (!best || e.intersectionRatio > best.intersectionRatio) {
            best = e;
          }
        }
        if (!best) return;
        const idx = Number(
          (best.target as HTMLElement).dataset.index ?? "0",
        );
        setCurrentIndex(idx);
        // Update hash without smooth-scrolling jumping us.
        const next = `#${String(idx + 1).padStart(2, "0")}`;
        if (window.location.hash !== next) {
          window.history.replaceState(null, "", next);
        }
      },
      {
        root,
        threshold: [0.5, 0.75, 1],
      },
    );

    for (const node of sectionRefs.current) {
      if (node) observer.observe(node);
    }
    return () => observer.disconnect();
  }, [total]);

  /* ----- Keyboard: arrow / page nav ----- */
  useEffect(() => {
    if (total === 0) return;

    const onKey = (e: KeyboardEvent) => {
      // Don't hijack typing in an input.
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        scrollToIndex(currentIndex + 1);
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        scrollToIndex(currentIndex - 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        scrollToIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        scrollToIndex(total - 1);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentIndex, total, scrollToIndex]);

  const currentTitle = useMemo(
    () => projects[currentIndex]?.title ?? "",
    [projects, currentIndex],
  );

  /* ----- Empty state — no live projects yet ----- */
  if (total === 0) {
    return (
      <div className="relative grid min-h-dvh place-items-center px-6 text-center">
        <ExitControls
          currentIndex={0}
          total={0}
          currentTitle="—"
        />
        <div className="max-w-md">
          <p className="mono-caption mb-4">§ launches · empty</p>
          <h1 className="editorial-display text-4xl text-foreground sm:text-5xl">
            No launches yet.
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">
            Be the first to ship something on Stargaze. Your project will
            appear here the moment it goes live.
          </p>
        </div>
      </div>
    );
  }

  // Top progress fill — fraction of way through the stack.
  const progress = total > 1 ? currentIndex / (total - 1) : 1;

  return (
    <>
      <ExitControls
        currentIndex={currentIndex}
        total={total}
        currentTitle={currentTitle}
      />

      {/* Sticky top progress bar — sits just below the exit controls.  */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-40 h-0.5 bg-border/30"
        aria-hidden
      >
        <div
          className="h-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      <ScrollRail
        total={total}
        currentIndex={currentIndex}
        onJump={scrollToIndex}
      />

      <div
        ref={containerRef}
        aria-label="Launches scroller, vertical"
        className="launches-scroll relative h-dvh w-full snap-y snap-mandatory overflow-y-scroll"
        style={{
          // Hide the scrollbar across browsers — the rail is the affordance.
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {/* Inline style block to nuke webkit scrollbar. Scoped via a class. */}
        <style>{`
          .launches-scroll::-webkit-scrollbar { display: none; }
        `}</style>

        {projects.map((project, i) => (
          <section
            key={project.id}
            ref={(el) => {
              sectionRefs.current[i] = el;
            }}
            data-index={i}
            id={`launch-${String(i + 1).padStart(2, "0")}`}
            role="region"
            aria-labelledby={`launch-${project.id}-title`}
            className="relative h-dvh w-full snap-start"
          >
            <LaunchCard
              project={project}
              index={i}
              total={total}
              onAdvance={() => scrollToIndex(i + 1)}
              titleId={`launch-${project.id}-title`}
            />
          </section>
        ))}
      </div>
    </>
  );
}
