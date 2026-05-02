import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ProjectRow } from "@/components/admin/project-row";
import { AccessRequestRow } from "@/components/admin/access-request-row";
import { getAdminUser } from "@/lib/auth/is-admin";
import { createClient } from "@/lib/supabase/server";
import type { ProjectStatus } from "@/lib/types/db";
import { cn, formatCount } from "@/lib/utils";

export const dynamic = "force-dynamic";

type AdminProjectRow = {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  status: ProjectStatus;
  github_repo_url: string | null;
  github_stars: number | null;
  is_open_source: boolean;
  created_at: string;
  creator: {
    id: string;
    github_username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  right_swipes: number;
  total_swipes: number;
};

type AccessReq = {
  id: string;
  status: "pending" | "approved" | "declined";
  message: string | null;
  requester_email: string;
  created_at: string;
  project: { id: string; title: string; slug: string } | null;
  requester: { github_username: string; avatar_url: string | null } | null;
};

export default async function AdminPage() {
  const admin = await getAdminUser();
  if (!admin) {
    redirect("/sign-in?redirect=/admin");
  }

  const supabase = await createClient();

  // Recent projects (any status), 50 newest
  const { data: rawProjects } = await supabase
    .from("projects")
    .select(
      `id, slug, title, tagline, status, github_repo_url, github_stars,
       is_open_source, created_at,
       creator:users!projects_user_id_fkey(id, github_username, display_name, avatar_url)`,
    )
    .order("created_at", { ascending: false })
    .limit(50);

  const projects = (rawProjects ?? []).map(normalizeProjectRow);

  // Compute swipe counts per project (one round-trip)
  if (projects.length > 0) {
    const ids = projects.map((p) => p.id);
    const { data: swipes } = await supabase
      .from("swipes")
      .select("project_id, direction")
      .in("project_id", ids);
    const counts = new Map<string, { right: number; total: number }>();
    for (const s of swipes ?? []) {
      const c = counts.get(s.project_id) ?? { right: 0, total: 0 };
      c.total++;
      if (s.direction === "right") c.right++;
      counts.set(s.project_id, c);
    }
    for (const p of projects) {
      const c = counts.get(p.id);
      p.right_swipes = c?.right ?? 0;
      p.total_swipes = c?.total ?? 0;
    }
  }

  // Pending access requests
  const { data: rawAccess } = await supabase
    .from("access_requests")
    .select(
      `id, status, message, requester_email, created_at,
       project:projects(id, title, slug),
       requester:users!access_requests_requester_user_id_fkey(github_username, avatar_url)`,
    )
    .order("created_at", { ascending: false })
    .limit(40);

  const requests = (rawAccess ?? []).map(normalizeAccessRow);
  const pendingCount = requests.filter((r) => r.status === "pending").length;

  const live = projects.filter((p) => p.status === "live");
  const hidden = projects.filter((p) => p.status === "hidden");
  const flagged = projects.filter((p) => p.status === "flagged");

  return (
    <>
      <Nav />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 pb-24 pt-8 md:pt-12">
          <header className="mb-10 flex items-end justify-between gap-4">
            <div>
              <Badge variant="outline" className="mb-3 gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Admin
              </Badge>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                Moderation
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Signed in as{" "}
                <span className="text-foreground">@{admin.github_username}</span>.
                The list below is the 50 newest projects + 40 newest access
                requests across the deck.
              </p>
            </div>
          </header>

          <StatStrip
            stats={[
              { label: "Live", value: live.length, tone: "primary" },
              { label: "Hidden", value: hidden.length, tone: "muted" },
              { label: "Flagged", value: flagged.length, tone: "destructive" },
              {
                label: "Pending requests",
                value: pendingCount,
                tone: pendingCount > 0 ? "primary" : "muted",
              },
            ]}
          />

          <Section
            title="Live projects"
            count={live.length}
            empty="No live projects yet."
          >
            {live.map((p) => (
              <ProjectRow key={p.id} project={p} />
            ))}
          </Section>

          {hidden.length > 0 ? (
            <Section title="Hidden" count={hidden.length}>
              {hidden.map((p) => (
                <ProjectRow key={p.id} project={p} />
              ))}
            </Section>
          ) : null}

          {flagged.length > 0 ? (
            <Section title="Flagged" count={flagged.length}>
              {flagged.map((p) => (
                <ProjectRow key={p.id} project={p} />
              ))}
            </Section>
          ) : null}

          <Section
            title="Access requests"
            count={requests.length}
            empty="No access requests yet."
          >
            {requests.map((r) => (
              <AccessRequestRow key={r.id} request={r} />
            ))}
          </Section>
        </section>
      </main>
      <Footer />
    </>
  );
}

function StatStrip({
  stats,
}: {
  stats: { label: string; value: number; tone: "primary" | "muted" | "destructive" }[];
}) {
  return (
    <div className="mb-12 grid grid-cols-2 gap-3 md:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label} className="border-border/60 bg-card/60">
          <CardContent className="p-4">
            <div
              className={cn(
                "text-2xl font-semibold tabular-nums",
                s.tone === "primary" && "text-primary",
                s.tone === "destructive" && "text-destructive",
                s.tone === "muted" && "text-foreground",
              )}
            >
              {formatCount(s.value)}
            </div>
            <div className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground">
              {s.label}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Section({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-12">
      <div className="mb-4 flex items-end justify-between">
        <h2 className="text-xl font-semibold tracking-tight">
          {title}{" "}
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {count}
          </span>
        </h2>
      </div>
      {count === 0 && empty ? (
        <p className="rounded-xl border border-dashed border-border/60 bg-card/40 p-8 text-center text-sm text-muted-foreground">
          {empty}
        </p>
      ) : (
        <Card className="border-border/60 bg-card/60">
          <CardContent className="divide-y divide-border/60 p-0">
            {children}
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function normalizeProjectRow(raw: unknown): AdminProjectRow {
  const r = raw as Record<string, unknown>;
  const creator = Array.isArray(r.creator) ? r.creator[0] : r.creator;
  return {
    id: r.id as string,
    slug: r.slug as string,
    title: r.title as string,
    tagline: r.tagline as string,
    status: r.status as ProjectStatus,
    github_repo_url: (r.github_repo_url ?? null) as string | null,
    github_stars: (r.github_stars ?? null) as number | null,
    is_open_source: r.is_open_source as boolean,
    created_at: r.created_at as string,
    creator: (creator as AdminProjectRow["creator"]) ?? null,
    right_swipes: 0,
    total_swipes: 0,
  };
}

function normalizeAccessRow(raw: unknown): AccessReq {
  const r = raw as Record<string, unknown>;
  const project = Array.isArray(r.project) ? r.project[0] : r.project;
  const requester = Array.isArray(r.requester) ? r.requester[0] : r.requester;
  return {
    id: r.id as string,
    status: r.status as AccessReq["status"],
    message: (r.message ?? null) as string | null,
    requester_email: r.requester_email as string,
    created_at: r.created_at as string,
    project: (project as AccessReq["project"]) ?? null,
    requester: (requester as AccessReq["requester"]) ?? null,
  };
}


