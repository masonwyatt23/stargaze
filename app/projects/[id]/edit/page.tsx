import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { EditForm } from "./edit-form";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditProjectPage({ params }: Props) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?redirect=/projects/${id}/edit`);

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select(
      `id, slug, user_id, title, tagline, description_md, github_repo_url,
       cta_url, is_open_source, category, status,
       media:project_media(id, type, url, order_index)`,
    )
    .eq("id", id)
    .maybeSingle();

  if (!project) notFound();
  if (project.user_id !== user.id) redirect(`/p/${project.slug}`);

  const media = (project.media ?? []) as Array<{
    id: string;
    type: "screenshot" | "video" | "gif";
    url: string;
    order_index: number;
  }>;
  const sorted = [...media].sort((a, b) => a.order_index - b.order_index);
  const demoVideo = sorted.find((m) => m.type === "video")?.url ?? null;
  const screenshots = sorted
    .filter((m) => m.type === "screenshot" || m.type === "gif")
    .map((m) => m.url);

  return (
    <>
      <Nav />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-4 pb-32 pt-8 md:pt-12">
          <Link
            href={`/p/${project.slug}`}
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to share page
          </Link>

          <header className="mb-8">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
              ★ Edit listing
            </span>
            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
              {project.title}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Update everything visitors see — title, tagline, screenshots,
              README. Changes go live immediately.
            </p>
          </header>

          <EditForm
            projectId={project.id}
            slug={project.slug}
            status={project.status as "live" | "hidden" | "flagged"}
            initial={{
              title: project.title,
              tagline: project.tagline,
              description_md: project.description_md ?? "",
              github_repo_url: project.github_repo_url ?? "",
              cta_url: project.cta_url ?? "",
              is_open_source: project.is_open_source,
              category:
                (project.category as
                  | "ai-tool"
                  | "dev-utility"
                  | "game"
                  | "saas"
                  | "other"
                  | null) ?? null,
              demo_video_url: demoVideo ?? "",
              screenshots,
            }}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
