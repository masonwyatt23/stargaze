import Link from "next/link";
import { ArrowRight, Layers, Shuffle, Star, Trophy } from "lucide-react";
import { GithubIcon } from "@/components/icons/github-icon";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { BuilderWall } from "@/components/landing/builder-wall";
import { CoordinateMark } from "@/components/landing/coordinate-mark";
import { FeaturedList } from "@/components/landing/featured-list";
import { HeroDemo } from "@/components/landing/hero-demo";
import { LeaderboardSpotlight } from "@/components/landing/leaderboard-spotlight";
import { LiveStats } from "@/components/landing/live-stats";
import { LiveTicker } from "@/components/landing/live-ticker";
import { MagazineGrid } from "@/components/landing/magazine-grid";
import { MakerStrip } from "@/components/landing/maker-strip";
import { ObservatoryCta } from "@/components/landing/observatory-cta";
import { SectionFrame } from "@/components/landing/section-frame";
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
  const [featured, leaders, stats] = await Promise.all([
    getFeatured(),
    getLeaders(),
    getStats(),
  ]);

  return (
    <>
      <Nav />
      <LiveTicker />
      <main className="flex-1">
        <Hero featured={featured} stats={stats} />
        <Bulletin stats={stats} featured={featured} leaders={leaders} />
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
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <section className="relative isolate overflow-hidden">
      {/* Atmosphere — starfield + radial glow + faint grid */}
      <div aria-hidden className="absolute inset-0 starfield opacity-80" />
      <div
        aria-hidden
        className="absolute inset-0 [background:radial-gradient(ellipse_900px_500px_at_80%_25%,hsl(47_96%_58%/0.12),transparent_70%)]"
      />
      <div
        aria-hidden
        className="absolute inset-0 observatory-grid opacity-[0.14] [mask-image:radial-gradient(ellipse_at_50%_30%,black_0%,transparent_75%)]"
      />

      <div className="relative mx-auto max-w-7xl px-6 pt-10 md:pt-14">
        {/* TOP — coordinate strip */}
        <div className="flex items-center gap-3">
          <CoordinateMark label="★" value="Stargaze · Today on deck" />
          <span className="hidden h-px flex-1 bg-foreground/10 md:block" />
          <CoordinateMark
            value={`${today.toUpperCase()} · ${String(stats.liveProjects).padStart(2, "0")} live`}
            className="hidden md:flex"
          />
        </div>

        {/* TITLE BLOCK — restrained, focused */}
        <div className="mt-12 grid gap-10 md:mt-16 md:grid-cols-[1.4fr_1fr] md:items-end md:gap-x-16">
          <div>
            <h1
              className="
                editorial-display text-foreground
                text-[clamp(2.75rem,8vw,6rem)]
                md:text-[clamp(3rem,6vw,5.5rem)]
              "
            >
              Today&apos;s top
              <br />
              <span className="bg-gradient-to-br from-primary via-primary to-amber-300 bg-clip-text text-transparent">
                indie builds.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
              <span className="text-foreground">A swipe-deck for builders.</span>{" "}
              Right-swipe to save — and{" "}
              <span className="rounded bg-primary/15 px-1.5 py-0.5 font-medium text-primary ring-1 ring-primary/30">
                auto-star the repo on GitHub.
              </span>
            </p>
          </div>

          {/* CTA + signal column */}
          <div className="flex flex-col items-start gap-4 md:items-end md:text-right">
            <div className="flex flex-col gap-3 sm:flex-row md:flex-row md:items-center">
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
                <Link href="/feed">
                  <Layers className="h-5 w-5" />
                  Peek the deck
                </Link>
              </Button>
              <Button
                asChild
                size="xl"
                variant="ghost"
                className="gap-2 text-primary hover:text-primary"
              >
                {/* `/api/random` 302s to a random live project. Plain anchor
                    is fine — the browser follows the redirect end-to-end. */}
                <a href="/api/random">
                  <Shuffle className="h-5 w-5" />
                  Surprise me
                </a>
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
              <span className="flex items-center gap-1.5">
                <span className="relative inline-flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                Live signal
              </span>
              <Sep />
              <span>No waitlist</span>
            </div>
          </div>
        </div>

        {/* THE FEED + THE MECHANIC ASIDE */}
        <div className="mt-14 grid gap-10 md:mt-20 md:grid-cols-[1.6fr_1fr] md:gap-x-12">
          {/* LEFT — featured list */}
          <div className="min-w-0">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
                  ★ Today on deck
                </span>
                <span className="hidden h-px w-12 bg-foreground/10 sm:block" />
                <span className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70 sm:inline">
                  hand-picked · § 01
                </span>
              </div>
              <Link
                href="/feed"
                className="hidden items-center gap-1 font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:underline md:inline-flex"
              >
                See all
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <FeaturedList projects={featured} />

            {/* Mobile "see all" */}
            <div className="mt-5 md:hidden">
              <Link
                href="/feed"
                className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:underline"
              >
                See all on the deck
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* RIGHT — the mechanic aside */}
          <aside className="relative md:pl-2">
            <div className="md:sticky md:top-32">
              <div className="mb-5 flex items-center gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
                  ★ The mechanic
                </span>
                <span className="hidden h-px flex-1 bg-foreground/10 sm:block" />
              </div>

              {/* Plate with frame corners */}
              <div className="relative">
                <div
                  aria-hidden
                  className="frame-corner absolute -inset-2 rounded-[24px]"
                />
                <div className="relative rounded-[20px] border hairline bg-card/50 p-5 backdrop-blur-sm md:p-6">
                  <div className="absolute inset-x-4 top-3 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.24em] text-muted-foreground/60">
                    <span>★ live preview</span>
                    <span>3-card stack</span>
                  </div>
                  <div className="pt-7">
                    <HeroDemo />
                  </div>
                </div>
              </div>

              {/* Caption + how-it-works */}
              <div className="mt-12 space-y-4">
                <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
                  Right-swipe an open-source card and we star the repo on
                  GitHub from your account, instantly. Closed-source flips to
                  a one-tap access request.
                </p>
                <Link
                  href="#mechanic"
                  className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:underline"
                >
                  Read the mechanic
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </aside>
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
  leaders,
}: {
  stats: {
    liveProjects: number;
    makers: number;
    starsAllTime: number;
    starsThisWeek: number;
  };
  featured: FeaturedProject[];
  leaders: LeaderRow[];
}) {
  return (
    <div className="mx-auto max-w-7xl px-6">
      <section className="py-14 md:py-20">
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

      <section id="mechanic" className="scroll-mt-24 py-14 md:py-20">
        <SectionFrame
          index={3}
          caption="The mechanic · how a swipe becomes a star"
        />
        <Mechanic />
      </section>

      <section className="py-14 md:py-20">
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

      <section className="py-14 md:py-20">
        <SectionFrame
          index={5}
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

      <section className="py-14 md:py-20">
        <SectionFrame
          index={6}
          caption="For makers · distribution as a service"
        />
        <div className="mt-6">
          <MakerStrip />
        </div>
      </section>

      <section className="py-14 pb-24 md:py-20 md:pb-32">
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

