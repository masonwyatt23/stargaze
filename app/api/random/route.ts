/**
 * GET /api/random — picks one random `status='live'` project and 302-redirects
 * to its share page (`/p/[slug]`).
 *
 * Designed as a shareable URL: `https://stargaze.ashlr.ai/api/random` always
 * lands on a fresh card. We disable caching so each click rolls again.
 *
 * Selection strategy: fetch all live (id, slug) pairs and pick one in JS.
 * For the current ~50–500 project corpus this is fine and sidesteps the
 * lack of a `RANDOM()` order in PostgREST. If the corpus grows past a few
 * thousand we can switch to an RPC that uses Postgres `ORDER BY RANDOM()`.
 */

import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const fallback = new URL("/feed", url.origin);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("slug")
    .eq("status", "live");

  if (error || !data || data.length === 0) {
    // Nothing to redirect to — send the visitor to the deck instead.
    return NextResponse.redirect(fallback, {
      status: 302,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const pick = data[Math.floor(Math.random() * data.length)];
  const target = new URL(`/p/${pick.slug}`, url.origin);

  return NextResponse.redirect(target, {
    status: 302,
    headers: { "Cache-Control": "no-store" },
  });
}
