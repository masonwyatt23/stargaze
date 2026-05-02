"use client";

import { Lock, Star } from "lucide-react";
import type { FeedProject } from "@/lib/types/db";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MediaGallery } from "@/components/media-gallery";
import { cn, formatCount } from "@/lib/utils";

export type ProjectCardProps = {
  project: FeedProject;
  onTap?: () => void;
  className?: string;
  /** Top card in the deck stack — only it gets full chrome + auto-playing video. */
  isTop?: boolean;
};

/**
 * Single deck card UI. Hero media on top, metadata below. Designed to fill the
 * deck container; the parent `<SwipeDeck>` handles drag, position, and stack.
 */
export function ProjectCard({
  project,
  onTap,
  className,
  isTop = false,
}: ProjectCardProps) {
  const creatorHandle = project.creator.github_username;
  const creatorName = project.creator.display_name ?? creatorHandle;
  const stars = project.github_stars ?? 0;

  return (
    <div
      className={cn(
        "no-select group flex h-full w-full flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-2xl shadow-black/40",
        isTop ? "border-border/80 ring-1 ring-primary/10" : "border-border/40",
        className,
      )}
      onClick={(e) => {
        // Suppress propagation so the deck's tap detector can fire.
        e.stopPropagation();
        onTap?.();
      }}
    >
      <MediaGallery media={project.media} autoPlay={isTop} />

      <div className="flex flex-1 flex-col gap-3 p-5">
        {/* Title + tagline */}
        <div className="space-y-1">
          <h3 className="line-clamp-1 text-xl font-semibold leading-tight tracking-tight">
            {project.title}
          </h3>
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {project.tagline}
          </p>
        </div>

        {/* Creator row */}
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            {project.creator.avatar_url ? (
              <AvatarImage
                src={project.creator.avatar_url}
                alt={`${creatorName} avatar`}
              />
            ) : null}
            <AvatarFallback>
              {creatorHandle.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">
              {creatorName}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              @{creatorHandle}
            </span>
          </div>
        </div>

        {/* Badges */}
        <div className="mt-auto flex flex-wrap items-center gap-1.5">
          {project.is_open_source ? (
            <Badge
              variant="warning"
              className={cn(
                "border-primary/40 bg-primary/15 text-primary",
                isTop && "shadow-[0_0_18px_hsl(47_96%_58%/0.35)]",
              )}
              title="Auto-star enabled — swipe right to star this repo on GitHub."
            >
              <Star className="h-3 w-3 fill-current" strokeWidth={0} />
              <span>OSS · auto-star</span>
            </Badge>
          ) : (
            <Badge variant="secondary" title="Closed source — request access on right-swipe.">
              <Lock className="h-3 w-3" />
              <span>Closed source</span>
            </Badge>
          )}

          {project.github_language && (
            <Badge variant="outline" className="font-normal">
              {project.github_language}
            </Badge>
          )}

          {project.github_repo_url && stars > 0 && (
            <Badge variant="outline" className="font-normal">
              <Star className="h-3 w-3" />
              <span>{formatCount(stars)}</span>
            </Badge>
          )}

          {project.has_demo_video && (
            <Badge variant="outline" className="font-normal">
              <span>Demo</span>
            </Badge>
          )}
        </div>

        {/* "tap to expand" affordance — only on the top card */}
        {isTop && onTap && (
          <p className="pointer-events-none mt-1 text-center text-[11px] uppercase tracking-widest text-muted-foreground/60">
            Tap card to expand
          </p>
        )}
      </div>
    </div>
  );
}
