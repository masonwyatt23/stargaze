import Link from "next/link";
import { redirect } from "next/navigation";
import { Footer } from "@/components/footer";
import { FilterBar } from "@/components/landing/filter-bar";
import { parseLanguageParam } from "@/components/landing/language-select";
import { parseOssParam, type OssState } from "@/components/landing/oss-toggle";
import { parseSortParam, type SortValue } from "@/components/landing/sort-select";
import { Nav } from "@/components/nav";
import { PersonalizationBadge } from "@/components/feed/personalization-badge";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import {
  buildUserProfile,
  scoreProject,
  type TasteProfile,
} from "@/lib/feed/personalize";
import { log } from "@/lib/log";
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

/** Cap user-supplied search input — keeps the SQL pattern bounded. */
const MAX_QUERY_LEN = 80;

type FeedPageProps = {
  // Next.js 16: searchParams is async.
  searchParams: Promise<{
    focus?: string;
    q?: string;
    cat?: string;
    sort?: string;
    oss?: string;
    lang?: string;
  }>;
};

/**
 * Auth-gated swipe feed. Server component fetches the next ~20 unswiped
 * live projects ranked by recency × right-swipe density (the default
 * "trending" sort), optionally filtered by:
 *   - `?q=`    → title/tagline/description ilike, ranked
 *   - `?cat=`  → exact category
 *   - `?sort=` → trending | fresh | popular | alpha (default trending)
 *   - `?oss=`  → true | false (open-source filter)
 *   - `?lang=` → github_language exact match (case-insensitive)
 */
