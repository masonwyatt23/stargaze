import Link from "next/link";
import { redirect } from "next/navigation";
import { Star } from "lucide-react";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { SavesClient, type SavedRow } from "./saves-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Saves",
  description: "Projects you've right-swiped — automatically starred on GitHub.",
};

export default async function SavesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?redirect=/saves");

  const saves = await fetchSaves(user.id);

  return (
    <>
      <Nav />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-4 pb-32 pt-6 md:pt-10">
          <header className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Saves
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Projects you right-swiped. Long-press (or right-click) to remove
              and unstar.
            </p>
          </header>

          {saves.length === 0 ? (
            <EmptySaves />
          ) : (
            <SavesClient saves={saves} />
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function EmptySaves() {
  return (
    <Card className="relative overflow-hidden border-dashed bg-card/40">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-50"
        style={{
          background:
            "radial-gradient(circle at center, hsl(47 96% 58% / 0.18) 0%, transparent 70%)",
        }}
      />
      <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 ring-1 ring-primary/30">
          <Star
            className="h-7 w-7 fill-primary text-primary"
            strokeWidth={0}
          />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold tracking-tight">
            Your saves will live here.
          </h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Right-swipe a project on the deck to save it — and (with auto-star
            on) star it on GitHub at the same time. Long-press any saved card
            to undo both.
          </p>
        </div>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Button asChild>
            <Link href="/feed">Open the deck</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/leaderboard">See who&apos;s leading</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

async function fetchSaves(userId: string): Promise<SavedRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("swipes")
    .select(
      `id, created_at, github_starred,
       project:projects!swipes_project_id_fkey(
         id, slug, title, tagline, github_repo_url, github_stars,
         github_language, is_open_source, status,
         creator:users!projects_user_id_fkey(github_username, display_name, avatar_url),
         media:project_media(url, type, order_index)
       )`,
    )
    .eq("user_id", userId)
    .eq("direction", "right")
    .order("created_at", { ascending: false })
    .limit(100);

  if (!data) return [];

  type RawSwipeRow = {
    id: string;
    created_at: string;
    github_starred: boolean;
    project: {
      id: string;
      slug: string;
      title: string;
      tagline: string;
      github_repo_url: string | null;
      github_stars: number | null;
      github_language: string | null;
      is_open_source: boolean;
      status: string;
      creator: {
        github_username: string;
        display_name: string | null;
        avatar_url: string | null;
      } | null;
      media: { url: string; type: string; order_index: number }[];
    } | null;
  };

  return (data as unknown as RawSwipeRow[])
    .filter((row) => row.project !== null)
    .map((row) => {
      const project = row.project!;
      return {
        swipeId: row.id,
        starredOnGithub: row.github_starred,
        savedAt: row.created_at,
        project: {
          id: project.id,
          slug: project.slug,
          title: project.title,
          tagline: project.tagline,
          githubRepoUrl: project.github_repo_url,
          githubStars: project.github_stars,
          githubLanguage: project.github_language,
          isOpenSource: project.is_open_source,
          creator: project.creator,
          coverUrl:
            [...project.media]
              .sort((a, b) => a.order_index - b.order_index)
              .find((m) => m.type !== "video")?.url ?? null,
        },
      } satisfies SavedRow;
    });
}
