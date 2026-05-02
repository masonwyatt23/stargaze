import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Sparkles, Star, TrendingUp } from "lucide-react";
import { GithubIcon } from "@/components/icons/github-icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { Sparkline } from "@/components/sparkline";
import { createClient } from "@/lib/supabase/server";
import { formatCount } from "@/lib/utils";

export const dynamic = "force-dynamic";

type ProfilePageProps = {
  // Next.js 16: params is async.
  params: Promise<{ username: string }>;
};

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const title = `@${username}`;
  const description = `Indie projects by @${username} on Stargaze. Right-swipe to back the maker.`;
  return {
    title,
    description,
    openGraph: {
      title: `@${username} · Stargaze`,
      description,
      type: "profile",
    },
    twitter: {
      card: "summary",
      title: `@${username} · Stargaze`,
      description,
    },
  };
}

type ProfileUser = {
  id: string;
  github_username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
};

type ProfileProject = {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  github_repo_url: string | null;
  github_language: string | null;
  github_stars: number | null;
  is_open_source: boolean;
  created_at: string;
  media: { url: string; type: string; order_index: number }[];
};

const JOIN_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

/** Date as YYYY-MM-DD in UTC — used as map key for daily bucketing. */
function ymdUtc(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default async function UserProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("users")
    .select("id, github_username, display_name, avatar_url, bio, created_at")
    .eq("github_username", username)
    .maybeSingle();

  if (!profile) notFound();
  const user = profile as ProfileUser;

  // ---------------------------------------------------------------------
  // Fetch the user's projects, leaderboard row, and (separately) the swipes
  // we need for analytics. We do projects first so the analytics queries can
  // be scoped to just their project IDs.
  // ---------------------------------------------------------------------
  const { data: rawProjects } = await supabase
    .from("projects")
    .select(
      `id, slug, title, tagline, github_repo_url, github_language,
       github_stars, is_open_source, created_at,
       media:project_media(url, type, order_index)`,
    )
    .eq("user_id", user.id)
    .eq("status", "live")
    .order("created_at", { ascending: false });

  const projects = (rawProjects ?? []) as unknown as ProfileProject[];
  const projectIds = projects.map((p) => p.id);

  // 14-day window (UTC midnight aligned) for the sparkline.
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setUTCHours(0, 0, 0, 0);
  fourteenDaysAgo.setUTCDate(fourteenDaysAgo.getUTCDate() - 13);

  const [{ data: leaderRow }, { data: rightSwipesAll }, { data: rightSwipes14d }] =
    await Promise.all([
      supabase
        .from("leaderboard_weekly_public")
        .select("right_swipes_week, projects_with_swipes")
        .eq("user_id", user.id)
        .maybeSingle(),
      projectIds.length > 0
        ? supabase
            .from("swipes")
            .select("project_id")
            .eq("direction", "right")
            .in("project_id", projectIds)
        : Promise.resolve({ data: [] as { project_id: string }[] }),
      projectIds.length > 0
        ? supabase
            .from("swipes")
            .select("project_id, created_at")
            .eq("direction", "right")
            .in("project_id", projectIds)
            .gte("created_at", fourteenDaysAgo.toISOString())
        : Promise.resolve({
            data: [] as { project_id: string; created_at: string }[],
          }),
    ]);

  // Per-project right-swipe count (lifetime).
  const swipeCountByProject = new Map<string, number>();
  for (const r of rightSwipesAll ?? []) {
    swipeCountByProject.set(
      r.project_id,
      (swipeCountByProject.get(r.project_id) ?? 0) + 1,
    );
  }

  const totalStarsDelivered = (rightSwipesAll ?? []).length;
  const rightSwipesWeek = leaderRow?.right_swipes_week ?? 0;

  // Daily bucket the last-14-days swipes.
  const dailyMap = new Map<string, number>();
  for (let i = 0; i < 14; i++) {
    const d = new Date(fourteenDaysAgo);
    d.setUTCDate(d.getUTCDate() + i);
    dailyMap.set(ymdUtc(d), 0);
  }
  for (const s of rightSwipes14d ?? []) {
    const key = ymdUtc(new Date(s.created_at));
    if (dailyMap.has(key)) {
      dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
    }
  }
  const daily14d = Array.from(dailyMap.entries()).map(([date, right]) => ({
    date,
    right,
  }));
  const sparklineData = daily14d.map((d) => d.right);

  // Highest right-swipe project lifetime — the "top project" hero.
  const topProject =
    projects.length > 0
      ? projects.reduce<ProfileProject>((best, p) => {
          const a = swipeCountByProject.get(best.id) ?? 0;
          const b = swipeCountByProject.get(p.id) ?? 0;
          return b > a ? p : best;
        }, projects[0])
      : null;
  const topProjectStars = topProject
    ? swipeCountByProject.get(topProject.id) ?? 0
    : 0;

  // Don't show a "top project" hero if there are no swipes yet — it's just
  // a duplicate of the first card in the grid otherwise.
  const showTopProject = topProject !== null && topProjectStars > 0;

  const joinedLabel = JOIN_DATE_FORMATTER.format(new Date(user.created_at));
  const displayName = user.display_name ?? user.github_username;

  return (
    <>
      <Nav />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-5xl px-4 pb-32 pt-6 md:pt-10">
          {/* ============================ Hero ============================ */}
          <Card className="overflow-hidden border-border/70 bg-gradient-to-br from-card via-card to-primary/5">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col gap-8 md:flex-row md:items-center md:gap-10">
                {/* Identity */}
                <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center md:flex-col md:items-start md:gap-5">
                  <Avatar className="h-24 w-24 ring-2 ring-primary/30 ring-offset-2 ring-offset-card">
                    {user.avatar_url ? (
                      <AvatarImage
                        src={user.avatar_url}
                        alt={user.github_username}
                      />
                    ) : null}
                    <AvatarFallback className="text-2xl">
                      {user.github_username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                      {displayName}
                    </h1>
                    <p className="mt-0.5 font-mono text-sm text-muted-foreground">
                      @{user.github_username}
                    </p>
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" />
                      Joined {joinedLabel}
                    </p>
                  </div>
                </div>

                {/* Bio + stat row */}
                <div className="min-w-0 flex-1 space-y-5">
                  {user.bio ? (
                    <p className="max-w-prose text-sm leading-relaxed text-foreground/90">
                      {user.bio}
                    </p>
                  ) : (
                    <p className="max-w-prose text-sm italic text-muted-foreground/70">
                      No bio yet.
                    </p>
                  )}

                  <div className="grid grid-cols-3 gap-3 sm:gap-4">
                    {/* Lifetime stars delivered */}
                    <Stat
                      label="Stars delivered"
                      icon={<Star className="h-3.5 w-3.5 fill-current" />}
                      value={formatCount(totalStarsDelivered)}
                    />
                    {/* This week */}
                    <Stat
                      label="This week"
                      icon={<TrendingUp className="h-3.5 w-3.5" />}
                      value={formatCount(rightSwipesWeek)}
                    />
                    {/* Sparkline */}
                    <div className="rounded-md border border-border/60 bg-card/60 p-3">
                      <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                        Last 14 days
                      </p>
                      <Sparkline
                        data={sparklineData}
                        className="mt-2 h-10 w-full text-primary"
                        ariaLabel={`${user.github_username} right-swipes over the last 14 days`}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      {projects.length} live project
                      {projects.length === 1 ? "" : "s"}
                    </Badge>
                    {leaderRow?.projects_with_swipes ? (
                      <Badge variant="secondary">
                        {leaderRow.projects_with_swipes} backed this week
                      </Badge>
                    ) : null}
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="ml-auto"
                    >
                      <a
                        href={`https://github.com/${user.github_username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <GithubIcon className="h-4 w-4" />
                        GitHub
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ======================== Top project ======================== */}
          {showTopProject && topProject ? (
            <section className="mt-10">
              <h2 className="mb-4 inline-flex items-center gap-2 text-lg font-semibold tracking-tight">
                <Sparkles className="h-4 w-4 text-primary" />
                Top project
              </h2>
              <TopProjectCard
                project={topProject}
                stars={topProjectStars}
              />
            </section>
          ) : null}

          {/* ============================ Grid ============================ */}
          <section className="mt-10">
            <h2 className="mb-4 text-lg font-semibold tracking-tight">
              {showTopProject ? "All projects" : "Projects"}
            </h2>
            {projects.length === 0 ? (
              <Card className="border-dashed bg-card/40">
                <CardContent className="p-10 text-center text-sm text-muted-foreground">
                  Nothing on the deck yet from @{user.github_username}.
                </CardContent>
              </Card>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2">
                {projects.map((p) => {
                  const cover = [...p.media]
                    .sort((a, b) => a.order_index - b.order_index)
                    .find((m) => m.type !== "video");
                  const swipes = swipeCountByProject.get(p.id) ?? 0;
                  return (
                    <li key={p.id}>
                      <Link
                        href={`/p/${p.slug}`}
                        className="group block focus-visible:outline-none"
                      >
                        <Card className="h-full overflow-hidden transition-all hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10 group-focus-visible:ring-2 group-focus-visible:ring-primary">
                          <div className="aspect-[16/10] overflow-hidden bg-muted">
                            {cover ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={cover.url}
                                alt=""
                                className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                                <Star className="h-10 w-10" />
                              </div>
                            )}
                          </div>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="line-clamp-1 font-semibold">
                                {p.title}
                              </h3>
                              <Badge variant="outline" className="gap-1">
                                <Star className="h-3 w-3 fill-primary text-primary" />
                                {formatCount(swipes)}
                              </Badge>
                            </div>
                            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                              {p.tagline}
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-1.5">
                              {p.github_language ? (
                                <Badge variant="secondary">
                                  {p.github_language}
                                </Badge>
                              ) : null}
                              {p.github_stars != null && p.github_stars > 0 ? (
                                <Badge variant="outline" className="gap-1">
                                  <GithubIcon className="h-3 w-3" />
                                  {formatCount(p.github_stars)}
                                </Badge>
                              ) : null}
                              {p.is_open_source ? (
                                <Badge
                                  variant="warning"
                                  className="border-primary/40 bg-primary/15 text-primary"
                                >
                                  OSS
                                </Badge>
                              ) : null}
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Stat({
  label,
  icon,
  value,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border/60 bg-card/60 p-3">
      <p className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-primary md:text-3xl">
        {value}
      </p>
    </div>
  );
}

function TopProjectCard({
  project,
  stars,
}: {
  project: ProfileProject;
  stars: number;
}) {
  const cover = [...project.media]
    .sort((a, b) => a.order_index - b.order_index)
    .find((m) => m.type !== "video");

  return (
    <Link
      href={`/p/${project.slug}`}
      className="group block focus-visible:outline-none"
    >
      <Card className="overflow-hidden transition-all hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10 group-focus-visible:ring-2 group-focus-visible:ring-primary">
        <div className="grid md:grid-cols-[5fr_4fr]">
          <div className="aspect-[16/10] overflow-hidden bg-muted md:aspect-auto">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cover.url}
                alt=""
                className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                <Star className="h-12 w-12" />
              </div>
            )}
          </div>
          <CardContent className="flex flex-col justify-center gap-3 p-6 md:p-8">
            <Badge
              variant="warning"
              className="w-fit gap-1 border-primary/40 bg-primary/15 text-primary"
            >
              <Star className="h-3 w-3 fill-current" />
              {formatCount(stars)} right-swipes
            </Badge>
            <h3 className="text-2xl font-bold tracking-tight md:text-3xl">
              {project.title}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {project.tagline}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {project.github_language ? (
                <Badge variant="secondary">{project.github_language}</Badge>
              ) : null}
              {project.is_open_source ? (
                <Badge variant="outline">Open source</Badge>
              ) : (
                <Badge variant="outline">Closed source</Badge>
              )}
            </div>
          </CardContent>
        </div>
      </Card>
    </Link>
  );
}
