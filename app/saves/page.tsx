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
    <Card className="border-dashed bg-card/40">
      <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
        <Star className="h-8 w-8 fill-primary/50 text-primary" />
        <p className="text-sm text-muted-foreground">
          No saves yet. Head to the deck and start starring.
        </p>
        <Button asChild className="mt-2">
          <Link href="/feed">Open the deck</Link>
        </Button>
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
