/**
 * POST /api/access-request — request access to a closed-source project.
 *
 * Body: { projectId: string (uuid), email: string, message?: string }
 *
 * Inserts an `access_requests` row and pings the project creator via
 * SendGrid. In dev (when SENDGRID_API_KEY is unset), we log the payload
 * and return 200 — the row is still inserted.
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { sendEmail } from "@/lib/email/send";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  projectId: z.string().uuid(),
  email: z.string().email().max(254),
  message: z.string().max(1000).optional(),
});

interface ProjectRow {
  id: string;
  title: string;
  user_id: string;
  is_open_source: boolean;
  status: "live" | "hidden" | "flagged";
}

interface CreatorRow {
  id: string;
  github_username: string;
  display_name: string | null;
}

interface AuthUserEmail {
  email: string | null;
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { projectId, email, message } = parsed.data;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  // Validate project (must be live, must be closed-source — no point in
  // requesting access to an open-source repo, the user can already use it).
  const { data: project, error: projectErr } = await supabase
    .from("projects")
    .select("id, title, user_id, is_open_source, status")
    .eq("id", projectId)
    .maybeSingle<ProjectRow>();

  if (projectErr) {
    return NextResponse.json(
      { error: "db_error", message: projectErr.message },
      { status: 500 },
    );
  }
  if (!project || project.status !== "live") {
    return NextResponse.json({ error: "project_not_found" }, { status: 404 });
  }
  if (project.is_open_source) {
    return NextResponse.json(
      { error: "project_is_open_source" },
      { status: 400 },
    );
  }

  // Insert the request. UNIQUE(project_id, requester_user_id) means a
  // duplicate will fail with 23505 — surface as 409.
  const { data: insertedRow, error: insertErr } = await supabase
    .from("access_requests")
    .insert({
      project_id: projectId,
      requester_user_id: user.id,
      requester_email: email,
      message: message ?? null,
      status: "pending",
    })
    .select("id")
    .single<{ id: string }>();

  if (insertErr) {
    if (insertErr.code === "23505") {
      return NextResponse.json({ error: "already_requested" }, { status: 409 });
    }
    return NextResponse.json(
      { error: "insert_failed", message: insertErr.message },
      { status: 500 },
    );
  }

  // Look up the creator's email out-of-band (auth.users) so we can notify them.
  // We use the user's RLS context here; if that ever blocks the lookup we
  // simply skip the email rather than fail the request.
  const { data: creator } = await supabase
    .from("users")
    .select("id, github_username, display_name")
    .eq("id", project.user_id)
    .maybeSingle<CreatorRow>();

  // auth.users.email is not in our public `users` table — read via the
  // current session's auth client. If the lookup fails, we still return 200
  // and just skip sending mail.
  let creatorEmail: string | null = null;
  try {
    const { data: authRow } = await supabase
      .schema("auth")
      .from("users")
      .select("email")
      .eq("id", project.user_id)
      .maybeSingle<AuthUserEmail>();
    creatorEmail = authRow?.email ?? null;
  } catch {
    creatorEmail = null;
  }

  // ---- Send the email ----
  const requesterName =
    user.display_name?.trim() || user.github_username || "A Stargaze user";
  const safeMessage = (message ?? "").trim();
  const subject = `New access request for ${project.title}`;
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
      <h2 style="margin:0 0 12px 0;">New access request</h2>
      <p style="margin:0 0 8px 0;">
        <strong>${escapeHtml(requesterName)}</strong> wants early access to
        <strong>${escapeHtml(project.title)}</strong>.
      </p>
      <p style="margin:0 0 8px 0;">Reply-to: <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
      ${
        safeMessage
          ? `<blockquote style="border-left:3px solid #ccc;padding:8px 12px;color:#444;margin:16px 0;">${escapeHtml(
              safeMessage,
            )}</blockquote>`
          : ""
      }
      <p style="color:#888;font-size:12px;margin-top:24px;">
        Sent via Stargaze — manage your projects at
        <a href="https://stargaze.ashlr.ai/dashboard">stargaze.ashlr.ai</a>
      </p>
    </div>
  `.trim();

  if (!creatorEmail) {
    log({
      level: "warn",
      event: "access_request.email.no_creator_email",
      projectId,
      creatorUserId: project.user_id,
    });
  } else {
    // Email is best-effort — the access_requests row is the source of truth.
    await sendEmail({
      to: creatorEmail,
      subject,
      html,
      replyTo: email,
      context: { projectId, scope: "access_request" },
    });
  }

  return NextResponse.json(
    { id: insertedRow.id, status: "pending" },
    { status: 200 },
  );
}

/** Minimal HTML escape for user-supplied strings going into our email body. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
