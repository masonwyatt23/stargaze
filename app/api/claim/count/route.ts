import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { findClaimableProjects } from "@/lib/auth/find-claimable";

export const dynamic = "force-dynamic";

/**
 * GET /api/claim/count — auth-gated.
 *
 * Returns the number of curator-imported projects the current user can
 * claim, plus the titles of the first 3 (for a teaser line in the banner).
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ count: 0, sample: [] }, { status: 401 });
  }

  const projects = await findClaimableProjects(
    user.id,
    user.github_username,
    user.github_orgs ?? [],
  );

  return NextResponse.json(
    {
      count: projects.length,
      sample: projects.slice(0, 3).map((p) => p.title),
    },
    {
      // Don't let intermediaries cache per-user counts.
      headers: { "cache-control": "private, no-store" },
    },
  );
}
