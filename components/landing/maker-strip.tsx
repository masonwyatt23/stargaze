import Link from "next/link";
import { ArrowRight, Sparkles, Zap, Eye, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

const SHIP_PROOF = [
  {
    icon: <Zap className="h-3.5 w-3.5" />,
    label: "90 second submit",
    body: "Paste a GitHub URL, drop a screenshot, write a tagline under 100 chars. Live the moment you click ship.",
  },
  {
    icon: <Eye className="h-3.5 w-3.5" />,
    label: "Real eyeballs",
    body: "We seed every feed with hand-picked viewers. New projects get a 24-hour fresh-boost so they actually surface.",
  },
  {
    icon: <Trophy className="h-3.5 w-3.5" />,
    label: "Stars that count",
    body: "Right-swipes auto-star your repo. The leaderboard ranks creators by stars delivered — earn distribution that compounds.",
  },
];

/**
 * For-makers strip — sales-y but in a builder vocabulary. Two-column
 * layout: left is a fat proof block with brand-yellow accents; right is
 * the action panel.
 */
export function MakerStrip() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card/40 p-8 md:p-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[radial-gradient(circle,hsl(47_96%_58%/0.18),transparent_70%)] blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 starfield opacity-60"
      />

      <div className="relative grid gap-12 md:grid-cols-[1.3fr_1fr]">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
            <Sparkles className="h-3 w-3" />
            For makers · § 06
          </div>

          <h2 className="mt-5 text-3xl font-bold tracking-tight md:text-5xl">
            You ship indie projects.
            <br />
            <span className="bg-gradient-to-br from-primary via-primary to-amber-300 bg-clip-text text-transparent">
              Stargaze ships you.
            </span>
          </h2>

          <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
            Distribution is the only bottleneck left. Stargaze turns swipes
            into stars and stars into momentum — your weekend hack reaches
            people who actually click through to your repo.
          </p>

          <ul className="mt-8 space-y-4">
            {SHIP_PROOF.map((s, i) => (
              <li key={s.label} className="flex gap-4">
                <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/30">
                  {s.icon}
                </span>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground">
                    0{i + 1} · {s.label}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {s.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col justify-between gap-6">
          <div className="rounded-2xl border hairline bg-background/40 p-5 backdrop-blur-sm">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/80">
              Average new project · first 7 days
            </div>
            <dl className="mt-4 space-y-3">
              {[
                { k: "swipes seen", v: "1,240" },
                { k: "right-swipes", v: "318" },
                { k: "github stars synced", v: "270" },
                { k: "click-throughs to repo", v: "186" },
              ].map((row) => (
                <div
                  key={row.k}
                  className="flex items-baseline justify-between gap-3 border-b border-dashed hairline pb-2 last:border-0 last:pb-0"
                >
                  <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    {row.k}
                  </dt>
                  <dd className="stat-numeral text-xl text-foreground">
                    {row.v}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/60">
              Indicative — based on early curated cohorts.
            </p>
          </div>

          <Button asChild size="xl" className="gap-2">
            <Link href="/projects/new">
              Submit a project
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
