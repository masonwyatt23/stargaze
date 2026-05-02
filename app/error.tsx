"use client";

/**
 * App-level error boundary. Triggered when a server or client component
 * throws and isn't caught downstream. Must be a client component per the
 * Next.js App Router contract.
 */
import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { LogomarkSVG } from "@/components/icons/logomark";
import { Button } from "@/components/ui/button";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Best-effort client-side log; structured logging can hook in later.
    if (process.env.NODE_ENV !== "production") {
      console.error("[stargaze:error-boundary]", error);
    }
  }, [error]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16">
      <div
        aria-hidden
        className="star-trail pointer-events-none absolute inset-0 opacity-50"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-destructive/15 blur-3xl"
      />

      <div className="relative z-10 w-full max-w-lg text-center">
        <div className="mb-6 flex justify-center">
          <span className="relative inline-flex">
            <LogomarkSVG className="size-20 text-primary opacity-80" />
            <span
              aria-hidden
              className="absolute -bottom-1 -right-1 inline-flex h-7 w-7 items-center justify-center rounded-full border border-destructive/40 bg-background text-destructive shadow-md"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
            </span>
          </span>
        </div>

        <p className="text-xs font-medium uppercase tracking-widest text-destructive">
          Something went wrong
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
          Something starwise broke
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          A glitch knocked us off course. Try again, or head back home.
        </p>

        {error.message ? (
          <div className="mx-auto mt-5 max-w-md overflow-hidden rounded-lg border border-border/60 bg-background/50 p-3 text-left">
            <p className="line-clamp-3 break-words text-xs text-muted-foreground">
              {error.message}
            </p>
            {error.digest ? (
              <p className="mt-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60">
                ref · {error.digest}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-8 flex flex-col items-center justify-center gap-2 sm:flex-row">
          <Button
            type="button"
            onClick={() => reset()}
            size="lg"
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Try again
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link href="/">Back home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
