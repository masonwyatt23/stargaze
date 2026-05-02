/**
 * `getCurrentUser()` — server-side helper for RSC and route handlers.
 *
 * Returns the user's row from our `users` table (joined with the
 * verified Supabase auth identity), or `null` when no one is signed in.
 *
 * Uses `supabase.auth.getUser()` which contacts the auth server and
 * verifies the JWT — never trust `getSession()` for auth decisions.
 */
import "server-only";
import { createClient } from "@/lib/supabase/server";

export type DBUser = {
  id: string;
  github_username: string;
  github_id: number;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  /**
   * Encrypted GitHub access token. Server-only — never serialize this
   * field to a client component or response body. Decrypt with
   * `decryptToken()` from `@/lib/crypto/token` before calling GitHub.
   */
  github_token_encrypted: string | null;
  /**
   * Lowercased GitHub org logins this user is a member of. Refreshed on
   * every OAuth sign-in. Used by the claim flow to surface repos owned
   * by orgs the user belongs to.
   */
  github_orgs: string[];
  auto_star_enabled: boolean;
  created_at: string;
};

export async function getCurrentUser(): Promise<DBUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const { data, error } = await supabase
    .from("users")
    .select(
      "id, github_username, github_id, display_name, avatar_url, bio, github_token_encrypted, github_orgs, auto_star_enabled, created_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) return null;

  return data as DBUser;
}
