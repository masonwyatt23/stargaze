import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, ExternalLink, Sparkles, Star } from "lucide-react";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { findClaimableProjects } from "@/lib/auth/find-claimable";
import { getCurrentUser } from "@/lib/auth/get-user";
import { parseGithubRepo } from "@/lib/utils";
import { ClaimForm } from "./claim-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Claim your projects — Stargaze",
  description:
    "Claim editorial-imported projects whose GitHub repo belongs to you.",
};

type ClaimPageProps = {
  // Next.js 16: searchParams is async.
  searchParams: Promise<{ done?: string }>;
};

export default async function ClaimPage({ searchParams }: ClaimPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?redirect=/claim");

  const { done } = await searchParams;

  const projects = await findClaimableProjects(
    user.id,
    user.github_username,
    user.github_orgs,
  );

  return (
    <>
      <Nav />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-4 pb-32 pt-6 md:pt-10">
          <header className="mb-8">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Editorial picks for @{user.github_username}
            </div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Claim your projects
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              These projects were imported by{" "}
              <span className="font-medium text-foreground">
                Stargaze Editorial
              </span>{" "}
              and the GitHub repo URL points to your account. Claim ownership
              and they show up under your profile, dashboard, and saves.
            </p>
          </header>

          {done ? (
            <div
              role="status"
              className="mb-6 flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Claim received.</p>
                <p className="mt-0.5 text-emerald-200/80">
                  Anything still listed below either failed validation or
                  wasn&apos;t selected. Try again or head to{" "}
                  <Link
                    href="/dashboard"
                    className="underline underline-offset-2 hover:text-emerald-100"
                  >
                    your dashboard
                  </Link>
                  .
                </p>
              </div>
            </div>
          ) : null}

          {projects.length === 0 ? (
            <EmptyClaimable username={user.github_username} />
          ) : (
            <ClaimForm projects={projects} />
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function EmptyClaimable({ username }: { username: string }) {
  return (
    <Card className="border-dashed bg-card/40">
      <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
        <Star className="h-8 w-8 text-primary" />
        <div className="space-y-1">
          <p className="text-sm font-medium">No claimable projects right now.</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            We didn&apos;t find any editorial imports whose repo URL points to{" "}
            <code className="rounded bg-muted/50 px-1 text-foreground/80">
              github.com/{username}
            </code>
            . If you think this is wrong, double-check the repo URL on the
            project page.
          </p>
        </div>
        <Link
          href="/feed"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Back to the deck
          <ExternalLink className="h-3 w-3" />
        </Link>
      </CardContent>
    </Card>
  );
}

export function ClaimableRow({
  title,
  tagline,
  repoUrl,
  stars,
}: {
  title: string;
  tagline: string;
  repoUrl: string | null;
  stars: number | null;
}) {
  const parsed = repoUrl ? parseGithubRepo(repoUrl) : null;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="truncate font-medium">{title}</p>
        <p className="line-clamp-2 text-xs text-muted-foreground">{tagline}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
        {stars !== null ? (
          <span className="inline-flex items-center gap-1">
            <Star className="h-3 w-3 text-primary" />
            {stars.toLocaleString()}
          </span>
        ) : null}
        {parsed ? (
          <a
            href={`https://github.com/${parsed.owner}/${parsed.repo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            {parsed.owner}/{parsed.repo}
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
      </div>
    </div>
  );
}

// Re-export Badge so the form file can import it without another path.
export { Badge };
