import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/badge/[slug].svg → shields-style SVG badge for a project's
 * cumulative right-swipe count on Stargaze. Designed to be pasted into a
 * README. Updates on each request (60s edge cache).
 *
 * Markdown:
 *   [![Stargaze](https://stargaze.ashlr.ai/api/badge/<slug>.svg)](https://stargaze.ashlr.ai/p/<slug>)
 *
 * Layout intentionally mimics shields.io: dark left half with the label,
 * yellow right half with the count, white text, single-line SVG.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug: slugRaw } = await ctx.params;
  const slug = slugRaw.replace(/\.svg$/i, "");

  const admin = createServiceClient();

  let count = 0;
  let found = false;
  try {
    const { data: project } = await admin
      .from("projects")
      .select("id")
      .eq("slug", slug)
      .eq("status", "live")
      .maybeSingle<{ id: string }>();

    if (project) {
      found = true;
      const { count: c } = await admin
        .from("swipes")
        .select("id", { count: "exact", head: true })
        .eq("project_id", project.id)
        .eq("direction", "right");
      count = c ?? 0;
    }
  } catch {
    // Fall through to a "0" badge — never error out the README.
  }

  const label = "Stargaze";
  const value = found ? formatCount(count) : "—";
  const svg = renderBadge({ label, value });

  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // CDN: cache 1 minute, stale-while-revalidate for 5
      "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
    },
  });
}

function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  if (n < 1_000_000) return `${Math.round(n / 1000)}k`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
}

/**
 * SVG badge mimicking shields.io flat style. Widths are computed from a
 * 7px-per-char heuristic that matches Verdana 11 closely enough for our
 * typical labels — no need to ship a font metric table for one badge.
 */
function renderBadge({
  label,
  value,
}: {
  label: string;
  value: string;
}): string {
  const labelText = `★ ${label}`;
  const labelW = textWidth(labelText) + 16; // 8px padding each side
  const valueW = textWidth(value) + 16;
  const totalW = labelW + valueW;

  const labelX = labelW / 2;
  const valueX = labelW + valueW / 2;

  const labelBg = "#0B1426"; // brand navy
  const valueBg = "#FACC15"; // brand yellow
  const labelFg = "#FACC15"; // star + label readable on navy
  const valueFg = "#0B1426"; // count readable on yellow

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="20" role="img" aria-label="${escapeXml(
    labelText,
  )}: ${escapeXml(value)}">
  <title>${escapeXml(labelText)}: ${escapeXml(value)}</title>
  <linearGradient id="g" x2="0" y2="100%">
    <stop offset="0" stop-color="#fff" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalW}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelW}" height="20" fill="${labelBg}"/>
    <rect x="${labelW}" width="${valueW}" height="20" fill="${valueBg}"/>
    <rect width="${totalW}" height="20" fill="url(#g)"/>
  </g>
  <g fill="${labelFg}" text-anchor="middle"
     font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11" font-weight="600">
    <text x="${labelX}" y="14">${escapeXml(labelText)}</text>
  </g>
  <g fill="${valueFg}" text-anchor="middle"
     font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11" font-weight="700">
    <text x="${valueX}" y="14">${escapeXml(value)}</text>
  </g>
</svg>`;
}

/** Rough Verdana-11 character widths for badge sizing. */
function textWidth(s: string): number {
  // Most glyphs ~6.5px; star + uppercase pad slightly more.
  let w = 0;
  for (const ch of s) {
    if (ch === "★") w += 9;
    else if (/[A-Z]/.test(ch)) w += 7.5;
    else if (/[ijl1.\s]/.test(ch)) w += 4;
    else w += 6.5;
  }
  return Math.ceil(w);
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
