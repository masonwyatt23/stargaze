import Link from "next/link";
import { Crown, Star, Trophy } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/footer";
import { LeaderboardCountdown } from "@/components/leaderboard-countdown";
import { LeaderboardTabs } from "@/components/leaderboard-tabs";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/server";
import { cn, formatCount } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Leaderboard",
  description: "The top makers of the week, ranked by stars earned on Stargaze.",
};

const VALID_CATEGORIES = new Set([
  "ai-tool",
  "dev-utility",
  "game",
  "saas",
  "other",
]);

const CATEGORY_LABEL: Record<string, string> = {
  "ai-tool": "AI",
  "dev-utility": "Dev tools",
  game: "Games",
  saas: "SaaS",
  other: "Other",
};

type Leader = {
  user_id: string;
  github_username: string;
  display_name: string | null;
  avatar_url: string | null;
  right_swipes_week: number;
  projects_with_swipes: number;
};

type TopProjectByUser = Map<
  string,
  {
    id: string;
    slug: string;
    title: string;
    thumbnail_url: string | null;
  }
>;

type LeaderboardPageProps = {
  searchParams: Promise<{ cat?: string }>;
};

export default async function LeaderboardPage({
  searchParams,
}: LeaderboardPageProps) {
  const { cat } = await searchParams;
  const activeCategory =
    cat && VALID_CATEGORIES.has(cat) ? cat : null;
  const activeTab = activeCategory ?? "all";

  const [leaders, topByUser] = activeCategory
    ? await fetchByCategory(activeCategory)
    : await Promise.all([fetchLeadersAll(), fetchTopProjectByUser()]);

  const resetIso = nextWeeklyResetISO();

  return (
    <>
      <Nav />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-4 pb-32 pt-6 md:pt-10">
          <Header
            resetIso={resetIso}
            categoryLabel={
              activeCategory ? CATEGORY_LABEL[activeCategory] : null
            }
          />

          <div className="mt-5 border-b border-border/40">
            <LeaderboardTabs active={activeTab} />
          </div>

          {leaders.length === 0 ? (
            <Card className="mt-6 border-dashed bg-card/40">
              <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
                <Trophy className="h-8 w-8 text-primary/70" />
                <p className="text-sm text-muted-foreground">
                  {activeCategory
                    ? `No ${CATEGORY_LABEL[activeCategory]} makers on the board this week. Ship something to claim it.`
                    : "The board is wide open this week. Ship something to claim it."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <ol className="mt-6 flex flex-col gap-2">
              {leaders.map((l, i) => (
                <LeaderRow
                  key={l.user_id}
                  rank={i + 1}
                  leader={l}
                  topProject={topByUser.get(l.user_id)}
                />
              ))}
            </ol>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function Header({
  resetIso,
  categoryLabel,
}: {
  resetIso: string;
  categoryLabel: string | null;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <Badge variant="warning" className="mb-2">
          <Trophy className="h-3 w-3" />
          {categoryLabel ? `${categoryLabel} · this week` : "This week"}
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Maker leaderboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {categoryLabel
            ? `Top ${categoryLabel} makers ranked by right-swipes earned in the last 7 days.`
            : "Ranked by right-swipes earned in the last 7 days."}
        </p>
      </div>
      <LeaderboardCountdown resetAt={resetIso} />
    </header>
  );
}

function LeaderRow({
  rank,
  leader,
  topProject,
}: {
  rank: number;
  leader: Leader;
  topProject:
    | { slug: string; title: string; thumbnail_url: string | null }
    | undefined;
}) {
  const isFirst = rank === 1;
  return (
    <li>
      <Card
        className={cn(
          "transition-colors",
          isFirst &&
            "border-primary/50 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent shadow-[0_0_30px_hsl(47_96%_58%/0.10)]",
        )}
      >
        <CardContent className="flex items-center gap-4 p-4">
          <span
            className={cn(
              "relative w-10 text-center font-mono text-lg tabular-nums",
              isFirst
                ? "text-primary"
                : rank <= 3
                  ? "text-foreground"
                  : "text-muted-foreground/70",
            )}
          >
            {isFirst ? (
              <Crown
                className="absolute -top-3 left-1/2 h-3.5 w-3.5 -translate-x-1/2 fill-primary text-primary drop-shadow-[0_0_8px_hsl(47_96%_58%/0.6)]"
                aria-hidden
              />
            ) : null}
            #{rank}
          </span>

          {/* Top project thumbnail (if any). Falls back to a subtle tile so
              row heights stay aligned. */}
          {topProject ? (
            <Link
              href={`/p/${topProject.slug}`}
              className="hidden shrink-0 sm:block"
              aria-label={`View ${topProject.title}`}
            >
              <ProjectThumb
                src={topProject.thumbnail_url}
                title={topProject.title}
                isFirst={isFirst}
              />
            </Link>
          ) : (
            <div className="hidden h-12 w-12 shrink-0 rounded-lg bg-secondary/40 ring-1 ring-border/40 sm:block" />
          )}

          <Link
            href={`/u/${leader.github_username}`}
            className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-90"
          >
            <Avatar
              className={cn(
                "h-10 w-10 ring-1",
                isFirst ? "ring-primary/50" : "ring-border",
              )}
            >
              {leader.avatar_url ? (
                <AvatarImage
                  src={leader.avatar_url}
                  alt={leader.github_username}
                />
              ) : null}
              <AvatarFallback>
                {leader.github_username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">
                {leader.display_name ?? leader.github_username}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                @{leader.github_username}
                {leader.projects_with_swipes > 0 ? (
                  <>
                    {" · "}
                    {leader.projects_with_swipes} project
                    {leader.projects_with_swipes === 1 ? "" : "s"}
                  </>
                ) : null}
              </p>
              {topProject ? (
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  Top:&nbsp;
                  <span className="text-foreground hover:underline">
                    {topProject.title}
                  </span>
                </p>
              ) : null}
            </div>
          </Link>

          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ring-1",
              isFirst
                ? "bg-primary/20 text-primary ring-primary/40"
                : "bg-primary/10 text-primary ring-primary/20",
            )}
          >
            <Star className="h-4 w-4 fill-primary" />
            {formatCount(leader.right_swipes_week)}
          </div>
        </CardContent>
      </Card>
    </li>
  );
}

function ProjectThumb({
  src,
  title,
  isFirst,
}: {
  src: string | null;
  title: string;
  isFirst: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg ring-1 transition",
        isFirst ? "ring-primary/40" : "ring-border/60",
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={title}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 via-primary/5 to-transparent text-xs font-mono text-muted-foreground">
          {title.slice(0, 2).toUpperCase()}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Data                                                                     */
/* ------------------------------------------------------------------------ */

async function fetchLeadersAll(): Promise<Leader[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("leaderboard_weekly_public")
      .select(
        "user_id, github_username, display_name, avatar_url, right_swipes_week, projects_with_swipes",
      )
      .order("right_swipes_week", { ascending: false })
      .limit(50);
    return (data ?? []) as Leader[];
  } catch {
    return [];
  }
}

/**
 * For each user with swipes this week, find their top-swiped project so we
 * can label the row with "Top: …" and render a thumbnail.
 */
async function fetchTopProjectByUser(): Promise<TopProjectByUser> {
  const result: TopProjectByUser = new Map();
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("projects")
      .select(
        `id, slug, title, user_id, status, created_at,
         media:project_media(url, thumbnail_url, order_index, type)`,
      )
      .eq("status", "live")
      .order("created_at", { ascending: false })
      .limit(200);

    for (const p of data ?? []) {
      const existing = result.get(p.user_id);
      if (!existing) {
        const media = (p.media ?? []) as Array<{
          url: string;
          thumbnail_url: string | null;
          order_index: number;
          type: string;
        }>;
        const sorted = [...media].sort(
          (a, b) => a.order_index - b.order_index,
        );
        const cover = sorted[0];
        const thumb =
          cover?.thumbnail_url ??
          (cover?.type === "screenshot" || cover?.type === "gif"
            ? cover.url
            : null);
        result.set(p.user_id, {
          id: p.id,
          slug: p.slug,
          title: p.title,
          thumbnail_url: thumb,
        });
      }
    }
  } catch {
    // ignore — leaderboard still renders without "top:" labels
  }
  return result;
}

/**
 * Per-category leaderboard via the `leaderboard_by_category` SQL function.
 * Returns leaders + a top-project map in one round-trip; we then enrich
 * the map with media thumbnails using the project ids we already know.
 */
async function fetchByCategory(
  category: string,
): Promise<[Leader[], TopProjectByUser]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.rpc("leaderboard_by_category", {
      p_category: category,
      p_limit: 50,
    });

    const rows = (data ?? []) as Array<{
      user_id: string;
      github_username: string;
      display_name: string | null;
      avatar_url: string | null;
      right_swipes_week: number;
      projects_with_swipes: number;
      top_project_id: string | null;
      top_project_slug: string | null;
      top_project_title: string | null;
    }>;

    const leaders: Leader[] = rows.map((r) => ({
      user_id: r.user_id,
      github_username: r.github_username,
      display_name: r.display_name,
      avatar_url: r.avatar_url,
      right_swipes_week: Number(r.right_swipes_week ?? 0),
      projects_with_swipes: Number(r.projects_with_swipes ?? 0),
    }));

    const topByUser: TopProjectByUser = new Map();
    const projectIds = rows
      .map((r) => r.top_project_id)
      .filter((id): id is string => Boolean(id));

    const mediaByProject = new Map<
      string,
      { url: string; thumbnail_url: string | null; type: string; order_index: number }
    >();

    if (projectIds.length > 0) {
      const { data: media } = await supabase
        .from("project_media")
        .select("project_id, url, thumbnail_url, order_index, type")
        .in("project_id", projectIds)
        .order("order_index", { ascending: true });

      for (const m of media ?? []) {
        // Keep the first (lowest order_index) per project.
        if (!mediaByProject.has(m.project_id)) {
          mediaByProject.set(m.project_id, {
            url: m.url,
            thumbnail_url: m.thumbnail_url,
            type: m.type,
            order_index: m.order_index,
          });
        }
      }
    }

    for (const r of rows) {
      if (!r.top_project_id || !r.top_project_slug || !r.top_project_title) {
        continue;
      }
      const cover = mediaByProject.get(r.top_project_id);
      const thumb =
        cover?.thumbnail_url ??
        (cover?.type === "screenshot" || cover?.type === "gif"
          ? (cover?.url ?? null)
          : null);
      topByUser.set(r.user_id, {
        id: r.top_project_id,
        slug: r.top_project_slug,
        title: r.top_project_title,
        thumbnail_url: thumb,
      });
    }

    return [leaders, topByUser];
  } catch {
    return [[], new Map()];
  }
}

function nextWeeklyResetISO(): string {
  // Reset weekly at Monday 00:00 UTC.
  const now = new Date();
  const day = now.getUTCDay();
  const daysUntilMonday = (8 - day) % 7 || 7;
  const next = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysUntilMonday,
      0,
      0,
      0,
    ),
  );
  return next.toISOString();
}
