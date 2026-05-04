import Link from "next/link";

import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";

export const metadata = {
  title: "Privacy — Stargaze",
  description:
    "What data Stargaze collects, why, and how to delete it. Plain language.",
};

const LAST_UPDATED = "May 4, 2026";

export default function PrivacyPage() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <article className="mx-auto w-full max-w-3xl px-4 py-12 md:py-20">
          <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary">
            ★ stargaze · privacy
          </p>
          <h1 className="mt-2 editorial-display text-4xl text-foreground md:text-5xl">
            Privacy policy
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Last updated {LAST_UPDATED}.
          </p>

          <Section title="In one paragraph">
            Stargaze stores your GitHub identity, an encrypted GitHub OAuth
            token used solely to star repos on your behalf when you swipe
            right, the projects you swipe on, and the projects you submit. We
            don&apos;t sell data, we don&apos;t run third-party trackers
            beyond Vercel Analytics, and we delete everything we have about
            you within 30 days if you ask. Email{" "}
            <a
              className="text-primary underline"
              href="mailto:support@ashlr.ai"
            >
              support@ashlr.ai
            </a>{" "}
            with the subject &ldquo;delete my account&rdquo; and we&apos;ll do it.
          </Section>

          <Section title="What we collect">
            <ul className="space-y-2">
              <li>
                <strong>From GitHub at sign-in:</strong> your username,
                numeric ID, display name, avatar URL, public email, and the
                organizations whose membership is public. We also receive an
                OAuth access token scoped to <code>public_repo</code>,{" "}
                <code>read:user</code>, <code>user:email</code>, and{" "}
                <code>read:org</code>.
              </li>
              <li>
                <strong>What you give us:</strong> projects you submit
                (title, tagline, description, screenshots, repo URL, demo
                video URL).
              </li>
              <li>
                <strong>From your interactions:</strong> the projects you
                swipe on (and direction), saves, access requests you send to
                closed-source makers.
              </li>
              <li>
                <strong>Operational logs:</strong> request paths, status
                codes, and error messages for ~30 days. We do not log your
                OAuth token, ever.
              </li>
            </ul>
          </Section>

          <Section title="What we do with it">
            <ul className="space-y-2">
              <li>
                <strong>Auto-star repos when you swipe right.</strong> The
                only reason we hold your GitHub token. Encrypted at rest with
                a key we never expose to the browser.
              </li>
              <li>
                <strong>Personalize your feed.</strong> Your swipe history
                informs what shows up next. Stays on our servers.
              </li>
              <li>
                <strong>Power the leaderboard + creator pages.</strong>{" "}
                Public counts of right-swipes per maker. Aggregate counts
                only — your individual swipes are private.
              </li>
              <li>
                <strong>Send you emails.</strong> Transactional only:
                weekly digest of your project performance, and access
                requests sent to your projects. Unsubscribe anytime in{" "}
                <Link
                  href="/settings"
                  className="text-primary underline"
                >
                  settings
                </Link>
                .
              </li>
            </ul>
          </Section>

          <Section title="Who we share it with">
            <p>
              GitHub (when starring/unstarring on your behalf), Supabase
              (database hosting), Vercel (web hosting + analytics), and
              SendGrid (transactional email). That&apos;s the full list. We
              don&apos;t sell or rent data, and we don&apos;t share with
              advertisers.
            </p>
          </Section>

          <Section title="Cookies + tracking">
            <p>
              We use Vercel Analytics for traffic counts. It does not use
              cookies and does not identify you across sites. Sign-in uses
              a session cookie issued by Supabase Auth — required for the
              app to work.
            </p>
          </Section>

          <Section title="Your rights">
            <ul className="space-y-2">
              <li>
                <strong>Export:</strong> email{" "}
                <a
                  className="text-primary underline"
                  href="mailto:support@ashlr.ai"
                >
                  support@ashlr.ai
                </a>{" "}
                and we&apos;ll send you a JSON dump of everything tied to
                your account within 7 days.
              </li>
              <li>
                <strong>Delete:</strong> same address, same SLA. Deletes
                projects, swipes, OAuth token, and account row. Public
                pages of deleted projects 404 immediately.
              </li>
              <li>
                <strong>Revoke GitHub access:</strong> visit{" "}
                <a
                  className="text-primary underline"
                  href="https://github.com/settings/connections/applications"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  github.com/settings/connections
                </a>{" "}
                and remove Stargaze. Your repo stars stay; future swipes
                stop firing.
              </li>
            </ul>
          </Section>

          <Section title="Contact">
            Questions, deletions, or data requests:{" "}
            <a
              className="text-primary underline"
              href="mailto:support@ashlr.ai"
            >
              support@ashlr.ai
            </a>
            .
          </Section>
        </article>
      </main>
      <Footer />
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10 border-t border-border/60 pt-8">
      <h2 className="text-xl font-bold tracking-tight md:text-2xl">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground md:text-base">
        {children}
      </div>
    </section>
  );
}
