/**
 * Hand-typed DB types matching supabase/migrations/0001_init.sql.
 * Source of truth for the app until we wire `supabase gen types`.
 */

export type ProjectStatus = "live" | "hidden" | "flagged";
export type ProjectCategory = "ai-tool" | "dev-utility" | "game" | "saas" | "other";
export type SwipeDirection = "right" | "left";
export type AccessRequestStatus = "pending" | "approved" | "declined";
export type MediaType = "screenshot" | "video" | "gif";

export interface DBUser {
  id: string;
  github_username: string;
  github_id: number;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  github_token_encrypted: string | null;
  github_orgs: string[];
  auto_star_enabled: boolean;
  created_at: string;
}

export interface DBProject {
  id: string;
  slug: string;
  user_id: string;
  title: string;
  tagline: string;
  description_md: string | null;
  description_html: string | null;
  github_repo_url: string | null;
  github_stars: number | null;
  github_language: string | null;
  is_open_source: boolean;
  cta_url: string | null;
  category: ProjectCategory | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface DBProjectMedia {
  id: string;
  project_id: string;
  type: MediaType;
  url: string;
  thumbnail_url: string | null;
  order_index: number;
}

export interface DBSwipe {
  id: string;
  user_id: string;
  project_id: string;
  direction: SwipeDirection;
  github_starred: boolean;
  github_star_synced_at: string | null;
  created_at: string;
}

export interface DBAccessRequest {
  id: string;
  project_id: string;
  requester_user_id: string;
  requester_email: string;
  message: string | null;
  status: AccessRequestStatus;
  created_at: string;
}

export interface DBLeaderboardEntry {
  user_id: string;
  github_username: string;
  display_name: string | null;
  avatar_url: string | null;
  right_swipes_week: number;
  projects_with_swipes: number;
}

/** Joined view used by feed cards: project + creator + media. */
export interface FeedProject extends DBProject {
  creator: Pick<DBUser, "id" | "github_username" | "display_name" | "avatar_url">;
  media: DBProjectMedia[];
  right_swipe_count: number;
  has_demo_video: boolean;
}
