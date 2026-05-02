import Link from "next/link";
import {
  ArrowRight,
  Layers,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";
import { GithubIcon } from "@/components/icons/github-icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/footer";
import { Logo } from "@/components/logo";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/server";
import { cn, formatCount } from "@/lib/utils";

export const dynamic = "force-dynamic";

type FeaturedProjectRow = {
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

async function getFeatured(): Promise<FeaturedProjectRow[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("projects")
      .select(
        `id, slug, title, tagline, github_language, github_stars,
         is_open_source, created_at, category,
         user:users!projects_user_id_fkey(github_username, display_name, avatar_url),
         media:project_media(url, type, order_index)`,
      )
      .eq("status", "live")
      .order("created_at", { ascending: false })
      .limit(6);
    return (data ?? []) as unknown as FeaturedProjectRow[];
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

export default async function LandingPage() {
  const [featured, leaders] = await Promise.all([getFeatured(), getLeaders()]);

  return (
    <>
      <Nav />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <FeaturedGrid projects={featured} />
        <LeaderboardPreview leaders={leaders} />
        <SocialProof />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}

/* ----------------------------- Hero ------------------------------------- */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="star-trail absolute inset-0 opacity-80"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(47_96%_58%/0.10),transparent_60%)]"
      />
      <div className="relative mx-auto max-w-5xl px-6 pb-20 pt-20 text-center md:pt-28">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          v0.1 — for the vibe-coded era
        </div>

        <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
          Discover indie projects
          <br />
          <span className="bg-gradient-to-br from-primary via-primary to-amber-300 bg-clip-text text-transparent">
            worth a star.
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-balance text-base text-muted-foreground md:text-lg">
          Stargaze is a swipe-deck for builders. Right-swipe to save — and
          auto-star the repo on GitHub. The leaderboard ranks makers by the
          stars they earn.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="xl" className="gap-2">
            <Link href="/sign-in">
              <GithubIcon className="h-5 w-5" />
              Continue with GitHub
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="xl" variant="ghost" className="gap-2">
            <Link href="/feed">
              <Layers className="h-5 w-5" />
              Peek the feed
            </Link>
          </Button>
        </div>

        <p className="mt-5 text-xs text-muted-foreground">
          ← skip ✕ &nbsp;·&nbsp; star → 🌟 &nbsp;·&nbsp; that&apos;s it
        </p>
      </div>
    </section>
  );
}

/* ---------------------- How it works (3 steps) -------------------------- */

