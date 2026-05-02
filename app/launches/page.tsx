// TODO: when adding new static routes, ensure `/launches` is included in
// `app/sitemap.ts`. The sitemap auto-includes static routes — verify there.

import type { Metadata } from "next";
import { LaunchesScroller } from "./launches-scroller";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Launches · Stargaze",
  description: "Today's indie projects, one full screen at a time.",
};

/**
 * Shape consumed by the launches scroller + card. A trimmed view of
 * `FeedProject` keyed to what the launch wall actually renders.
 */
export type LaunchProject = {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description_html: string | null;
  github_repo_url: string | null;
  github_stars: number | null;
  github_language: string | null;
  is_open_source: boolean;
  cta_url: string | null;
  category: string | null;
  creator: {
    github_username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  media: Array<{ url: string; type: string; order_index: number }>;
  right_swipe_count: number;
};

/**
 * `/launches` — vertical scroll-snap "launch wall." One full-viewport
 * section per live project, sorted by recency. Public (no auth gate),
 * no Nav, no Footer — full-bleed immersive surface. Visitors exit via
 * the top-bar close button or the logomark home link.
 */
export default async function LaunchesPage() {
  const projects = await fetchLiveLaunches();

  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-background text-foreground">
      <LaunchesScroller projects={projects} />
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Data                                                                     */
/* ------------------------------------------------------------------------ */

async function fetchLiveLaunches(): Promise<LaunchProject[]> {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("projects")
    .select(
      `id, slug, title, tagline, description_html,
       github_repo_url, github_stars, github_language, is_open_source,
       cta_url, category, created_at,
       creator:users!projects_user_id_fkey(github_username, display_name, avatar_url),
       media:project_media(url, type, order_index)`,
    )
    .eq("status", "live")
    .order("created_at", { ascending: false })
    .limit(100);

  if (!rows || rows.length === 0) return [];

  // Right-swipe counts for the rank chip. Single round-trip across
  // every visible project — same pattern the feed uses.
  const ids = rows.map((r) => r.id);
  const { data: rights } = await supabase
    .from("swipes")
    .select("project_id")
    .in("project_id", ids)
    .eq("direction", "right");

  const rightCount = new Map<string, number>();
  for (const r of rights ?? []) {
    rightCount.set(r.project_id, (rightCount.get(r.project_id) ?? 0) + 1);
  }

  return rows.map((p) => {
    const creator = Array.isArray(p.creator) ? p.creator[0] : p.creator;
    const media = (p.media ?? []) as Array<{
      url: string;
      type: string;
      order_index: number;
    }>;
    const sortedMedia = [...media].sort(
      (a, b) => a.order_index - b.order_index,
    );

    return {
      id: p.id as string,
      slug: p.slug as string,
      title: p.title as string,
      tagline: p.tagline as string,
      description_html: (p.description_html as string | null) ?? null,
      github_repo_url: (p.github_repo_url as string | null) ?? null,
      github_stars: (p.github_stars as number | null) ?? null,
      github_language: (p.github_language as string | null) ?? null,
      is_open_source: Boolean(p.is_open_source),
      cta_url: (p.cta_url as string | null) ?? null,
      category: (p.category as string | null) ?? null,
      creator: creator
        ? {
            github_username: (creator.github_username as string) ?? "",
            display_name: (creator.display_name as string | null) ?? null,
            avatar_url: (creator.avatar_url as string | null) ?? null,
          }
        : null,
      media: sortedMedia,
      right_swipe_count: rightCount.get(p.id as string) ?? 0,
    } satisfies LaunchProject;
  });
}
