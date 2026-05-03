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

const CARD_GRADIENTS = [
  "from-violet-500/30 via-fuchsia-500/15 to-amber-400/20",
  "from-sky-500/30 via-cyan-500/15 to-emerald-400/20",
  "from-amber-500/30 via-orange-500/15 to-pink-500/20",
  "from-emerald-500/30 via-teal-500/15 to-sky-400/20",
  "from-rose-500/30 via-pink-500/15 to-violet-400/20",
];

/**
 * Horizontal scroll rail of featured projects — Apple-App-Store-Today vibe.
 * Edge fades + scroll-snap for tactile horizontal browsing on touch + mouse.
 */
export function FeaturedRail({
  projects,
  className,
}: {
  projects: FeaturedProject[];
  className?: string;
}) {
  if (projects.length === 0) return <EmptyRail />;

  return (
    <div
      className={cn("relative -mx-6 sm:-mx-0", className)}
      aria-label="Featured projects scroll"
    >
      {/* Edge gradient fades — desktop only */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-12 bg-gradient-to-r from-background to-transparent sm:block"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-12 bg-gradient-to-l from-background to-transparent sm:block"
      />

      <ul
        role="list"
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-3 scrollbar-hidden sm:gap-5 sm:px-0"
        style={{ scrollbarWidth: "none" }}
      >
        {projects.slice(0, 12).map((p, i) => (
          <li
            key={p.id}
            className="snap-start shrink-0"
            style={{ width: "clamp(240px, 28vw, 280px)" }}
          >
            <RailCard project={p} accent={CARD_GRADIENTS[i % CARD_GRADIENTS.length]} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function RailCard({
  project,
  accent,
}: {
  project: FeaturedProject;
  accent: string;
}) {
  const cover = pickCover(project);
  const initials =
    project.title.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || "★";

  return (
    <Link
      href={`/p/${project.slug}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/50 bg-card transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_12px_40px_-15px_hsl(47_96%_58%/0.5)]"
    >
      {/* Cover */}
      <div
        className={cn(
          "relative aspect-[16/10] overflow-hidden bg-gradient-to-br",
          accent,
        )}
      >
        {cover ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={cover}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="font-mono text-3xl font-bold tracking-tighter text-white/85 mix-blend-overlay">
              {initials}
            </span>
          </div>
        )}

        {/* OSS sticker */}
        {project.is_open_source ? (
          <div className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground shadow-[0_0_18px_hsl(47_96%_58%/0.6)]">
            <Star className="h-2.5 w-2.5 fill-current" strokeWidth={0} />
            OSS
          </div>
        ) : null}

        {/* Hover arrow */}
        <ArrowUpRight className="absolute bottom-2 right-2 h-4 w-4 translate-y-1 text-foreground/0 transition-all group-hover:translate-y-0 group-hover:text-foreground" />
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-1 text-base font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
          {project.title}
        </h3>
        <p className="line-clamp-2 flex-1 text-xs leading-relaxed text-muted-foreground">
          {project.tagline}
        </p>
        <div className="mt-1 flex items-center justify-between gap-3 text-[11px]">
          {project.user ? (
            <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground/85">
              <Avatar className="h-4 w-4 shrink-0">
                {project.user.avatar_url ? (
                  <AvatarImage
                    src={project.user.avatar_url}
                    alt={project.user.github_username}
                  />
                ) : null}
                <AvatarFallback className="text-[8px]">
                  {project.user.github_username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">@{project.user.github_username}</span>
            </span>
          ) : <span />}
          {project.github_stars != null ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 font-semibold text-primary tabular">
              <Star className="h-3 w-3 fill-primary" strokeWidth={0} />
              {formatCount(project.github_stars)}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function pickCover(project: FeaturedProject): string | null {
  const ordered = [...project.media].sort(
    (a, b) => a.order_index - b.order_index,
  );
  return ordered.find((m) => m.type !== "video")?.url ?? null;
}

function EmptyRail() {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center">
      <Star className="mx-auto h-7 w-7 fill-primary/40 text-primary/50" />
      <p className="mt-3 text-sm text-muted-foreground">
        First projects shipping shortly.
      </p>
    </div>
  );
}
