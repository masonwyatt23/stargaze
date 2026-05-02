"use client";

import * as React from "react";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  Flag,
  ExternalLink,
  Star,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { setProjectStatus } from "@/app/admin/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GithubIcon } from "@/components/icons/github-icon";
import { cn, formatCount } from "@/lib/utils";
import type { ProjectStatus } from "@/lib/types/db";

type Project = {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  status: ProjectStatus;
  github_repo_url: string | null;
  github_stars: number | null;
  is_open_source: boolean;
  created_at: string;
  creator: {
    id: string;
    github_username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  right_swipes: number;
  total_swipes: number;
};

export function ProjectRow({ project }: { project: Project }) {
  const [pending, startTransition] = React.useTransition();

  const setStatus = (next: ProjectStatus) => {
    startTransition(async () => {
      try {
        await setProjectStatus(project.id, next);
        toast.success(`Marked "${project.title}" as ${next}`);
      } catch (err) {
        toast.error("Failed to update status", {
          description: err instanceof Error ? err.message : undefined,
        });
      }
    });
  };

  const rightRate =
    project.total_swipes > 0
      ? Math.round((project.right_swipes / project.total_swipes) * 100)
      : null;

  return (
    <div className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar className="h-9 w-9 shrink-0">
          {project.creator?.avatar_url ? (
            <AvatarImage
              src={project.creator.avatar_url}
              alt={project.creator.github_username}
            />
          ) : null}
          <AvatarFallback>
            {project.creator?.github_username.slice(0, 2).toUpperCase() ?? "??"}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/p/${project.slug}`}
              className="truncate text-sm font-semibold hover:text-primary"
            >
              {project.title}
            </Link>
            <StatusBadge status={project.status} />
            {!project.is_open_source ? (
              <Badge variant="outline" className="shrink-0">
                Closed
              </Badge>
            ) : null}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {project.tagline}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground/70">
            by{" "}
            <span className="text-muted-foreground">
              @{project.creator?.github_username ?? "?"}
            </span>{" "}
            · {new Date(project.created_at).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 md:gap-4">
        <Stat label="Saves" value={project.right_swipes} />
        <Stat
          label="Swipes"
          value={project.total_swipes}
          subValue={rightRate != null ? `${rightRate}% ★` : undefined}
        />
        {project.github_repo_url ? (
          <a
            href={project.github_repo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
          >
            <GithubIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Repo</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}

        <div className="flex items-center gap-1">
          {project.status !== "live" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatus("live")}
              disabled={pending}
              title="Restore to live"
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
          )}
          {project.status === "live" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatus("hidden")}
                disabled={pending}
                title="Hide from feed"
              >
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <EyeOff className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatus("flagged")}
                disabled={pending}
                title="Flag (mark for review)"
                className="text-destructive hover:text-destructive"
              >
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Flag className="h-3.5 w-3.5" />}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  if (status === "live") {
    return (
      <Badge variant="success" className="shrink-0 gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
        Live
      </Badge>
    );
  }
  if (status === "hidden") {
    return (
      <Badge variant="secondary" className="shrink-0">
        Hidden
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="shrink-0 gap-1">
      <Flag className="h-3 w-3" />
      Flagged
    </Badge>
  );
}

function Stat({
  label,
  value,
  subValue,
}: {
  label: string;
  value: number;
  subValue?: string;
}) {
  return (
    <div className="flex w-12 flex-col items-start tabular-nums">
      <span className={cn("text-sm font-semibold", value > 0 && "text-primary")}>
        {label === "Saves" && value > 0 ? (
          <span className="inline-flex items-center gap-0.5">
            <Star className="h-3 w-3 fill-primary text-primary" />
            {formatCount(value)}
          </span>
        ) : (
          formatCount(value)
        )}
      </span>
      <span className="text-[10px] uppercase text-muted-foreground/70">
        {subValue ?? label}
      </span>
    </div>
  );
}
