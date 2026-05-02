"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { ExternalLink, MoreVertical, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatCount } from "@/lib/utils";

export type SavedRow = {
  swipeId: string;
  starredOnGithub: boolean;
  savedAt: string;
  project: {
    id: string;
    slug: string;
    title: string;
    tagline: string;
    githubRepoUrl: string | null;
    githubStars: number | null;
    githubLanguage: string | null;
    isOpenSource: boolean;
    creator: {
      github_username: string;
      display_name: string | null;
      avatar_url: string | null;
    } | null;
    coverUrl: string | null;
  };
};

type SavesClientProps = {
  saves: SavedRow[];
};

const LONG_PRESS_MS = 500;

export function SavesClient({ saves }: SavesClientProps) {
  const [items, setItems] = useState(saves);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onPressStart = useCallback((swipeId: string) => {
    pressTimer.current = setTimeout(() => {
      setActiveMenu(swipeId);
    }, LONG_PRESS_MS);
  }, []);

  const onPressEnd = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }, []);

  const onContextMenu = useCallback(
    (e: React.MouseEvent, swipeId: string) => {
      e.preventDefault();
      setActiveMenu(swipeId);
    },
    [],
  );

  const handleRemove = useCallback(async (row: SavedRow) => {
    setActiveMenu(null);
    setRemoving(row.swipeId);
    try {
      const res = await fetch("/api/swipe/undo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId: row.project.id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error("Couldn't remove that save.", {
          description: body?.error ?? "Try again in a moment.",
        });
        setRemoving(null);
        return;
      }
      setItems((prev) => prev.filter((s) => s.swipeId !== row.swipeId));
      toast.success(
        row.starredOnGithub
          ? `Removed ${row.project.title} (and unstarred on GitHub)`
          : `Removed ${row.project.title}`,
      );
    } catch (err) {
      toast.error("Network blip.", {
        description: err instanceof Error ? err.message : undefined,
      });
      setRemoving(null);
    }
  }, []);

  if (items.length === 0) {
    return (
      <Card className="border-dashed bg-card/40">
        <CardContent className="p-12 text-center text-sm text-muted-foreground">
          All clear. Open the deck to save more.
        </CardContent>
      </Card>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((row) => (
        <li key={row.swipeId} className="relative">
          <Card
            className={cn(
              "overflow-hidden transition-opacity",
              removing === row.swipeId && "opacity-40",
            )}
            onPointerDown={() => onPressStart(row.swipeId)}
            onPointerUp={onPressEnd}
            onPointerLeave={onPressEnd}
            onPointerCancel={onPressEnd}
            onContextMenu={(e) => onContextMenu(e, row.swipeId)}
          >
            <CardContent className="flex items-center gap-3 p-3">
              <div className="h-16 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                {row.project.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={row.project.coverUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                    <Star className="h-5 w-5" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/p/${row.project.slug}`}
                    className="line-clamp-1 font-semibold hover:underline"
                  >
                    {row.project.title}
                  </Link>
                  {row.starredOnGithub ? (
                    <Badge variant="warning" className="shrink-0 gap-1">
                      <Star className="h-3 w-3 fill-current" />
                      Starred
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                  {row.project.tagline}
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  {row.project.creator ? (
                    <>
                      <Avatar className="h-4 w-4">
                        {row.project.creator.avatar_url ? (
                          <AvatarImage
                            src={row.project.creator.avatar_url}
                            alt={row.project.creator.github_username}
                          />
                        ) : null}
                        <AvatarFallback>
                          {row.project.creator.github_username
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>@{row.project.creator.github_username}</span>
                    </>
                  ) : null}
                  {row.project.githubStars != null && (
                    <span className="ml-auto inline-flex items-center gap-1 font-mono">
                      <Star className="h-3 w-3 fill-primary text-primary" />
                      {formatCount(row.project.githubStars)}
                    </span>
                  )}
                  {row.project.githubLanguage && (
                    <Badge variant="secondary" className="text-[10px]">
                      {row.project.githubLanguage}
                    </Badge>
                  )}
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                aria-label="More actions"
                onClick={() => setActiveMenu(row.swipeId)}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {activeMenu === row.swipeId ? (
            <div
              className="absolute right-2 top-2 z-20 w-56 overflow-hidden rounded-md border border-border bg-popover shadow-2xl"
              role="menu"
              onMouseLeave={() => setActiveMenu(null)}
            >
              {row.project.githubRepoUrl ? (
                <a
                  href={row.project.githubRepoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                  role="menuitem"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open on GitHub
                </a>
              ) : null}
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                onClick={() => handleRemove(row)}
              >
                <Trash2 className="h-4 w-4" />
                {row.starredOnGithub ? "Remove + unstar" : "Remove"}
              </button>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
