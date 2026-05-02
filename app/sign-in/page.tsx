import type { Metadata } from "next";
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
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-card/60 p-8 shadow-2xl backdrop-blur">
        <div className="mb-8 text-center">
          <h1 className="bg-gradient-to-br from-primary to-amber-300 bg-clip-text text-4xl font-bold text-transparent">
            Stargaze
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Swipe through indie GitHub side projects.
            <br />
            Right-swipe stars the repo for you.
          </p>
        </div>

        {error ? (
          <div
            role="alert"
            className="mb-6 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          >
            {prettyError(error)}
          </div>
        ) : null}

        <SignInButton redirectTo={redirect} />

        <p className="mt-6 text-center text-xs text-muted-foreground">
          We request <code className="text-foreground/80">public_repo</code>,{" "}
          <code className="text-foreground/80">read:user</code>, and{" "}
          <code className="text-foreground/80">user:email</code> so we can star
          repos you save. Revoke any time in your GitHub settings.
        </p>
      </div>
    </main>
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
