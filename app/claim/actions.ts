"use server";

/**
 * Server actions for the claim flow.
 *
 * `claimProjects()` transfers ownership of one or more curator-imported
 * projects to the signing-in user. We re-validate ownership for *every*
 * project at action time — never trust the form payload alone — so a
 * forged hidden input can't grant ownership of someone else's project.
 */
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { CURATOR_USERNAME } from "@/lib/auth/find-claimable";
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

  // Resolve curator id; only curator-owned projects are claimable.
  const { data: curator } = await sb
    .from("users")
    .select("id")
    .eq("github_username", CURATOR_USERNAME)
    .maybeSingle();
  if (!curator?.id) return { claimed: 0, error: "Curator user not found." };
  if (curator.id === user.id) {
    return { claimed: 0, error: "Curator can't claim from itself." };
  }

  // Pull only the rows that match our id list AND are owned by the
  // curator. Anything else is silently dropped.
  const { data: rows, error } = await sb
    .from("projects")
    .select("id, user_id, github_repo_url, slug")
    .eq("user_id", curator.id)
    .in("id", ids);

  if (error) return { claimed: 0, error: "Lookup failed." };
  if (!rows || rows.length === 0) return { claimed: 0 };

  const lowered = user.github_username.toLowerCase();
  const eligible = rows.filter((r) => {
    if (!r.github_repo_url) return false;
    const parsed = parseGithubRepo(r.github_repo_url);
    return parsed?.owner.toLowerCase() === lowered;
  });

  if (eligible.length === 0) return { claimed: 0 };

  const eligibleIds = eligible.map((r) => r.id);

  const { error: updateErr, count } = await sb
    .from("projects")
    .update({ user_id: user.id }, { count: "exact" })
    .in("id", eligibleIds)
    .eq("user_id", curator.id); // belt-and-suspenders against TOCTOU

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
