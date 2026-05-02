import Link from "next/link";
import { ArrowUpRight, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, formatCount } from "@/lib/utils";

type FeaturedProject = {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  github_language: string | null;
  github_stars: number | null;
  is_open_source: boolean;
  created_at: string;
  category: string | null;
  user: {
    github_username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  media: Array<{ url: string; type: string; order_index: number }>;
};

/**
 * Hero "Today on Stargaze" featured list. Product Hunt-inspired vertical
 * stack of numbered project rows. Real thumbnails, real creators, brand
 * yellow used sparingly on stars + the primary CTA chip.
 *
 * Each row is a Link to /p/[slug] with a hover-rise + arrow affordance.
 */
export function FeaturedList({
  projects,
  className,
}: {
  projects: FeaturedProject[];
  className?: string;
}) {
  if (projects.length === 0) {
    return <EmptyList className={className} />;
  }

  return (
    <ol className={cn("flex flex-col gap-2", className)}>
      {projects.slice(0, 5).map((p, i) => (
        <FeaturedRow key={p.id} project={p} rank={i + 1} />
      ))}
    </ol>
  );
}

function FeaturedRow({
  project,
  rank,
}: {
  project: FeaturedProject;
  rank: number;
}) {
  const cover = pickCover(project);
  const initials = (
    project.title.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2) || "★"
  ).toUpperCase();

  return (
    <li>
      <Link
        href={`/p/${project.slug}`}
        className="group relative flex items-center gap-4 rounded-2xl border hairline bg-card/40 p-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card/70 hover:shadow-[0_0_30px_-15px_hsl(47_96%_58%/0.5)] sm:gap-5 sm:p-4"
      >
        {/* Rank — stat-numeral mono */}
        <span className="stat-numeral hidden w-6 shrink-0 text-center text-xl text-foreground/60 group-hover:text-primary sm:block md:text-2xl">
          {String(rank).padStart(2, "0")}
        </span>

        {/* Thumbnail — square 64px / 80px on desktop */}
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border hairline bg-gradient-to-br from-secondary to-background sm:h-20 sm:w-20">
          {cover ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={cover}
              alt=""
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.08]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-mono text-base font-bold tracking-tighter text-foreground/40">
              {initials}
            </div>
          )}
          {/* Mobile rank overlay */}
          <span className="stat-numeral absolute left-1 top-1 rounded bg-background/85 px-1 py-0.5 text-[10px] text-foreground/80 backdrop-blur-sm sm:hidden">
            {String(rank).padStart(2, "0")}
          </span>
        </div>

        {/* Title + tagline + creator strip */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h3 className="truncate text-base font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary md:text-lg">
              {project.title}
            </h3>
            {project.is_open_source ? null : (
              <span className="hidden shrink-0 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground/70 sm:inline">
                closed
              </span>
            )}
          </div>
          <p className="line-clamp-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {project.tagline}
          </p>
          <div className="mt-1.5 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
            {project.user ? (
              <span className="flex items-center gap-1.5">
                <Avatar className="h-3.5 w-3.5">
                  {project.user.avatar_url ? (
                    <AvatarImage
                      src={project.user.avatar_url}
                      alt={project.user.github_username}
                    />
                  ) : null}
                  <AvatarFallback className="text-[7px]">
                    {project.user.github_username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">@{project.user.github_username}</span>
              </span>
            ) : null}
            {project.github_language ? (
              <>
                <Sep />
                <span className="hidden truncate sm:inline">
                  {project.github_language}
                </span>
              </>
            ) : null}
            {project.category ? (
              <>
                <Sep />
                <span className="hidden truncate md:inline">{project.category}</span>
              </>
            ) : null}
          </div>
        </div>

        {/* Right: stars chip */}
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-sm font-semibold text-primary tabular sm:px-3 sm:py-2">
            <Star className="h-3.5 w-3.5 fill-primary" strokeWidth={0} />
            {formatCount(project.github_stars ?? 0)}
          </span>
          <span className="hidden font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60 group-hover:text-primary md:inline">
            stars
          </span>
        </div>

        {/* Hover affordance */}
        <ArrowUpRight className="hidden h-4 w-4 shrink-0 text-foreground/30 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary md:block" />
      </Link>
    </li>
  );
}

function Sep() {
  return <span className="text-primary/40">/</span>;
}

function pickCover(project: FeaturedProject): string | null {
  const ordered = [...project.media].sort(
    (a, b) => a.order_index - b.order_index,
  );
  const screenshot = ordered.find((m) => m.type !== "video");
  return screenshot?.url ?? null;
}

function EmptyList({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed hairline-strong p-10 text-center",
        className,
      )}
    >
      <Star className="mx-auto h-8 w-8 fill-primary/30 text-primary/40" />
      <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        Deck initializing — first projects shipping shortly.
      </p>
    </div>
  );
}