function HowItWorks() {
  const steps = [
    {
      icon: <Layers className="h-6 w-6" />,
      title: "Browse the deck",
      blurb:
        "Hand-curated indie projects. Screenshots, demos, and a one-line tagline. No SEO sludge, no infinite scroll.",
    },
    {
      icon: <Star className="h-6 w-6 fill-primary text-primary" />,
      title: "Swipe right to save",
      blurb:
        "Right = save it for later and back the maker. Left = pass. Keyboard works too: → / s to star, ← / x to skip.",
    },
    {
      icon: <Trophy className="h-6 w-6" />,
      title: "Stars hit GitHub",
      blurb:
        "We star the repo on your behalf using the OAuth scope you granted. Toggle off any time in Settings.",
    },
  ];

  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
          How it works
        </h2>
        <p className="mt-3 text-muted-foreground">
          Three taps from sign-in to backing your first maker.
        </p>
      </div>
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {steps.map((s, i) => (
          <Card
            key={s.title}
            className="relative overflow-hidden border-border/60 bg-card/60 backdrop-blur"
          >
            <CardContent className="p-6">
              <div className="absolute right-4 top-4 font-mono text-xs text-muted-foreground/40">
                0{i + 1}
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
                {s.icon}
              </div>
              <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {s.blurb}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

/* ----------------------- Featured projects grid ------------------------- */

function FeaturedGrid({ projects }: { projects: FeaturedProjectRow[] }) {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Fresh off the build
          </h2>
          <p className="mt-2 text-muted-foreground">
            Six newest projects on the deck right now.
          </p>
        </div>
        <Link
          href="/feed"
          className="hidden items-center gap-1 text-sm text-primary hover:underline md:inline-flex"
        >
          Open the deck <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {projects.length === 0 ? (
        <EmptyFeatured />
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <FeaturedCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </section>
  );
}

function EmptyFeatured() {
  return (
    <Card className="mt-8 border-dashed bg-card/40">
      <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
        <Star className="h-8 w-8 fill-primary/50 text-primary" />
        <p className="text-sm text-muted-foreground">
          No live projects yet. Be the first —{" "}
          <Link className="text-primary hover:underline" href="/projects/new">
            ship something
          </Link>
          .
        </p>
      </CardContent>
    </Card>
  );
}

function FeaturedCard({ project }: { project: FeaturedProjectRow }) {
  const cover = [...project.media]
    .sort((a, b) => a.order_index - b.order_index)
    .find((m) => m.type !== "video");

  return (
    <Link
      href={`/p/${project.slug}`}
      className="group block focus-visible:outline-none"
    >
      <Card className="h-full overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10 group-focus-visible:ring-2 group-focus-visible:ring-primary">
        <div className="aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-secondary to-muted">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover.url}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
              <Star className="h-10 w-10" />
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 text-base font-semibold">
              {project.title}
            </h3>
            {project.github_stars != null && (
              <Badge variant="outline" className="shrink-0 gap-1">
                <Star className="h-3 w-3 fill-primary text-primary" />
                {formatCount(project.github_stars)}
              </Badge>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {project.tagline}
          </p>
          <div className="mt-3 flex items-center gap-2">
            {project.user ? (
              <>
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
                <span className="text-xs text-muted-foreground">
                  @{project.user.github_username}
                </span>
              </>
            ) : null}
            {project.github_language ? (
              <Badge variant="secondary" className="ml-auto">
                {project.github_language}
              </Badge>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

/* ----------------------- Leaderboard preview ---------------------------- */

function LeaderboardPreview({ leaders }: { leaders: LeaderRow[] }) {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <div className="grid items-center gap-10 md:grid-cols-2">
        <div>
          <Badge variant="warning" className="mb-3">
            <Trophy className="h-3 w-3" />
            Live
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Makers earn the spotlight.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Every right-swipe lifts a creator. The weekly leaderboard ranks
            who&apos;s shipping projects that stop the scroll.
          </p>
          <div className="mt-6">
            <Button asChild variant="outline" className="gap-1.5">
              <Link href="/leaderboard">
                See the full board
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden border-border/60 bg-card/60 backdrop-blur">
          <CardContent className="p-2">
            {leaders.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                The board is wide open. Ship something this week and lead it.
              </p>
            ) : (
              <ol className="divide-y divide-border/60">
                {leaders.map((l, i) => (
                  <li
                    key={l.user_id}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5",
                      i === 0 && "bg-primary/5",
                    )}
                  >
                    <span
                      className={cn(
                        "w-6 text-center font-mono text-sm tabular-nums",
                        i === 0
                          ? "text-primary"
                          : "text-muted-foreground/70",
                      )}
                    >
                      #{i + 1}
                    </span>
                    <Avatar className="h-8 w-8">
                      {l.avatar_url ? (
                        <AvatarImage src={l.avatar_url} alt={l.github_username} />
                      ) : null}
                      <AvatarFallback>
                        {l.github_username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {l.display_name ?? l.github_username}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        @{l.github_username}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                      <Star className="h-4 w-4 fill-primary" />
                      {formatCount(l.right_swipes_week)}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

/* ----------------------- Social proof ----------------------------------- */

function SocialProof() {
  const quotes = [
    {
      quote:
        "Finally a place where my weekend hack gets seen by people who actually star repos.",
      author: "@indie-builder",
    },
    {
      quote:
        "It's like Tinder for GitHub stars — but the kind your CI pipeline cares about.",
      author: "@ship-it-friday",
    },
    {
      quote:
        "Got 40 stars in an afternoon from a tagline I wrote in five minutes.",
      author: "@vibe-coder",
    },
  ];

  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
          Stars that mean something.
        </h2>
        <p className="mt-3 text-muted-foreground">
          Distribution for the vibe-coded era.
        </p>
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {quotes.map((q) => (
          <Card
            key={q.author}
            className="border-border/60 bg-card/60 backdrop-blur"
          >
            <CardContent className="p-6">
              <Star className="h-5 w-5 fill-primary text-primary" />
              <p className="mt-3 text-sm leading-relaxed text-foreground">
                &ldquo;{q.quote}&rdquo;
              </p>
              <p className="mt-3 font-mono text-xs text-muted-foreground">
                — {q.author}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

/* ------------------------ Final CTA ------------------------------------- */

function FinalCta() {
  return (
    <section className="relative overflow-hidden border-t border-border/60 bg-gradient-to-b from-background to-card/20 px-6 py-20">
      <div className="star-trail absolute inset-0 opacity-50" aria-hidden />
      <div className="relative mx-auto max-w-3xl text-center">
        <Logo size="xl" asPlain className="mx-auto" />
        <h2 className="mt-6 text-3xl font-bold tracking-tight md:text-4xl">
          Star projects that stop your scroll.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Sign in with GitHub. Swipe a few. Make a maker&apos;s week.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="xl" className="gap-2">
            <Link href="/sign-in">
              <GithubIcon className="h-5 w-5" />
              Continue with GitHub
            </Link>
          </Button>
          <Button asChild size="xl" variant="ghost" className="gap-2">
            <Link href="/projects/new">
              Submit your project
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
