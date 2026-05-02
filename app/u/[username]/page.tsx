import Link from "next/link";
import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import { GithubIcon } from "@/components/icons/github-icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/server";
import { formatCount } from "@/lib/utils";

export const dynamic = "force-dynamic";

type ProfilePageProps = {
  // Next.js 16: params is async.
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: ProfilePageProps) {
  const { username } = await params;
  return {
    title: `@${username}`,
    description: `Indie projects by @${username} on Stargaze.`,
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

  const [{ data: rawProjects }, { data: leaderRow }, { data: rightSwipes }] =
    await Promise.all([
      supabase
        .from("projects")
        .select(
          `id, slug, title, tagline, github_repo_url, github_language,
           github_stars, is_open_source, created_at,
           media:project_media(url, type, order_index)`,
        )
        .eq("user_id", user.id)
        .eq("status", "live")
        .order("created_at", { ascending: false }),
      supabase
        .from("leaderboard_weekly_public")
        .select("right_swipes_week, projects_with_swipes")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("swipes")
        .select("project_id")
        .eq("direction", "right")
        .in(
          "project_id",
          // chain to get this user's projects
          (
            await supabase
              .from("projects")
              .select("id")
              .eq("user_id", user.id)
          ).data?.map((p) => p.id) ?? [],
        ),
    ]);

  const projects = (rawProjects ?? []) as unknown as ProfileProject[];

  const swipeCountByProject = new Map<string, number>();
  for (const r of rightSwipes ?? []) {
    swipeCountByProject.set(
      r.project_id,
      (swipeCountByProject.get(r.project_id) ?? 0) + 1,
    );
  }

  return (
    <>
      <Nav />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-4xl px-4 pb-32 pt-6 md:pt-10">
          <header className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <Avatar className="h-20 w-20 ring-1 ring-border sm:h-24 sm:w-24">
              {user.avatar_url ? (
                <AvatarImage src={user.avatar_url} alt={user.github_username} />
              ) : null}
              <AvatarFallback>
                {user.github_username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                {user.display_name ?? user.github_username}
              </h1>
              <p className="mt-1 font-mono text-sm text-muted-foreground">
                @{user.github_username}
              </p>
              {user.bio ? (
                <p className="mt-3 max-w-prose text-sm">{user.bio}</p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Star className="h-3 w-3 fill-primary text-primary" />
                  {formatCount(leaderRow?.right_swipes_week ?? 0)} stars this
                  week
                </Badge>
                <Badge variant="outline">
                  {projects.length} project{projects.length === 1 ? "" : "s"}
                </Badge>
                <Button asChild variant="ghost" size="sm" className="ml-auto">
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
          </header>

          <section className="mt-10">
            <h2 className="mb-4 text-lg font-semibold tracking-tight">
              Projects
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
                                {formatCount(
                                  swipeCountByProject.get(p.id) ?? 0,
                                )}
                              </Badge>
                            </div>
                            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                              {p.tagline}
                            </p>
                            {p.github_language ? (
                              <Badge variant="secondary" className="mt-3">
                                {p.github_language}
                              </Badge>
                            ) : null}
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
