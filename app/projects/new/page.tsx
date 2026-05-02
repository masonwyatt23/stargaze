import { redirect } from "next/navigation";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { getCurrentUser } from "@/lib/auth/get-user";
import { ProjectForm } from "./project-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Submit a project",
  description: "Put your side project in front of builders who star.",
};

export default async function NewProjectPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?redirect=/projects/new");

  return (
    <>
      <Nav />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-5xl px-4 pb-32 pt-6 md:pt-10">
          <header className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Ship a project
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              The deck rewards taglines that stop the scroll. Make it count.
            </p>
          </header>
          <ProjectForm
            currentUser={{
              github_username: user.github_username,
              display_name: user.display_name,
              avatar_url: user.avatar_url,
            }}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
