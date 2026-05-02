import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { NotificationsEmptyState } from "@/components/notifications/empty-state";
import {
  NotifRow,
  type NotifRowProps,
} from "@/components/notifications/notif-row";
import { getCurrentUser, type DBUser } from "@/lib/auth/get-user";
import { findClaimableProjects } from "@/lib/auth/find-claimable";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Notifications — Stargaze",
  description:
    "Right-swipes on your projects, access requests, and claim suggestions.",
};

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?redirect=/notifications");

  const [swipeRows, accessRows, claimRow] = await Promise.all([
    fetchSwipeNotifications(user.id),
    fetchAccessRequestNotifications(user.id),
    fetchClaimSuggestion(user),
  ]);

  // Compose final list. Welcome row only shows when there's nothing else.
  const items: NotifRowProps[] = [];

  if (claimRow) items.push(claimRow);
  for (const a of accessRows) items.push(a);
  for (const s of swipeRows) items.push(s);

  // Sort recent activity (swipe + access) by timestamp; claim suggestion
  // floats to the top because it's the most actionable.
  const claimItems = items.filter((i) => i.variant === "claim");
  const otherItems = items
    .filter((i) => i.variant !== "claim")
    .sort((a, b) => sortKey(b) - sortKey(a));

  const composed = [...claimItems, ...otherItems];

  const showWelcome = composed.length === 0;

  return (
    <>
      <Nav />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-2xl px-4 pb-32 pt-6 md:pt-10">
          <header className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Notifications
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Right-swipes on your projects, access requests, and claim
              suggestions land here.
            </p>
          </header>

          {showWelcome ? (
            <div className="space-y-3">
              <NotifRow
                variant="welcome"
                username={user.github_username}
              />
              <NotificationsEmptyState />
            </div>
          ) : (
            <ul className="space-y-3">
              {composed.map((row, idx) => (
                <li key={notifKey(row, idx)}>
                  <NotifRow {...row} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

/* ------------------------------------------------------------------------ */
/* Data                                                                     */
/* ------------------------------------------------------------------------ */

type SwipeRow = Extract<NotifRowProps, { variant: "swipe" }>;
type AccessRow = Extract<NotifRowProps, { variant: "access-request" }>;
type ClaimRow = Extract<NotifRowProps, { variant: "claim" }>;

async function fetchSwipeNotifications(userId: string): Promise<SwipeRow[]> {
  const supabase = await createClient();

  // Pull the user's projects, then aggregate right-swipes per (project, day).
  const { data: projects } = await supabase
    .from("projects")
    .select("id, slug, title")
    .eq("user_id", userId);

  if (!projects || projects.length === 0) return [];

  const ids = projects.map((p) => p.id);

  const { data: swipes } = await supabase
    .from("swipes")
    .select(
      `id, project_id, created_at,
       user:users!swipes_user_id_fkey(github_username, avatar_url)`,
    )
    .in("project_id", ids)
    .eq("direction", "right")
    .order("created_at", { ascending: false })
    .limit(200);

  if (!swipes || swipes.length === 0) return [];

  type Row = {
    id: string;
    project_id: string;
    created_at: string;
    user: { github_username: string; avatar_url: string | null } | null;
  };

  const projectById = new Map(projects.map((p) => [p.id, p] as const));

  // Group by project + UTC day so the inbox isn't flooded when one project
  // gets a flurry of right-swipes the same day.
  const groups = new Map<
    string,
    {
      projectId: string;
      day: string;
      latestAt: string;
      count: number;
      swipers: Map<string, { githubUsername: string; avatarUrl: string | null }>;
    }
  >();

  for (const raw of swipes as unknown as Row[]) {
    const day = raw.created_at.slice(0, 10);
    const key = `${raw.project_id}:${day}`;
    let g = groups.get(key);
    if (!g) {
      g = {
        projectId: raw.project_id,
        day,
        latestAt: raw.created_at,
        count: 0,
        swipers: new Map(),
      };
      groups.set(key, g);
    }
    g.count += 1;
    if (raw.created_at > g.latestAt) g.latestAt = raw.created_at;
    if (raw.user && !g.swipers.has(raw.user.github_username)) {
      g.swipers.set(raw.user.github_username, {
        githubUsername: raw.user.github_username,
        avatarUrl: raw.user.avatar_url,
      });
    }
  }

  const rows: SwipeRow[] = [];
  for (const g of groups.values()) {
    const project = projectById.get(g.projectId);
    if (!project) continue;
    rows.push({
      variant: "swipe",
      projectTitle: project.title,
      projectSlug: project.slug,
      count: g.count,
      latestAt: g.latestAt,
      href: `/p/${project.slug}`,
      swipers: Array.from(g.swipers.values()).slice(0, 3),
    });
  }

  // Most recent first.
  rows.sort(
    (a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime(),
  );
  return rows.slice(0, 30);
}

async function fetchAccessRequestNotifications(
  userId: string,
): Promise<AccessRow[]> {
  // Service client because access_requests RLS may be locked down to the
  // requester. The creator (us) needs to see them, scoped to projects we own.
  const sb = createServiceClient();

  const { data: projects } = await sb
    .from("projects")
    .select("id, slug, title")
    .eq("user_id", userId)
    .eq("is_open_source", false);

  if (!projects || projects.length === 0) return [];

  const ids = projects.map((p) => p.id);

  const { data } = await sb
    .from("access_requests")
    .select(
      `id, project_id, requester_user_id, requester_email, message, status, created_at,
       requester:users!access_requests_requester_user_id_fkey(github_username, avatar_url)`,
    )
    .in("project_id", ids)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!data) return [];

  const projectById = new Map(projects.map((p) => [p.id, p] as const));

  type Row = {
    id: string;
    project_id: string;
    requester_user_id: string;
    requester_email: string;
    message: string | null;
    status: "pending" | "approved" | "declined";
    created_at: string;
    requester: { github_username: string; avatar_url: string | null } | null;
  };

  return (data as unknown as Row[]).flatMap<AccessRow>((r) => {
    const project = projectById.get(r.project_id);
    if (!project) return [];
    return [
      {
        variant: "access-request",
        projectTitle: project.title,
        projectSlug: project.slug,
        requesterUsername: r.requester?.github_username ?? null,
        requesterAvatarUrl: r.requester?.avatar_url ?? null,
        requesterEmail: r.requester_email,
        status: r.status,
        message: r.message,
        createdAt: r.created_at,
        href: `/p/${project.slug}`,
        unread: r.status === "pending",
      },
    ];
  });
}

async function fetchClaimSuggestion(user: DBUser): Promise<ClaimRow | null> {
  const projects = await findClaimableProjects(user.id, user.github_username);
  if (projects.length === 0) return null;
  return {
    variant: "claim",
    count: projects.length,
    sample: projects.slice(0, 3).map((p) => p.title),
    href: "/claim",
    unread: true,
  };
}

/* ------------------------------------------------------------------------ */
/* Helpers                                                                  */
/* ------------------------------------------------------------------------ */

function sortKey(row: NotifRowProps): number {
  switch (row.variant) {
    case "swipe":
      return new Date(row.latestAt).getTime();
    case "access-request":
      return new Date(row.createdAt).getTime();
    default:
      return Number.MAX_SAFE_INTEGER;
  }
}

function notifKey(row: NotifRowProps, idx: number): string {
  switch (row.variant) {
    case "swipe":
      return `swipe-${row.projectSlug}-${row.latestAt}`;
    case "access-request":
      return `access-${row.projectSlug}-${row.createdAt}-${idx}`;
    case "claim":
      return `claim-${row.count}`;
    case "welcome":
      return `welcome-${row.username}`;
  }
}
