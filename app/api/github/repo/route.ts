/**
 * POST /api/github/repo — fetch GitHub repo metadata.
 *
 * Used by the project-create form to auto-fill description, language, stars,
 * and default branch when the user pastes a GitHub URL.
 *
 * Body: { githubRepoUrl: string }
 *
 * Returns a small subset of the GH `/repos/:owner/:repo` payload.
 *
 * Auth is optional — the GH endpoint is public for public repos. We attach
 * the caller's token if they happen to be signed in to dodge the 60/hr
 * anonymous rate limit.
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { parseGithubRepo } from "@/lib/utils";
import {
  GitHubError,
  GitHubNotFoundError,
  GitHubRateLimitError,
  fetchRepoMetadata,
} from "@/lib/github";
import { getCurrentUser } from "@/lib/auth/get-user";
import { decryptToken } from "@/lib/crypto/token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  githubRepoUrl: z.string().url().max(500),
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

  const repo = parseGithubRepo(parsed.data.githubRepoUrl);
  if (!repo) {
    return NextResponse.json({ error: "invalid_github_url" }, { status: 400 });
  }

  // Try to pick up a token if the caller is signed in (better rate limits).
  let token: string | null = null;
  const user = await getCurrentUser();
  if (user?.github_token_encrypted) {
    try {
      token = await decryptToken(user.github_token_encrypted);
    } catch {
      token = null;
    }
  }

  try {
    const meta = await fetchRepoMetadata({ owner: repo.owner, repo: repo.repo, token });
    return NextResponse.json(
      {
        owner: repo.owner,
        repo: repo.repo,
        name: meta.name,
        full_name: meta.full_name,
        description: meta.description,
        html_url: meta.html_url,
        homepage: meta.homepage,
        default_branch: meta.default_branch,
        language: meta.language,
        stargazers_count: meta.stargazers_count,
        forks_count: meta.forks_count,
        open_issues_count: meta.open_issues_count,
        topics: meta.topics,
        license: meta.license,
        private: meta.private,
        archived: meta.archived,
        fork: meta.fork,
      },
      { status: 200 },
    );
  } catch (err) {
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
    console.error("[github/repo] unexpected error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
