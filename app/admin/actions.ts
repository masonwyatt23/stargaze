"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/auth/is-admin";
import { createClient } from "@/lib/supabase/server";
import type { ProjectStatus } from "@/lib/types/db";

async function requireAdmin() {
  const admin = await getAdminUser();
  if (!admin) throw new Error("not_authorized");
  return admin;
}

/** Set a project's status (live | hidden | flagged). */
export async function setProjectStatus(
  projectId: string,
  status: ProjectStatus,
) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ status })
    .eq("id", projectId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/feed");
  revalidatePath("/");
}

/** Mark an access request as approved or declined. (Approval is informational
 *  — actual GitHub-repo access still happens out-of-band by the creator.) */
export async function setAccessRequestStatus(
  requestId: string,
  status: "approved" | "declined",
) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("access_requests")
    .update({ status })
    .eq("id", requestId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}
