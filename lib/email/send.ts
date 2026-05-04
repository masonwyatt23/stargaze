/**
 * SendGrid email helper.
 *
 * Centralised so /api/access-request and /api/cron/weekly-digest share the
 * same auth + error handling, and so a future provider switch only touches
 * one file.
 *
 * Required env:
 *   - SENDGRID_API_KEY
 * Optional env:
 *   - EMAIL_FROM           default "Stargaze <support@ashlr.ai>"
 *   - EMAIL_REPLY_TO       default "support@ashlr.ai"
 */

import { log } from "@/lib/log";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  /** Override the From address (rarely needed). */
  from?: string;
  /** Optional reply-to — useful when surfacing user-supplied emails. */
  replyTo?: string;
  /** For diagnostics — surfaced into the structured log line on failure. */
  context?: Record<string, string | number | boolean | null | undefined>;
};

export type SendEmailResult =
  | { ok: true }
  | { ok: false; reason: "no_api_key" | "non_2xx" | "exception"; status?: number; message?: string };

const SENDGRID_ENDPOINT = "https://api.sendgrid.com/v3/mail/send";

/**
 * Parse a "Name <addr@example.com>" or bare "addr@example.com" string into
 * the `{ email, name }` shape SendGrid expects.
 */
function parseAddress(raw: string): { email: string; name?: string } {
  const trimmed = raw.trim();
  const m = trimmed.match(/^\s*(.*?)\s*<\s*([^>]+?)\s*>\s*$/);
  if (m) return { name: m[1] || undefined, email: m[2] };
  return { email: trimmed };
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    log({
      level: "info",
      event: "email.skipped_no_api_key",
      to: input.to,
      subject: input.subject,
      ...input.context,
    });
    return { ok: false, reason: "no_api_key" };
  }

  const fromRaw =
    input.from ?? process.env.EMAIL_FROM ?? "Stargaze <support@ashlr.ai>";
  const replyToRaw =
    input.replyTo ?? process.env.EMAIL_REPLY_TO ?? "support@ashlr.ai";

  const body = {
    personalizations: [{ to: [{ email: input.to }] }],
    from: parseAddress(fromRaw),
    reply_to: parseAddress(replyToRaw),
    subject: input.subject,
    content: [{ type: "text/html", value: input.html }],
  };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    const res = await fetch(SENDGRID_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);

    // SendGrid returns 202 Accepted on success — anything else is a fail.
    if (res.status >= 200 && res.status < 300) {
      return { ok: true };
    }
    const errText = await res.text().catch(() => res.statusText);
    log({
      level: "error",
      event: "email.sendgrid_non_2xx",
      to: input.to,
      subject: input.subject,
      status: res.status,
      body: errText.slice(0, 500),
      ...input.context,
    });
    return { ok: false, reason: "non_2xx", status: res.status, message: errText };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log({
      level: "error",
      event: "email.sendgrid_exception",
      to: input.to,
      subject: input.subject,
      error: message,
      ...input.context,
    });
    return { ok: false, reason: "exception", message };
  }
}
