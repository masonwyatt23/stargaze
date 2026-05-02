import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { X } from "lucide-react";
import { Logo } from "@/components/logo";
import { LaunchCardStatic } from "@/components/launches/launch-card-static";
import {
  MoreLaunchesRail,
  type RailProject,
} from "@/components/launches/more-launches-rail";
import { createClient } from "@/lib/supabase/server";
import type { LaunchProject } from "@/app/launches/page";

export const dynamic = "force-dynamic";

type LaunchSlugPageProps = {
  // Next.js 16: params is async.
  params: Promise<{ slug: string }>;
};

/* ------------------------------------------------------------------------ */
/* Metadata                                                                  */
/* ------------------------------------------------------------------------ */

export async function generateMetadata({
  params,
}: LaunchSlugPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("title, tagline, status")
    .eq("slug", slug)
    .eq("status", "live")
    .maybeSingle();

  if (!data) return { title: "Launch not found · Stargaze" };

  const title = `${data.title} · Stargaze launch`;
  const description = (data.tagline as string) ?? undefined;
  const ogImage = `/p/${slug}/opengraph-image`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

/* ------------------------------------------------------------------------ */
/* Page                                                                      */
/* ------------------------------------------------------------------------ */

/**
 * `/launches/[slug]` — immersive deep-link to a single launch.
 *
 * Sibling to `/launches#NN` (the hash-anchored scroll wall) but with a
 * canonical, shareable URL. No Nav, no Footer — only a logo home-link
 * top-left and a close button top-right. Bottom-of-fold hosts a small
 * horizontal rail of 5 other recent launches so visitors can hop
 * laterally without bouncing back to the wall.
 *
 * 404s if the slug doesn't resolve OR the project isn't `status='live'`.
 */
export default async function LaunchSlugPage({
  params,
}: LaunchSlugPageProps) {
  const { slug } = await params;

  const supabase = await createClient();

  // Pull the deck of live projects in recency order. We need the full
  // ordered set so we can compute the section ordinal (so the close
  // button can return the visitor to `/launches#NN`) and slice the
  // "more launches" rail with the same recency sort.
  const { data: deck } = await supabase
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

  const rows = deck ?? [];
  const ordinal = rows.findIndex((r) => r.slug === slug);
  if (ordinal === -1) notFound();

  const ids = rows.map((r) => r.id as string);

  // Right-swipe count for ranking chip — single round trip, same shape
  // as `/launches/page.tsx`. We only need this for the focused project
  // and the rail items; map by id for cheap lookup.
  const { data: rights } = await supabase
    .from("swipes")
    .select("project_id")
    .in("project_id", ids)
    .eq("direction", "right");

  const rightCount = new Map<string, number>();
  for (const r of rights ?? []) {
    rightCount.set(r.project_id, (rightCount.get(r.project_id) ?? 0) + 1);
  }

  const focused = toLaunchProject(rows[ordinal], rightCount);

  // 5 other live projects, recency-sorted, excluding this one. We slice
  // from `rows` rather than re-querying — they're already ordered.
  const railSource = rows
    .filter((r) => r.slug !== slug)
    .slice(0, 5)
    .map(toRailProject);

  const total = rows.length;
  const indexLabel = String(ordinal + 1).padStart(2, "0");
  const closeHref = total > 0 ? `/launches#${indexLabel}` : "/launches";

  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-background text-foreground">
      {/* ============================== Top bar ============================ */}
      {/* Mirrors the `<ExitControls>` proportions used on the wall, but
          static — no observer state to lift. */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50">
        <div className="pointer-events-auto flex items-center justify-between gap-4 border-b border-border/30 bg-background/60 px-4 py-3 backdrop-blur-md md:px-6">
          <div className="flex shrink-0 items-center">
            <Logo size="sm" />
          </div>

          <Link
            href={closeHref}
            aria-label="Close launch — view all launches"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border/40 bg-card/40 px-3 py-1.5 text-xs font-medium text-foreground/90 transition-colors hover:border-primary/40 hover:bg-card/70 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <X className="size-3.5" aria-hidden />
            <span>Close · view all launches</span>
          </Link>
        </div>
      </header>

      {/* ============================== Hero =============================== */}
      <LaunchCardStatic
        project={focused}
        index={ordinal + 1}
        total={total}
        showsCTAToFullDeck
      />

      {/* ============================== Rail =============================== */}
      <MoreLaunchesRail projects={railSource} />
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Mappers                                                                   */
/* ------------------------------------------------------------------------ */

type DeckRow = {
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
  creator:
    | {
        github_username: string;
        display_name: string | null;
        avatar_url: string | null;
      }
    | Array<{
        github_username: string;
        display_name: string | null;
        avatar_url: string | null;
      }>
    | null;
  media:
    | Array<{ url: string; type: string; order_index: number }>
    | null;
};

function toLaunchProject(
  row: unknown,
  rightCount: Map<string, number>,
): LaunchProject {
  const r = row as DeckRow;
  const creator = Array.isArray(r.creator) ? r.creator[0] : r.creator;
  const media = (r.media ?? []) as Array<{
    url: string;
    type: string;
    order_index: number;
  }>;
  const sortedMedia = [...media].sort(
    (a, b) => a.order_index - b.order_index,
  );

  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    tagline: r.tagline,
    description_html: r.description_html ?? null,
    github_repo_url: r.github_repo_url ?? null,
    github_stars: r.github_stars ?? null,
    github_language: r.github_language ?? null,
    is_open_source: Boolean(r.is_open_source),
    cta_url: r.cta_url ?? null,
    category: r.category ?? null,
    creator: creator
      ? {
          github_username: creator.github_username ?? "",
          display_name: creator.display_name ?? null,
          avatar_url: creator.avatar_url ?? null,
        }
      : null,
    media: sortedMedia,
    right_swipe_count: rightCount.get(r.id) ?? 0,
  };
}

function toRailProject(row: unknown): RailProject {
  const r = row as DeckRow;
  const creator = Array.isArray(r.creator) ? r.creator[0] : r.creator;
  const media = (r.media ?? []) as Array<{
    url: string;
    type: string;
    order_index: number;
  }>;
  const cover =
    [...media]
      .sort((a, b) => a.order_index - b.order_index)
      .find((m) => m.type !== "video") ?? null;

  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    github_stars: r.github_stars ?? null,
    creator: creator
      ? {
          github_username: creator.github_username ?? "",
          display_name: creator.display_name ?? null,
        }
      : null,
    cover: cover ? { url: cover.url, type: cover.type } : null,
  };
}
