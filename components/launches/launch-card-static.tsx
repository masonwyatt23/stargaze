import Link from "next/link";
import { ArrowDown } from "lucide-react";
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

type LaunchCardStaticProps = {
  project: LaunchProject;
  /** 1-based ordinal across the live deck, for the "§ NN / TT" caption. */
  index: number;
  /** Total live launches (drives the totals label and CTA copy). */
  total: number;
  /** Render the "browse all NN launches" CTA at the bottom. */
  showsCTAToFullDeck?: boolean;
};

/**
 * Server-rendered, single-section variant of `<LaunchCard>`.
 *
 * Used by the deep-link route at `/launches/[slug]` — same visual
 * language as the scroll wall (60/40 split, halo, tilted media,
 * mono section number, badges, two CTAs) but with no IntersectionObserver,
 * no scroll-snap, and no client state. Picks the first screenshot or
 * video as the hero shot — pagination is not shown because we can't
 * swap shots without going client.
 *
 * `index` is 1-based here (the deep-link's "this is launch #NN"); we
 * normalize to 0-based before passing to the shared palette helpers.
 */
export function LaunchCardStatic({
  project,
  index,
  total,
  showsCTAToFullDeck = true,
}: LaunchCardStaticProps) {
  const zeroIndex = index - 1;
  const palette = paletteFor(zeroIndex);
  const halo = haloFor(zeroIndex);

  const screenshots = project.media.filter(
    (m) => m.type === "screenshot" || m.type === "gif",
  );
  const videos = project.media.filter((m) => m.type === "video");
  const heroMedia = videos[0] ?? screenshots[0] ?? null;

  const indexLabel = String(index).padStart(2, "0");
  const totalLabel = String(Math.max(total, 1)).padStart(2, "0");

  return (
    <section
      className={cn(
        "relative flex w-full flex-col overflow-hidden bg-gradient-to-br md:flex-row",
        "min-h-dvh",
        palette,
      )}
      aria-labelledby={`launch-${project.id}-title`}
    >
      {/* Subtle starfield substrate — same texture as the scroll wall. */}
      <div
        aria-hidden
        className="starfield pointer-events-none absolute inset-0 opacity-50"
      />

      <RankChip
        indexLabel={indexLabel}
        rightSwipeCount={project.right_swipe_count}
      />

      {/* ============================ LEFT (60%) ============================ */}
      <div className="relative z-10 flex w-full flex-col justify-between px-5 pb-8 pt-20 sm:px-6 sm:pt-24 md:w-[60%] md:px-14 md:pb-14 md:pt-28">
        <div className="flex flex-col gap-5 sm:gap-6">
          <div className="mono-caption font-mono text-primary/80">
            § {indexLabel} / {totalLabel}
          </div>

          <h1
            id={`launch-${project.id}-title`}
            className="editorial-display text-[2.5rem] text-foreground sm:text-6xl md:text-7xl lg:text-[5.5rem]"
          >
            {project.title}
          </h1>

          <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg md:text-xl">
            {project.tagline}
          </p>

          {project.creator ? <CreatorChip creator={project.creator} /> : null}

          <BadgeRow project={project} />

          <PrimaryCTAs project={project} />
        </div>

        {/* Bottom-left: deck CTA (server-rendered, links into the wall). */}
        {showsCTAToFullDeck ? (
          <div className="mt-10">
            <Link
              href="/launches"
              className="group/deck inline-flex items-center gap-2 self-start font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground/70 transition-colors hover:text-primary"
            >
              <ArrowDown
                className="size-3.5 transition-transform group-hover/deck:translate-y-0.5"
                aria-hidden
              />
              <span>Browse all {total} launches</span>
            </Link>
          </div>
        ) : null}
      </div>

      {/* ============================ RIGHT (40%) ============================ */}
      <div className="relative flex w-full items-center justify-center px-5 pb-10 pt-2 sm:px-6 sm:pb-12 md:w-[40%] md:px-10 md:pb-14 md:pt-28">
        <div className="relative w-full max-w-md md:max-w-none">
          {/* Soft halo behind the media. */}
          <div
            aria-hidden
            className={cn(
              "absolute inset-0 -z-10 rounded-[2rem] opacity-80 blur-3xl motion-reduce:blur-xl",
              halo,
            )}
          />

          {heroMedia ? (
            <div
              className={cn(
                "group/media relative overflow-hidden rounded-2xl border border-border/40 bg-card/80 shadow-2xl shadow-black/40 ring-1 ring-primary/10 backdrop-blur-sm",
                "aspect-[4/3] md:aspect-[3/4] lg:aspect-[4/3]",
                "transition-transform duration-500 ease-out",
                "[transform:perspective(1400px)_rotateY(-6deg)_rotateX(2deg)] hover:[transform:perspective(1400px)_rotateY(-2deg)_rotateX(0deg)]",
                "motion-reduce:transform-none motion-reduce:hover:transform-none",
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
                  src={heroMedia.url}
                  alt={`${project.title} screenshot`}
                  className="h-full w-full object-cover"
                  // Hero shot — eager because it's above the fold on the
                  // immersive deep-link page.
                  loading="eager"
                />
              )}

              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent"
              />
            </div>
          ) : (
            <PlaceholderArtwork title={project.title} index={zeroIndex} />
          )}
        </div>
      </div>
    </section>
  );
}
