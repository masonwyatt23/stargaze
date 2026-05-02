import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Star } from "lucide-react";
import { GithubIcon } from "@/components/icons/github-icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/footer";
import { MediaGallery } from "@/components/media-gallery";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/server";
import type {
  DBProjectMedia,
  DBProject,
  DBUser,
} from "@/lib/types/db";
import { formatCount } from "@/lib/utils";

export const dynamic = "force-dynamic";

type ProjectPageProps = {
  // Next.js 16: params is async.
  params: Promise<{ slug: string }>;
};

type ProjectRow = DBProject & {
  creator: Pick<DBUser, "id" | "github_username" | "display_name" | "avatar_url">;
  media: DBProjectMedia[];
};

async function fetchProject(slug: string): Promise<ProjectRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select(
      `id, slug, user_id, title, tagline, description_md, description_html,
       github_repo_url, github_stars, github_language, is_open_source,
       cta_url, category, status, created_at, updated_at,
       creator:users!projects_user_id_fkey(id, github_username, display_name, avatar_url),
       media:project_media(id, project_id, type, url, thumbnail_url, order_index)`,
    )
    .eq("slug", slug)
    .eq("status", "live")
    .maybeSingle();

  return (data as unknown as ProjectRow | null) ?? null;
}

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await fetchProject(slug);
  if (!project) return { title: "Project not found" };

  const description = project.tagline;
  return {
    title: project.title,
    description,
    openGraph: {
      title: project.title,
      description,
      type: "article",
      // opengraph-image.tsx will populate the image automatically.
    },
    twitter: {
      card: "summary_large_image",
      title: project.title,
      description,
    },
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = await fetchProject(slug);
  if (!project) notFound();

  return (
    <>
      <Nav />
      <main className="flex-1">
        <article className="mx-auto w-full max-w-3xl px-4 pb-32 pt-6 md:pt-10">
          <header className="mb-6">
            <Link
              href={`/u/${project.creator.github_username}`}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <Avatar className="h-6 w-6">
                {project.creator.avatar_url ? (
                  <AvatarImage
                    src={project.creator.avatar_url}
                    alt={project.creator.github_username}
                  />
                ) : null}
                <AvatarFallback>
                  {project.creator.github_username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span>
                {project.creator.display_name ??
                  `@${project.creator.github_username}`}
              </span>
            </Link>

            <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
              {project.title}
            </h1>
            <p className="mt-2 max-w-prose text-base text-muted-foreground">
              {project.tagline}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {project.is_open_source ? (
                <Badge variant="success">Open source</Badge>
              ) : (
                <Badge variant="secondary">Closed source</Badge>
              )}
              {project.category ? (
                <Badge variant="outline">{project.category}</Badge>
              ) : null}
              {project.github_language ? (
                <Badge variant="secondary">{project.github_language}</Badge>
              ) : null}
              {project.github_stars != null ? (
                <Badge variant="warning" className="gap-1">
                  <Star className="h-3 w-3 fill-current" />
                  {formatCount(project.github_stars)}
                </Badge>
              ) : null}
            </div>
          </header>

          {project.media.length > 0 ? (
            <Card className="overflow-hidden">
              <MediaGallery
                media={project.media}
                showControls
                aspectClass="aspect-video"
              />
            </Card>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Button asChild size="lg" className="gap-2">
              <Link href={`/feed?focus=${project.id}`}>
                <Star className="h-4 w-4 fill-primary-foreground" />
                Star on Stargaze
              </Link>
            </Button>
            {project.github_repo_url ? (
              <Button asChild variant="outline" size="lg" className="gap-2">
                <a
                  href={project.github_repo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <GithubIcon className="h-4 w-4" />
                  View repo
                </a>
              </Button>
            ) : null}
            {project.cta_url ? (
              <Button asChild variant="ghost" size="lg" className="gap-2">
                <a
                  href={project.cta_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                  Try it
                </a>
              </Button>
            ) : null}
          </div>

          {project.description_html ? (
            <section
              className="prose prose-invert mt-10 max-w-none prose-headings:tracking-tight prose-a:text-primary prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-pre:bg-card"
              // The description_html is sanitized server-side via the
              // markdown agent's pipeline before write.
              dangerouslySetInnerHTML={{ __html: project.description_html }}
            />
          ) : project.description_md ? (
            <pre className="mt-10 whitespace-pre-wrap rounded-md border border-border bg-card/40 p-4 font-mono text-xs">
              {project.description_md}
            </pre>
          ) : null}
        </article>
      </main>
      <Footer />
    </>
  );
}
