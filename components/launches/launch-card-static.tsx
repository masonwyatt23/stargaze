import Link from "next/link";
import { ArrowDown, ExternalLink, Lock, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GithubIcon } from "@/components/icons/github-icon";
import { cn, formatCount } from "@/lib/utils";
import type { LaunchProject } from "@/app/launches/page";

/**
 * Background gradient palette, keyed by `index % 5`. Mirrors the
 * client `<LaunchCard>` palette so the static deep-link page feels
 * like the same wall, just paused on a single section.
 */
const PALETTES = [
  "from-amber-400/15 via-background to-background",
  "from-violet-500/15 via-background to-background",
  "from-cyan-500/15 via-background to-background",
  "from-emerald-500/15 via-background to-background",
  "from-rose-500/15 via-background to-background",
] as const;

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
 */
export function LaunchCardStatic({
  project,
  index,
  total,
  showsCTAToFullDeck = true,
}: LaunchCardStaticProps) {
  const palette = PALETTES[(index - 1) % PALETTES.length];
  const halo = HALOS[(index - 1) % HALOS.length];

  const screenshots = project.media.filter(
    (m) => m.type === "screenshot" || m.type === "gif",
  );
  const videos = project.media.filter((m) => m.type === "video");
  const heroMedia = videos[0] ?? screenshots[0] ?? null;

  const creator = project.creator;
  const creatorHandle = creator?.github_username ?? "";
  const creatorName = creator?.display_name ?? creatorHandle;
  const stars = project.github_stars ?? 0;
  const indexLabel = String(index).padStart(2, "0");
  const totalLabel = String(Math.max(total, 1)).padStart(2, "0");
  const categoryLabel = project.category
    ? CATEGORY_LABEL[project.category] ?? project.category
    : null;

  const focusHref = `/sign-in?redirect=${encodeURIComponent(
    `/feed?focus=${project.id}`,
  )}`;

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

      {/* Rank chip — top-right, sits below the close bar. */}
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
      <div className="relative z-10 flex w-full flex-col justify-between px-6 pb-10 pt-24 md:w-[60%] md:px-14 md:pb-14 md:pt-28">
        <div className="flex flex-col gap-6">
          <div className="mono-caption font-mono text-primary/80">
            § {indexLabel} / {totalLabel}
          </div>

          <h1
            id={`launch-${project.id}-title`}
            className="editorial-display text-5xl text-foreground sm:text-6xl md:text-7xl lg:text-[5.5rem]"
          >
            {project.title}
          </h1>

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
      <div className="relative flex w-full items-center justify-center px-6 pb-12 pt-2 md:w-[40%] md:px-10 md:pb-14 md:pt-28">
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
            <PlaceholderArtwork title={project.title} index={index - 1} />
          )}
        </div>
      </div>
    </section>
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
    <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl border border-border/40 bg-card/60 ring-1 ring-primary/10">
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
