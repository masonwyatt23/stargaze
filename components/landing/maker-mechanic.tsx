import { ArrowRight, Hand, Star } from "lucide-react";
import { GithubIcon } from "@/components/icons/github-icon";

/**
 * 3-step "submit → swipe → star" flow with a tiny SVG connector. Built to
 * communicate the entire mechanic in 30 seconds. Used inside <MakerStrip />.
 *
 * The flow is intentionally horizontal on desktop (so the eye reads
 * left-to-right and lands on "stars delivered") and stacked vertically on
 * mobile with a vertical SVG arrow between steps.
 */
export function MakerMechanic() {
  const steps = [
    {
      n: "01",
      title: "Submit",
      ms: "90 seconds",
      body: "Paste a GitHub URL. We pull stars, language, and a cover. Add a tagline under 100 chars.",
      icon: <GithubIcon className="h-3.5 w-3.5" aria-hidden />,
    },
    {
      n: "02",
      title: "People swipe",
      ms: "~24h fresh-boost",
      body: "Your card lands on the deck with a fresh-boost window, then settles into algorithmic ranking.",
      icon: <Hand className="h-4 w-4" aria-hidden />,
    },
    {
      n: "03",
      title: "Stars delivered",
      ms: "real, on-chain GitHub",
      body: "Right-swipes auto-star your repo via the swiper's GitHub OAuth. No bots, no fake metrics.",
      icon: <Star className="h-4 w-4 fill-current" strokeWidth={0} aria-hidden />,
    },
  ];

  return (
    <div className="relative">
      {/* Step grid */}
      <ol className="relative grid gap-4 md:grid-cols-3 md:gap-0">
        {steps.map((s, i) => (
          <li
            key={s.n}
            className="relative flex h-full flex-col gap-3 rounded-2xl border hairline bg-background/40 p-5 backdrop-blur-sm md:rounded-none md:border-0 md:bg-transparent md:px-7 md:backdrop-blur-none"
          >
            {/* Vertical divider on desktop, between steps */}
            {i > 0 ? (
              <span
                aria-hidden
                className="absolute -left-px top-3 hidden h-[calc(100%-1.5rem)] w-px bg-foreground/10 md:block"
              />
            ) : null}

            {/* Stacked-mobile arrow connector */}
            {i > 0 ? (
              <span
                aria-hidden
                className="absolute -top-3 left-1/2 hidden h-3 w-px -translate-x-1/2 bg-primary/40 md:hidden"
              />
            ) : null}

            <div className="flex items-baseline justify-between gap-2">
              <span className="stat-numeral text-4xl text-primary md:text-5xl">
                {s.n}
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.22em] text-primary">
                {s.icon}
                {s.title}
              </span>
            </div>

            <h3 className="text-lg font-semibold tracking-tight text-foreground">
              {s.title}
              <span className="ml-2 font-mono text-[10px] font-normal uppercase tracking-[0.22em] text-muted-foreground/70">
                {s.ms}
              </span>
            </h3>

            <p className="text-sm leading-relaxed text-muted-foreground">
              {s.body}
            </p>
          </li>
        ))}
      </ol>

      {/* Decorative connector arrows (desktop only) — drawn as inline SVG
          so we can paint them brand-yellow with a soft glow. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 hidden -translate-y-1/2 md:block"
      >
        <div className="grid grid-cols-3">
          <div className="flex justify-end pr-2">
            <ArrowRight className="h-4 w-4 text-primary/50" />
          </div>
          <div className="flex justify-end pr-2">
            <ArrowRight className="h-4 w-4 text-primary/50" />
          </div>
          <span />
        </div>
      </div>
    </div>
  );
}
