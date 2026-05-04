import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/get-user";
import { log } from "@/lib/log";
import { parseGithubRepo } from "@/lib/utils";

/**
 * POST /api/cover/auto
 * Body: { url: string, source?: "live" | "github" }
 *
 * Returns a usable cover-image URL for a project being submitted, derived from
 * one of two sources:
 *   - "live"   → Microlink screenshot of the live site (default)
 *   - "github" → GitHub social-preview image for the repo (opengraph.githubassets.com)
 *
 * Both sources return externally-hosted PNG/JPG URLs the caller can drop into
 * the screenshots array directly. Auth-gated to prevent the endpoint becoming
 * a free screenshot proxy.
 */
const bodySchema = z.object({
  url: z.string().url(),
  source: z.enum(["live", "github"]).optional().default("live"),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    const json = await req.json();
    body = bodySchema.parse(json);
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  // URL hygiene — block obviously-internal targets so this endpoint can't be
  // used as a reconnaissance probe even if Microlink's own SSRF guards lapse.
  // The Microlink URL itself is returned to the client (rather than proxied),
  // which means it remains a publicly-callable screenshot URL forever — that's
  // intentional for cost reasons but documented as a known limitation.
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(body.url);
  } catch {
    return NextResponse.json({ error: "malformed url" }, { status: 400 });
  }
  if (parsedUrl.protocol !== "https:") {
    return NextResponse.json(
      { error: "url must be https" },
      { status: 400 },
    );
  }
  const host = parsedUrl.hostname.toLowerCase();
  const isPrivate =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    // IPv4 RFC1918 + link-local
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^169\.254\./.test(host) ||
    // Decimal/octal/hex-encoded IPv4 (e.g. "2130706433" = 127.0.0.1) — block
    // any pure-numeric host so encoding tricks can't bypass the dotted check
    /^\d+$/.test(host) ||
    /^0x[\da-f]+$/i.test(host) ||
    // IPv6 — node's URL parser keeps brackets in `hostname`
    host === "[::1]" ||
    host === "[::]" ||
    /^\[fe80:/i.test(host) || // link-local
    /^\[f[cd][\da-f]{2}:/i.test(host); // ULA fc00::/7
  if (isPrivate) {
    return NextResponse.json(
      { error: "url must be publicly reachable" },
      { status: 400 },
    );
  }

  if (body.source === "github") {
    const parsed = parseGithubRepo(body.url);
    if (!parsed) {
      return NextResponse.json(
        { error: "not a recognizable github repo url" },
        { status: 400 },
      );
    }
    const cover = `https://opengraph.githubassets.com/${Date.now()}/${parsed.owner}/${parsed.repo}`;
    log({
      level: "info",
      event: "cover.auto.github",
      user_id: user.id,
      url: body.url,
    });
    return NextResponse.json({ url: cover, source: "github" });
  }

  // Live-site screenshot via Microlink.
  const microlink = new URL("https://api.microlink.io/");
  microlink.searchParams.set("url", body.url);
  microlink.searchParams.set("screenshot", "true");
  microlink.searchParams.set("meta", "false");
  microlink.searchParams.set("embed", "screenshot.url");
  microlink.searchParams.set("viewport.width", "1280");
  microlink.searchParams.set("viewport.height", "800");
  microlink.searchParams.set("waitFor", "1500");

  log({
    level: "info",
    event: "cover.auto.microlink",
    user_id: user.id,
    url: body.url,
  });

  return NextResponse.json({ url: microlink.toString(), source: "live" });
}
