import {
  BarChart3,
  Check,
  Crown,
  Share2,
  Sparkles,
  Trophy,
} from "lucide-react";

/**
 * "What you get" checklist — six concrete benefits with lucide icons.
 * Lays out as a 2-column list on md+, single column on mobile. Each item
 * uses a brand-yellow check to keep the eye moving down the list.
 */
const ITEMS = [
  {
    icon: <Sparkles className="h-3.5 w-3.5" aria-hidden />,
    title: "Real GitHub stars from real users",
    body: "Not bots — actual swiper accounts. The star ledger lives on github.com/your-repo.",
  },
  {
    icon: <Share2 className="h-3.5 w-3.5" aria-hidden />,
    title: "A polished share page at /p/your-slug",
    body: "Rich Open Graph cards for Twitter, Discord, LinkedIn, and Slack — with auto-generated previews.",
  },
  {
    icon: <BarChart3 className="h-3.5 w-3.5" aria-hidden />,
    title: "Creator dashboard with daily stats",
    body: "Top-performing screenshots, a 30-day chart, swipe-through ratios, and where the click-throughs go.",
  },
  {
    icon: <Trophy className="h-3.5 w-3.5" aria-hidden />,
    title: "Spot on the weekly leaderboard",
    body: "Climb the ranks and earn a permanent constellation entry — visible to every visitor.",
  },
  {
    icon: <Crown className="h-3.5 w-3.5" aria-hidden />,
    title: "Editorial promotion for exceptional builds",
    body: "We boost the best projects — featured rail on the landing, hero pick, social shoutouts.",
  },
  {
    icon: <Check className="h-3.5 w-3.5" aria-hidden />,
    title: "Forever free. No credit card. No waitlist.",
    body: "No enterprise sales call, no paid placements, no lock-in. Sign in with GitHub and ship.",
  },
];

export function MakerChecklist() {
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {ITEMS.map((item, i) => (
        <li
          key={item.title}
          className="group flex gap-3 rounded-xl border hairline bg-background/40 p-4 backdrop-blur-sm transition-colors hover:border-primary/40"
        >
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/30">
            {item.icon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/60">
                0{i + 1}
              </span>
              <h4 className="text-sm font-semibold leading-snug text-foreground">
                {item.title}
              </h4>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {item.body}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
