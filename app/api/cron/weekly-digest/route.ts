import { NextResponse } from "next/server";

import { log } from "@/lib/log";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/cron/weekly-digest
 *
 * Per-maker weekly recap email. Sends each maker who has at least one live
 * project a summary of how their work performed in the last 7 days. Designed
 * to run once per week from Vercel Cron (configured in vercel.json).
 *
 * Auth:
 *   - Vercel Cron forwards `Authorization: Bearer <CRON_SECRET>`
 *   - Manual triggers from the dashboard also accept the same secret
 *   - Falls back to denying anonymous traffic
 *
 * Idempotency:
 *   - Safe to re-run within the week — Resend deduplicates by message-id but
 *     we don't rely on that; the body just describes the rolling 7d window.
 *
 * Failure mode:
 *   - Each maker's email is sent independently; one failure doesn't block the
 *     rest. The route returns a per-user summary so a failed maker shows up in
 *     the response and the cron log.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "RESEND_API_KEY not configured" },
      { status: 500 },
    );
  }
  const fromAddr =
    process.env.RESEND_FROM_EMAIL ?? "Stargaze <noreply@stargaze.ashlr.ai>";

  const admin = createServiceClient();

  // Pull every maker with at least one live project. We need the auth.users
  // email which RLS hides from the public users table — service-role bypasses
  // that.
  const { data: makers, error: makersErr } = await admin
    .from("users")
    .select("id, github_username, display_name")
    .neq("github_id", 0);

  if (makersErr) {
    log({
      level: "error",
      event: "cron.weekly_digest.makers_query_failed",
      error: makersErr.message,
    });
    return NextResponse.json({ error: makersErr.message }, { status: 500 });
  }

  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const results: Array<{ user_id: string; status: "sent" | "skipped" | "failed"; reason?: string }> = [];

  for (const maker of makers ?? []) {
    try {
      // Per-maker pipeline: 4 small queries instead of one RPC, so we don't
      // need to ship another migration just for the digest. Acceptable cost
      // at our current maker-count.

      // 1) maker's live projects
      const { data: projects } = await admin
        .from("projects")
        .select("id, slug, title")
        .eq("user_id", maker.id)
        .eq("status", "live");
      if (!projects || projects.length === 0) {
        results.push({ user_id: maker.id, status: "skipped", reason: "no_live_projects" });
        continue;
      }
      const projectIds = projects.map((p) => p.id);

      // 2) right-swipes on those projects this week
      const { count: weekSwipes } = await admin
        .from("swipes")
        .select("id", { count: "exact", head: true })
        .in("project_id", projectIds)
        .eq("direction", "right")
        .gte("created_at", since);

      // 3) top project this week
      const { data: topRow } = await admin
        .from("swipes")
        .select("project_id")
        .in("project_id", projectIds)
        .eq("direction", "right")
        .gte("created_at", since);
      const counts = new Map<string, number>();
      (topRow ?? []).forEach((r) =>
        counts.set(r.project_id, (counts.get(r.project_id) ?? 0) + 1),
      );
      const top = projects
        .map((p) => ({ ...p, count: counts.get(p.id) ?? 0 }))
        .sort((a, b) => b.count - a.count)[0];

      // 4) maker's email (auth.users is service-role only)
      const { data: authRow } = await admin.auth.admin.getUserById(maker.id);
      const email = authRow.user?.email;
      if (!email) {
        results.push({ user_id: maker.id, status: "skipped", reason: "no_email" });
        continue;
      }

      const swipes = weekSwipes ?? 0;
      // Skip totally inactive makers — quiet weeks are demoralizing in the
      // inbox. We'll re-engage them via a dedicated re-activation email.
      if (swipes === 0) {
        results.push({ user_id: maker.id, status: "skipped", reason: "no_activity" });
        continue;
      }

      const handle = maker.github_username || "maker";
      const displayName = maker.display_name?.trim() || `@${handle}`;
      const subject = `${swipes} right-swipe${swipes === 1 ? "" : "s"} this week on Stargaze`;

      const html = renderDigestHtml({
        displayName,
        swipes,
        projectCount: projects.length,
        top,
      });

      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddr,
          to: email,
          subject,
          html,
        }),
      });

      if (r.ok) {
        results.push({ user_id: maker.id, status: "sent" });
      } else {
        const errText = await r.text().catch(() => r.statusText);
        results.push({ user_id: maker.id, status: "failed", reason: errText.slice(0, 200) });
      }
    } catch (err) {
      results.push({
        user_id: maker.id,
        status: "failed",
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const sent = results.filter((r) => r.status === "sent").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const failed = results.filter((r) => r.status === "failed").length;

  log({
    level: "info",
    event: "cron.weekly_digest.complete",
    sent,
    skipped,
    failed,
    total: results.length,
  });

  return NextResponse.json({ sent, skipped, failed, results });
}

function renderDigestHtml(args: {
  displayName: string;
  swipes: number;
  projectCount: number;
  top: { slug: string; title: string; count: number };
}): string {
  const { displayName, swipes, projectCount, top } = args;
  return `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0B1426;">
      <p style="margin:0 0 12px 0;font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:#FACC15;">★ Stargaze · Weekly</p>
      <h2 style="margin:0 0 16px 0;font-size:28px;line-height:1.2;">
        Hey ${escapeHtml(displayName)} — your week on the deck
      </h2>
      <p style="margin:0 0 24px 0;font-size:16px;line-height:1.5;">
        <strong>${swipes}</strong> right-swipe${swipes === 1 ? "" : "s"} across your
        ${projectCount} live project${projectCount === 1 ? "" : "s"} in the last 7 days.
      </p>
      <div style="border:1px solid #e6e6e6;border-radius:12px;padding:16px;margin:0 0 24px 0;background:#fafafa;">
        <p style="margin:0 0 4px 0;font-size:12px;color:#666;text-transform:uppercase;letter-spacing:0.18em;">Top project this week</p>
        <p style="margin:0 0 8px 0;font-size:18px;font-weight:600;">${escapeHtml(top.title)}</p>
        <p style="margin:0;font-size:14px;color:#444;">
          ${top.count} right-swipe${top.count === 1 ? "" : "s"} ·
          <a href="https://stargaze.ashlr.ai/p/${encodeURIComponent(top.slug)}" style="color:#0B1426;text-decoration:underline;">view page</a>
        </p>
      </div>
      <p style="margin:0 0 8px 0;font-size:14px;line-height:1.5;">
        Want more? Share your project page on X/Reddit/HN — every external view
        funnels visitors through the deck and back to your repo.
      </p>
      <p style="margin:24px 0 0 0;font-size:12px;color:#888;">
        Stargaze · <a href="https://stargaze.ashlr.ai/dashboard" style="color:#888;">dashboard</a>
        · <a href="https://stargaze.ashlr.ai/settings" style="color:#888;">unsubscribe</a>
      </p>
    </div>
  `.trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
