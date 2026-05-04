import Link from "next/link";

import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";

export const metadata = {
  title: "Terms — Stargaze",
  description: "The basics of using Stargaze. Plain language.",
};

const LAST_UPDATED = "May 4, 2026";

export default function TermsPage() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <article className="mx-auto w-full max-w-3xl px-4 py-12 md:py-20">
          <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary">
            ★ stargaze · terms
          </p>
          <h1 className="mt-2 editorial-display text-4xl text-foreground md:text-5xl">
            Terms of service
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Last updated {LAST_UPDATED}.
          </p>

          <Section title="The deal">
            Stargaze is a free swipe-deck for indie GitHub projects, run by
            Ashlr. By signing in or submitting a project you agree to these
            terms. They&apos;re short. If anything below conflicts with the{" "}
            <Link
              href="/privacy"
              className="text-primary underline"
            >
              privacy policy
            </Link>
            , the privacy policy wins.
          </Section>

          <Section title="What you can do">
            <ul className="space-y-2">
              <li>Sign in with GitHub.</li>
              <li>
                Submit your own projects, or projects you have explicit
                permission to list.
              </li>
              <li>
                Swipe through other people&apos;s projects. Right-swipes
                save them and (if auto-star is on) star their repo on
                GitHub via your account.
              </li>
              <li>Request access to closed-source projects.</li>
              <li>
                Embed your project&apos;s Stargaze badge anywhere you want.
              </li>
            </ul>
          </Section>

          <Section title="What you can't do">
            <ul className="space-y-2">
              <li>
                Submit projects you don&apos;t own and don&apos;t have
                permission to list. Curator-imported projects can be claimed
                by their original creator at any time.
              </li>
              <li>
                Submit content that&apos;s illegal, fraudulent, malicious,
                infringing, or designed to harm users (malware, phishing,
                scams).
              </li>
              <li>
                Spam, manipulate the leaderboard, abuse the swipe rate
                limits, or run automation against the site without our
                explicit OK.
              </li>
              <li>
                Sign in with a GitHub account that&apos;s less than 30 days
                old. Anti-spam guard.
              </li>
            </ul>
          </Section>

          <Section title="Auto-star">
            When auto-star is enabled (default), right-swiping an
            open-source project causes us to star it on GitHub on your
            behalf using your OAuth token. You authorize this by signing in.
            You can disable auto-star anytime in{" "}
            <Link
              href="/settings"
              className="text-primary underline"
            >
              settings
            </Link>
            , and you can remove the star yourself from GitHub or by
            unsaving the project on Stargaze.
          </Section>

          <Section title="Content + IP">
            You keep ownership of everything you submit. By submitting a
            project, you grant Stargaze a non-exclusive license to display
            it on the site, in feed cards, in social-share images, and in
            email digests. We can remove or hide content that violates
            these terms, with or without notice, and we can do so quietly
            (status set to <code>hidden</code>) before reaching out.
          </Section>

          <Section title="Service-as-is">
            Stargaze is provided as-is. We don&apos;t guarantee uptime,
            data durability beyond reasonable backups, or that your project
            will get any particular number of swipes. We&apos;re not liable
            for missed business opportunities, lost stars, or anything else
            that happens because the service was unavailable.
          </Section>

          <Section title="Account termination">
            You can delete your account anytime by emailing{" "}
            <a
              className="text-primary underline"
              href="mailto:support@ashlr.ai"
            >
              support@ashlr.ai
            </a>
            . We can suspend or delete accounts that violate these terms.
            We&apos;ll usually email you first if there&apos;s ambiguity.
          </Section>

          <Section title="Changes">
            We&apos;ll update these terms occasionally. Material changes
            get a notice on the home page or via email; everything else
            we&apos;ll just bump the last-updated date above.
          </Section>

          <Section title="Contact">
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
