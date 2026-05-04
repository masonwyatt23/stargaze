/**
 * Milestone celebration email — fires when a project crosses a notable
 * right-swipe count (5, 10, 25, 50, 100, 250, 500, 1000, ...).
 *
 * The swipe API calls `maybeSendMilestoneEmail` after every right-swipe
 * insert; this module owns the count → milestone → email decision so the
 * route handler stays focused.
 *
 * Idempotency: race between two near-simultaneous swipes could in theory
 * trigger two emails for the same milestone. Acceptable trade-off vs. the
 * complexity of a dedicated `milestones_sent` table — we'd rather a maker
 * get a duplicate "you hit 100!" than miss it entirely.
 */

import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { log } from "@/lib/log";

/** Right-swipe counts that warrant a celebration email. */
const MILESTONES = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

export type MilestoneCheckInput = {
  projectId: string;
  /** Right-swipe count BEFORE the latest swipe was inserted. Pass `undefined`
   *  if you don't have it — we'll re-query and assume the milestone was just
   *  crossed if the total now lands on one. */
  prevCount?: number;
};

/**
 * Check whether the project just crossed a milestone, and if so, fire a
 * celebration email to the owner. Safe to call after every right-swipe.
 *
 * Returns the milestone that was emailed, or `null` if nothing fired.
 */
export async function maybeSendMilestoneEmail(
  input: MilestoneCheckInput,
): Promise<number | null> {
  const admin = createServiceClient();

  try {
    // Current right-swipe count for this project.
    const { count: nowCount } = await admin
      .from("swipes")
      .select("id", { count: "exact", head: true })
      .eq("project_id", input.projectId)
      .eq("direction", "right");

    if (nowCount == null) return null;

    // Determine which milestone was just crossed (if any). If we don't have
    // prevCount, assume "exact match" only — i.e. only fire when the new total
    // is exactly a milestone. That's slightly under-eager but cheap.
    const crossed = MILESTONES.find((m) => {
      if (input.prevCount != null) {
        return input.prevCount < m && nowCount >= m;
      }
      return nowCount === m;
    });
    if (!crossed) return null;

    // Project + creator details for the email body.
    const { data: project } = await admin
      .from("projects")
      .select(
        "id, slug, title, user_id, github_repo_url, is_open_source",
      )
      .eq("id", input.projectId)
      .maybeSingle<{
        id: string;
        slug: string;
        title: string;
        user_id: string;
        github_repo_url: string | null;
        is_open_source: boolean;
      }>();
    if (!project) return null;

    const { data: ownerAuth } = await admin.auth.admin.getUserById(
      project.user_id,
    );
    const ownerEmail = ownerAuth.user?.email;
    if (!ownerEmail) return null;

    const { data: owner } = await admin
      .from("users")
      .select("github_username, display_name")
      .eq("id", project.user_id)
      .maybeSingle<{ github_username: string; display_name: string | null }>();
    const displayName =
      owner?.display_name?.trim() ||
      `@${owner?.github_username ?? "maker"}`;

    const subject = `🎉 ${project.title} just hit ${crossed} right-swipes on Stargaze`;
    const html = renderMilestoneHtml({
      displayName,
      projectTitle: project.title,
      slug: project.slug,
      milestone: crossed,
      isOpenSource: project.is_open_source,
    });

    const result = await sendEmail({
      to: ownerEmail,
      subject,
      html,
      context: {
        scope: "milestone",
        project_id: project.id,
        milestone: crossed,
      },
    });

    if (result.ok) {
      log({
        level: "info",
        event: "milestone.email.sent",
        project_id: project.id,
        milestone: crossed,
      });
      return crossed;
    }
    return null;
  } catch (err) {
    log({
      level: "warn",
      event: "milestone.email.failed",
      project_id: input.projectId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

function renderMilestoneHtml(args: {
  displayName: string;
  projectTitle: string;
  slug: string;
  milestone: number;
  isOpenSource: boolean;
}): string {
  const { displayName, projectTitle, slug, milestone, isOpenSource } = args;
  const projectUrl = `https://stargaze.ashlr.ai/p/${encodeURIComponent(slug)}`;
  const insightsUrl = `https://stargaze.ashlr.ai/p/${encodeURIComponent(slug)}/insights`;
  const starsLine = isOpenSource
    ? `That's also <strong>${milestone} new stars</strong> on your GitHub repo, sent on swipers' behalf.`
    : `Each right-swipe is a real Stargaze user saving your project for later.`;

  return `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0B1426;">
      <p style="margin:0 0 12px 0;font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:#FACC15;">★ Stargaze · Milestone</p>
      <h2 style="margin:0 0 12px 0;font-size:28px;line-height:1.2;">
        ${escapeHtml(displayName)}, you just hit <span style="color:#0B1426;">${milestone}</span>.
      </h2>
      <p style="margin:0 0 16px 0;font-size:16px;line-height:1.5;">
        <strong>${escapeHtml(projectTitle)}</strong> just crossed
        <strong>${milestone} right-swipes</strong> on Stargaze. ${starsLine}
      </p>
      <div style="margin:24px 0;">
        <a href="${projectUrl}"
           style="display:inline-block;padding:10px 18px;background:#FACC15;color:#0B1426;text-decoration:none;font-weight:700;border-radius:8px;">
          View your project
        </a>
        <a href="${insightsUrl}"
           style="display:inline-block;padding:10px 18px;margin-left:8px;color:#0B1426;text-decoration:underline;">
          See the insights
        </a>
      </div>
      <p style="margin:0 0 8px 0;font-size:14px;line-height:1.5;color:#444;">
        Want to compound this? Share your project page anywhere — every visit
        funnels people through the deck and back to your repo.
      </p>
      <p style="margin:24px 0 0 0;font-size:12px;color:#888;">
        Stargaze · <a href="https://stargaze.ashlr.ai/dashboard" style="color:#888;">dashboard</a>
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
