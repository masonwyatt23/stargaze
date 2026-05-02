import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type TickerItem = {
  glyph?: "★" | "→" | "·" | "+";
  label: string;
};

const DEFAULT_ITEMS: TickerItem[] = [
  { glyph: "★", label: "live signal" },
  { label: "30 projects on deck" },
  { glyph: "→", label: "swipe right stars the repo" },
  { label: "auto-star · backed by your GitHub OAuth" },
  { glyph: "★", label: "weekly leaderboard resets monday 00:00 utc" },
  { label: "no waitlist · no enterprise sales call" },
  { glyph: "+", label: "open source friendly · indie-first" },
  { label: "ship · swipe · be seen" },
  { glyph: "★", label: "observation deck 01" },
  { label: "n 38.9° w 77.0°" },
];

/**
 * Editorial ticker pinned just under the nav. Two duplicated halves
 * scroll horizontally for a seamless loop. Pure CSS animation.
 */
export function LiveTicker({
  items = DEFAULT_ITEMS,
  className,
}: {
  items?: TickerItem[];
  className?: string;
}) {
  const doubled = [...items, ...items];
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden border-y hairline bg-background/40 backdrop-blur-sm",
        "[mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]",
        className,
      )}
      aria-label="Stargaze live signal"
    >
      <div className="flex w-max animate-marquee items-center gap-10 py-2">
        {doubled.map((item, i) => (
          <span
            key={i}
            className="flex shrink-0 items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground/80"
          >
            {item.glyph === "★" ? (
              <Star
                className="h-2.5 w-2.5 fill-primary text-primary"
                strokeWidth={0}
              />
            ) : item.glyph ? (
              <span aria-hidden className="text-primary/80">
                {item.glyph}
              </span>
            ) : null}
            <span className="font-mono">{item.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
