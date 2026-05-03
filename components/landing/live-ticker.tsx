import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type TickerItem = {
  glyph?: "★" | "→" | "·" | "+";
  label: string;
};

// Warmer, friendlier rotation. Sentence case, no observatory cosplay.
const DEFAULT_ITEMS: TickerItem[] = [
  { glyph: "★", label: "Swipe right stars the repo on GitHub" },
  { label: "Hand-picked indie projects" },
  { glyph: "→", label: "No waitlist — sign in with GitHub and start" },
  { label: "Open-source friendly · indie-first" },
  { glyph: "+", label: "Submit your project in under 90 seconds" },
  { label: "Top makers earn the spotlight every Monday" },
  { glyph: "★", label: "Built for builders by builders" },
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
            className="flex shrink-0 items-center gap-2 text-[12px] tracking-tight text-muted-foreground/85"
          >
            {item.glyph === "★" ? (
              <Star
                className="h-3 w-3 fill-primary text-primary"
                strokeWidth={0}
              />
            ) : item.glyph ? (
              <span aria-hidden className="text-primary/80">
                {item.glyph}
              </span>
            ) : null}
            <span>{item.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
