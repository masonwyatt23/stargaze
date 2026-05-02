/**
 * Server Supabase client — for Server Components, Server Actions, and
 * Route Handlers. Uses the Next.js 16 async `cookies()` helper.
 *
 * Two flavors:
 *   - createClient()        — anon-key client, scoped to the user's session.
 *   - createServiceClient() — service-role client (admin). Only call this
 *                             from server code that absolutely needs to
 *                             bypass RLS (e.g. OAuth callback writing the
 *                             encrypted GitHub token, cron functions).
 */
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  // Next.js 16: `cookies()` is async.
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // `cookies().set` throws when called from a Server Component.
          // The middleware refreshes the session, so it's safe to ignore.
        }
      },
    },
  });
}

/**
 * Service-role client. Bypasses RLS. Never expose to the browser, never
 * log its key, never use it for ordinary user-scoped queries — use
 * `createClient()` above instead.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return createSupabaseClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
