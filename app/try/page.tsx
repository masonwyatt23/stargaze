import { redirect } from "next/navigation";
import Link from "next/link";

import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { TryDeck } from "@/components/try/try-deck";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import type { FeedProject } from "@/lib/types/db";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Try the deck — Stargaze",
  description:
    "Swipe through real indie GitHub projects. No sign-in needed for the first few.",
};

/**
 * /try — anonymous, no-auth preview of the swipe deck. Logged-in users get
 * redirected to the real /feed since the demo would be a downgrade for them.
 *
 * Anonymous swipes are NOT persisted — purely a "what does this feel like"
 * conversion play. After ~5 swipes the deck swaps in a sign-in CTA card so
 * visitors meet the auth wall while still in the swipe rhythm.
 */
export default async function TryPage() {
  const user = await getCurrentUser();
  if (user) redirect("/feed");

  const supabase = await createClient();

  // Pick a hand-curated 8-card preview: live OSS projects with a screenshot,
  // skewed toward the more visually interesting ones (have a cover image).
  const { data } = await supabase
    .from("projects")
    .select(
      `id, slug, user_id, title, tagline, description_md, description_html,
       github_repo_url, github_stars, github_language, is_open_source,
       cta_url, category, status, created_at, updated_at,
       creator:users!projects_user_id_fkey(
         id, github_username, display_name, avatar_url
       ),
       media:project_media(id, project_id, type, url, thumbnail_url, order_index)`,
    )
    .eq("status", "live")
    .eq("is_open_source", true)
    .order("github_stars", { ascending: false, nullsFirst: false })
    .limit(40);

  const all = (data ?? []) as unknown as FeedProject[];

  // Prefer cards that have at least one screenshot — empty cards make the
  // demo feel half-built. Fisher-Yates within the group, take 8.
  const withCovers = all.filter((p) =>
    p.media?.some((m) => m.type === "screenshot"),
  );
  const pool = withCovers.length >= 8 ? withCovers : all;
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const preview = pool.slice(0, 8).map((p) => ({
    ...p,
    right_swipe_count: 0,
    has_demo_video: p.media?.some((m) => m.type === "video") ?? false,
  }));

  return (
    <>
      <Nav />
      <main className="relative flex-1">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 pb-24 pt-6 md:pt-12">
          <div className="mb-6 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary">
              ★ try the deck
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
              Swipe a few. Then sign in.
            </h1>
            <p className="mt-3 text-sm text-muted-foreground md:text-base">
              No account needed. Right-swipe = save + auto-star (after sign-in).
              Left-swipe = next card.
            </p>
          </div>

          {preview.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-card/40 p-8 text-center text-muted-foreground">
              <p>The deck is warming up — check back in a sec.</p>
              <Link
                href="/feed"
                className="mt-3 inline-block text-primary underline"
              >
                Or jump straight to the full feed
              </Link>
            </div>
          ) : (
            <TryDeck projects={preview} />
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
