/**
 * Server-side helper for the claim flow.
 *
 * When a real GitHub user signs in we want to surface projects that were
 * imported into the catalog by `@stargaze-curator` (the editorial bot
 * with `github_id = 0`) but whose `github_repo_url` actually belongs to
 * the signing-in user. They get the option to claim ownership.
 */
import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import type { DBProject } from "@/lib/types/db";
import { parseGithubRepo } from "@/lib/utils";

export const CURATOR_USERNAME = "stargaze-curator";

/**
 * Returns up to 20 projects in the DB that:
 *   - are owned by `@stargaze-curator` (sentinel github_id=0), and
 *   - whose github_repo_url owner matches `githubUsername` (case-insensitive).
 *
 * Uses the service-role client because the curator's projects live under a
 * different `user_id` than the requesting user — RLS would otherwise block
 * a direct SELECT on rows the user can't yet claim. We restrict the query
 * server-side and only ever return rows that the requesting user is
 * authorized to claim, so the privilege escalation surface is bounded.
 */
export async function findClaimableProjects(
  userId: string,
  githubUsername: string,
): Promise<DBProject[]> {
  if (!userId || !githubUsername) return [];

  const sb = createServiceClient();

  // Resolve curator user id once. If the curator user doesn't exist (e.g. a
  // dev environment that hasn't been seeded) there's nothing to claim.
  const { data: curator } = await sb
    .from("users")
    .select("id")
    .eq("github_username", CURATOR_USERNAME)
    .maybeSingle();

  if (!curator?.id) return [];
  if (curator.id === userId) return []; // curator can't claim from itself

  // ILIKE pattern is bounded to the curator's projects so worst-case scan
  // is small. Escape `%` and `_` from the username to be safe even though
  // GitHub usernames don't allow them.
  const safeUsername = githubUsername.replace(/[\\%_]/g, (m) => `\\${m}`);
  const pattern = `https://github.com/${safeUsername}/%`;

  const { data, error } = await sb
    .from("projects")
    .select(
      `id, slug, user_id, title, tagline, description_md, description_html,
       github_repo_url, github_stars, github_language, is_open_source,
       cta_url, category, status, created_at, updated_at`,
    )
    .eq("user_id", curator.id)
    .ilike("github_repo_url", pattern)
    .limit(20);

  if (error || !data) return [];

  // Defense in depth: re-validate ownership using parseGithubRepo so URL
  // variants (trailing slash, .git, query strings) all hit the same code
  // path used by the claim action.
  const lowered = githubUsername.toLowerCase();
  return (data as DBProject[]).filter((p) => {
    if (!p.github_repo_url) return false;
    const parsed = parseGithubRepo(p.github_repo_url);
    return parsed?.owner.toLowerCase() === lowered;
  });
}
