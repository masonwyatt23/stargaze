import Link from "next/link";
import { ArrowRight, Sparkles, Star } from "lucide-react";
import { GithubIcon } from "@/components/icons/github-icon";
import { Button } from "@/components/ui/button";
import { MakerChecklist } from "@/components/landing/maker-checklist";
import { MakerMechanic } from "@/components/landing/maker-mechanic";
import { SampleCard } from "@/components/landing/sample-card";
import { cn, formatCount } from "@/lib/utils";

type Stats = {
  liveProjects: number;
  makers: number;
  starsAllTime: number;
  starsThisWeek: number;
};

type Props = {
  stats: Stats;
  /** Currently signed-in user, if any. Determines CTA copy + destination. */
  currentUser: {
    github_username: string;
    avatar_url: string | null;
  } | null;
};

const QUOTES = [
  {
    body: "Got 40 stars in an afternoon from a tagline I wrote in five minutes.",
    author: "@vibe-coder",
    pill: "AI tools · SF",
  },
  {
    body: "First distribution channel I've used where people actually click through to the repo.",
    author: "@ship-it-friday",
    pill: "indie hackers",
  },
  {
    body: "My weekend project hit Hacker News-level traffic without me posting anywhere.",
    author: "@indie-builder",
    pill: "agentic / NYC",
  },
];

/**
 * For-makers growth section — the part of the landing that converts
 * indie makers into submitters. Replaces the old MakerStrip entirely.
 *
 * Structure (top → bottom):
 *   - Pinned "FOR MAKERS" caption
 *   - Bold opener with one-line subtitle
 *   - 4-stat strip (real Supabase data)
 *   - 3-step mechanic flow (submit → swipe → stars)
 *   - 2-column: 6-item checklist + sample preview card
 *   - 3-column maker quotes (testimonial-style)
 *   - Big primary CTA + reassurance line
 *
 * Visual identity: navy + brand-yellow + emerald accent for the live dot.
 * Backed by a starfield, a yellow halo, and the dotted observatory grid
 * so it reads distinctly from neighbouring sections.
 */
