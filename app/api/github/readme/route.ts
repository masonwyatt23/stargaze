/**
 * POST /api/github/readme — fetch + render a repo's README to sanitized HTML.
 *
 * Used by the project-create flow to preview the README inline. Always runs
 * server-side so we can safely use marked + DOMPurify and avoid CORS issues.
 *
 * Body: { githubRepoUrl: string }
 *
 * Returns: { html: string, truncated: boolean }
 *
 * If the input markdown exceeds 50KB, we truncate before rendering to keep
 * the response payload bounded.
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { parseGithubRepo } from "@/lib/utils";
import { renderMarkdown } from "@/lib/markdown";
import {
  GitHubError,
  GitHubNotFoundError,
  GitHubRateLimitError,
  fetchReadme,
} from "@/lib/github";
import { getCurrentUser } from "@/lib/auth/get-user";
import { decryptToken } from "@/lib/crypto/token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MARKDOWN_BYTES = 50 * 1024; // 50KB

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

  // Use the user's token if available — public-only is fine without one,
  // but authed requests get 5000/hr instead of 60/hr.
  let token: string | null = null;
  const user = await getCurrentUser();
  if (user?.github_token_encrypted) {
    try {
      token = await decryptToken(user.github_token_encrypted);
    } catch {
      // Bad ciphertext is non-fatal here; fall back to anon GH access.
      token = null;
    }
  }

  try {
    const md = await fetchReadme({ owner: repo.owner, repo: repo.repo, token });
    const truncated = md.length > MAX_MARKDOWN_BYTES;
    const source = truncated ? md.slice(0, MAX_MARKDOWN_BYTES) : md;
    const html = renderMarkdown(source);
    return NextResponse.json({ html, truncated }, { status: 200 });
  } catch (err) {
    if (err instanceof GitHubNotFoundError) {
      return NextResponse.json({ error: "readme_not_found" }, { status: 404 });
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
    console.error("[github/readme] unexpected error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
