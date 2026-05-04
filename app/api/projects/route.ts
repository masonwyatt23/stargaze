import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/get-user";
import { log } from "@/lib/log";
import { renderMarkdown } from "@/lib/markdown";
import { createServiceClient } from "@/lib/supabase/server";
import { parseGithubRepo, slugify } from "@/lib/utils";

const CreateInput = z.object({
  title: z.string().min(2).max(120),
  tagline: z.string().min(8).max(100),
  is_open_source: z.boolean(),
  github_repo_url: z.string().url().max(300).nullable(),
  cta_url: z.string().url().max(300).nullable(),
  category: z.enum(["ai-tool", "dev-utility", "game", "saas", "other"]),
  description_md: z.string().max(50_000).nullable(),
  demo_video_url: z.string().url().max(500).nullable(),
  screenshots: z
    .array(z.string().url().max(500))
    .min(1, "At least one cover image is required.")
    .max(20),
});

/**
 * POST /api/projects
 * Creates a new project for the signed-in user. Mirrors the validation in
 * `app/projects/[id]/edit/actions.ts` so the create + edit paths stay in sync.
 *
 * Hard requirement: at least one screenshot URL. The deck has no fallback for
 * cover-less cards — empty cards make the entire feed feel broken.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  let parsed: z.infer<typeof CreateInput>;
  try {
    const json = await req.json();
    parsed = CreateInput.parse(json);
  } catch (err) {
    const msg =
      err instanceof z.ZodError
        ? err.issues[0]?.message ?? "invalid input"
        : "invalid body";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // OSS projects must have a github_repo_url so auto-star has somewhere to go.
  if (parsed.is_open_source && !parsed.github_repo_url) {
    return NextResponse.json(
      { error: "Open-source projects need a GitHub repo URL." },
      { status: 400 },
    );
  }
  if (parsed.github_repo_url && !parseGithubRepo(parsed.github_repo_url)) {
    return NextResponse.json(
      { error: "GitHub repo URL doesn't look right." },
      { status: 400 },
    );
  }

  const description_html = parsed.description_md
    ? renderMarkdown(parsed.description_md)
    : null;

  // Slug = title-slug + 6-char suffix to avoid collisions without a retry loop.
  const baseSlug = slugify(parsed.title).slice(0, 60) || "project";
  const suffix = Math.random().toString(36).slice(2, 8);
  const slug = `${baseSlug}-${suffix}`;

  const admin = createServiceClient();

  // Insert as `hidden` first so the project never appears in the deck
  // between the project row insert and the media insert (the deck would
  // otherwise serve a cover-less card during that window).
  const { data: created, error: insertErr } = await admin
    .from("projects")
    .insert({
      slug,
      user_id: user.id,
      title: parsed.title,
      tagline: parsed.tagline,
      description_md: parsed.description_md,
      description_html,
      github_repo_url: parsed.github_repo_url,
      cta_url: parsed.cta_url ?? parsed.github_repo_url,
      is_open_source: parsed.is_open_source,
      category: parsed.category,
      status: "hidden",
    })
    .select("id, slug")
    .single();

  if (insertErr || !created) {
    log({
      level: "error",
      event: "projects.create.insert_failed",
      user_id: user.id,
      error: insertErr?.message ?? "unknown",
    });
    return NextResponse.json(
      { error: insertErr?.message ?? "Couldn't save the project." },
      { status: 500 },
    );
  }

  const media: Array<{
    project_id: string;
    type: "screenshot" | "video";
    url: string;
    order_index: number;
  }> = [];

  if (parsed.demo_video_url) {
    media.push({
      project_id: created.id,
      type: "video",
      url: parsed.demo_video_url,
      order_index: -1,
    });
  }
  parsed.screenshots.forEach((url, i) =>
    media.push({
      project_id: created.id,
      type: "screenshot",
      url,
      order_index: i,
    }),
  );

  const { error: mediaErr } = await admin.from("project_media").insert(media);
  if (mediaErr) {
    log({
      level: "warn",
      event: "projects.create.media_insert_failed",
      user_id: user.id,
      project_id: created.id,
      error: mediaErr.message,
    });
    // Leave the project hidden so a cover-less card never enters the deck.
    // Owner can re-upload from the edit screen and flip status manually.
    return NextResponse.json(
      { slug: created.slug, warning: "media_failed" },
      { status: 201 },
    );
  }

  // All media committed — flip to live.
  const { error: liveErr } = await admin
    .from("projects")
    .update({ status: "live" })
    .eq("id", created.id);
  if (liveErr) {
    log({
      level: "warn",
      event: "projects.create.go_live_failed",
      user_id: user.id,
      project_id: created.id,
      error: liveErr.message,
    });
    // Project + media are saved but the row is still hidden. Surface a
    // warning so the client can prompt the owner to retry / unhide from
    // the dashboard, instead of silently shipping a 201.
    return NextResponse.json(
      { slug: created.slug, warning: "go_live_failed" },
      { status: 201 },
    );
  }

  log({
    level: "info",
    event: "projects.create.ok",
    user_id: user.id,
    project_id: created.id,
    slug: created.slug,
  });

  return NextResponse.json({ slug: created.slug }, { status: 201 });
}