export function MakerStrip({ stats, currentUser }: Props) {
  const ctaHref = currentUser
    ? "/projects/new"
    : "/sign-in?redirect=/projects/new";
  const ctaLabel = currentUser
    ? "Submit your project"
    : "Sign in to submit";

  return (
    <section
      aria-label="For makers — submit your project"
      className="relative isolate overflow-hidden rounded-[2rem] border border-primary/30 bg-card/40"
    >
      {/* Atmosphere layers */}
      <div aria-hidden className="absolute inset-0 starfield opacity-60" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 observatory-grid opacity-30"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,hsl(47_96%_58%/0.20),transparent_70%)] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,hsl(47_96%_58%/0.10),transparent_70%)] blur-3xl"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
      />

      <div className="relative px-6 py-14 sm:px-10 sm:py-20 md:px-16 md:py-24">
        {/* Pinned caption */}
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.32em] text-primary">
            <Sparkles className="h-3 w-3" aria-hidden />
            For makers
          </span>
          <span className="hidden h-px flex-1 bg-foreground/10 sm:block" />
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70 sm:inline">
            § 06 · submission deck
          </span>
        </div>

        {/* Bold opener */}
        <div className="mt-8 max-w-4xl">
          <h2 className="editorial-display text-4xl text-foreground md:text-6xl lg:text-7xl">
            Building is easy.{" "}
            <span className="bg-gradient-to-br from-primary via-primary to-amber-300 bg-clip-text text-transparent">
              Distribution is the bottleneck.
            </span>
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Stargaze turns indie projects into{" "}
            <span className="text-foreground">real GitHub stars</span>,
            engaged users, and a spot on the weekly leaderboard. Submit
            once. Compound forever.
          </p>
        </div>

        {/* Stats strip — real numbers, big mono numerals */}
        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border hairline bg-foreground/[0.06] sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="live projects"
            value={stats.liveProjects}
            hint="on the deck right now"
          />
          <StatTile
            label="active makers"
            value={stats.makers}
            hint="real GitHub accounts"
          />
          <StatTile
            label="stars delivered"
            value={stats.starsAllTime}
            hint="lifetime, all repos"
            glow
          />
          <StatTile
            label="stars this week"
            value={stats.starsThisWeek}
            hint="rolling 7-day window"
            glow
          />
        </div>

        {/* Mechanic — 3 steps in 30 seconds */}
        <div className="mt-16 md:mt-24">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h3 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
              The mechanic, in 30 seconds.
            </h3>
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70 sm:inline">
              submit → swipe → star
            </span>
          </div>
          <MakerMechanic />
        </div>

        {/* Checklist + sample card */}
        <div className="mt-16 grid gap-10 md:mt-24 lg:grid-cols-[1.25fr_1fr] lg:gap-14">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
              What you get when you submit.
            </h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              Six concrete things. No marketing weasel-words.
            </p>
            <div className="mt-6">
              <MakerChecklist />
            </div>
          </div>
          <div className="lg:pt-8">
            <SampleCard user={currentUser} />
          </div>
        </div>

        {/* Maker quotes */}
        <div className="mt-16 md:mt-24">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h3 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
              Makers who already submitted.
            </h3>
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70 sm:inline">
              field reports
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {QUOTES.map((q) => (
              <figure
                key={q.author}
                className="relative rounded-2xl border hairline bg-background/40 p-5 backdrop-blur-sm transition-colors hover:border-primary/40"
              >
                <Star
                  aria-hidden
                  className="h-4 w-4 fill-primary text-primary constellation-glow"
                  strokeWidth={0}
                />
                <blockquote className="mt-3 text-sm leading-relaxed text-foreground">
                  <span className="text-primary">&ldquo;</span>
                  {q.body}
                  <span className="text-primary">&rdquo;</span>
                </blockquote>
                <figcaption className="mt-4 flex items-baseline justify-between border-t hairline pt-3">
                  <span className="font-mono text-xs text-foreground">
                    {q.author}
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/70">
                    {q.pill}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>

        {/* Big primary CTA */}
        <div className="mt-16 flex flex-col items-center text-center md:mt-24">
          <div
            aria-hidden
            className="pointer-events-none absolute -z-10 h-64 w-64 translate-y-12 rounded-full bg-[radial-gradient(circle,hsl(47_96%_58%/0.35),transparent_65%)] blur-3xl"
          />

          <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary/90">
            ★ ship it
          </p>
          <h3 className="mt-3 max-w-2xl editorial-display text-3xl text-foreground md:text-5xl">
            You shipped it.
            <br />
            <span className="text-primary">Now ship it to people.</span>
          </h3>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <Button
              asChild
              size="xl"
              className="gap-2 shadow-[0_0_60px_-10px_hsl(47_96%_58%/0.8)]"
            >
              <Link href={ctaHref}>
                {currentUser ? null : (
                  <GithubIcon className="h-5 w-5" aria-hidden />
                )}
                {ctaLabel}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
            {currentUser ? null : (
              <Button asChild size="xl" variant="ghost" className="gap-2">
                <Link href="/feed">
                  See the deck first
                </Link>
              </Button>
            )}
          </div>

          <p className="mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground/80">
            <span>Free forever</span>
            <span className="text-primary/50">·</span>
            <span>No waitlist</span>
            <span className="text-primary/50">·</span>
            <span>90-second submit</span>
          </p>
        </div>
      </div>
    </section>
  );
}

function StatTile({
  label,
  value,
  hint,
  glow,
}: {
  label: string;
  value: number;
  hint: string;
  glow?: boolean;
}) {
  return (
    <div className="relative bg-card/70 px-6 py-7 backdrop-blur-sm sm:px-7 sm:py-8">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/80">
        {glow ? (
          <Star
            className="h-3 w-3 fill-primary text-primary constellation-glow"
            strokeWidth={0}
            aria-hidden
          />
        ) : (
          <span
            aria-hidden
            className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_hsl(160_84%_50%/0.7)]"
          />
        )}
        {label}
      </div>
      <div
        className={cn(
          "stat-numeral mt-3 text-4xl md:text-5xl",
          glow ? "text-primary" : "text-foreground",
        )}
      >
        {formatCount(value)}
      </div>
      <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
        {hint}
      </div>
    </div>
  );
}
