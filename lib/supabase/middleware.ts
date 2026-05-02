/**
 * Middleware helper — refreshes the Supabase auth session cookie on
 * every request that matches the matcher in the project-root
 * `middleware.ts`.
 *
 * NOTE on Next.js 16: the file convention `middleware.ts` is deprecated
 * in favor of `proxy.ts`, but the legacy name still works. This helper
 * is generic over the request and can be reused if/when we migrate to
 * `proxy.ts`.
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If env is missing, don't crash the request — just skip the refresh.
  if (!url || !anonKey) {
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Touch the user — this triggers token refresh + cookie set if needed.
  // Use `getUser()` (verifies with the auth server) rather than
  // `getSession()` (reads cookie blindly) so we never trust stale data.
  await supabase.auth.getUser();

  return response;
}
