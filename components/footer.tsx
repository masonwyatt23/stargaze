import Link from "next/link";
import { GithubIcon } from "@/components/icons/github-icon";
import { Logo } from "@/components/logo";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-background/40 px-4 py-10 pb-24 text-sm md:pb-10">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div className="space-y-2">
          <Logo size="sm" />
          <p className="text-xs text-muted-foreground">
            Swipe right. Star repos. Boost makers.
          </p>
        </div>

        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <Link className="hover:text-foreground" href="/feed">
            Feed
          </Link>
          <Link className="hover:text-foreground" href="/leaderboard">
            Leaderboard
          </Link>
          <Link className="hover:text-foreground" href="/projects/new">
            Submit a project
          </Link>
          <a
            className="inline-flex items-center gap-1 hover:text-foreground"
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <GithubIcon className="h-3.5 w-3.5" />
            GitHub
          </a>
        </nav>
      </div>

      <div className="mx-auto mt-6 max-w-6xl text-[11px] text-muted-foreground/80">
        Stargaze is a side project for indie makers. Stars are sent on your
        behalf only when auto-star is enabled.
      </div>
    </footer>
  );
}
