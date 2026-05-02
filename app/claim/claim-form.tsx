"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckSquare, ExternalLink, Square, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { DBProject } from "@/lib/types/db";
import { cn, parseGithubRepo } from "@/lib/utils";
import { claimProjects } from "./actions";

type Props = {
  projects: DBProject[];
};

export function ClaimForm({ projects }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(projects.map((p) => p.id)),
  );

  const allChecked = selected.size === projects.length;
  const noneChecked = selected.size === 0;

  const sortedProjects = useMemo(
    () =>
      [...projects].sort((a, b) => (b.github_stars ?? 0) - (a.github_stars ?? 0)),
    [projects],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === projects.length ? new Set() : new Set(projects.map((p) => p.id)),
    );
  }

  function handleSubmit() {
    if (selected.size === 0) return;
    const ids = Array.from(selected);

    startTransition(async () => {
      const result = await claimProjects(ids);

      if (result.error) {
        toast.error("Couldn't claim", { description: result.error });
        return;
      }

      if (result.claimed === 0) {
        toast.error("Nothing was claimed", {
          description: "These projects no longer match your account.",
        });
        return;
      }

      toast.success(
        `Claimed ${result.claimed} project${result.claimed === 1 ? "" : "s"}`,
        { description: "They're yours now — find them on your dashboard." },
      );

      router.push(`/dashboard?claimed=${result.claimed}`);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={toggleAll}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md px-1 py-1 self-start"
        >
          {allChecked ? (
            <CheckSquare className="h-4 w-4 text-primary" />
          ) : (
            <Square className="h-4 w-4" />
          )}
          {allChecked ? "Unselect all" : "Select all"}
          <span className="text-xs text-muted-foreground/70">
            ({selected.size} of {projects.length})
          </span>
        </button>

        <Button
          type="button"
          onClick={handleSubmit}
          disabled={pending || noneChecked}
          className="gap-2"
        >
          {pending
            ? "Claiming…"
            : `Claim ${selected.size || ""} selected`.trim()}
        </Button>
      </div>

      <ul className="space-y-3">
        {sortedProjects.map((p) => {
          const checked = selected.has(p.id);
          const parsed = p.github_repo_url ? parseGithubRepo(p.github_repo_url) : null;

          return (
            <li key={p.id}>
              <Card
                className={cn(
                  "border-border/60 bg-card/50 transition-colors",
                  checked && "border-primary/50 bg-primary/5",
                )}
              >
                <CardContent className="p-0">
                  <label className="flex cursor-pointer items-start gap-4 p-4">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(p.id)}
                      className="peer sr-only"
                    />
                    <span
                      aria-hidden
                      className={cn(
                        "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                        checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background",
                      )}
                    >
                      {checked ? (
                        <CheckSquare className="h-3.5 w-3.5" />
                      ) : null}
                    </span>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="truncate font-medium">{p.title}</p>
                        {p.github_stars !== null ? (
                          <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                            <Star className="h-3 w-3 text-primary" />
                            {p.github_stars.toLocaleString()}
                          </span>
                        ) : null}
                      </div>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {p.tagline}
                      </p>
                      {parsed ? (
                        <a
                          href={`https://github.com/${parsed.owner}/${parsed.repo}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground/80 hover:text-foreground"
                        >
                          {parsed.owner}/{parsed.repo}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                    </div>
                  </label>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>

      <p className="pt-2 text-xs text-muted-foreground">
        We re-verify ownership against the repo URL when you submit. If a
        project&apos;s repo no longer points to your account, it&apos;ll be
        skipped.
      </p>
    </div>
  );
}
