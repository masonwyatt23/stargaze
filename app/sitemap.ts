import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

/**
 * Dynamic sitemap. Includes static marketing/feed pages, every live project
 * (`/p/[slug]`), and every creator profile that has at least one live project
 * (`/u/[username]`). `lastModified` reflects project.updated_at and
 * user.created_at so search engines can spot fresh content.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://stargaze-evero.vercel.app";

  // Trim any trailing slash so we never emit `//path`.
  const origin = baseUrl.replace(/\/$/, "");

  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${origin}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${origin}/feed`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${origin}/leaderboard`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${origin}/sign-in`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  // Pull live projects + their creator handle in one round-trip.
  // We tolerate a Supabase miss gracefully — sitemaps must never 500.
  let projectEntries: MetadataRoute.Sitemap = [];
  let creatorEntries: MetadataRoute.Sitemap = [];

  try {
    const supabase = await createClient();
    const { data: rows } = await supabase
      .from("projects")
      .select(
        `slug, updated_at,
         creator:users!projects_user_id_fkey(github_username, created_at)`,
      )
      .eq("status", "live")
      .order("updated_at", { ascending: false })
      .limit(5000);

    type Row = {
      slug: string;
      updated_at: string;
      creator: {
        github_username: string;
        created_at: string;
      } | null;
    };

    const projects = (rows ?? []) as unknown as Row[];

    projectEntries = projects.map((p) => ({
      url: `${origin}/p/${p.slug}`,
      lastModified: new Date(p.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    // Dedupe creators since one creator can have many projects. Keep the
    // earliest created_at as the lastModified hint (creator metadata changes
    // rarely; profile freshness comes from their projects).
    const creatorMap = new Map<string, Date>();
    for (const p of projects) {
      if (!p.creator) continue;
      const existing = creatorMap.get(p.creator.github_username);
      const candidate = new Date(p.creator.created_at);
      if (!existing || candidate < existing) {
        creatorMap.set(p.creator.github_username, candidate);
      }
    }

    creatorEntries = Array.from(creatorMap.entries()).map(
      ([username, lastModified]) => ({
        url: `${origin}/u/${username}`,
        lastModified,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }),
    );
  } catch {
    // Swallow — at minimum we'll still ship the static entries.
  }

  return [...staticEntries, ...projectEntries, ...creatorEntries];
}
