/**
 * POST /api/swipe/undo — remove an existing swipe.
 *
 * Used by long-press-to-remove on the Saves screen. If the original swipe
 * had `github_starred=true`, we symmetrically un-star the repo so the
 * user's GitHub stars stay in sync with what they see in the app.
 *
 * Like the swipe endpoint, the un-star is best-effort: deleting the row
 * always succeeds even if GitHub returns an error.
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { decryptToken } from "@/lib/crypto/token";
import { log } from "@/lib/log";
import { parseGithubRepo } from "@/lib/utils";
import {
  GitHubAuthError,
  GitHubRateLimitError,
  unstarRepo,
} from "@/lib/github";
import type { DBProject, DBSwipe } from "@/lib/types/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UndoBodySchema = z.object({
  projectId: z.string().uuid(),
});

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = UndoBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { projectId } = parsed.data;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  // Fetch the swipe + the project (so we can look up the repo URL even after
  // the swipe row is deleted, and to know whether we starred it).
  const { data: swipe } = await supabase
    .from("swipes")
    .select("id, github_starred, project_id")
    .eq("user_id", user.id)
    .eq("project_id", projectId)
    .maybeSingle<Pick<DBSwipe, "id" | "github_starred" | "project_id">>();

  if (!swipe) {
    return NextResponse.json({ error: "swipe_not_found" }, { status: 404 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, github_repo_url, is_open_source")
    .eq("id", projectId)
    .maybeSingle<Pick<DBProject, "id" | "github_repo_url" | "is_open_source">>();

  // Delete first; un-star is best-effort and shouldn't gate the UX.
  const { error: deleteErr } = await supabase
    .from("swipes")
    .delete()
    .eq("id", swipe.id)
    .eq("user_id", user.id); // RLS-belt-and-suspenders

  if (deleteErr) {
    return NextResponse.json(
      { error: "swipe_delete_failed", message: deleteErr.message },
      { status: 500 },
    );
  }

  let githubUnstarred = false;
  const shouldUnstar =
    swipe.github_starred &&
    !!project?.github_repo_url &&
    !!user.github_token_encrypted;

  if (shouldUnstar) {
    const parsedRepo = parseGithubRepo(project!.github_repo_url!);
    if (parsedRepo) {
      try {
        const token = await decryptToken(user.github_token_encrypted!);
        await unstarRepo({ owner: parsedRepo.owner, repo: parsedRepo.repo, token });
        githubUnstarred = true;
      } catch (err) {
        if (err instanceof GitHubAuthError) {
          log({
            level: "warn",
            event: "swipe.undo.github.token_rejected",
            userId: user.id,
            projectId,
          });
          await supabase
            .from("users")
            .update({ github_token_encrypted: null })
            .eq("id", user.id);
        } else if (err instanceof GitHubRateLimitError) {
          log({
            level: "warn",
            event: "swipe.undo.github.rate_limited",
            userId: user.id,
            projectId,
            resetAt: err.resetAt?.toISOString() ?? null,
          });
        } else {
          log({
            level: "error",
            event: "swipe.undo.github.unstar.failed",
            userId: user.id,
            projectId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }
  }

  return NextResponse.json({ undone: true, githubUnstarred }, { status: 200 });
}
