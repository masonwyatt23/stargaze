/**
 * POST /api/github/unstar — symmetric to /api/github/star.
 *
 * Body: { owner: string, repo: string }
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/crypto/token";
import { log } from "@/lib/log";
import {
  GitHubAuthError,
  GitHubError,
  GitHubNotFoundError,
  GitHubRateLimitError,
  unstarRepo,
} from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  owner: z.string().min(1).max(100),
  repo: z.string().min(1).max(100),
});

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { owner, repo } = parsed.data;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!user.github_token_encrypted) {
    return NextResponse.json({ error: "no_github_token" }, { status: 400 });
  }

  try {
    const token = await decryptToken(user.github_token_encrypted);
    await unstarRepo({ owner, repo, token });
    return NextResponse.json({ unstarred: true }, { status: 200 });
  } catch (err) {
    if (err instanceof GitHubAuthError) {
      const supabase = await createClient();
      await supabase
        .from("users")
        .update({ github_token_encrypted: null })
        .eq("id", user.id);
      return NextResponse.json({ error: "github_auth_failed" }, { status: 401 });
    }
    if (err instanceof GitHubNotFoundError) {
      return NextResponse.json({ error: "repo_not_found" }, { status: 404 });
    }
    if (err instanceof GitHubRateLimitError) {
      return NextResponse.json(
        { error: "github_rate_limited", resetAt: err.resetAt?.toISOString() ?? null },
        { status: 429 },
      );
    }
    if (err instanceof GitHubError) {
      return NextResponse.json(
        { error: "github_error", message: err.message },
        { status: err.status >= 400 && err.status < 600 ? err.status : 502 },
      );
    }
    log({
      level: "error",
      event: "github.unstar.failed",
      userId: user.id,
      owner,
      repo,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
