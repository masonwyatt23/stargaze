import Link from "next/link";
import { ExternalLink, Lock, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GithubIcon } from "@/components/icons/github-icon";
import { cn, formatCount } from "@/lib/utils";
import type { LaunchProject } from "@/app/launches/page";

/* ------------------------------------------------------------------------ */
/* Palette tables — shared by the scroll wall <LaunchCard> and the static
   deep-link <LaunchCardStatic>. Indexing is `index % 5`; both consumers
   pass an already-normalized 0-based index.                                */
/* ------------------------------------------------------------------------ */

export const PALETTES = [
  "from-amber-400/15 via-background to-background",
  "from-violet-500/15 via-background to-background",
  "from-cyan-500/15 via-background to-background",
  "from-emerald-500/15 via-background to-background",
  "from-rose-500/15 via-background to-background",
] as const;

export const HALOS = [
  "bg-amber-400/30",
  "bg-violet-500/30",
  "bg-cyan-500/30",
  "bg-emerald-500/30",
  "bg-rose-500/30",
] as const;

export const CATEGORY_LABEL: Record<string, string> = {
  "ai-tool": "AI",
  "dev-utility": "Dev tools",
  game: "Games",
  saas: "SaaS",
  other: "Other",
};

export function paletteFor(index: number): string {
  return PALETTES[index % PALETTES.length];
}

export function haloFor(index: number): string {
  return HALOS[index % HALOS.length];
}

export function categoryLabelFor(category: string | null): string | null {
  if (!category) return null;
  return CATEGORY_LABEL[category] ?? category;
}

/** Build the sign-in -> /feed?focus=ID redirect link used by both cards. */
export function buildFocusHref(projectId: string): string {
  return `/sign-in?redirect=${encodeURIComponent(`/feed?focus=${projectId}`)}`;
}

/* ------------------------------------------------------------------------ */
/* Sub-components                                                           */
/* ------------------------------------------------------------------------ */

type Creator = NonNullable<LaunchProject["creator"]>;

export function CreatorChip({ creator }: { creator: Creator }) {
  const handle = creator.github_username ?? "";
  const name = creator.display_name ?? handle;
  return (
    <Link
      href={`/u/${handle}`}
      className="group/creator inline-flex w-fit items-center gap-3 rounded-full border border-border/40 bg-card/60 py-1.5 pl-1.5 pr-4 backdrop-blur-sm transition-colors hover:border-primary/40 hover:bg-card/80"
    >
      <Avatar className="h-8 w-8 ring-1 ring-border/60">
        {creator.avatar_url ? (
          <AvatarImage src={creator.avatar_url} alt={`${name} avatar`} />
        ) : null}
        <AvatarFallback>{handle.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="text-sm">
        <span className="font-medium text-foreground">{name}</span>
        <span className="ml-1.5 text-muted-foreground">@{handle}</span>
      </span>
    </Link>
  );
}

export function BadgeRow({ project }: { project: LaunchProject }) {
  const stars = project.github_stars ?? 0;
  const categoryLabel = categoryLabelFor(project.category);

  return (
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
  );
}

export function PrimaryCTAs({ project }: { project: LaunchProject }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-3">
      <Button asChild size="lg" className="font-semibold">
        <Link href={buildFocusHref(project.id)}>
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
  );
}

export function RankChip({
  indexLabel,
  rightSwipeCount,
}: {
  indexLabel: string;
  rightSwipeCount: number;
}) {
  if (rightSwipeCount <= 0) return null;
  return (
    <div className="pointer-events-none absolute right-4 top-16 z-20 md:right-10 md:top-20">
      <Badge
        variant="warning"
        className="border-primary/40 bg-primary/15 text-primary shadow-[0_0_18px_hsl(47_96%_58%/0.25)]"
      >
        <Star className="h-3 w-3 fill-current" strokeWidth={0} />
        <span>
          #{indexLabel} this week · {formatCount(rightSwipeCount)} ★
        </span>
      </Badge>
    </div>
  );
}

/**
 * Fallback artwork — shown when a project has no media yet. Halo color
 * is keyed by the same index palette so it blends with the section's
 * gradient.
 */
export function PlaceholderArtwork({
  title,
  index,
}: {
  title: string;
  index: number;
}) {
  return (
    <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl border border-border/40 bg-card/60 ring-1 ring-primary/10">
      <div
        aria-hidden
        className={cn(
          "absolute inset-x-1/4 inset-y-1/3 rounded-full opacity-60 blur-2xl",
          haloFor(index),
        )}
      />
      <span className="relative z-10 font-mono text-7xl font-bold text-foreground/80">
        {title.slice(0, 2).toUpperCase()}
      </span>
    </div>
  );
}
