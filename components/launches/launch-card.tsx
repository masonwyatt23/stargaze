"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown, ExternalLink, Lock, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GithubIcon } from "@/components/icons/github-icon";
import { cn, formatCount } from "@/lib/utils";
import type { LaunchProject } from "@/app/launches/page";

/**
 * Background gradient palette, keyed by `index % 5`. Each section gets
 * a different tint so the wall doesn't feel monotonous as you scroll.
 */
const PALETTES = [
  "from-amber-400/15 via-background to-background",
  "from-violet-500/15 via-background to-background",
  "from-cyan-500/15 via-background to-background",
  "from-emerald-500/15 via-background to-background",
  "from-rose-500/15 via-background to-background",
] as const;

/**
 * Halo color (the soft glow behind the media tile) — also keyed by index.
 * Slightly hotter than the gradient so the media really pops.
 */
const HALOS = [
  "bg-amber-400/30",
  "bg-violet-500/30",
  "bg-cyan-500/30",
  "bg-emerald-500/30",
  "bg-rose-500/30",
] as const;

const CATEGORY_LABEL: Record<string, string> = {
  "ai-tool": "AI",
  "dev-utility": "Dev tools",
  game: "Games",
  saas: "SaaS",
  other: "Other",
};

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
  const palette = PALETTES[index % PALETTES.length];
  const halo = HALOS[index % HALOS.length];

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

  const creator = project.creator;
  const creatorHandle = creator?.github_username ?? "";
  const creatorName = creator?.display_name ?? creatorHandle;
  const stars = project.github_stars ?? 0;
  const indexLabel = String(index + 1).padStart(2, "0");
  const totalLabel = String(total).padStart(2, "0");
  const categoryLabel = project.category
    ? CATEGORY_LABEL[project.category] ?? project.category
    : null;

  const focusHref = `/sign-in?redirect=${encodeURIComponent(
    `/feed?focus=${project.id}`,
  )}`;

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

      {/* Rank chip — top-right (sits below the exit bar). */}
      {project.right_swipe_count > 0 ? (
        <div className="pointer-events-none absolute right-4 top-16 z-20 md:right-10 md:top-20">
          <Badge
            variant="warning"
            className="border-primary/40 bg-primary/15 text-primary shadow-[0_0_18px_hsl(47_96%_58%/0.25)]"
          >
            <Star className="h-3 w-3 fill-current" strokeWidth={0} />
            <span>
              #{indexLabel} this week · {formatCount(project.right_swipe_count)}{" "}
              ★
            </span>
          </Badge>
        </div>
      ) : null}

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

          {/* Creator row */}
          {creator ? (
            <Link
              href={`/u/${creatorHandle}`}
              className="group/creator inline-flex w-fit items-center gap-3 rounded-full border border-border/40 bg-card/60 py-1.5 pl-1.5 pr-4 backdrop-blur-sm transition-colors hover:border-primary/40 hover:bg-card/80"
            >
              <Avatar className="h-8 w-8 ring-1 ring-border/60">
                {creator.avatar_url ? (
                  <AvatarImage
                    src={creator.avatar_url}
                    alt={`${creatorName} avatar`}
                  />
                ) : null}
                <AvatarFallback>
                  {creatorHandle.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">
                <span className="font-medium text-foreground">
                  {creatorName}
                </span>
                <span className="ml-1.5 text-muted-foreground">
                  @{creatorHandle}
                </span>
              </span>
            </Link>
          ) : null}

          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-2">
            {project.is_open_source ? (
              <Badge
                variant="warning"
                className="border-primary/40 bg-primary/15 text-primary"
                title="Open source — auto-star on swipe-right."
              >
                <Star className="h-3 w-3 fill-current" strokeWidth={0} />
                <span>OSS</span>
              </Badge>
            ) : (
              <Badge variant="secondary" title="Closed source.">
                <Lock className="h-3 w-3" />
                <span>Closed source</span>
              </Badge>
            )}

            {project.github_language ? (
              <Badge variant="outline" className="font-normal">
                {project.github_language}
              </Badge>
            ) : null}

            {project.github_repo_url && stars > 0 ? (
              <Badge variant="outline" className="font-normal">
                <Star className="h-3 w-3" />
                <span>{formatCount(stars)}</span>
              </Badge>
            ) : null}

            {categoryLabel ? (
              <Badge variant="outline" className="font-normal">
                {categoryLabel}
              </Badge>
            ) : null}
          </div>

          {/* CTAs */}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="font-semibold">
              <Link href={focusHref}>
                <Star className="h-4 w-4 fill-current" strokeWidth={0} />
                Star this on GitHub
              </Link>
            </Button>

            {project.github_repo_url ? (
              <Button asChild size="lg" variant="outline">
                <a
                  href={project.github_repo_url}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <GithubIcon className="size-4" />
                  Open repo
                  <ExternalLink className="size-3.5 opacity-70" />
                </a>
              </Button>
            ) : null}
          </div>
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
                  src={
                    screenshots[activeShot]?.url ?? heroMedia.url
                  }
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

/* ------------------------------------------------------------------------ */
/* Fallback artwork — shown when a project has no media yet                */
/* ------------------------------------------------------------------------ */

function PlaceholderArtwork({
  title,
  index,
}: {
  title: string;
  index: number;
}) {
  const halo = HALOS[index % HALOS.length];
  return (
    <div
      className={cn(
        "relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl border border-border/40 bg-card/60 ring-1 ring-primary/10",
      )}
    >
      <div
        aria-hidden
        className={cn(
          "absolute inset-x-1/4 inset-y-1/3 rounded-full opacity-60 blur-2xl",
          halo,
        )}
      />
      <span className="relative z-10 font-mono text-7xl font-bold text-foreground/80">
        {title.slice(0, 2).toUpperCase()}
      </span>
    </div>
  );
}
