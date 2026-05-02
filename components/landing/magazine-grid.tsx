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
 * Editorial magazine grid — 1 hero featured card on the left, 5 smaller
 * "constellation" cards on the right in a 2x3 grid. Asymmetric on
 * purpose so it doesn't read like a 3-column app store.
 */
export function MagazineGrid({ projects }: { projects: FeaturedProject[] }) {
  if (projects.length === 0) {
    return <EmptyState />;
  }

  const [hero, ...rest] = projects;
  const constellation = rest.slice(0, 5);

  return (
    <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
      <HeroProject project={hero} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2">
        {constellation.map((p, i) => (
          <ConstellationCard key={p.id} project={p} index={i + 2} />
        ))}
      </div>
    </div>
  );
}

function HeroProject({ project }: { project: FeaturedProject }) {
  const cover = pickCover(project);
  return (
    <Link
      href={`/p/${project.slug}`}
      className="group relative block overflow-hidden rounded-3xl border hairline bg-card transition-colors hover:border-primary/40"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-secondary via-card to-background">
        {cover ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={cover}
            alt=""
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Star className="h-12 w-12 fill-primary/20 text-primary/40" />
          </div>
        )}

        {/* Overlay gradient + caption block */}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />

        <div className="absolute inset-0 flex flex-col justify-between p-6 md:p-8">
          <div className="flex items-start justify-between">
            <span className="rounded-full border border-primary/40 bg-background/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-primary backdrop-blur">
              ✦ Hero pick · § 01
            </span>
            <ArrowUpRight className="h-5 w-5 text-foreground/60 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
          </div>

          <div className="space-y-3">
            <h3 className="max-w-xl text-3xl font-bold leading-[1.05] tracking-tight text-foreground md:text-4xl">
              {project.title}
            </h3>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
              {project.tagline}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80">
              {project.user ? (
                <span className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    {project.user.avatar_url ? (
                      <AvatarImage
                        src={project.user.avatar_url}
                        alt={project.user.github_username}
                      />
                    ) : null}
                    <AvatarFallback>
                      {project.user.github_username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  @{project.user.github_username}
                </span>
              ) : null}
              {project.github_language ? (
                <>
                  <Sep />
                  <span>{project.github_language}</span>
                </>
              ) : null}
              {project.github_stars != null ? (
                <>
                  <Sep />
                  <span className="flex items-center gap-1 text-primary">
                    <Star className="h-3 w-3 fill-primary" strokeWidth={0} />
                    {formatCount(project.github_stars)}
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ConstellationCard({
  project,
  index,
}: {
  project: FeaturedProject;
  index: number;
}) {
  const cover = pickCover(project);
  return (
    <Link
      href={`/p/${project.slug}`}
      className={cn(
        "group relative overflow-hidden rounded-2xl border hairline bg-card transition-all",
        "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_0_30px_-15px_hsl(47_96%_58%/0.6)]",
      )}
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-secondary to-background">
        {cover ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={cover}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground/30">
            <Star className="h-8 w-8" />
          </div>
        )}
        <div className="absolute right-2 top-2 rounded font-mono text-[9px] uppercase tracking-[0.2em] text-primary/90">
          § {String(index).padStart(2, "0")}
        </div>
      </div>
      <div className="p-4">
        <h4 className="line-clamp-1 text-sm font-semibold tracking-tight text-foreground">
          {project.title}
        </h4>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {project.tagline}
        </p>
        <div className="mt-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
          <span className="truncate">
            @{project.user?.github_username ?? "indie"}
          </span>
          {project.github_stars != null ? (
            <span className="flex items-center gap-1 text-primary">
              <Star className="h-2.5 w-2.5 fill-primary" strokeWidth={0} />
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
  const screenshot = ordered.find((m) => m.type !== "video");
  return screenshot?.url ?? null;
}

function Sep() {
  return <span className="opacity-40">/</span>;
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed hairline-strong p-16 text-center">
      <Star className="mx-auto h-10 w-10 fill-primary/30 text-primary/40" />
      <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        Deck initializing — first projects shipping shortly.
      </p>
    </div>
  );
}
