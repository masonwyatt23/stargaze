/**
 * Server-side helper for the claim flow.
 *
 * When a real GitHub user signs in we want to surface projects that were
 * imported into the catalog by a *system* curator account (sentinel rows
 * with `github_id <= 0`, e.g. `@stargaze-curator` or `@maswy23`) but whose
 * `github_repo_url` actually belongs to the signing-in user — either
 * under their personal namespace OR under one of the GitHub orgs they're
 * a member of.
 */
import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import type { DBProject } from "@/lib/types/db";
import { parseGithubRepo } from "@/lib/utils";

export const CURATOR_USERNAME = "stargaze-curator";

/** Lowercased GitHub login (or org slug) — same shape we store in `users.github_orgs`. */
type OwnerSlug = string;

function buildOwnerSet(
  githubUsername: string,
  githubOrgs: string[],
): Set<OwnerSlug> {
  const owners = new Set<OwnerSlug>();
  if (githubUsername) owners.add(githubUsername.toLowerCase());
  for (const org of githubOrgs ?? []) {
    if (org) owners.add(org.toLowerCase());
  }
  return owners;
}

/**
 * Resolve every "system" user id — accounts seeded by the import script
 * with `github_id <= 0`. Their projects are the only ones eligible to be
 * claimed; everything else is owned by a real human.
 */
async function resolveSystemUserIds(
  sb: ReturnType<typeof createServiceClient>,
): Promise<string[]> {
  const { data, error } = await sb
    .from("users")
    .select("id")
    .lte("github_id", 0);
  if (error || !data) return [];
  return data.map((row) => row.id as string);
}

/**
 * Returns up to 50 projects in the DB that:
 *   - are owned by any system user (sentinel `github_id <= 0`), and
 *   - whose github_repo_url owner matches `githubUsername` OR appears in
 *     `githubOrgs` (case-insensitive).
 *
 * Uses the service-role client because the system user's projects live
 * under a different `user_id` than the requesting user — RLS would
 * otherwise block a direct SELECT on rows the user can't yet claim. We
 * restrict the query server-side and only ever return rows that the
 * requesting user is authorized to claim, so the privilege escalation
 * surface is bounded.
 */
export async function findClaimableProjects(
  userId: string,
  githubUsername: string,
  githubOrgs: string[] = [],
): Promise<DBProject[]> {
  if (!userId || !githubUsername) return [];

  const sb = createServiceClient();

  const systemUserIds = await resolveSystemUserIds(sb);
  if (systemUserIds.length === 0) return [];
  // The requesting user shouldn't be a system user themselves; if they
  // are, treat as nothing-to-claim rather than letting them claim from
  // their own row.
  if (systemUserIds.includes(userId)) return [];

  const owners = buildOwnerSet(githubUsername, githubOrgs);
  if (owners.size === 0) return [];

  // Build a Supabase `or(...)` filter — one ilike clause per candidate
  // owner. GitHub usernames/org slugs use a restricted character set
  // (alphanumeric + hyphen), so the only ilike-special chars to worry
  // about are `%`, `_`, and `\`. We escape defensively anyway.
  const orFilter = Array.from(owners)
    .map((owner) => {
      const safe = owner.replace(/[\\%_]/g, (m) => `\\${m}`);
      return `github_repo_url.ilike.https://github.com/${safe}/%`;
    })
    .join(",");

  const { data, error } = await sb
    .from("projects")
    .select(
      `id, slug, user_id, title, tagline, description_md, description_html,
       github_repo_url, github_stars, github_language, is_open_source,
       cta_url, category, status, created_at, updated_at`,
    )
    .in("user_id", systemUserIds)
    .or(orFilter)
    .limit(50);

  if (error || !data) return [];

  // Defense in depth: re-validate ownership using parseGithubRepo so URL
  // variants (trailing slash, .git, query strings) all hit the same code
  // path used by the claim action.
  return (data as DBProject[]).filter((p) => {
    if (!p.github_repo_url) return false;
    const parsed = parseGithubRepo(p.github_repo_url);
    if (!parsed) return false;
    return owners.has(parsed.owner.toLowerCase());
  });
}
