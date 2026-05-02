import Link from "next/link";
import { Star, Trophy } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/server";
import { cn, formatCount } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Leaderboard",
  description: "The top makers of the week, ranked by stars earned on Stargaze.",
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
  { id: string; slug: string; title: string }
>;

export default async function LeaderboardPage() {
  const [leaders, topByUser] = await Promise.all([
    fetchLeaders(),
    fetchTopProjectByUser(),
  ]);

  return (
    <>
      <Nav />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-4 pb-32 pt-6 md:pt-10">
          <Header />

          {leaders.length === 0 ? (
            <Card className="mt-6 border-dashed bg-card/40">
              <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
                <Trophy className="h-8 w-8 text-primary/70" />
                <p className="text-sm text-muted-foreground">
                  The board is wide open this week. Ship something to claim
                  it.
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

function Header() {
  const reset = nextWeeklyResetISO();
  return (
    <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <Badge variant="warning" className="mb-2">
          <Trophy className="h-3 w-3" />
          This week
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Maker leaderboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ranked by right-swipes earned in the last 7 days.
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        Resets <span className="font-mono">{reset}</span>
      </p>
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
  topProject: { slug: string; title: string } | undefined;
}) {
  return (
    <li>
      <Card
        className={cn(
          "transition-colors",
          rank === 1 && "border-primary/40 bg-primary/5",
        )}
      >
        <CardContent className="flex items-center gap-4 p-4">
          <span
            className={cn(
              "w-8 text-center font-mono text-lg tabular-nums",
              rank === 1
                ? "text-primary"
                : rank <= 3
                  ? "text-foreground"
                  : "text-muted-foreground/70",
            )}
          >
            #{rank}
          </span>

          <Link
            href={`/u/${leader.github_username}`}
            className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-90"
          >
            <Avatar className="h-10 w-10 ring-1 ring-border">
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
                  <Link
                    href={`/p/${topProject.slug}`}
                    className="text-foreground hover:underline"
                  >
                    {topProject.title}
                  </Link>
                </p>
              ) : null}
            </div>
          </Link>

          <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary ring-1 ring-primary/20">
            <Star className="h-4 w-4 fill-primary" />
            {formatCount(leader.right_swipes_week)}
          </div>
        </CardContent>
      </Card>
    </li>
  );
}

async function fetchLeaders(): Promise<Leader[]> {
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
 * can label the row with "Top: …".
 */
async function fetchTopProjectByUser(): Promise<TopProjectByUser> {
  const result: TopProjectByUser = new Map();
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("projects")
      .select(
        "id, slug, title, user_id, status, created_at",
      )
      .eq("status", "live")
      .order("created_at", { ascending: false })
      .limit(200);

    for (const p of data ?? []) {
      const existing = result.get(p.user_id);
      if (!existing) {
        result.set(p.user_id, { id: p.id, slug: p.slug, title: p.title });
      }
    }
  } catch {
    // ignore — leaderboard still renders without "top:" labels
  }
  return result;
}

function nextWeeklyResetISO(): string {
  // The matview is refreshed by a cron in v0.2; for v0.1 we just show the
  // next Monday at 00:00 UTC as a friendly anchor.
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
  return next.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}
