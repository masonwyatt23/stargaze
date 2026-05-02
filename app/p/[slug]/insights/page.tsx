import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Sparkles, Star, TrendingUp } from "lucide-react";
import { Footer } from "@/components/footer";
import { GithubIcon } from "@/components/icons/github-icon";
import { Nav } from "@/components/nav";
import { Sparkline } from "@/components/sparkline";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { cn, formatCount } from "@/lib/utils";

export const dynamic = "force-dynamic";

type InsightsPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function InsightsPage({ params }: InsightsPageProps) {
  const { slug } = await params;

  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?redirect=/p/${slug}/insights`);

  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select(
      `id, slug, user_id, title, tagline, github_repo_url, github_stars,
       github_language, is_open_source, category, status, created_at`,
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!project) notFound();

  // Owner-only — bounce non-owners back to the public share page.
  if (project.user_id !== user.id) redirect(`/p/${slug}`);

  // All swipes on this project, lifetime
  const { data: swipes } = await supabase
    .from("swipes")
    .select("direction, github_starred, created_at, user_id")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  const all = swipes ?? [];
  const rightSwipes = all.filter((s) => s.direction === "right");
  const totalSwipes = all.length;
  const rightRate =
    totalSwipes > 0 ? Math.round((rightSwipes.length / totalSwipes) * 100) : 0;
  const githubStarsSynced = all.filter((s) => s.github_starred).length;

  // 30-day daily right-swipe series
  const dailyRights = bucketDaily(rightSwipes.map((s) => s.created_at), 30);

  // Recent activity — last 20 right-swipes with viewer profile
  const recentRightIds = rightSwipes.slice(0, 20).map((s) => s.user_id);
  const { data: viewers } = recentRightIds.length
    ? await supabase
        .from("users")
        .select("id, github_username, avatar_url, display_name")
        .in("id", recentRightIds)
    : { data: [] as Array<{ id: string; github_username: string; avatar_url: string | null; display_name: string | null }> };
  const viewerMap = new Map(
    (viewers ?? []).map((v) => [v.id, v]),
  );
  const recentEvents = rightSwipes.slice(0, 20).map((s) => ({
    at: s.created_at,
    viewer: viewerMap.get(s.user_id),
  }));

  return (
    <>
      <Nav />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-8 md:pt-12">
          <Link
            href={`/p/${slug}`}
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to share page
          </Link>

          <header className="mb-8">
            <Badge variant="outline" className="mb-3 gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Insights
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              {project.title}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {project.tagline}
            </p>
          </header>

          {/* 4-stat grid */}
          <div className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat
              label="Right-swipes"
              value={formatCount(rightSwipes.length)}
              icon={<Star className="h-4 w-4 fill-primary text-primary" />}
              tone="primary"
            />
            <Stat
              label="Impressions"
              value={formatCount(totalSwipes)}
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <Stat
              label="Right-swipe rate"
              value={`${rightRate}%`}
              icon={<Sparkles className="h-4 w-4 text-primary" />}
              tone={rightRate >= 30 ? "primary" : undefined}
            />
            <Stat
              label="GitHub stars synced"
              value={formatCount(githubStarsSynced)}
              icon={<GithubIcon className="h-4 w-4" />}
              tone="primary"
            />
          </div>

          {/* 30-day chart */}
          <Card className="mb-10 border-border/60 bg-card/60">
            <CardContent className="p-6">
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <h2 className="text-base font-semibold">Last 30 days</h2>
                  <p className="text-xs text-muted-foreground">
                    Daily right-swipes received.
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  {dailyRights.reduce((s, n) => s + n, 0)} this period
                </div>
              </div>
              <Sparkline
                data={dailyRights}
                className="h-24 w-full text-primary"
              />
              <div className="mt-2 flex justify-between text-[10px] text-muted-foreground/70">
                <span>{relativeDay(-29)}</span>
                <span>{relativeDay(-15)}</span>
                <span>today</span>
              </div>
            </CardContent>
          </Card>

          {/* Two columns: recent activity + boost ideas */}
          <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
            <Card className="border-border/60 bg-card/60">
              <CardContent className="p-0">
                <div className="border-b border-border/60 px-5 py-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Recent activity
                  </h2>
                </div>
                {recentEvents.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    No right-swipes yet. Share your project to get the first one.
                  </div>
                ) : (
                  <ul className="divide-y divide-border/60">
                    {recentEvents.map((e, i) => (
                      <li key={i} className="flex items-center gap-3 px-5 py-3">
                        <Avatar className="h-7 w-7 shrink-0">
                          {e.viewer?.avatar_url ? (
                            <AvatarImage
                              src={e.viewer.avatar_url}
                              alt={e.viewer.github_username}
                            />
                          ) : null}
                          <AvatarFallback>
                            {e.viewer?.github_username
                              .slice(0, 2)
                              .toUpperCase() ?? "??"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">
                            <Star className="mr-1 inline h-3 w-3 fill-primary text-primary" />
                            <Link
                              href={`/u/${e.viewer?.github_username ?? ""}`}
                              className="font-medium hover:text-primary"
                            >
                              @{e.viewer?.github_username ?? "?"}
                            </Link>{" "}
                            <span className="text-muted-foreground">
                              starred this
                            </span>
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {timeAgo(e.at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60">
              <CardContent className="p-5">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Boost ideas
                </h2>
                <ul className="mt-4 space-y-4 text-sm">
                  <Tip
                    headline="Add a demo video"
                    body="Projects with a 15–30s demo see ~2.4× more right-swipes than screenshot-only listings."
                  />
                  <Tip
                    headline="Tighten your tagline"
                    body="Under 80 characters punches harder. Lead with the verb, drop the &lsquo;a tool that&hellip;&rsquo;"
                  />
                  <Tip
                    headline="Open-source it (if you can)"
                    body="OSS projects get ~1.8× more saves than closed-source on Stargaze. Auto-star is a real distribution channel."
                  />
                </ul>
                <div className="mt-6 flex flex-col gap-2">
                  {project.github_repo_url ? (
                    <Button asChild variant="outline" size="sm">
                      <a
                        href={project.github_repo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <GithubIcon className="h-3.5 w-3.5" />
                        Open repo
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  ) : null}
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/p/${slug}`}>
                      View public page <ExternalLink className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Stat({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: "primary";
}) {
  return (
    <Card className="border-border/60 bg-card/60">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          {icon}
          {label}
        </div>
        <div
          className={cn(
            "mt-1 text-2xl font-semibold tabular-nums",
            tone === "primary" && "text-primary",
          )}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function Tip({ headline, body }: { headline: string; body: React.ReactNode }) {
  return (
    <li>
      <div className="font-medium text-foreground">{headline}</div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
    </li>
  );
}

/** Bucket ISO timestamps into the last `days` UTC days, return count per day. */
function bucketDaily(timestamps: string[], days: number): number[] {
  const buckets = new Array(days).fill(0);
  const now = new Date();
  const todayUTC = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  for (const t of timestamps) {
    const d = new Date(t);
    const dayUTC = Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
    );
    const offset = Math.floor((todayUTC - dayUTC) / 86_400_000);
    if (offset >= 0 && offset < days) {
      buckets[days - 1 - offset]++;
    }
  }
  return buckets;
}

function relativeDay(offset: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.round(hr / 24);
  return `${d}d ago`;
}
