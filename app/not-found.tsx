import Link from "next/link";
import { ArrowRight, Layers, Trophy } from "lucide-react";
import { LogomarkSVG } from "@/components/icons/logomark";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "404 — Lost in space · Stargaze",
  description: "We couldn't find that page. Let's get you back on the deck.",
};

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16">
      <div
        aria-hidden
        className="star-trail pointer-events-none absolute inset-0 opacity-60"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-1/3 h-72 w-72 rounded-full bg-primary/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 bottom-1/4 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl"
      />

      <div className="relative z-10 w-full max-w-lg text-center">
        <div className="mb-6 flex justify-center">
          <LogomarkSVG className="size-24 text-primary drop-shadow-[0_0_30px_rgba(250,204,21,0.35)]" />
        </div>

        <p className="text-xs font-medium uppercase tracking-widest text-primary/80">
          Error 404
        </p>
        <h1 className="mt-2 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-3xl font-bold tracking-tight text-transparent md:text-4xl">
          Lost in space
        </h1>
        <p className="mt-3 text-sm text-muted-foreground md:text-base">
          The page you&apos;re looking for drifted out of orbit. Let&apos;s get
          you back to where the projects are.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-2 sm:flex-row">
          <Button asChild size="lg" className="gap-2">
            <Link href="/">
              Back home
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="ghost" className="gap-2">
            <Link href="/feed">
              <Layers className="h-4 w-4" />
              Open the deck
            </Link>
          </Button>
          <Button asChild size="lg" variant="ghost" className="gap-2">
            <Link href="/leaderboard">
              <Trophy className="h-4 w-4" />
              Leaderboard
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
