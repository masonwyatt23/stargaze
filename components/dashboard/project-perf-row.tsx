import Link from "next/link";
import { ArrowUpRight, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Sparkline } from "@/components/sparkline";
import { cn, formatCount } from "@/lib/utils";

export type ProjectPerf = {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  isOpenSource: boolean;
  status: string;
  /** Lifetime right-swipes (auto-stars). */
  rightSwipesLifetime: number;
  /** Right-swipes in the last 7 days. */
  rightSwipesWeek: number;
  /** right / (right+left), 0–1, null when no swipes ever. */
  swipeRate: number | null;
  /** Last 14 days of right-swipes for the inline sparkline. */
  trend: number[];
};

type Props = { project: ProjectPerf };

/**
 * One row of the per-project performance table. Server-rendered.
 *
 * Mobile: a stacked card. Title + status chip on row 1; metrics + sparkline
 *         arranged in a tight grid; Edit/Insights as full-width footer links
 *         so they're tappable without zooming.
 *
 * Desktop: the original single-line layout — title takes the slack and
 *          metrics/sparkline/links sit on the right.
 */
export function ProjectPerfRow({ project }: Props) {
  const ratePct =
    project.swipeRate === null ? null : Math.round(project.swipeRate * 100);

  return (
    <div
      className={cn(
        "group rounded-lg border border-border/60 bg-card/30 transition-colors hover:border-border hover:bg-card/60",
        // Desktop: the original single-row grid.
        "md:grid md:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto_auto] md:items-center md:gap-3 md:px-4 md:py-3",
      )}
    >
      {/* ===== Mobile layout ===== */}
      <div className="flex flex-col gap-3 p-3 md:hidden">
        {/* Header — title + status badges */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <Link
                href={`/p/${project.slug}`}
                className="truncate font-semibold text-foreground hover:text-primary"
              >
                {project.title}
              </Link>
              {project.status !== "live" ? (
                <Badge variant="warning" className="capitalize">
                  {project.status}
                </Badge>
              ) : null}
              {project.isOpenSource ? null : (
                <Badge variant="outline" className="text-[10px]">
                  Closed
                </Badge>
              )}
            </div>
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
              {project.tagline}
            </p>
          </div>
          <div className="text-primary">
            <Sparkline
              data={project.trend}
              className="h-7 w-16"
              ariaLabel={`${project.title} trend last 14 days`}
            />
          </div>
        </div>

        {/* Metric row */}
        <div className="grid grid-cols-3 gap-2 rounded-md bg-secondary/30 px-2 py-2">
          <MobileStat
            label="Lifetime"
            value={
              <span className="inline-flex items-center gap-1">
                <Star className="h-3 w-3 fill-primary text-primary" />
                <span>{formatCount(project.rightSwipesLifetime)}</span>
              </span>
            }
          />
          <MobileStat
            label="7d"
            value={
              <span
                className={cn(
                  "tabular-nums",
                  project.rightSwipesWeek > 0
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                +{project.rightSwipesWeek}
              </span>
            }
          />
          <MobileStat
            label="Rate"
            value={
              <span
                className={cn(
                  "tabular-nums",
                  ratePct === null
                    ? "text-muted-foreground"
                    : ratePct >= 60
                      ? "text-green-300"
                      : ratePct >= 30
                        ? "text-foreground"
                        : "text-orange-300",
                )}
              >
                {ratePct === null ? "—" : `${ratePct}%`}
              </span>
            }
          />
        </div>

        {/* Footer — Edit + Insights as 44px-tappable links */}
        <div className="grid grid-cols-2 gap-2 border-t border-border/40 pt-2">
          <Link
            href={`/projects/${project.id}/edit`}
            className="inline-flex h-11 items-center justify-center rounded-md text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Edit
          </Link>
          <Link
            href={`/p/${project.slug}/insights`}
            className="inline-flex h-11 items-center justify-center gap-1 rounded-md text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Insights
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* ===== Desktop layout (original) ===== */}
      <div className="hidden min-w-0 md:block">
        <div className="flex items-center gap-2">
          <Link
            href={`/p/${project.slug}`}
            className="truncate font-medium text-foreground hover:text-primary"
          >
            {project.title}
          </Link>
          {project.status !== "live" ? (
            <Badge variant="warning" className="capitalize">
              {project.status}
            </Badge>
          ) : null}
          {project.isOpenSource ? null : (
            <Badge variant="outline" className="text-[10px]">
              Closed
            </Badge>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {project.tagline}
        </p>
      </div>

      {/* Lifetime stars */}
      <div className="hidden md:block">
        <Metric
          label="Lifetime"
          value={
            <span className="inline-flex items-center gap-1">
              <Star className="h-3 w-3 fill-primary text-primary" />
              <span>{formatCount(project.rightSwipesLifetime)}</span>
            </span>
          }
        />
      </div>

      {/* Week */}
      <div className="hidden md:block">
        <Metric
          label="7d"
          value={
            <span
              className={cn(
                "tabular-nums",
                project.rightSwipesWeek > 0
                  ? "text-foreground"
                  : "text-muted-foreground",
              )}
            >
              +{project.rightSwipesWeek}
            </span>
          }
        />
      </div>

      {/* Right-swipe rate */}
      <div className="hidden md:block">
        <Metric
          label="Rate"
          value={
            <span
              className={cn(
                "tabular-nums",
                ratePct === null
                  ? "text-muted-foreground"
                  : ratePct >= 60
                    ? "text-green-300"
                    : ratePct >= 30
                      ? "text-foreground"
                      : "text-orange-300",
              )}
            >
              {ratePct === null ? "—" : `${ratePct}%`}
            </span>
          }
        />
      </div>

      {/* Trend sparkline */}
      <div className="hidden text-primary md:block">
        <Sparkline
          data={project.trend}
          className="h-7 w-20"
          ariaLabel={`${project.title} trend last 14 days`}
        />
      </div>

      {/* Insights + Edit links */}
      <div className="hidden items-center gap-1 justify-self-end md:flex">
        <Link
          href={`/projects/${project.id}/edit`}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          Edit
        </Link>
        <Link
          href={`/p/${project.slug}/insights`}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          Insights
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-0">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/80">
        {label}
      </span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function MobileStat({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 text-center">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/80">
        {label}
      </span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

export default ProjectPerfRow;
