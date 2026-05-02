import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Lock, ShieldCheck, Star } from "lucide-react";
import { LogomarkSVG } from "@/components/icons/logomark";
import { SignInButton } from "./sign-in-button";

export const metadata: Metadata = {
  title: "Sign in — Stargaze",
  description:
    "Sign in with GitHub to swipe, save, and auto-star indie side projects.",
};

type SignInPageProps = {
  // Next.js 16: searchParams is async.
  searchParams: Promise<{ error?: string; redirect?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { error, redirect } = await searchParams;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16">
      {/* Star-trail flourish behind the panel */}
      <div
        aria-hidden
        className="star-trail pointer-events-none absolute inset-0 opacity-70"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-1/4 h-72 w-72 rounded-full bg-primary/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 bottom-1/3 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl"
      />

      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-card/70 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Stargaze home"
          >
            <LogomarkSVG className="size-7 text-primary" />
            <span className="bg-gradient-to-br from-primary to-amber-300 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
              Stargaze
            </span>
          </Link>
          <p className="mt-3 text-sm text-muted-foreground">
            Swipe through indie GitHub side projects.
            <br />
            Right-swipe stars the repo for you.
          </p>
        </div>

        {error ? (
          <div
            role="alert"
            className="mb-6 flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <span className="text-red-200">{prettyError(error)}</span>
          </div>
        ) : null}

        <SignInButton redirectTo={redirect} />

        <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground/80">
          By continuing you agree to our{" "}
          <Link
            href="/terms"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Terms
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Privacy Policy
          </Link>
          .
        </p>

        <div className="mt-6 space-y-2.5 rounded-lg border border-border/60 bg-background/40 p-4">
          <ScopeRow
            icon={<Star className="h-3.5 w-3.5" />}
            title="public_repo"
            body="Used only to star repos when you swipe right. We never write to your repos."
          />
          <ScopeRow
            icon={<Lock className="h-3.5 w-3.5" />}
            title="read:user · user:email"
            body="Reads your public profile so we can show your avatar and link your stars."
          />
          <ScopeRow
            icon={<ShieldCheck className="h-3.5 w-3.5" />}
            title="Revoke anytime"
            body="Disable auto-star in settings or revoke the OAuth app on GitHub."
          />
        </div>
      </div>
    </main>
  );
}

function ScopeRow({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span
        aria-hidden
        className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"
      >
        {icon}
      </span>
      <div className="space-y-0.5">
        <p className="text-xs font-medium text-foreground">{title}</p>
        <p className="text-[11px] leading-snug text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

function prettyError(code: string): string {
  switch (code) {
    case "oauth_failed":
      return "GitHub sign-in failed. Please try again.";
    case "exchange_failed":
      return "We couldn't complete the sign-in handshake. Please try again.";
    case "no_provider_token":
      return "GitHub didn't share an access token. Try removing Stargaze in your GitHub OAuth apps and signing in again.";
    case "user_upsert_failed":
      return "Sign-in succeeded but we couldn't save your profile. Please try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}
