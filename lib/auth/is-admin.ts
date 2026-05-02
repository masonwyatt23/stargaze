import "server-only";
import { getCurrentUser } from "./get-user";
import type { DBUser } from "@/lib/types/db";

/**
 * Returns the current user IF they appear in the comma-separated
 * STARGAZE_ADMIN_GITHUB_USERNAMES env var, else null.
 *
 * Set the env var on Vercel:
 *   STARGAZE_ADMIN_GITHUB_USERNAMES="masonwyatt23,co-founder-handle"
 */
export async function getAdminUser(): Promise<DBUser | null> {
  const allowList = (process.env.STARGAZE_ADMIN_GITHUB_USERNAMES ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (allowList.length === 0) return null;

  const user = await getCurrentUser();
  if (!user) return null;
  if (!allowList.includes(user.github_username.toLowerCase())) return null;
  return user;
}
