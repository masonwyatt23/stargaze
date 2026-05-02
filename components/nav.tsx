import Link from "next/link";
import { Layers, Plus, Star, Trophy } from "lucide-react";
import { GithubIcon } from "@/components/icons/github-icon";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo, LogoMark } from "@/components/logo";
import { getCurrentUser } from "@/lib/auth/get-user";
import { cn } from "@/lib/utils";

/**
 * Top nav for desktop + a bottom tab bar for mobile. Server component —
 * fetches the current user once and passes it to both.
 */
export async function Nav() {
  const user = await getCurrentUser();

  return (
    <>
      <DesktopNav user={user} />
      <MobileTabBar user={user} />
    </>
  );
}

type NavUser = Awaited<ReturnType<typeof getCurrentUser>>;

function DesktopNav({ user }: { user: NavUser }) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 hidden md:block",
        "border-b border-border/60 bg-background/70 backdrop-blur-xl",
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Logo size="md" />
          <nav className="flex items-center gap-1 text-sm">
            <NavLink href="/feed">Feed</NavLink>
            <NavLink href="/saves">Saves</NavLink>
            <NavLink href="/leaderboard">Leaderboard</NavLink>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm" className="gap-1.5">
                <Link href="/projects/new">
                  <Plus className="h-4 w-4" />
                  Submit
                </Link>
              </Button>
              <ProfileMenu user={user} />
            </>
          ) : (
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/sign-in">
                <GithubIcon className="h-4 w-4" />
                Sign in
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

function MobileTabBar({ user }: { user: NavUser }) {
  return (
    <>
      {/* Mobile-only top strip with logo + sign-in */}
      <header className="sticky top-0 z-40 flex h-12 items-center justify-between border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl md:hidden">
        <Logo size="sm" />
        {user ? (
          <Link
            href={`/u/${user.github_username}`}
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Avatar className="h-7 w-7">
              {user.avatar_url ? (
                <AvatarImage src={user.avatar_url} alt={user.github_username} />
              ) : null}
              <AvatarFallback>
                {user.github_username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
        ) : (
          <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
            <Link href="/sign-in">Sign in</Link>
          </Button>
        )}
      </header>

      {/* Bottom tab bar */}
      <nav
        aria-label="Primary"
        className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-4 border-t border-border/60 bg-background/85 backdrop-blur-xl md:hidden"
      >
        <TabBarLink href="/feed" icon={<Layers className="h-5 w-5" />} label="Feed" />
        <TabBarLink href="/saves" icon={<Star className="h-5 w-5" />} label="Saves" />
        <TabBarLink
          href="/leaderboard"
          icon={<Trophy className="h-5 w-5" />}
          label="Leaders"
        />
        <TabBarLink
          href={user ? "/projects/new" : "/sign-in"}
          icon={<Plus className="h-5 w-5" />}
          label="Submit"
        />
      </nav>
    </>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </Link>
  );
}

function TabBarLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function ProfileMenu({ user }: { user: NonNullable<NavUser> }) {
  // Lightweight nav — clicking the avatar sends you to your profile;
  // sign-out lives in /settings.
  return (
    <Link
      href={`/u/${user.github_username}`}
      className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label="Your profile"
    >
      <Avatar className="h-8 w-8 ring-1 ring-border">
        {user.avatar_url ? (
          <AvatarImage src={user.avatar_url} alt={user.github_username} />
        ) : null}
        <AvatarFallback>
          {user.github_username.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
    </Link>
  );
}

export { LogoMark };
