"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Lock, Star, X } from "lucide-react";
import type { FeedProject } from "@/lib/types/db";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GithubIcon } from "@/components/icons/github-icon";
import { MediaGallery } from "@/components/media-gallery";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn, formatCount } from "@/lib/utils";

export type ProjectDetailSheetProps = {
  project: FeedProject | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fired by the primary CTA — "Star this on GitHub" or "Request access". */
  onSwipe: (direction: "right" | "left") => void;
  /** Fired on backdrop click, esc, or close button. Does NOT swipe. */
  onClose: () => void;
};

/**
 * Tap-to-expand detail sheet for a feed card. Renders the full media gallery,
 * description HTML (already sanitized server-side via lib/markdown.ts), and
 * the right/left swipe primary actions. Bottom-sheet on mobile, right-side
 * sheet on desktop.
 */
export function ProjectDetailSheet({
  project,
  open,
  onOpenChange,
  onSwipe,
  onClose,
}: ProjectDetailSheetProps) {
  const isDesktop = useIsDesktop();
  const side = isDesktop ? "right" : "bottom";

  // Don't keep stale content mid-close animation; the parent is the source of
  // truth about whether the sheet is open, but if `project` is null we don't
  // render the body to avoid a flash of empty content.
  if (!project) {
    return (
      <Sheet
        open={open}
        onOpenChange={(next) => {
          onOpenChange(next);
          if (!next) onClose();
        }}
      >
        <SheetContent
          side={side}
          className={cn(
            side === "bottom"
              ? "max-h-[92vh] overflow-y-auto"
              : "w-full max-w-xl overflow-y-auto sm:max-w-xl",
          )}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Project details</SheetTitle>
            <SheetDescription>Loading…</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
  }

  const creatorHandle = project.creator.github_username;
  const creatorName = project.creator.display_name ?? creatorHandle;
  const stars = project.github_stars ?? 0;
  const isOSS = project.is_open_source;

  const handlePrimary = () => {
    onSwipe("right");
    onOpenChange(false);
  };

  const handleSkip = () => {
    onSwipe("left");
    onOpenChange(false);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) onClose();
      }}
    >
      <SheetContent
        side={side}
        className={cn(
          // Override the default 24px padding so the gallery can go edge-to-edge.
          "p-0",
          side === "bottom"
            ? "max-h-[92vh] overflow-y-auto rounded-t-2xl"
            : "w-full max-w-xl overflow-y-auto sm:max-w-xl",
        )}
      >
        {/* Accessible title for screen readers; the visible title is rendered
            below in the body so it can be styled large. */}
        <SheetHeader className="sr-only">
          <SheetTitle>{project.title}</SheetTitle>
          <SheetDescription>{project.tagline}</SheetDescription>
        </SheetHeader>

        {/* Hero media gallery — auto-plays only while the sheet is open so we
            don't burn battery on closed sheets. */}
        <div className="relative">
          <MediaGallery
            media={project.media}
            autoPlay={open}
            showControls
            aspectClass="aspect-[16/9]"
            className="rounded-none"
          />
          {/* Custom close button — Sheet's built-in close has padding that
              clashes with edge-to-edge media. */}
          <button
            type="button"
            aria-label="Close details"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-6 pb-28 pt-6">
          {/* Title + tagline */}
          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold leading-tight tracking-tight">
              {project.title}
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              {project.tagline}
            </p>
          </div>

          {/* Creator row */}
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
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
              <Link
                href={`/u/${creatorHandle}`}
                className="block truncate text-xs text-muted-foreground transition-colors hover:text-primary"
                onClick={(e) => e.stopPropagation()}
              >
                @{creatorHandle}
              </Link>
            </div>
          </div>

          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-1.5">
            {isOSS ? (
              <Badge
                variant="warning"
                className="border-primary/40 bg-primary/15 text-primary"
              >
                <Star className="h-3 w-3 fill-current" strokeWidth={0} />
                <span>OSS · auto-star</span>
              </Badge>
            ) : (
              <Badge variant="secondary">
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

            {project.category && (
              <Badge variant="outline" className="font-normal capitalize">
                {project.category.replace(/-/g, " ")}
              </Badge>
            )}

            {project.has_demo_video && (
              <Badge variant="outline" className="font-normal">
                Demo
              </Badge>
            )}
          </div>

          {/* Description — sanitized HTML from lib/markdown.ts. Typography
              comes from .prose-stargaze (see app/globals.css). */}
          {project.description_html ? (
            <div
              className="prose-stargaze"
              dangerouslySetInnerHTML={{ __html: project.description_html }}
            />
          ) : (
            <p className="text-sm italic text-muted-foreground">
              No description provided.
            </p>
          )}
        </div>

        {/* Sticky footer with primary actions. Anchored absolutely so it stays
            visible while the body scrolls. */}
        <div className="sticky bottom-0 left-0 right-0 border-t border-border/60 bg-card/95 p-4 backdrop-blur-md">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              type="button"
              size="lg"
              onClick={handlePrimary}
              className="flex-1"
            >
              {isOSS ? (
                <>
                  <Star className="h-4 w-4 fill-current" strokeWidth={0} />
                  Star this on GitHub
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Request access
                </>
              )}
            </Button>

            {project.github_repo_url && (
              <Button
                type="button"
                size="lg"
                variant="outline"
                asChild
              >
                <a
                  href={project.github_repo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <GithubIcon className="size-4" />
                  Open repo
                  <ExternalLink className="h-3.5 w-3.5 opacity-60" />
                </a>
              </Button>
            )}

            <Button
              type="button"
              size="lg"
              variant="ghost"
              onClick={handleSkip}
              className="sm:w-auto"
            >
              Skip for now
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Lightweight desktop-vs-mobile media query hook. Returns true once the window
 * is wider than 768px. SSR-safe (returns false on the first render so the
 * mobile bottom-sheet is the default for users with no JS warm-up).
 */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  return isDesktop;
}
