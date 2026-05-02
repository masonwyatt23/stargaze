/**
 * Next.js middleware — refreshes the Supabase auth session cookie on
 * every navigation so RSC + Route Handlers always see a fresh session.
 *
 * Heads-up: in Next.js 16 the `middleware` file convention is
 * deprecated in favor of `proxy.ts`. The legacy name still works; we
 * stay on `middleware.ts` until we're ready to migrate other agents'
 * code along with it.
 */
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on every path except:
     *   - _next/static, _next/image (static assets)
     *   - favicon.ico, robots.txt, sitemap.xml
     *   - public image extensions
     * API routes ARE included so server-side handlers see the refreshed
     * session cookie.
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
