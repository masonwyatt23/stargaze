import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { GithubIcon } from "@/components/icons/github-icon";
import { LogomarkSVG } from "@/components/icons/logomark";
import { Button } from "@/components/ui/button";

/**
 * Final CTA — observatory style. Big logomark on a starfield with a
 * single typographic statement and two buttons. Restrained on purpose.
 */
export function ObservatoryCta() {
  return (
    <section className="relative isolate overflow-hidden border-t hairline">
      <div aria-hidden className="absolute inset-0 starfield opacity-80" />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_50%_120%,hsl(47_96%_58%/0.15),transparent_60%)]"
      />

      <div className="relative mx-auto max-w-3xl px-6 py-24 text-center md:py-32">
        <div className="flex justify-center">
          <div className="relative">
            <div
              aria-hidden
              className="absolute inset-0 -z-10 blur-2xl"
              style={{
                background:
                  "radial-gradient(circle, hsl(47 96% 58% / 0.45) 0%, transparent 65%)",
              }}
            />
            <LogomarkSVG className="h-16 w-16 text-primary md:h-20 md:w-20" />
          </div>
        </div>

        <div className="mt-6 font-mono text-[10px] uppercase tracking-[0.32em] text-primary/90">
          ★ End of bulletin · § 09
        </div>

        <h2 className="mt-6 editorial-display text-5xl text-foreground md:text-7xl">
          Stop scrolling.
          <br />
          <span className="text-primary">Start starring.</span>
        </h2>

        <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
          Sign in with GitHub. Swipe a few decks. Make a maker&apos;s week.
          Discover three indie projects you&apos;ll actually use before
          breakfast.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            asChild
            size="xl"
            className="gap-2 shadow-[0_0_40px_-12px_hsl(47_96%_58%/0.6)]"
          >
            <Link href="/sign-in">
              <GithubIcon className="h-5 w-5" />
              Continue with GitHub
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="xl" variant="ghost" className="gap-2">
            <Link href="/projects/new">
              <Star className="h-4 w-4 fill-primary text-primary" />
              Submit your project
            </Link>
          </Button>
        </div>

        <div className="mt-12 flex items-center justify-center gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
          <span>★</span>
          <span>swipe right</span>
          <span className="text-primary/60">/</span>
          <span>star repos</span>
          <span className="text-primary/60">/</span>
          <span>boost makers</span>
          <span>★</span>
        </div>
      </div>
    </section>
  );
}
