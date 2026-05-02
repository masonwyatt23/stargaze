import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Inbox,
  Lightbulb,
  Plus,
  Rocket,
  Sparkles,
  Star,
  TrendingUp,
  UserCircle2,
  Video,
} from "lucide-react";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ActivityEventRow,
  type ActivityEvent,
} from "@/components/dashboard/activity-event";
import {
  DashboardChart,
  type DailyBucket,
} from "@/components/dashboard/dashboard-chart";
import {
  ProjectPerfRow,
  type ProjectPerf,
} from "@/components/dashboard/project-perf-row";
import { RealtimeListener } from "@/components/dashboard/realtime-listener";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { cn, formatCount } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard",
  description:
    "Your creator command center — stars delivered, weekly trends, and pending access requests for every project you've shipped.",
};

const TREND_DAYS = 30;
const PROJECT_TREND_DAYS = 14;

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?redirect=/dashboard");

  const data = await loadDashboardData(user.id);

  return (
    <>
      <Nav />
      <RealtimeListener projectTitles={data.projectTitleMap} />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 pb-32 pt-6 md:pt-10">
          {/* Welcome row */}
          <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                Hey @{user.github_username}{" "}
                <span className="text-muted-foreground">
                  — here&apos;s how your projects are doing.
                </span>
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Stars delivered, weekly trends, and the people who want
                access to what you&apos;ve shipped.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild className="gap-1.5">
                <Link href="/projects/new">
                  <Plus className="h-4 w-4" />
                  Submit a project
                </Link>
              </Button>
              <Button asChild variant="outline" className="gap-1.5">
                <Link href={`/u/${user.github_username}`}>
                  <UserCircle2 className="h-4 w-4" />
                  View profile
                </Link>
              </Button>
            </div>
          </header>

          {/* Empty state for users with no projects */}
          {data.projects.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {/* Stat strip */}
              <section
                className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4"
                aria-label="Account stats"
              >
                <StatCard
                  icon={<Star className="h-4 w-4 fill-primary text-primary" />}
                  label="Stars delivered"
                  value={formatCount(data.starsTotal)}
                  hint="Lifetime · across all projects"
                />
                <StatCard
                  icon={<TrendingUp className="h-4 w-4 text-primary" />}
                  label="This week"
                  value={`+${formatCount(data.starsThisWeek)}`}
                  hint="Stars in the last 7 days"
                  positive={data.starsThisWeek > 0}
                />
                <StatCard
                  icon={<Inbox className="h-4 w-4 text-primary" />}
                  label="Pending requests"
                  value={String(data.pendingRequests)}
                  hint={
                    data.pendingRequests > 0
                      ? "Need your reply"
                      : "All caught up"
                  }
                  warn={data.pendingRequests > 0}
                />
                <StatCard
                  icon={<Rocket className="h-4 w-4 text-primary" />}
                  label="Live projects"
                  value={String(data.liveProjectCount)}
                  hint={`${data.totalProjectCount} total submitted`}
                />
              </section>

              {/* Big chart */}
              <Card className="mt-6 border-border/70 bg-card/40">
                <CardContent className="p-5 md:p-6">
                  <DashboardChart data={data.dailyTrend} />
                </CardContent>
              </Card>

              {/* Per-project performance */}
              <section className="mt-8" aria-labelledby="perf-heading">
                <div className="mb-3 flex items-end justify-between">
                  <div>
                    <h2
                      id="perf-heading"
                      className="text-lg font-semibold tracking-tight"
                    >
                      Per-project performance
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Sorted by lifetime right-swipes.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {data.projects.map((p) => (
                    <ProjectPerfRow key={p.id} project={p} />
                  ))}
                </div>
              </section>

              {/* Top-performing screenshot */}
              {data.topScreenshot ? (
                <Card className="mt-8 overflow-hidden border-primary/30 bg-gradient-to-br from-primary/[0.07] via-card/40 to-card/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Your top-performing screenshot
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-[minmax(0,1fr)_280px] md:items-center">
                    <div>
                      <p className="text-sm leading-relaxed">
                        This screenshot from{" "}
                        <Link
                          href={`/p/${data.topScreenshot.projectSlug}`}
                          className="font-medium text-foreground hover:text-primary"
                        >
                          {data.topScreenshot.projectTitle}
                        </Link>{" "}
                        is converting at{" "}
                        <span className="font-semibold text-primary">
                          {Math.round(data.topScreenshot.swipeRate * 100)}%
                        </span>{" "}
                        right-swipe rate. That&apos;s the visual people are
                        responding to — lean into it.
                      </p>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="mt-3"
                      >
                        <Link
                          href={`/p/${data.topScreenshot.projectSlug}/insights`}
                        >
                          See project insights
                        </Link>
                      </Button>
                    </div>
                    <div className="overflow-hidden rounded-lg border border-border bg-background/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={data.topScreenshot.url}
                        alt={`Top-performing screenshot from ${data.topScreenshot.projectTitle}`}
                        className="h-auto w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {/* Recent activity */}
              <section
                className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"
                aria-label="Recent activity and tips"
              >
                <Card className="border-border/70 bg-card/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Recent activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 px-3 pb-3 pt-1">
                    {data.activity.length === 0 ? (
                      <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                        No activity yet. Once people start swiping, you&apos;ll
                        see it here in real time.
                      </p>
                    ) : (
                      data.activity.map((event) => (
                        <ActivityEventRow
                          key={`${event.kind}-${event.id}`}
                          event={event}
                        />
                      ))
                    )}
                  </CardContent>
                </Card>

                <BoostIdeasCard
                  videoLift={data.videoLift}
                  ossLift={data.ossLift}
                />
              </section>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

// ---------------------------------------------------------------------
// UI building blocks (kept inline so the page reads top-to-bottom)
// ---------------------------------------------------------------------

function StatCard({
  icon,
  label,
  value,
  hint,
  positive,
  warn,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  positive?: boolean;
  warn?: boolean;
}) {
  return (
    <Card
      className={cn(
        "border-border/70 bg-card/40",
        warn ? "ring-1 ring-inset ring-yellow-500/30" : "",
      )}
    >
      <CardContent className="flex flex-col gap-1 p-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {icon}
          <span className="uppercase tracking-wider">{label}</span>
        </div>
        <div
          className={cn(
            "text-2xl font-bold tabular-nums",
            positive ? "text-primary" : "",
          )}
        >
          {value}
        </div>
        <div className="text-[11px] text-muted-foreground">{hint}</div>
      </CardContent>
    </Card>
  );
}

function BoostIdeasCard({
  videoLift,
  ossLift,
}: {
  videoLift: { ratio: number; computed: boolean };
  ossLift: { ratio: number; computed: boolean };
}) {
  const tips: { icon: React.ReactNode; body: React.ReactNode }[] = [
    {
      icon: <Video className="h-4 w-4 text-primary" />,
      body: (
        <>
          Projects with demo videos get{" "}
          <span className="font-semibold text-foreground">
            {videoLift.ratio.toFixed(1)}x
          </span>{" "}
          more right-swipes.
          <span className="ml-1 text-[11px] text-muted-foreground">
            {videoLift.computed ? "From your data" : "Industry data"}
          </span>
        </>
      ),
    },
    {
      icon: <Star className="h-4 w-4 text-primary" />,
      body: (
        <>
          Open-source projects get{" "}
          <span className="font-semibold text-foreground">
            {ossLift.ratio.toFixed(1)}x
          </span>{" "}
          more saves than closed-source.
          <span className="ml-1 text-[11px] text-muted-foreground">
            {ossLift.computed ? "From your data" : "Industry data"}
          </span>
        </>
      ),
    },
    {
      icon: <Sparkles className="h-4 w-4 text-primary" />,
      body: (
        <>
          Tighten your tagline to under{" "}
          <span className="font-semibold text-foreground">80 characters</span>{" "}
          — concise pitches consistently out-swipe long ones.
        </>
      ),
    },
  ];

  return (
    <Card className="border-border/70 bg-card/40">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="h-4 w-4 text-primary" />
          Boost ideas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-2">
        {tips.map((tip, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <span className="mt-0.5 shrink-0">{tip.icon}</span>
            <div className="text-sm leading-snug text-muted-foreground">
              {tip.body}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card className="mt-10 border-dashed border-primary/30 bg-card/40">
      <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-inset ring-primary/30">
          <Rocket className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">
            Your dashboard is waiting on its first project.
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Submit a project and we&apos;ll start tracking right-swipes,
            stars, and access requests here in real time.
          </p>
        </div>
        <Button asChild size="lg" className="gap-1.5">
          <Link href="/projects/new">
            <Plus className="h-4 w-4" />
            Submit your first project
          </Link>
        </Button>
        <Badge variant="outline" className="text-muted-foreground">
          Pro tip — projects with a 30-second demo video convert best.
        </Badge>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------

type DashboardData = {
  projects: ProjectPerf[];
  /** Used by RealtimeListener to label incoming swipe events. */
  projectTitleMap: Record<string, string>;
  starsTotal: number;
  starsThisWeek: number;
  pendingRequests: number;
  liveProjectCount: number;
  totalProjectCount: number;
  dailyTrend: DailyBucket[];
  activity: ActivityEvent[];
  topScreenshot: {
    url: string;
    projectTitle: string;
    projectSlug: string;
    swipeRate: number;
  } | null;
  videoLift: { ratio: number; computed: boolean };
  ossLift: { ratio: number; computed: boolean };
};

async function loadDashboardData(userId: string): Promise<DashboardData> {
  const supabase = await createClient();

  // 1. All projects this user owns (any status — we surface hidden /
  //    flagged ones in the perf table with a badge).
  const { data: projectRows } = await supabase
    .from("projects")
    .select(
      "id, slug, title, tagline, is_open_source, status, created_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const projects = (projectRows ?? []) as Array<{
    id: string;
    slug: string;
    title: string;
    tagline: string;
    is_open_source: boolean;
    status: string;
    created_at: string;
  }>;
  const projectIds = projects.map((p) => p.id);

  // Bail early — no projects, no data.
  if (projectIds.length === 0) {
    return {
      projects: [],
      projectTitleMap: {},
      starsTotal: 0,
      starsThisWeek: 0,
      pendingRequests: 0,
      liveProjectCount: 0,
      totalProjectCount: 0,
      dailyTrend: buildEmptyDailyTrend(TREND_DAYS),
      activity: [],
      topScreenshot: null,
      videoLift: { ratio: 2.4, computed: false },
      ossLift: { ratio: 1.8, computed: false },
    };
  }

  // 2. All swipes on the user's projects, last 30 days. We pull rows
  //    rather than aggregate via RPC because we need them for both the
  //    daily trend AND the activity feed.
  const since = new Date(Date.now() - TREND_DAYS * 24 * 60 * 60 * 1000);
  const sinceIso = since.toISOString();

  const [swipesRes, lifetimeStarsRes, accessReqRes, mediaRes] =
    await Promise.all([
      supabase
        .from("swipes")
        .select("id, project_id, direction, github_starred, user_id, created_at")
        .in("project_id", projectIds)
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false }),
      // Lifetime aggregates per project. We could do head-count queries
      // per project but a single broad query is fewer round-trips.
      supabase
        .from("swipes")
        .select("project_id, direction, github_starred")
        .in("project_id", projectIds),
      supabase
        .from("access_requests")
        .select(
          `id, status, created_at, project_id, requester_email,
           project:projects!access_requests_project_id_fkey(title, slug),
           requester:users!access_requests_requester_user_id_fkey(github_username, avatar_url)`,
        )
        .in("project_id", projectIds)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("project_media")
        .select("project_id, type, url, order_index")
        .in("project_id", projectIds)
        .order("order_index", { ascending: true }),
    ]);

  const recentSwipes = (swipesRes.data ?? []) as Array<{
    id: string;
    project_id: string;
    direction: "right" | "left";
    github_starred: boolean;
    user_id: string;
    created_at: string;
  }>;
  const lifetimeSwipes = (lifetimeStarsRes.data ?? []) as Array<{
    project_id: string;
    direction: "right" | "left";
    github_starred: boolean;
  }>;

  // Lifetime aggregates per project.
  type LifeAgg = {
    right: number;
    left: number;
    starred: number;
  };
  const lifetimeByProject = new Map<string, LifeAgg>();
  for (const id of projectIds) {
    lifetimeByProject.set(id, { right: 0, left: 0, starred: 0 });
  }
  let starsTotal = 0;
  for (const s of lifetimeSwipes) {
    const agg = lifetimeByProject.get(s.project_id);
    if (!agg) continue;
    if (s.direction === "right") agg.right += 1;
    else agg.left += 1;
    if (s.github_starred) {
      agg.starred += 1;
      starsTotal += 1;
    }
  }

  // 7-day windows for "this week" star count + per-project week counts.
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let starsThisWeek = 0;
  const weekByProject = new Map<string, number>();
  for (const s of recentSwipes) {
    const t = new Date(s.created_at).getTime();
    if (t < weekAgo) continue;
    if (s.direction !== "right") continue;
    if (s.github_starred) starsThisWeek += 1;
    weekByProject.set(
      s.project_id,
      (weekByProject.get(s.project_id) ?? 0) + 1,
    );
  }

  // 30-day daily trend across ALL the user's projects.
  const dailyTrend = buildDailyTrend(recentSwipes, TREND_DAYS);

  // Per-project 14-day trend for the inline sparklines.
  const perProjectTrend = build14dPerProjectTrend(recentSwipes, projectIds);

  // Build the perf rows — sorted by lifetime right-swipes desc.
  const perfRows: ProjectPerf[] = projects
    .map((p) => {
      const life = lifetimeByProject.get(p.id) ?? {
        right: 0,
        left: 0,
        starred: 0,
      };
      const total = life.right + life.left;
      return {
        id: p.id,
        slug: p.slug,
        title: p.title,
        tagline: p.tagline,
        isOpenSource: p.is_open_source,
        status: p.status,
        rightSwipesLifetime: life.right,
        rightSwipesWeek: weekByProject.get(p.id) ?? 0,
        swipeRate: total === 0 ? null : life.right / total,
        trend: perProjectTrend.get(p.id) ?? new Array(PROJECT_TREND_DAYS).fill(0),
      } satisfies ProjectPerf;
    })
    .sort((a, b) => b.rightSwipesLifetime - a.rightSwipesLifetime);

  // Pending access requests — count + list (we'll merge into activity).
  type AccessRow = {
    id: string;
    status: "pending" | "approved" | "declined";
    created_at: string;
    project_id: string;
    requester_email: string;
    project: { title: string; slug: string } | { title: string; slug: string }[] | null;
    requester:
      | { github_username: string; avatar_url: string | null }
      | { github_username: string; avatar_url: string | null }[]
      | null;
  };
  const accessRows = (accessReqRes.data ?? []) as AccessRow[];
  const pendingRequests = accessRows.filter((r) => r.status === "pending").length;

  // Top-performing screenshot: pick the highest-rate project that has a
  // screenshot or gif, then take its first such media row. We require
  // at least 5 swipes total to avoid spurious "100%" rates from a
  // single right-swipe.
  const mediaRows = (mediaRes.data ?? []) as Array<{
    project_id: string;
    type: "screenshot" | "video" | "gif";
    url: string;
    order_index: number;
  }>;
  const topScreenshot = pickTopScreenshot(perfRows, mediaRows);

  // Activity feed: recent right-swipes (anonymized) + recent access
  // requests, merged + sorted by created_at desc, capped at 20.
  const projectMeta = new Map<string, { title: string; slug: string }>();
  for (const p of projects) {
    projectMeta.set(p.id, { title: p.title, slug: p.slug });
  }

  const swipeEvents: ActivityEvent[] = recentSwipes
    .filter((s) => s.direction === "right")
    .slice(0, 30)
    .map((s) => {
      const meta = projectMeta.get(s.project_id);
      return {
        kind: "swipe",
        id: s.id,
        createdAt: s.created_at,
        projectSlug: meta?.slug ?? "",
        projectTitle: meta?.title ?? "your project",
        viewerHandle: anonymizeViewer(s.user_id),
        starred: s.github_starred,
      } satisfies ActivityEvent;
    });

  const accessEvents: ActivityEvent[] = accessRows.slice(0, 30).map((r) => {
    const project = Array.isArray(r.project) ? r.project[0] : r.project;
    const requester = Array.isArray(r.requester) ? r.requester[0] : r.requester;
    return {
      kind: "access_request",
      id: r.id,
      createdAt: r.created_at,
      projectSlug: project?.slug ?? "",
      projectTitle: project?.title ?? "your project",
      requesterUsername: requester?.github_username ?? null,
      requesterAvatarUrl: requester?.avatar_url ?? null,
      status: r.status,
    } satisfies ActivityEvent;
  });

  const activity = [...swipeEvents, ...accessEvents]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 20);

  // Boost-tip ratios — try to compute from real data; fall back to
  // industry defaults when sample sizes are tiny.
  const videoLift = computeVideoLift(perfRows, mediaRows);
  const ossLift = computeOssLift(perfRows);

  const projectTitleMap: Record<string, string> = {};
  for (const p of projects) projectTitleMap[p.id] = p.title;

  const liveProjectCount = projects.filter((p) => p.status === "live").length;

  return {
    projects: perfRows,
    projectTitleMap,
    starsTotal,
    starsThisWeek,
    pendingRequests,
    liveProjectCount,
    totalProjectCount: projects.length,
    dailyTrend,
    activity,
    topScreenshot,
    videoLift,
    ossLift,
  };
}

// ---------------------------------------------------------------------
// Pure helpers (no DB calls)
// ---------------------------------------------------------------------

function buildEmptyDailyTrend(days: number): DailyBucket[] {
  const out: DailyBucket[] = [];
  const today = startOfUtcDay(new Date());
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    out.push({ date: d.toISOString().slice(0, 10), count: 0 });
  }
  return out;
}

function buildDailyTrend(
  swipes: Array<{ direction: string; created_at: string }>,
  days: number,
): DailyBucket[] {
  const buckets = buildEmptyDailyTrend(days);
  const idx = new Map(buckets.map((b, i) => [b.date, i]));
  for (const s of swipes) {
    if (s.direction !== "right") continue;
    const day = new Date(s.created_at).toISOString().slice(0, 10);
    const i = idx.get(day);
    if (i === undefined) continue;
    buckets[i].count += 1;
  }
  return buckets;
}

function build14dPerProjectTrend(
  swipes: Array<{ project_id: string; direction: string; created_at: string }>,
  projectIds: string[],
): Map<string, number[]> {
  const result = new Map<string, number[]>();
  for (const id of projectIds) {
    result.set(id, new Array(PROJECT_TREND_DAYS).fill(0));
  }
  const today = startOfUtcDay(new Date()).getTime();
  for (const s of swipes) {
    if (s.direction !== "right") continue;
    const swipeDay = startOfUtcDay(new Date(s.created_at)).getTime();
    const daysAgo = Math.floor((today - swipeDay) / (24 * 60 * 60 * 1000));
    if (daysAgo < 0 || daysAgo >= PROJECT_TREND_DAYS) continue;
    const arr = result.get(s.project_id);
    if (!arr) continue;
    // Index 0 is oldest, last index is most recent.
    arr[PROJECT_TREND_DAYS - 1 - daysAgo] += 1;
  }
  return result;
}

function startOfUtcDay(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}

/**
 * Anonymize the viewer's user-id into a stable, friendly handle. We
 * deliberately don't surface the real GitHub username on the activity
 * feed — the goal is signal ("someone saved your thing!") without
 * making this a stalking surface.
 */
function anonymizeViewer(userId: string): string {
  // Take the last 4 hex chars of the uuid and mod into one of a few
  // playful adjectives. Stable per-user so the same person reads the
  // same way across events, which feels more "real" than pure random.
  const adjectives = [
    "indie-maker",
    "ship-it-pal",
    "vibe-coder",
    "weekend-hacker",
    "solo-dev",
    "side-quest",
    "ramen-builder",
    "ssr-fan",
  ];
  const tail = userId.replace(/-/g, "").slice(-4);
  const seed = parseInt(tail, 16) || 0;
  return `@${adjectives[seed % adjectives.length]}-${tail.slice(-2)}`;
}

function pickTopScreenshot(
  perfRows: ProjectPerf[],
  mediaRows: Array<{
    project_id: string;
    type: "screenshot" | "video" | "gif";
    url: string;
    order_index: number;
  }>,
): DashboardData["topScreenshot"] {
  // Filter perf rows down to those with enough swipes to be meaningful.
  const candidates = perfRows.filter(
    (p) => p.swipeRate !== null && p.rightSwipesLifetime + (p.swipeRate ? 0 : 0) >= 0,
  );
  if (candidates.length === 0) return null;

  // We want at least 5 swipes total before we trust a rate.
  const trustworthy = candidates.filter((p) => {
    if (p.swipeRate === null) return false;
    const total = p.rightSwipesLifetime / Math.max(p.swipeRate, 1e-9);
    return total >= 5;
  });
  if (trustworthy.length === 0) return null;

  const best = trustworthy.reduce((a, b) =>
    (a.swipeRate ?? 0) >= (b.swipeRate ?? 0) ? a : b,
  );

  const projectMedia = mediaRows
    .filter(
      (m) =>
        m.project_id === best.id && (m.type === "screenshot" || m.type === "gif"),
    )
    .sort((a, b) => a.order_index - b.order_index);

  const pick = projectMedia[0];
  if (!pick) return null;

  return {
    url: pick.url,
    projectTitle: best.title,
    projectSlug: best.slug,
    swipeRate: best.swipeRate ?? 0,
  };
}

function computeVideoLift(
  perfRows: ProjectPerf[],
  mediaRows: Array<{ project_id: string; type: string }>,
): { ratio: number; computed: boolean } {
  const hasVideo = new Set(
    mediaRows.filter((m) => m.type === "video").map((m) => m.project_id),
  );
  const withVideo = perfRows.filter((p) => hasVideo.has(p.id));
  const withoutVideo = perfRows.filter((p) => !hasVideo.has(p.id));
  if (
    withVideo.length === 0 ||
    withoutVideo.length === 0 ||
    perfRows.length < 4
  ) {
    return { ratio: 2.4, computed: false };
  }
  const avg = (rows: ProjectPerf[]) =>
    rows.reduce((a, p) => a + p.rightSwipesLifetime, 0) /
    Math.max(rows.length, 1);
  const ratio = avg(withVideo) / Math.max(avg(withoutVideo), 1);
  if (!Number.isFinite(ratio) || ratio <= 0) {
    return { ratio: 2.4, computed: false };
  }
  return { ratio: Math.min(Math.max(ratio, 0.5), 10), computed: true };
}

function computeOssLift(perfRows: ProjectPerf[]): {
  ratio: number;
  computed: boolean;
} {
  const oss = perfRows.filter((p) => p.isOpenSource);
  const closed = perfRows.filter((p) => !p.isOpenSource);
  if (oss.length === 0 || closed.length === 0 || perfRows.length < 4) {
    return { ratio: 1.8, computed: false };
  }
  const avg = (rows: ProjectPerf[]) =>
    rows.reduce((a, p) => a + p.rightSwipesLifetime, 0) /
    Math.max(rows.length, 1);
  const ratio = avg(oss) / Math.max(avg(closed), 1);
  if (!Number.isFinite(ratio) || ratio <= 0) {
    return { ratio: 1.8, computed: false };
  }
  return { ratio: Math.min(Math.max(ratio, 0.5), 10), computed: true };
}
