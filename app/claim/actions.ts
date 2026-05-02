"use server";

/**
 * Server actions for the claim flow.
 *
 * `claimProjects()` transfers ownership of one or more system-imported
 * projects to the signing-in user. We re-validate ownership for *every*
 * project at action time — never trust the form payload alone — so a
 * forged hidden input can't grant ownership of someone else's project.
 *
 * "System" = sentinel user accounts seeded by the import script with
 * `github_id <= 0` (e.g. `@stargaze-curator`, `@maswy23`). Ownership of
 * a candidate row may match the user's own GitHub username OR any of
 * the GitHub orgs they're a member of.
 */
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { parseGithubRepo } from "@/lib/utils";

export async function claimProjects(
  projectIds: string[],
): Promise<{ claimed: number; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { claimed: 0, error: "Not signed in." };

  if (!Array.isArray(projectIds) || projectIds.length === 0) {
    return { claimed: 0 };
  }

  // Cap the batch size to bound the validation cost.
  const ids = projectIds.slice(0, 20);

  const sb = createServiceClient();

  // Resolve every system-curator user id (`github_id <= 0`). Only rows
  // owned by one of these accounts are claimable. If there are none
  // (fresh dev env), nothing to do.
  const { data: systemUsers } = await sb
    .from("users")
    .select("id")
    .lte("github_id", 0);

  const systemUserIds = (systemUsers ?? []).map((u) => u.id as string);
  if (systemUserIds.length === 0) {
    return { claimed: 0, error: "No system curator accounts found." };
  }
  if (systemUserIds.includes(user.id)) {
    return { claimed: 0, error: "System accounts can't claim from themselves." };
  }

  // Pull only the rows that match our id list AND are owned by a system
  // user. Anything else is silently dropped.
  const { data: rows, error } = await sb
    .from("projects")
    .select("id, user_id, github_repo_url, slug")
    .in("user_id", systemUserIds)
    .in("id", ids);

  if (error) return { claimed: 0, error: "Lookup failed." };
  if (!rows || rows.length === 0) return { claimed: 0 };

  // Ownership match set: the user's own login plus any orgs they belong
  // to. Lowercased to match `parseGithubRepo` output and our storage.
  const owners = new Set<string>();
  if (user.github_username) owners.add(user.github_username.toLowerCase());
  for (const org of user.github_orgs ?? []) {
    if (org) owners.add(org.toLowerCase());
  }

  const eligible = rows.filter((r) => {
    if (!r.github_repo_url) return false;
    const parsed = parseGithubRepo(r.github_repo_url);
    if (!parsed) return false;
    return owners.has(parsed.owner.toLowerCase());
  });

  if (eligible.length === 0) return { claimed: 0 };

  const eligibleIds = eligible.map((r) => r.id);

  const { error: updateErr, count } = await sb
    .from("projects")
    .update({ user_id: user.id }, { count: "exact" })
    .in("id", eligibleIds)
    .in("user_id", systemUserIds); // belt-and-suspenders against TOCTOU

  if (updateErr) return { claimed: 0, error: "Claim failed." };

  // Refresh anywhere these projects might be displayed.
  revalidatePath("/claim");
  revalidatePath("/dashboard");
  revalidatePath("/feed");
  revalidatePath(`/u/${user.github_username}`);
  for (const row of eligible) {
    revalidatePath(`/p/${row.slug}`);
  }

  return { claimed: count ?? eligible.length };
}
