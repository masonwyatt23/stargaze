"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { renderMarkdown } from "@/lib/markdown";
import type { ProjectStatus } from "@/lib/types/db";

const MediaInput = z.object({
  type: z.enum(["screenshot", "video", "gif"]),
  url: z.string().url().max(500),
});

const UpdateInput = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(120),
  tagline: z.string().min(1).max(100),
  description_md: z.string().max(50_000).nullable(),
  github_repo_url: z.string().url().max(300).nullable(),
  cta_url: z.string().url().max(300).nullable(),
  is_open_source: z.boolean(),
  category: z
    .enum(["ai-tool", "dev-utility", "game", "saas", "other"])
    .nullable(),
  demo_video_url: z.string().url().max(500).nullable(),
  screenshots: z
    .array(z.string().url().max(500))
    .min(1, "At least one cover image is required.")
    .max(20),
});

export type UpdateProjectInput = z.infer<typeof UpdateInput>;

async function requireOwner(projectId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("not_signed_in");
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, slug, user_id, title")
    .eq("id", projectId)
    .maybeSingle<{ id: string; slug: string; user_id: string; title: string }>();
  if (!project) throw new Error("not_found");
  if (project.user_id !== user.id) throw new Error("not_owner");
  return { user, project };
}

export async function updateProject(
  raw: UpdateProjectInput,
): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  let parsed: UpdateProjectInput;
  try {
    parsed = UpdateInput.parse(raw);
  } catch {
    return { ok: false, error: "Invalid input." };
  }

  let project: { id: string; slug: string; user_id: string; title: string };
  try {
    const ctx = await requireOwner(parsed.projectId);
    project = ctx.project;
  } catch (err) {
    const m = (err as Error).message;
    return {
      ok: false,
      error:
        m === "not_signed_in"
          ? "Not signed in."
          : m === "not_owner"
            ? "You don't own this project."
            : "Project not found.",
    };
  }

  const description_html = parsed.description_md
    ? renderMarkdown(parsed.description_md)
    : null;

  // Use service role for the media swap so RLS policies on bulk delete don't trip
  const admin = createServiceClient();

  const { error: updateErr } = await admin
    .from("projects")
    .update({
      title: parsed.title,
      tagline: parsed.tagline,
      description_md: parsed.description_md,
      description_html,
      github_repo_url: parsed.github_repo_url,
      cta_url: parsed.cta_url ?? parsed.github_repo_url,
      is_open_source: parsed.is_open_source,
      category: parsed.category,
    })
    .eq("id", parsed.projectId);

  if (updateErr) return { ok: false, error: updateErr.message };

  // Replace media rows: simple delete + re-insert in declared order.
  await admin.from("project_media").delete().eq("project_id", parsed.projectId);

  const newMedia: Array<{
    project_id: string;
    type: "screenshot" | "video" | "gif";
    url: string;
    order_index: number;
  }> = [];

  // Demo video first (negative order so it always sorts to the front)
  if (parsed.demo_video_url) {
    newMedia.push({
      project_id: parsed.projectId,
      type: "video",
      url: parsed.demo_video_url,
      order_index: -1,
    });
  }

  parsed.screenshots.forEach((url, i) => {
    newMedia.push({
      project_id: parsed.projectId,
      type: "screenshot",
      url,
      order_index: i,
    });
  });

  if (newMedia.length > 0) {
    const { error: mediaErr } = await admin
      .from("project_media")
      .insert(newMedia);
    if (mediaErr) {
      return { ok: false, error: `Saved fields but media failed: ${mediaErr.message}` };
    }
  }

  // Revalidate every surface that shows this project
  revalidatePath("/");
  revalidatePath("/feed");
  revalidatePath("/launches");
  revalidatePath(`/p/${project.slug}`);
  revalidatePath(`/launches/${project.slug}`);
  revalidatePath("/dashboard");

  return { ok: true, slug: project.slug };
}

export async function setProjectStatus(
  projectId: string,
  status: ProjectStatus,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!["live", "hidden", "flagged"].includes(status)) {
    return { ok: false, error: "Invalid status." };
  }
  let project: { slug: string };
  try {
    const ctx = await requireOwner(projectId);
    project = ctx.project;
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ status })
    .eq("id", projectId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/feed");
  revalidatePath("/launches");
  revalidatePath(`/p/${project.slug}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteProject(
  projectId: string,
  confirmTitle: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  let project: { title: string; slug: string };
  try {
    const ctx = await requireOwner(projectId);
    project = ctx.project;
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  if (confirmTitle.trim() !== project.title) {
    return { ok: false, error: "Title confirmation didn't match." };
  }
  const admin = createServiceClient();
  const { error } = await admin.from("projects").delete().eq("id", projectId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  revalidatePath("/feed");
  revalidatePath("/launches");
  revalidatePath("/dashboard");
  return { ok: true };
}
