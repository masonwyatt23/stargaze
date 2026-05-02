/**
 * Sign-out endpoint.
 *
 * POST `/auth/sign-out` — clears the Supabase session cookies and
 * redirects to `/`. Use POST (not GET) so a stray <link rel="prefetch">
 * or favicon scrape can't accidentally sign people out.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const origin = new URL(request.url).origin;
  return NextResponse.redirect(new URL("/", origin), { status: 303 });
}
