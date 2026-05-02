import { redirect } from "next/navigation";
import { Footer } from "@/components/footer";
import { FilterBar } from "@/components/landing/filter-bar";
import { Nav } from "@/components/nav";
import { PersonalizationBadge } from "@/components/feed/personalization-badge";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import {
  buildUserProfile,
  scoreProject,
  type TasteProfile,
} from "@/lib/feed/personalize";
import type { FeedProject } from "@/lib/types/db";
import { EmptyFilterState } from "./empty-filter-state";
import { FeedClient } from "./feed-client";

export const dynamic = "force-dynamic";

const VALID_CATEGORIES = new Set([
  "ai-tool",
  "dev-utility",
  "game",
  "saas",
  "other",
]);

type FeedPageProps = {
  // Next.js 16: searchParams is async.
  searchParams: Promise<{ focus?: string; q?: string; cat?: string }>;
};

/**
 * Auth-gated swipe feed. Server component fetches the next ~20 unswiped
 * live projects ranked by recency × right-swipe density, optionally
 * filtered by `?q=` (title/tagline ilike) and `?cat=` (category).
 */
export default async function FeedPage({ searchParams }: FeedPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in?redirect=/feed");
  }

  const { focus, q, cat } = await searchParams;

  const trimmedQ = q?.trim() ?? "";
  const activeQuery = trimmedQ.length > 0 ? trimmedQ : null;
  const activeCategory =
    cat && cat !== "all" && VALID_CATEGORIES.has(cat) ? cat : null;

  const profile = await fetchTasteProfile(user.id);

  const projects = await fetchFeedForUser(user.id, focus, {
    query: activeQuery,
    category: activeCategory,
  }, profile);

  const filtersActive = activeQuery !== null || activeCategory !== null;

  return (
    <>
      <Nav />
      <main className="flex-1">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-stretch px-4 pb-32 pt-6 md:pt-10">
          <FilterBar
            activeCategory={activeCategory}
            activeQuery={activeQuery}
          />

          {profile.total > 0 && !filtersActive ? (
            <div className="mb-3 mt-1 flex justify-center">
              <PersonalizationBadge profileSize={profile.total} />
            </div>
          ) : null}

          {projects.length === 0 && filtersActive ? (
            <EmptyFilterState
              query={activeQuery}
              category={activeCategory}
            />
          ) : (
            <FeedClient
              projects={projects}
              autoStarEnabled={user.auto_star_enabled}
            />
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

/* ------------------------------------------------------------------------ */
/* Data                                                                     */
/* ------------------------------------------------------------------------ */

type FeedFilters = {
  query: string | null;
  category: string | null;
};

/** Pulls the user's last 100 right-swipes (joined to project category +
 *  language) and returns a TasteProfile. Cold-start tolerant — empty profile
 *  if the user hasn't swiped yet. */
async function fetchTasteProfile(userId: string): Promise<TasteProfile> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("swipes")
    .select("project:projects(category, github_language)")
    .eq("user_id", userId)
    .eq("direction", "right")
    .order("created_at", { ascending: false })
    .limit(100);
  const swipes = (data ?? [])
    .map((row) => {
      const p = Array.isArray(row.project) ? row.project[0] : row.project;
      return {
        category: (p?.category ?? null) as string | null,
        language: (p?.github_language ?? null) as string | null,
      };
    });
  return buildUserProfile(swipes);
}

async function fetchFeedForUser(
  userId: string,
  focusId: string | undefined,
  filters: FeedFilters,
  profile: TasteProfile,
): Promise<FeedProject[]> {
  const supabase = await createClient();

  // Pull a generous window of recent live projects. When filters are
  // active we still cap the prefetch window — most decks are < 60 cards.
  let query = supabase
    .from("projects")
    .select(
      `id, slug, user_id, title, tagline, description_md, description_html,
       github_repo_url, github_stars, github_language, is_open_source,
       cta_url, category, status, created_at, updated_at,
       creator:users!projects_user_id_fkey(id, github_username, display_name, avatar_url),
       media:project_media(id, project_id, type, url, thumbnail_url, order_index)`,
    )
    .eq("status", "live");

  if (filters.category) {
    query = query.eq("category", filters.category);
  }

  if (filters.query) {
    // Postgres ILIKE escape — keep `%` and `_` literal in user input so
    // a stray underscore doesn't act as a wildcard. Supabase passes the
    // value through PostgREST which treats `,` `(` `)` specially in
    // .or(), so we encode them too.
    const safe = filters.query
      .replace(/[\\%_]/g, (m) => `\\${m}`)
      .replace(/[(),]/g, " ")
      .trim();
    if (safe.length > 0) {
      query = query.or(`title.ilike.%${safe}%,tagline.ilike.%${safe}%`);
    }
  }

  const { data: recent } = await query
    .order("created_at", { ascending: false })
    .limit(60);

  if (!recent || recent.length === 0) return [];

  // Find which of these the user has already swiped on; filter them out.
  const ids = recent.map((p) => p.id);
  const { data: swiped } = await supabase
    .from("swipes")
    .select("project_id")
    .eq("user_id", userId)
    .in("project_id", ids);

  const swipedSet = new Set((swiped ?? []).map((s) => s.project_id));

  // Right-swipe counts per project for ranking.
  const { data: rights } = await supabase
    .from("swipes")
    .select("project_id")
    .in("project_id", ids)
    .eq("direction", "right");

  const rightCount = new Map<string, number>();
  for (const r of rights ?? []) {
    rightCount.set(r.project_id, (rightCount.get(r.project_id) ?? 0) + 1);
  }

  const now = new Date();

  // v0.2 ranking: scoreProject combines recency, popularity, GitHub
  // stars, demo-video boost, AND personalization (cold-start safe).
  const ranked = recent
    .filter((p) => !swipedSet.has(p.id))
    .map((p) => {
      const media = (p.media ?? []) as Array<{ type: string }>;
      return {
        project: p,
        score: scoreProject(
          {
            category: p.category as string | null,
            github_language: p.github_language as string | null,
            github_stars: p.github_stars as number | null,
            created_at: p.created_at as string,
            right_swipes: rightCount.get(p.id) ?? 0,
            total_swipes: rightCount.get(p.id) ?? 0,
            has_demo_video: media.some((m) => m.type === "video"),
          },
          profile,
          now,
        ),
      };
    })
    .sort((a, b) => b.score - a.score);

  // If a focus id is provided (deep-link from a share page), bring it to
  // the top so it's the first card the user sees.
  const ordered = focusId
    ? [
        ...ranked.filter((r) => r.project.id === focusId),
        ...ranked.filter((r) => r.project.id !== focusId),
      ]
    : ranked;

  const top = ordered.slice(0, 20).map((r) => r.project);

  return top.map((p) => {
    const media = (p.media ?? []) as FeedProject["media"];
    return {
      id: p.id,
      slug: p.slug,
      user_id: p.user_id,
      title: p.title,
      tagline: p.tagline,
      description_md: p.description_md,
      description_html: p.description_html,
      github_repo_url: p.github_repo_url,
      github_stars: p.github_stars,
      github_language: p.github_language,
      is_open_source: p.is_open_source,
      cta_url: p.cta_url,
      category: p.category,
      status: p.status,
      created_at: p.created_at,
      updated_at: p.updated_at,
      creator: (Array.isArray(p.creator)
        ? (p.creator[0] ?? {
            id: "",
            github_username: "",
            display_name: null,
            avatar_url: null,
          })
        : (p.creator ?? {
            id: "",
            github_username: "",
            display_name: null,
            avatar_url: null,
          })) as unknown as FeedProject["creator"],
      media,
      right_swipe_count: rightCount.get(p.id) ?? 0,
      has_demo_video: media.some((m) => m.type === "video"),
    } satisfies FeedProject;
  });
}
