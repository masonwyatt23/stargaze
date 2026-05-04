import Link from "next/link";
import { ArrowRight, Layers, Shuffle, Sparkles, Star, Trophy } from "lucide-react";
import { GithubIcon } from "@/components/icons/github-icon";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { BuilderWall } from "@/components/landing/builder-wall";
import { FeaturedRail } from "@/components/landing/featured-rail";
import { HeroDemo } from "@/components/landing/hero-demo";
import { LeaderboardSpotlight } from "@/components/landing/leaderboard-spotlight";
import { LiveStats } from "@/components/landing/live-stats";
import { LiveTicker } from "@/components/landing/live-ticker";
import { MagazineGrid } from "@/components/landing/magazine-grid";
import { MakerStrip } from "@/components/landing/maker-strip";
import { ObservatoryCta } from "@/components/landing/observatory-cta";
import { SectionFrame } from "@/components/landing/section-frame";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------------ */
/* Data                                                                     */
/* ------------------------------------------------------------------------ */

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

type LeaderRow = {
  user_id: string;
  github_username: string;
  display_name: string | null;
  avatar_url: string | null;
  right_swipes_week: number;
};

async function getFeatured(): Promise<FeaturedProject[]> {
  try {
    const supabase = await createClient();
    // Pull a wide window then shuffle in-memory — gives every live project a
    // fair shot at the hero each time, instead of always showing the 6 newest.
    // Page is `dynamic = "force-dynamic"` so each request re-shuffles.
    const { data } = await supabase
      .from("projects")
      .select(
        `id, slug, title, tagline, github_language, github_stars,
         is_open_source, created_at, category,
         user:users!projects_user_id_fkey(github_username, display_name, avatar_url),
         media:project_media(url, type, order_index)`,
      )
      .eq("status", "live")
      .limit(200);
    const all = (data ?? []) as unknown as FeaturedProject[];
    // Fisher-Yates shuffle, then take 6
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    return all.slice(0, 6);
  } catch {
    return [];
  }
}

async function getLeaders(): Promise<LeaderRow[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("leaderboard_weekly_public")
      .select(
        "user_id, github_username, display_name, avatar_url, right_swipes_week",
      )
      .order("right_swipes_week", { ascending: false })
      .limit(5);
    return (data ?? []) as LeaderRow[];
  } catch {
    return [];
  }
}

/**
 * Top 5 projects by right-swipes received in the last 7 days. Drives the
 * landing's "Trending this week" rail — gives the page a recurring "what's
 * hot right now" hook that changes every visit.
 *
 * Done in two queries (recent swipes → aggregate → fetch project rows) to
 * keep things in PostgREST without a custom RPC.
 */
async function getTrending(): Promise<FeaturedProject[]> {
  try {
    const supabase = await createClient();
    const since = new Date(
      Date.now() - 7 * 24 * 3600 * 1000,
    ).toISOString();
    const { data: swipes } = await supabase
      .from("swipes")
      .select("project_id")
      .eq("direction", "right")
      .gte("created_at", since);
    if (!swipes || swipes.length === 0) return [];

    const counts = new Map<string, number>();
    for (const s of swipes as Array<{ project_id: string }>) {
      counts.set(s.project_id, (counts.get(s.project_id) ?? 0) + 1);
    }
    const topIds = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id]) => id);
    if (topIds.length === 0) return [];

    const { data: projects } = await supabase
      .from("projects")
      .select(
        `id, slug, title, tagline, github_language, github_stars,
         is_open_source, created_at, category,
         user:users!projects_user_id_fkey(github_username, display_name, avatar_url),
         media:project_media(url, type, order_index)`,
      )
      .in("id", topIds)
      .eq("status", "live");
    const rows = (projects ?? []) as unknown as FeaturedProject[];
    // Re-order to match topIds (the query above doesn't preserve order).
    const byId = new Map(rows.map((r) => [r.id, r]));
    return topIds
      .map((id) => byId.get(id))
      .filter((p): p is FeaturedProject => Boolean(p));
  } catch {
    return [];
  }
}

