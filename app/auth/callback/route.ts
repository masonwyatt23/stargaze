/**
 * GitHub OAuth callback handler.
 *
 * Flow:
 *   1. Supabase redirects here with `?code=...` (PKCE).
 *   2. Exchange the code for a session — this also sets the auth cookie.
 *   3. Capture `session.provider_token` (the GitHub access token).
 *   4. Encrypt it and upsert the `users` row with profile data pulled
 *      from `session.user.user_metadata` (provided by GitHub).
 *   5. Redirect to `/feed` (or `?next=...` if we were carrying one).
 *
 * On any failure we redirect to `/sign-in?error=...`. We never log the
 * provider token, the encryption key, or the encrypted blob.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { encryptToken } from "@/lib/crypto/token";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/feed";
  const oauthError = url.searchParams.get("error");

  const origin = url.origin;
  const errorRedirect = (slug: string) =>
    NextResponse.redirect(new URL(`/sign-in?error=${slug}`, origin));

  if (oauthError || !code) {
    return errorRedirect("oauth_failed");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session || !data.user) {
    return errorRedirect("exchange_failed");
  }

  const { session, user } = data;

  // GitHub's PKCE flow gives us the user's access token here. Without
  // it we can't auto-star repos, so we hard-fail rather than silently
  // continuing with an account that won't work.
  const providerToken = session.provider_token;
  if (!providerToken) {
    return errorRedirect("no_provider_token");
  }

  // Pull GitHub profile data from auth metadata.
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const githubUsername =
    (meta.user_name as string | undefined) ??
    (meta.preferred_username as string | undefined) ??
    null;

  // GitHub IDs come through as either number or string depending on
  // provider config — coerce to BIGINT-compatible number.
  const rawGithubId =
    (meta.provider_id as string | number | undefined) ??
    (meta.sub as string | number | undefined) ??
    null;
  const githubId = rawGithubId == null ? null : Number(rawGithubId);

  if (!githubUsername || !githubId || Number.isNaN(githubId)) {
    return errorRedirect("user_upsert_failed");
  }

  const displayName =
    (meta.full_name as string | undefined) ??
    (meta.name as string | undefined) ??
    null;
  const avatarUrl = (meta.avatar_url as string | undefined) ?? null;
  const bio = (meta.bio as string | undefined) ?? null;

  let encrypted: string;
  try {
    encrypted = await encryptToken(providerToken);
  } catch {
    return errorRedirect("user_upsert_failed");
  }

  // Use the service-role client to write the encrypted token. The
  // anon-client's INSERT policy on `users` would also allow this for
  // auth.uid() = id, but the token column is sensitive enough that we
  // prefer the explicit privileged write.
  const admin = createServiceClient();
  const { error: upsertError } = await admin.from("users").upsert(
    {
      id: user.id,
      github_username: githubUsername,
      github_id: githubId,
      display_name: displayName,
      avatar_url: avatarUrl,
      bio,
      github_token_encrypted: encrypted,
    },
    { onConflict: "id" },
  );

  if (upsertError) {
    return errorRedirect("user_upsert_failed");
  }

  // Validate the redirect target — only allow same-origin paths.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/feed";
  return NextResponse.redirect(new URL(safeNext, origin));
}
