/**
 * POST /api/swipe — record a swipe.
 *
 * Body: { projectId: string (uuid), direction: "right" | "left" }
 *
 * On a right-swipe of an open-source project, we *best-effort* star the repo
 * on the user's behalf if they have a stored token and auto_star is enabled.
 * The swipe always succeeds even if the star call fails (timeout, rate limit,
 * etc) — UX rule: never block a swipe on an external API.
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { decryptToken } from "@/lib/crypto/token";
import { maybeSendMilestoneEmail } from "@/lib/email/milestone";
import { log } from "@/lib/log";
import { parseGithubRepo } from "@/lib/utils";
import {
  GitHubAuthError,
  GitHubRateLimitError,
  starRepo,
} from "@/lib/github";
import type { DBProject } from "@/lib/types/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SwipeBodySchema = z.object({
  projectId: z.string().uuid(),
  direction: z.enum(["right", "left"]),
});

export async function POST(request: Request): Promise<Response> {
  // ---- Parse + validate body ----
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = SwipeBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { projectId, direction } = parsed.data;

  // ---- Auth ----
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  // ---- Project lookup (must be live) ----
  const { data: project, error: projectErr } = await supabase
    .from("projects")
    .select(
      "id, status, is_open_source, github_repo_url, user_id",
    )
    .eq("id", projectId)
    .maybeSingle<
      Pick<DBProject, "id" | "status" | "is_open_source" | "github_repo_url" | "user_id">
    >();

  if (projectErr) {
    return NextResponse.json({ error: "db_error", message: projectErr.message }, { status: 500 });
  }
  if (!project || project.status !== "live") {
    return NextResponse.json({ error: "project_not_found" }, { status: 404 });
  }

  // ---- Insert the swipe ----
  // No pre-check SELECT — the unique (user_id, project_id) constraint is the
  // real fence. Map the duplicate-key violation to a clean 409 here.
  const { data: swipe, error: insertErr } = await supabase
    .from("swipes")
    .insert({
      user_id: user.id,
      project_id: projectId,
      direction,
      github_starred: false,
    })
    .select("id")
    .single<{ id: string }>();

  if (insertErr || !swipe) {
    // Postgres unique-violation = 23505 → already swiped on this project.
    if (insertErr?.code === "23505") {
      return NextResponse.json({ error: "already_swiped" }, { status: 409 });
    }
    // Rate-limit raised by trigger.
    if (insertErr?.message?.includes("rate_limit_exceeded")) {
      return NextResponse.json({ error: "rate_limit_exceeded" }, { status: 429 });
    }
    return NextResponse.json(
      { error: "swipe_insert_failed", message: insertErr?.message ?? "unknown" },
      { status: 500 },
    );
  }

  // ---- Best-effort GitHub star on right-swipe ----
  let githubStarred = false;
  const shouldStar =
    direction === "right" &&
    project.is_open_source &&
    user.auto_star_enabled &&
    !!user.github_token_encrypted &&
    !!project.github_repo_url;

  if (shouldStar) {
    const parsedRepo = project.github_repo_url
      ? parseGithubRepo(project.github_repo_url)
      : null;

    if (parsedRepo) {
      try {
        const token = await decryptToken(user.github_token_encrypted!);
        await starRepo({ owner: parsedRepo.owner, repo: parsedRepo.repo, token });
        githubStarred = true;

        // Mark the swipe row as starred (don't fail the response on this).
        const { error: updateErr } = await supabase
          .from("swipes")
          .update({
            github_starred: true,
            github_star_synced_at: new Date().toISOString(),
          })
          .eq("id", swipe.id);

        if (updateErr) {
          log({
            level: "error",
            event: "swipe.mark_starred.failed",
            swipeId: swipe.id,
            userId: user.id,
            projectId,
            error: updateErr.message,
          });
        }
      } catch (err) {
        if (err instanceof GitHubAuthError) {
          // Token is dead — clear it so the user is forced to re-auth.
          log({
            level: "warn",
            event: "swipe.github.token_rejected",
            userId: user.id,
            projectId,
          });
          const { error: clearErr } = await supabase
            .from("users")
            .update({ github_token_encrypted: null })
            .eq("id", user.id);
          if (clearErr) {
            log({
              level: "error",
              event: "swipe.github.clear_token.failed",
              userId: user.id,
              error: clearErr.message,
            });
          }
        } else if (err instanceof GitHubRateLimitError) {
          log({
            level: "warn",
            event: "swipe.github.rate_limited",
            userId: user.id,
            projectId,
            resetAt: err.resetAt?.toISOString() ?? null,
          });
        } else {
          log({
            level: "error",
            event: "swipe.github.star.failed",
            userId: user.id,
            projectId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
        // githubStarred stays false; swipe response still succeeds.
      }
    }
  }

  // Milestone email — fire-but-await so it completes before the serverless
  // function unfreezes. No-ops for left-swipes and for projects that haven't
  // crossed a milestone count.
  if (direction === "right") {
    await maybeSendMilestoneEmail({ projectId });
  }

  return NextResponse.json(
    { swipeId: swipe.id, githubStarred },
    { status: 200 },
  );
}