async function getStats() {
  try {
    const supabase = await createClient();
    const [
      { count: liveProjects },
      { count: makers },
      { count: starsAllTime },
      { count: starsThisWeek },
    ] = await Promise.all([
      supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .eq("status", "live"),
      supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .neq("github_id", 0),
      supabase
        .from("swipes")
        .select("*", { count: "exact", head: true })
        .eq("direction", "right"),
      supabase
        .from("swipes")
        .select("*", { count: "exact", head: true })
        .eq("direction", "right")
        .gte(
          "created_at",
          new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
        ),
    ]);
    return {
      liveProjects: liveProjects ?? 0,
      makers: makers ?? 0,
      starsAllTime: starsAllTime ?? 0,
      starsThisWeek: starsThisWeek ?? 0,
    };
  } catch {
    return { liveProjects: 0, makers: 0, starsAllTime: 0, starsThisWeek: 0 };
  }
}

/* ------------------------------------------------------------------------ */
/* Page                                                                     */
/* ------------------------------------------------------------------------ */

export default async function LandingPage() {
  const [featured, trending, leaders, stats, currentUser] = await Promise.all([
    getFeatured(),
    getTrending(),
    getLeaders(),
    getStats(),
    getCurrentUser(),
  ]);

  return (
    <>
      <Nav />
      <LiveTicker />
      <main className="flex-1">
        <Hero featured={featured} stats={stats} />
        <Bulletin
          stats={stats}
          featured={featured}
          trending={trending}
          leaders={leaders}
          currentUser={currentUser}
        />
      </main>
      <ObservatoryCta />
      <Footer />
    </>
  );
}

/* ------------------------------------------------------------------------ */
/* Hero — Product Hunt-inspired: featured list is the centerpiece           */
/* ------------------------------------------------------------------------ */

