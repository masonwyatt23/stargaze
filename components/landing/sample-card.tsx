import { ArrowRight, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GithubIcon } from "@/components/icons/github-icon";

type Props = {
  /** Logged-in user, if any — used to make the preview personal. */
  user: {
    github_username: string;
    avatar_url: string | null;
  } | null;
};

/**
 * Mock "your project would look like this" preview — a polished mini
 * version of a feed card with placeholder values. Designed to make a
 * maker visualize their card on the deck before they submit.
 *
 * Swiper-mock UI: live signal dot, fake screenshot frame, creator-chip
 * (with the visitor's avatar if signed in, "@you" otherwise), and a
 * stars chip animating from "0 → many".
 */
export function SampleCard({ user }: Props) {
  const handle = user?.github_username ?? "you";
  const initials = handle.slice(0, 2).toUpperCase();

  return (
    <div className="relative">
      {/* Decorative caption */}
      <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-primary/80">
        <span className="relative inline-flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 opacity-70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>
        Your card · live preview
      </div>

      {/* Card frame — mimics the real feed card */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card shadow-[0_0_60px_-20px_hsl(47_96%_58%/0.45)]">
        {/* Cover */}
        <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-secondary via-card to-background">
          {/* Faux-screenshot grid */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-60"
            style={{
              backgroundImage: `
                linear-gradient(to right, hsl(var(--border) / 0.4) 1px, transparent 1px),
                linear-gradient(to bottom, hsl(var(--border) / 0.4) 1px, transparent 1px)
              `,
              backgroundSize: "32px 32px",
            }}
          />
          {/* Glow */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 70% 30%, hsl(47 96% 58% / 0.22), transparent 60%)",
            }}
          />

          {/* Mock browser chrome */}
          <div className="absolute left-4 right-4 top-4 flex items-center gap-2 rounded-md border hairline bg-background/70 px-3 py-1.5 backdrop-blur">
            <span className="flex gap-1">
              <span className="h-2 w-2 rounded-full bg-foreground/15" />
              <span className="h-2 w-2 rounded-full bg-foreground/15" />
              <span className="h-2 w-2 rounded-full bg-foreground/15" />
            </span>
            <span className="ml-2 font-mono text-[10px] text-muted-foreground/80">
              github.com/{handle}/your-repo
            </span>
          </div>

          {/* Centered logo placeholder */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/30 backdrop-blur">
              <Star
                className="h-8 w-8 fill-primary text-primary constellation-glow"
                strokeWidth={0}
                aria-hidden
              />
            </div>
          </div>

          {/* Top-right rank badge */}
          <span className="absolute right-4 top-4 rounded-full border border-primary/40 bg-background/70 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.22em] text-primary backdrop-blur">
            ✦ Hero pick
          </span>
        </div>

        {/* Body */}
        <div className="space-y-3 p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-lg font-bold leading-tight tracking-tight text-foreground">
              Your project title
            </h3>
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary/15 px-2 py-1 font-mono text-[10px] text-primary ring-1 ring-primary/30">
              <Star
                className="h-2.5 w-2.5 fill-primary"
                strokeWidth={0}
                aria-hidden
              />
              0 <ArrowRight className="h-2.5 w-2.5" aria-hidden /> many
            </span>
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground">
            Your tagline goes here. One line, under 100 chars, says what
            it does and who it&apos;s for.
          </p>

          <div className="flex items-center justify-between border-t hairline pt-3">
            <span className="flex items-center gap-2">
              <Avatar className="h-6 w-6 ring-1 ring-primary/30">
                {user?.avatar_url ? (
                  <AvatarImage src={user.avatar_url} alt={handle} />
                ) : null}
                <AvatarFallback className="text-[10px]">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="font-mono text-xs text-foreground">
                @{handle}
              </span>
            </span>
            <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
              <GithubIcon className="h-3 w-3" />
              auto-star on right swipe
            </span>
          </div>
        </div>
      </div>

      {/* Footer caption */}
      <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/60">
        ↑ This is what your project would look like.
      </p>
    </div>
  );
}