export default async function FeedPage({ searchParams }: FeedPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in?redirect=/feed");
  }

  const { focus, q, cat, sort, oss, lang } = await searchParams;

  const trimmedQ = (q ?? "").trim().slice(0, MAX_QUERY_LEN);
  const activeQuery = trimmedQ.length > 0 ? trimmedQ : null;
  const activeCategory =
    cat && cat !== "all" && VALID_CATEGORIES.has(cat) ? cat : null;
  const activeSort = parseSortParam(sort);
  const activeOss = parseOssParam(oss);
  const activeLanguage = parseLanguageParam(lang);

  // Defensive — neither failure should crash the page.
  let profile: TasteProfile;
  try {
    profile = await fetchTasteProfile(user.id);
  } catch (err) {
    log({
      level: "error",
      event: "feed.profile.failed",
      userId: user.id,
      error: (err as Error).message,
    });
    profile = { categories: new Map(), languages: new Map(), total: 0 };
  }

  let projects: FeedProject[] = [];
  try {
    projects = await fetchFeedForUser(
      user.id,
      focus,
      {
        query: activeQuery,
        category: activeCategory,
        sort: activeSort,
        oss: activeOss,
        language: activeLanguage,
      },
      profile,
    );
  } catch (err) {
    log({
      level: "error",
      event: "feed.fetch.failed",
      userId: user.id,
      filters: { q: activeQuery, cat: activeCategory, sort: activeSort, oss: activeOss, lang: activeLanguage },
      error: (err as Error).message,
      stack: (err as Error).stack?.slice(0, 1500),
    });
    projects = [];
  }

  const filtersActive =
    activeQuery !== null ||
    activeCategory !== null ||
    activeOss !== "any" ||
    activeLanguage !== null ||
    activeSort !== "trending";

  return (
    <>
      <Nav />
      <main className="flex-1">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-stretch px-3 pb-24 pt-3 md:px-4 md:pb-32 md:pt-10">
          <FilterBar
            activeCategory={activeCategory}
            activeQuery={activeQuery}
            activeSort={activeSort}
            activeOss={activeOss}
            activeLanguage={activeLanguage}
          />

          {profile.total > 0 && !filtersActive ? (
            <div className="mb-2 mt-0.5 flex justify-center md:mb-3 md:mt-1">
              <PersonalizationBadge profileSize={profile.total} />
            </div>
          ) : null}

          {projects.length === 0 && filtersActive ? (
            <EmptyFilterState
              query={activeQuery}
              category={activeCategory}
            />
          ) : projects.length === 0 ? (
            <EmptyDeckState username={user.github_username} />
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

function EmptyDeckState({ username }: { username: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-10 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/30">
        <span className="text-2xl">★</span>
      </div>
      <h2 className="text-xl font-semibold">You&apos;re all caught up, @{username}.</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Either you&apos;ve seen every project, or the feed is regrouping. Try{" "}
        <Link href="/api/random" className="text-primary underline">a surprise</Link>,
        peek the <Link href="/launches" className="text-primary underline">launch wall</Link>,
        or <Link href="/projects/new" className="text-primary underline">submit something</Link>.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Data                                                                     */
/* ------------------------------------------------------------------------ */

type FeedFilters = {
  query: string | null;
  category: string | null;
  sort: SortValue;
  oss: OssState;
  language: string | null;
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

  if (filters.oss === "true") {
    query = query.eq("is_open_source", true);
  } else if (filters.oss === "false") {
    query = query.eq("is_open_source", false);
  }

  if (filters.language) {
    // Case-insensitive exact match. ilike with no wildcards behaves like
    // a case-insensitive `=` and lets us avoid an `eq` mismatch on
    // mixed-case rows ("typescript" vs "TypeScript").
    query = query.ilike("github_language", filters.language);
  }

  if (filters.query) {
    // Postgres ILIKE escape — keep `%` and `_` literal in user input so
    // a stray underscore doesn't act as a wildcard. PostgREST treats
    // `,` `(` `)` specially in .or(), so we strip them too.
    const safe = filters.query
      .replace(/[\\%_]/g, (m) => `\\${m}`)
      .replace(/[(),]/g, " ")
      .trim();
    if (safe.length > 0) {
      // Match against title, tagline, AND description so search digs
      // beyond the surface fields. Ranking happens in-memory below.
      query = query.or(
        `title.ilike.%${safe}%,tagline.ilike.%${safe}%,description_md.ilike.%${safe}%`,
      );
    }
  }

  // SQL-side ordering. For everything except `alpha`/`popular`/`fresh` we
  // do recency desc and let the in-memory scorer take over. Bumping the
  // limit a touch for `alpha`/`popular` because the in-memory scorer won't
  // re-rank those.
  if (filters.sort === "alpha") {
    query = query.order("title", { ascending: true });
  } else if (filters.sort === "popular") {
    query = query.order("github_stars", { ascending: false, nullsFirst: false });
  } else {
    // `fresh` and `trending` both want recency-first as the prefetch order.
    query = query.order("created_at", { ascending: false });
  }

  const { data: recent } = await query.limit(60);

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
  const candidates = recent.filter((p) => !swipedSet.has(p.id));

  // Apply sort. `trending` reuses the personalized scorer; the others
  // honour the SQL order we already requested (so we just take the prefix).
  type Ranked = { project: typeof recent[number]; score: number };
  let ordered: Ranked[];

  if (filters.sort === "trending") {
    ordered = candidates
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
  } else {
    // SQL already ordered the rows correctly — preserve that order.
    ordered = candidates.map((p, i) => ({ project: p, score: -i }));
  }

  // When a search is active, re-rank by match-strength (exact title >
  // title-contains > tagline > description) so the top hit is the most
  // relevant — not just the most recent. Tied matches keep the inner sort.
  if (filters.query) {
    const needle = filters.query.toLowerCase();
    const matchScore = (p: { title: string; tagline: string; description_md: string | null }) => {
      const title = (p.title ?? "").toLowerCase();
      const tagline = (p.tagline ?? "").toLowerCase();
      const desc = (p.description_md ?? "").toLowerCase();
      if (title === needle) return 4;
      if (title.startsWith(needle)) return 3;
      if (title.includes(needle)) return 2;
      if (tagline.includes(needle)) return 1;
      if (desc.includes(needle)) return 0.5;
      return 0;
    };
    ordered = ordered
      .map((r, i) => ({
        ...r,
        // Combine: relevance dominates, then inner score breaks ties.
        score: matchScore(r.project as { title: string; tagline: string; description_md: string | null }) * 1000
          + r.score
          - i * 0.0001,
      }))
      .sort((a, b) => b.score - a.score);
  }

  // If a focus id is provided (deep-link from a share page), bring it to
  // the top so it's the first card the user sees.
  const finalOrdered = focusId
    ? [
        ...ordered.filter((r) => r.project.id === focusId),
        ...ordered.filter((r) => r.project.id !== focusId),
      ]
    : ordered;

  const top = finalOrdered.slice(0, 20).map((r) => r.project);

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
