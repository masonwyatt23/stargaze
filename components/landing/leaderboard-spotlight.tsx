import Link from "next/link";
import { ArrowRight, Star, Trophy } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn, formatCount } from "@/lib/utils";

type LeaderRow = {
  user_id: string;
  github_username: string;
  display_name: string | null;
  avatar_url: string | null;
  right_swipes_week: number;
};

/**
 * Editorial leaderboard preview: #1 takes a poster portrait card on the
 * left, ranks 2–5 line up as a numbered ladder on the right. Mono
 * tabular numerals for star counts. Brand-yellow used sparingly — only
 * on #1 and the rank crown.
 */
export function LeaderboardSpotlight({ leaders }: { leaders: LeaderRow[] }) {
  if (leaders.length === 0) {
    return <EmptyBoard />;
  }

  const [first, ...rest] = leaders;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <FirstPlaceCard leader={first} />
      <div className="flex flex-col">
        <div className="mb-3 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
          <span>Ladder · ranks 02 — 05</span>
          <span className="text-primary/80">★ stars / week</span>
        </div>
        <ul className="divide-y hairline rounded-2xl border hairline bg-card/40 backdrop-blur-sm">
          {rest.slice(0, 4).map((l, i) => (
            <RungRow key={l.user_id} leader={l} rank={i + 2} />
          ))}
        </ul>
        <div className="mt-6">
          <Button asChild variant="outline" className="gap-2">
            <Link href="/leaderboard">
              See the full constellation
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function FirstPlaceCard({ leader }: { leader: LeaderRow }) {
  return (
    <Link
      href={`/u/${leader.github_username}`}
      className="group relative isolate flex flex-col justify-between overflow-hidden rounded-3xl border border-primary/40 bg-card p-7 md:p-9"
    >
      {/* Halo */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-1/3 -top-1/3 h-[140%] w-[140%] rounded-full bg-[radial-gradient(circle,hsl(47_96%_58%/0.18)_0%,transparent_60%)] blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 starfield opacity-50"
      />

      {/* Top row */}
      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
          <Trophy className="h-3 w-3" />
          Rank 01 · This week
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/60">
          alpha lyrae
        </div>
      </div>

      {/* Center: avatar + name */}
      <div className="relative mt-10 flex items-end gap-5">
        <div className="relative">
          <div
            aria-hidden
            className="absolute -inset-2 rounded-full bg-primary/15 blur"
          />
          <Avatar className="relative h-20 w-20 ring-2 ring-primary/60 md:h-24 md:w-24">
            {leader.avatar_url ? (
              <AvatarImage
                src={leader.avatar_url}
                alt={leader.github_username}
              />
            ) : null}
            <AvatarFallback className="bg-primary/15 text-primary">
              {leader.github_username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            featured maker
          </div>
          <div className="mt-1 truncate text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            {leader.display_name ?? leader.github_username}
          </div>
          <div className="truncate font-mono text-sm text-muted-foreground">
            @{leader.github_username}
          </div>
        </div>
      </div>

      {/* Big star counter */}
      <div className="relative mt-10 flex items-end justify-between border-t hairline pt-6">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            stars delivered (week)
          </div>
          <div className="stat-numeral mt-2 text-5xl text-primary md:text-6xl">
            <span className="inline-flex items-baseline gap-2">
              <Star
                className="h-5 w-5 fill-primary text-primary md:h-7 md:w-7"
                strokeWidth={0}
              />
              {formatCount(leader.right_swipes_week)}
            </span>
          </div>
        </div>
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/70 transition-colors group-hover:text-primary md:inline">
          view profile →
        </span>
      </div>
    </Link>
  );
}

function RungRow({ leader, rank }: { leader: LeaderRow; rank: number }) {
  return (
    <li className="group">
      <Link
        href={`/u/${leader.github_username}`}
        className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-foreground/[0.03]"
      >
        <span
          className={cn(
            "stat-numeral w-10 text-2xl tabular text-foreground/70 group-hover:text-primary",
          )}
        >
          {String(rank).padStart(2, "0")}
        </span>
        <Avatar className="h-9 w-9 shrink-0 ring-1 ring-foreground/10">
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
          <div className="truncate text-sm font-medium text-foreground">
            {leader.display_name ?? leader.github_username}
          </div>
          <div className="truncate font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
            @{leader.github_username}
          </div>
        </div>
        <div className="flex items-center gap-1 stat-numeral text-base text-primary">
          <Star className="h-3.5 w-3.5 fill-primary" strokeWidth={0} />
          {formatCount(leader.right_swipes_week)}
        </div>
      </Link>
    </li>
  );
}

function EmptyBoard() {
  return (
    <div className="rounded-3xl border border-dashed hairline-strong p-16 text-center">
      <Trophy className="mx-auto h-10 w-10 text-primary/40" />
      <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        Constellation forming · check back this week.
      </p>
    </div>
  );
}
