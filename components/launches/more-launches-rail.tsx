import Link from "next/link";
import { Star } from "lucide-react";
import { cn, formatCount } from "@/lib/utils";

export type RailProject = {
  id: string;
  slug: string;
  title: string;
  github_stars: number | null;
  creator: {
    github_username: string;
    display_name: string | null;
  } | null;
  cover: { url: string; type: string } | null;
};

type MoreLaunchesRailProps = {
  projects: RailProject[];
  /**
   * Optional class to extend the wrapper — useful if a parent wants to
   * tighten/widen the gutters around the rail.
   */
  className?: string;
};

/**
 * Horizontal scroll rail of small project cards shown below the immersive
 * `/launches/[slug]` hero. Each tile links into another launch's deep-link
 * page so visitors can hop laterally without bouncing back to the wall.
 *
 * Uses native overflow-x-auto with snap points — no JavaScript needed.
 * If `projects` is empty the component renders nothing.
 */
export function MoreLaunchesRail({
  projects,
  className,
}: MoreLaunchesRailProps) {
  if (projects.length === 0) return null;

  return (
    <section
      aria-labelledby="more-launches-heading"
      className={cn(
        "relative w-full border-t border-border/40 bg-background/80 backdrop-blur-sm",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-7xl px-6 py-10 md:px-10 md:py-14">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mono-caption font-mono text-primary/80">
              § more launches
            </p>
            <h2
              id="more-launches-heading"
              className="mt-1 text-xl font-semibold tracking-tight md:text-2xl"
            >
              Other recent ships
            </h2>
          </div>
          <Link
            href="/launches"
            className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground/80 transition-colors hover:text-primary"
          >
            View all →
          </Link>
        </div>

        {/* Native horizontal scroll — snap-x for tactile pagination on
            touch, plain overflow on desktop where the wheel/trackpad
            already feels right. */}
        <ul
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="list"
        >
          {projects.map((p) => (
            <li
              key={p.id}
              className="w-[260px] shrink-0 snap-start md:w-[280px]"
            >
              <Link
                href={`/launches/${p.slug}`}
                className="group block focus-visible:outline-none"
              >
                <div className="overflow-hidden rounded-xl border border-border/40 bg-card/60 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 group-focus-visible:ring-2 group-focus-visible:ring-primary">
                  <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                    {p.cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.cover.url}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                        <span className="font-mono text-3xl font-bold">
                          {p.title.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                    )}
                    {p.github_stars && p.github_stars > 0 ? (
                      <div className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full border border-border/40 bg-background/80 px-2 py-0.5 backdrop-blur-sm">
                        <Star
                          className="h-3 w-3 fill-current text-primary"
                          strokeWidth={0}
                        />
                        <span className="font-mono text-[11px] text-foreground/90">
                          {formatCount(p.github_stars)}
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <div className="p-3">
                    <h3 className="line-clamp-1 text-sm font-semibold tracking-tight">
                      {p.title}
                    </h3>
                    {p.creator ? (
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        @{p.creator.github_username}
                      </p>
                    ) : null}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
