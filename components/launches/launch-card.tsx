"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  BadgeRow,
  CreatorChip,
  PlaceholderArtwork,
  PrimaryCTAs,
  RankChip,
  haloFor,
  paletteFor,
} from "@/components/launches/launch-card-shared";
import { cn } from "@/lib/utils";
import type { LaunchProject } from "@/app/launches/page";

type LaunchCardProps = {
  project: LaunchProject;
  index: number;
  total: number;
  /** Called when the user clicks the "scroll for next" hint. */
  onAdvance?: () => void;
  /** Stable id for the section's `<h2>` so `aria-labelledby` resolves. */
  titleId?: string;
};

export function LaunchCard({
  project,
  index,
  total,
  onAdvance,
  titleId,
}: LaunchCardProps) {
  const palette = paletteFor(index);
  const halo = haloFor(index);

  const screenshots = project.media.filter(
    (m) => m.type === "screenshot" || m.type === "gif",
  );
  const videos = project.media.filter((m) => m.type === "video");
  // Prefer a video if available — videos are the most cinematic artifact.
  const heroMedia = videos[0] ?? screenshots[0] ?? null;

  const [activeShot, setActiveShot] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  /* prefers-reduced-motion → kill the tilt + halo blur. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const indexLabel = String(index + 1).padStart(2, "0");
  const totalLabel = String(total).padStart(2, "0");

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col overflow-hidden bg-gradient-to-br md:flex-row",
        palette,
      )}
    >
      {/* Subtle starfield substrate */}
      <div
        aria-hidden
        className="starfield pointer-events-none absolute inset-0 opacity-50"
      />

      <RankChip
        indexLabel={indexLabel}
        rightSwipeCount={project.right_swipe_count}
      />

      {/* ============================ LEFT (60%) ============================ */}
      <div className="relative z-10 flex w-full flex-col justify-between px-6 pb-10 pt-24 md:w-[60%] md:px-14 md:pt-28 md:pb-14">
        <div className="flex flex-col gap-6">
          <div className="mono-caption font-mono text-primary/80">
            § {indexLabel} / {totalLabel}
          </div>

          <h2
            id={titleId}
            className="editorial-display text-5xl text-foreground sm:text-6xl md:text-7xl lg:text-[5.5rem]"
          >
            {project.title}
          </h2>

          <p className="max-w-xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            {project.tagline}
          </p>

          {project.creator ? <CreatorChip creator={project.creator} /> : null}

          <BadgeRow project={project} />

          <PrimaryCTAs project={project} />
        </div>

        {/* Bottom-left: scroll hint */}
        <button
          type="button"
          onClick={onAdvance}
          className={cn(
            "group/hint mt-10 inline-flex w-fit items-center gap-2 self-start text-xs font-mono uppercase tracking-[0.22em] text-muted-foreground/70 transition-colors hover:text-primary",
            index === total - 1 && "opacity-40",
          )}
          aria-label={
            index === total - 1
              ? "End of launches"
              : "Scroll for next launch"
          }
        >
          <span>
            {index === total - 1 ? "end of wall" : "scroll for next"}
          </span>
          <ChevronDown
            className={cn(
              "size-3.5 transition-transform group-hover/hint:translate-y-0.5",
              !reducedMotion && index !== total - 1 && "animate-bounce",
            )}
            aria-hidden
          />
        </button>
      </div>

      {/* ============================ RIGHT (40%) ============================ */}
      <div className="relative flex w-full items-center justify-center px-6 pb-12 pt-2 md:w-[40%] md:px-10 md:pb-14 md:pt-28">
        <div className="relative w-full max-w-md md:max-w-none">
          {/* Soft halo behind the media. */}
          <div
            aria-hidden
            className={cn(
              "absolute inset-0 -z-10 rounded-[2rem] opacity-80",
              halo,
              !reducedMotion && "blur-3xl",
              reducedMotion && "blur-xl",
            )}
          />

          {heroMedia ? (
            <div
              className={cn(
                "group/media relative overflow-hidden rounded-2xl border border-border/40 bg-card/80 shadow-2xl shadow-black/40 ring-1 ring-primary/10 backdrop-blur-sm",
                "aspect-[4/3] md:aspect-[3/4] lg:aspect-[4/3]",
                "transition-transform duration-500 ease-out",
                !reducedMotion &&
                  "[transform:perspective(1400px)_rotateY(-6deg)_rotateX(2deg)] hover:[transform:perspective(1400px)_rotateY(-2deg)_rotateX(0deg)]",
              )}
            >
              {videos.length > 0 && heroMedia.type === "video" ? (
                <video
                  src={heroMedia.url}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={screenshots[activeShot]?.url ?? heroMedia.url}
                  alt={`${project.title} screenshot`}
                  className="h-full w-full object-cover"
                  loading={index < 2 ? "eager" : "lazy"}
                />
              )}

              {/* Bottom gradient for legibility on bright shots. */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent"
              />
            </div>
          ) : (
            <PlaceholderArtwork title={project.title} index={index} />
          )}

          {/* Screenshot pagination dots — only when there's more than one
              still image and we're not on a video-first card. */}
          {screenshots.length > 1 && heroMedia?.type !== "video" ? (
            <div className="mt-4 flex justify-center gap-1.5">
              {screenshots.map((shot, i) => (
                <button
                  key={`${shot.url}-${i}`}
                  type="button"
                  onClick={() => setActiveShot(i)}
                  aria-label={`Show screenshot ${i + 1} of ${screenshots.length}`}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === activeShot
                      ? "w-6 bg-primary"
                      : "w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground/70",
                  )}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