function Hero({
  featured,
  stats,
}: {
  featured: FeaturedProject[];
  stats: { liveProjects: number };
}) {
  return (
    <section className="relative isolate overflow-hidden">
      {/* Atmosphere */}
      <div aria-hidden className="absolute inset-0 starfield opacity-70" />
      <div
        aria-hidden
        className="absolute inset-0 [background:radial-gradient(ellipse_900px_600px_at_80%_30%,hsl(47_96%_58%/0.16),transparent_70%)]"
      />
      <div
        aria-hidden
        className="absolute inset-0 [background:radial-gradient(ellipse_700px_400px_at_15%_85%,hsl(160_84%_50%/0.06),transparent_60%)]"
      />

      <div className="relative mx-auto max-w-7xl px-4 pt-5 sm:px-6 sm:pt-8 md:pt-12">
        {/* WARM HEADER PILL — replaces the cold OBSERVATORY DECK coordinates */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Live · {stats.liveProjects} projects today
          </span>
          <span className="hidden text-xs text-muted-foreground/60 sm:inline">
            updated continuously
          </span>
        </div>

        {/* HERO ROW — balanced 50/50 on desktop. On mobile we flip the
            order: demo first (visual hook), then title + CTAs below. */}
        <div className="mt-6 grid items-center gap-8 md:mt-10 md:grid-cols-[1fr_1fr] md:gap-x-14 md:gap-y-10 lg:gap-x-20">
          {/* LEFT — title + tagline + CTAs (md:order-1, mobile second) */}
          <div className="order-2 md:order-1">
            <h1
              className="
                editorial-display text-foreground
                text-[clamp(2.25rem,7vw,4.5rem)]
                md:text-[clamp(2.5rem,5vw,4rem)]
              "
            >
              Indie projects
              <br />
              <span className="bg-gradient-to-br from-primary via-primary to-amber-300 bg-clip-text text-transparent">
                worth a star.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
              A swipe-deck for builders.{" "}
              <span className="text-foreground">Right-swipe to save</span> — and{" "}
              <span className="rounded bg-primary/15 px-1.5 py-0.5 font-medium text-primary ring-1 ring-primary/30">
                auto-star the repo on GitHub.
              </span>{" "}
              Picked by humans, starred by you.
            </p>

            <div className="mt-8 flex flex-col flex-wrap gap-3 sm:flex-row sm:items-center">
              <Button
                asChild
                size="xl"
                className="gap-2 shadow-[0_0_40px_-10px_hsl(47_96%_58%/0.7)]"
              >
                <Link href="/sign-in">
                  <GithubIcon className="h-5 w-5" />
                  Continue with GitHub
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="xl" variant="ghost" className="gap-2">
                <Link href="/try">
                  <Layers className="h-5 w-5" />
                  Try the deck
                </Link>
              </Button>
              <Button
                asChild
                size="xl"
                variant="ghost"
                className="gap-2 text-primary hover:text-primary"
              >
                <a href="/api/random">
                  <Shuffle className="h-5 w-5" />
                  Surprise me
                </a>
              </Button>
            </div>

            {/* Signal row */}
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground/85">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-primary" />
                Free · open source friendly
              </span>
              <span className="text-primary/40">·</span>
              <span>No waitlist</span>
              <span className="text-primary/40">·</span>
              <span>Sign in, swipe, done</span>
            </div>
          </div>

          {/* RIGHT — animated swipe deck (the centerpiece). On mobile we
              promote it to the top of the hero so the visual hook lands
              before any copy. */}
          <div className="relative order-1 md:order-2">
            {/* Soft halo */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10 blur-3xl"
              style={{
                background:
                  "radial-gradient(circle at center, hsl(47 96% 58% / 0.25) 0%, transparent 70%)",
              }}
            />
            <div className="relative mx-auto w-full max-w-[320px] sm:max-w-[380px] md:mx-0 md:ml-auto md:max-w-[420px]">
              <HeroDemo
                projects={featured.map((p) => ({
                  id: p.id,
                  slug: p.slug,
                  title: p.title,
                  tagline: p.tagline,
                  github_language: p.github_language,
                  github_stars: p.github_stars,
                  is_open_source: p.is_open_source,
                  user: p.user
                    ? {
                        github_username: p.user.github_username,
                        avatar_url: p.user.avatar_url,
                      }
                    : null,
                  cover_url:
                    p.media
                      ?.slice()
                      .sort((a, b) => a.order_index - b.order_index)
                      .find((m) => m.type === "screenshot")?.url ?? null,
                }))}
              />
            </div>

            {/* Hover-pause hint — desktop only; on mobile the looping demo
                is self-evident and the line is just clutter. */}
            <div className="mt-12 hidden items-center justify-center gap-2 text-[11px] text-muted-foreground/70 md:flex md:justify-start md:pl-2">
              <span className="inline-block h-1 w-6 bg-primary/50" />
              <span>3 real projects, looping. Hover to pause.</span>
            </div>
          </div>
        </div>

        {/* HORIZONTAL FEATURED RAIL — replaces the vertical numbered list */}
        <div className="mt-16 md:mt-24">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-primary">
                <Star className="h-3 w-3 fill-primary" strokeWidth={0} />
                Today on deck
              </div>
              <h2 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
                Hand-picked.{" "}
                <span className="text-muted-foreground">Worth a swipe.</span>
              </h2>
            </div>
            <Link
              href="/feed"
              className="group inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              See the full deck
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <FeaturedRail projects={featured} />
        </div>
      </div>

      <div className="relative mx-auto mt-20 max-w-7xl px-6">
        <div className="border-t hairline" />
      </div>
    </section>
  );
}

function Sep() {
  return <span className="text-primary/40">/</span>;
}

/* ------------------------------------------------------------------------ */
/* Bulletin                                                                 */
/* ------------------------------------------------------------------------ */

function Bulletin({
  stats,
  featured,
  trending,
  leaders,
  currentUser,
}: {
  stats: {
    liveProjects: number;
    makers: number;
    starsAllTime: number;
    starsThisWeek: number;
  };
  featured: FeaturedProject[];
  trending: FeaturedProject[];
  leaders: LeaderRow[];
  currentUser: {
    github_username: string;
    avatar_url: string | null;
  } | null;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <section className="py-10 md:py-20">
        <SectionFrame
          index={2}
          caption="Live signal · platform readout"
          meta="updated continuously"
        />
        <div className="mt-6">
          <LiveStats
            stats={[
              {
                label: "live projects",
                value: stats.liveProjects,
                hint: "currently on the deck",
              },
              {
                label: "makers shipping",
                value: stats.makers,
                hint: "real human accounts",
              },
              {
                label: "stars delivered",
                value: stats.starsAllTime,
                hint: "lifetime, all repos",
                glow: true,
              },
              {
                label: "stars this week",
                value: stats.starsThisWeek,
                hint: "rolling 7-day window",
                glow: true,
              },
            ]}
          />
        </div>
      </section>

      <section id="mechanic" className="scroll-mt-24 py-10 md:py-20">
        <SectionFrame
          index={3}
          caption="The mechanic · how a swipe becomes a star"
        />
        <Mechanic />
      </section>

      <section className="py-10 md:py-20">
        <div className="mb-6 flex items-end justify-between gap-6">
          <SectionFrame
            index={4}
            caption="Today on deck · featured projects"
            className="flex-1"
          />
          <Link
            href="/feed"
            className="hidden items-center gap-1 font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:underline md:inline-flex"
          >
            Open the deck
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <h2 className="mb-10 max-w-3xl editorial-display text-4xl text-foreground md:text-6xl">
          Six new builds.
          <br />
          <span className="text-muted-foreground">All worth a swipe.</span>
        </h2>
        <MagazineGrid projects={featured} />
      </section>

      {trending.length > 0 ? (
        <section className="py-10 md:py-20">
          <SectionFrame
            index={5}
            caption="Trending this week · last 7 days of right-swipes"
            meta={`${trending.length} hot${trending.length === 1 ? "" : "s"}`}
          />
          <div className="mb-10 mt-4 flex flex-wrap items-baseline justify-between gap-4">
            <h2 className="editorial-display text-4xl text-foreground md:text-6xl">
              What&apos;s hot{" "}
              <span className="text-primary">right now.</span>
            </h2>
            <Link
              href="/feed?sort=trending"
              className="group inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              See more on the deck
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <FeaturedRail projects={trending} />
        </section>
      ) : null}

      <section className="py-10 md:py-20">
        <SectionFrame
          index={trending.length > 0 ? 6 : 5}
          caption="This week's constellation · leaderboard"
          meta="resets monday 00:00 UTC"
        />
        <div className="mb-10 mt-4 flex items-baseline gap-4">
          <h2 className="editorial-display text-4xl text-foreground md:text-6xl">
            Makers earn the spotlight.
          </h2>
          <Trophy
            aria-hidden
            className="hidden h-7 w-7 text-primary md:block"
          />
        </div>
        <LeaderboardSpotlight leaders={leaders} />
      </section>

      <section className="py-10 md:py-20">
        <SectionFrame
          index={6}
          caption="For makers · submit your project"
        />
        <div className="mt-6">
          <MakerStrip stats={stats} currentUser={currentUser} />
        </div>
      </section>

      <section className="py-10 pb-20 md:py-20 md:pb-32">
        <SectionFrame
          index={7}
          caption="From the field · what makers say"
        />
        <h2 className="mb-14 mt-4 max-w-3xl editorial-display text-4xl text-foreground md:text-6xl">
          Stars that{" "}
          <span className="bg-gradient-to-br from-primary via-primary to-amber-300 bg-clip-text text-transparent">
            mean something.
          </span>
        </h2>
        <BuilderWall />
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Mechanic — 3 editorial columns                                          */
/* ------------------------------------------------------------------------ */

function Mechanic() {
  const steps: Array<{
    n: string;
    keyword: string;
    headline: string;
    body: string;
    icon: React.ReactNode;
  }> = [
    {
      n: "01",
      keyword: "Browse",
      headline: "A deck of indie work, hand-picked.",
      body:
        "TikTok-style stack. One card at a time. Hero media auto-plays on top, screenshots cross-fade. Tap to read the full pitch.",
      icon: <Layers className="h-4 w-4" />,
    },
    {
      n: "02",
      keyword: "Swipe",
      headline: "Right saves it. Left moves on.",
      body:
        "Drag, click the buttons, or use ← / → / s / x on a keyboard. A burst confirms the action. The card you just swiped never reappears.",
      icon: (
        <Star className="h-4 w-4 fill-primary text-primary" strokeWidth={0} />
      ),
    },
    {
      n: "03",
      keyword: "Star",
      headline: "We star the repo on your GitHub.",
      body:
        "Open-source projects get a real GitHub star from your account, instantly. Closed-source flips to a one-tap access request to the maker.",
      icon: <Trophy className="h-4 w-4" />,
    },
  ];

  return (
    <div className="relative mt-4 grid grid-cols-1 gap-12 border-y hairline-strong py-12 md:grid-cols-3 md:gap-0 md:py-16">
      {steps.map((s, i) => (
        <div key={s.n} className="relative flex flex-col gap-5 px-0 md:px-8">
          {i > 0 ? (
            <span
              aria-hidden
              className="absolute -left-px top-2 hidden h-[calc(100%-1rem)] w-px bg-foreground/10 md:block"
            />
          ) : null}

          <div className="flex items-baseline justify-between">
            <span className="stat-numeral text-7xl text-primary md:text-8xl">
              {s.n}
            </span>
            <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/80">
              {s.icon}
              {s.keyword}
            </span>
          </div>

          <h3 className="text-xl font-semibold leading-snug tracking-tight text-foreground md:text-2xl">
            {s.headline}
          </h3>

          <p className="text-sm leading-relaxed text-muted-foreground">
            {s.body}
          </p>
        </div>
      ))}
    </div>
  );
}

