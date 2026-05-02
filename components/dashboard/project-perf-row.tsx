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
 * Compact on mobile (stacks the metrics under the title), expands to a
 * single line on desktop.
 */
export function ProjectPerfRow({ project }: Props) {
  const ratePct =
    project.swipeRate === null ? null : Math.round(project.swipeRate * 100);

  return (
    <div
      className={cn(
        "group grid grid-cols-1 items-center gap-3 rounded-lg border border-border/60 bg-card/30 px-4 py-3 transition-colors hover:border-border hover:bg-card/60",
        "md:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto_auto]",
      )}
    >
      {/* Title + tagline */}
      <div className="min-w-0">
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
      <Metric
        label="Lifetime"
        value={
          <span className="inline-flex items-center gap-1">
            <Star className="h-3 w-3 fill-primary text-primary" />
            <span>{formatCount(project.rightSwipesLifetime)}</span>
          </span>
        }
      />

      {/* Week */}
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

      {/* Right-swipe rate */}
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

      {/* Trend sparkline */}
      <div className="text-primary">
        <Sparkline
          data={project.trend}
          className="h-7 w-20"
          ariaLabel={`${project.title} trend last 14 days`}
        />
      </div>

      {/* Insights + Edit links */}
      <div className="flex items-center gap-1 justify-self-end">
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
    <div className="flex items-baseline gap-1.5 md:flex-col md:items-start md:gap-0">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/80">
        {label}
      </span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export default ProjectPerfRow;
