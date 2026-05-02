import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Sparkles, Star } from "lucide-react";
import { GithubIcon } from "@/components/icons/github-icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/footer";
import { MediaGallery } from "@/components/media-gallery";
import { Nav } from "@/components/nav";
import { ShareButtons } from "@/components/share-buttons";
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

type SiblingProject = {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  github_language: string | null;
  is_open_source: boolean;
  media: { url: string; type: string; order_index: number }[];
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

  const supabase = await createClient();

  // "More from this maker" + "Discover more" — fetch in parallel.
  const [{ data: rawMakerProjects }, { data: rawNewest }] = await Promise.all([
    supabase
      .from("projects")
      .select(
        `id, slug, title, tagline, github_language, is_open_source,
         media:project_media(url, type, order_index)`,
      )
      .eq("user_id", project.user_id)
      .eq("status", "live")
      .neq("id", project.id)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("projects")
      .select(
        `id, slug, title, tagline, github_language, is_open_source,
         media:project_media(url, type, order_index)`,
      )
      .eq("status", "live")
      .neq("id", project.id)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const makerProjects =
    (rawMakerProjects ?? []) as unknown as SiblingProject[];
  const newestProjects = (rawNewest ?? []) as unknown as SiblingProject[];

  const heroMedia = [...project.media].sort(
    (a, b) => a.order_index - b.order_index,
  );
  const heroBackground = heroMedia.find((m) => m.type !== "video")?.url ?? null;

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://stargaze-evero.vercel.app";
  const shareUrl = `${baseUrl.replace(/\/$/, "")}/p/${project.slug}`;
  const shareText = `${project.title} — ${project.tagline}`;

  return (
    <>
      <Nav />
      <main className="flex-1">
        {/* ============================ Hero ============================ */}
        <section className="relative isolate overflow-hidden border-b border-border/60">
          {/* Blurred screenshot wallpaper */}
          {heroBackground ? (
            <div aria-hidden className="absolute inset-0 -z-10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroBackground}
                alt=""
                className="h-full w-full object-cover opacity-30 blur-2xl saturate-150"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/85 to-background" />
            </div>
          ) : (
            <div
              aria-hidden
              className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-background to-background"
            />
          )}

          <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 pb-12 pt-10 md:grid-cols-2 md:gap-12 md:pb-16 md:pt-16">
            {/* Left: project visual */}
            <div className="md:order-1">
              <Card className="overflow-hidden border-border/70 bg-card/90 shadow-2xl shadow-black/40 backdrop-blur-sm">
                {project.media.length > 0 ? (
                  <MediaGallery
                    media={project.media}
                    showControls
                    aspectClass="aspect-[16/10]"
                  />
                ) : (
                  <div className="flex aspect-[16/10] w-full items-center justify-center bg-muted text-muted-foreground/40">
                    <Star className="h-16 w-16" />
                  </div>
                )}
              </Card>
            </div>

            {/* Right: project details + CTAs */}
            <div className="flex flex-col justify-center gap-5 md:order-2">
              <Link
                href={`/u/${project.creator.github_username}`}
                className="inline-flex w-fit items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
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

              <div className="space-y-3">
                <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
                  {project.title}
                </h1>
                <p className="max-w-prose text-base text-muted-foreground md:text-lg">
                  {project.tagline}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
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

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Button asChild size="lg" className="gap-2">
                  <Link href={`/feed?focus=${project.id}`}>
                    <Sparkles className="h-4 w-4" />
                    Open in Stargaze
                  </Link>
                </Button>
                {project.github_repo_url ? (
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="gap-2"
                  >
                    <a
                      href={project.github_repo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <GithubIcon className="h-4 w-4" />
                      Star on GitHub
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

              <div className="pt-1">
                <ShareButtons
                  url={shareUrl}
                  text={shareText}
                  size="sm"
                />
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-10 md:pt-14">
          {/* ===================== Description body ===================== */}
          {project.description_html ? (
            <article
              className="prose prose-invert max-w-none prose-headings:tracking-tight prose-a:text-primary prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-pre:bg-card"
              // The description_html is sanitized server-side via the
              // markdown agent's pipeline before write.
              dangerouslySetInnerHTML={{ __html: project.description_html }}
            />
          ) : project.description_md ? (
            <pre className="whitespace-pre-wrap rounded-md border border-border bg-card/40 p-4 font-mono text-xs">
              {project.description_md}
            </pre>
          ) : null}
        </div>

        {/* ===================== More from this maker ===================== */}
        {makerProjects.length > 0 ? (
          <section className="border-t border-border/60 bg-background/40">
            <div className="mx-auto w-full max-w-6xl px-4 py-12">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
                    More from{" "}
                    {project.creator.display_name ??
                      `@${project.creator.github_username}`}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Other live projects from this maker.
                  </p>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/u/${project.creator.github_username}`}>
                    View profile →
                  </Link>
                </Button>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {makerProjects.map((p) => (
                  <SiblingCard key={p.id} project={p} />
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {/* ===================== Discover more ===================== */}
        {newestProjects.length > 0 ? (
          <section className="border-t border-border/60">
            <div className="mx-auto w-full max-w-6xl px-4 py-12 pb-24">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
                    Discover more
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Newest projects on the deck.
                  </p>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/feed">Open feed →</Link>
                </Button>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {newestProjects.map((p) => (
                  <SiblingCard key={p.id} project={p} />
                ))}
              </ul>
            </div>
          </section>
        ) : null}
      </main>
      <Footer />
    </>
  );
}

function SiblingCard({ project }: { project: SiblingProject }) {
  const cover = [...project.media]
    .sort((a, b) => a.order_index - b.order_index)
    .find((m) => m.type !== "video");

  return (
    <li>
      <Link
        href={`/p/${project.slug}`}
        className="group block focus-visible:outline-none"
      >
        <Card className="h-full overflow-hidden transition-all hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10 group-focus-visible:ring-2 group-focus-visible:ring-primary">
          <div className="aspect-[16/10] overflow-hidden bg-muted">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cover.url}
                alt=""
                className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                <Star className="h-10 w-10" />
              </div>
            )}
          </div>
          <CardContent className="p-4">
            <h3 className="line-clamp-1 font-semibold">{project.title}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {project.tagline}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {project.github_language ? (
                <Badge variant="secondary">{project.github_language}</Badge>
              ) : null}
              {project.is_open_source ? (
                <Badge variant="outline">OSS</Badge>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </Link>
    </li>
  );
}
