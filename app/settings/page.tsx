import { redirect } from "next/navigation";
import { LogOut, Star } from "lucide-react";
import { GithubIcon } from "@/components/icons/github-icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { Separator } from "@/components/ui/separator";
import { getCurrentUser } from "@/lib/auth/get-user";
import { AutoStarToggle } from "./auto-star-toggle";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Settings",
  description: "Manage your Stargaze preferences.",
};

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?redirect=/settings");

  return (
    <>
      <Nav />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-2xl px-4 pb-32 pt-6 md:pt-10">
          <header className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Settings
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Tune how Stargaze behaves on your behalf.
            </p>
          </header>

          {/* Account row */}
          <Card className="mb-6">
            <CardContent className="flex items-center gap-4 p-4">
              <Avatar className="h-12 w-12">
                {user.avatar_url ? (
                  <AvatarImage src={user.avatar_url} alt={user.github_username} />
                ) : null}
                <AvatarFallback>
                  {user.github_username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold">
                  {user.display_name ?? user.github_username}
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  @{user.github_username}
                </p>
              </div>
              <a
                href={`https://github.com/${user.github_username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <GithubIcon className="h-4 w-4" />
                GitHub
              </a>
            </CardContent>
          </Card>

          <h2 className="mb-3 text-lg font-semibold tracking-tight">
            Preferences
          </h2>

          <Card>
            <CardContent className="p-0">
              <AutoStarToggle initial={user.auto_star_enabled} />
              <Separator />
              <div className="flex items-start gap-3 p-4">
                <Star
                  className="mt-0.5 h-5 w-5 shrink-0 fill-primary text-primary"
                  strokeWidth={1.5}
                />
                <div>
                  <p className="text-sm font-medium">How auto-star works</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Right-swiping an open-source project stars it on GitHub
                    using the OAuth scope you granted at sign-in. Skips never
                    star anything. Removing a save unstars the repo.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <h2 className="mb-3 mt-10 text-lg font-semibold tracking-tight">
            Account
          </h2>

          <Card>
            <CardContent className="p-0">
              <SignOutRow />
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}

function SignOutRow() {
  return (
    <form action="/api/auth/sign-out" method="post">
      <button
        type="submit"
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left text-sm text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex items-center gap-3">
          <LogOut className="h-4 w-4" />
          <span>Sign out</span>
        </div>
        <span className="text-xs text-muted-foreground">
          Ends this Stargaze session
        </span>
      </button>
    </form>
  );
}
