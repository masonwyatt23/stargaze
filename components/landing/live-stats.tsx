import { Star } from "lucide-react";
import { cn, formatCount } from "@/lib/utils";

type StatRow = {
  label: string;
  value: number;
  hint?: string;
  glow?: boolean;
};

/**
 * Live stats strip — proves the platform is real. Big mono tabular
 * numerals, tiny mono labels. Dotted-grid background gives it a
 * mission-control feel.
 */
export function LiveStats({ stats }: { stats: StatRow[] }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border hairline bg-card/60">
      <div
        aria-hidden
        className="absolute inset-0 observatory-grid opacity-50"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
      />

      <div className="relative grid divide-y hairline sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className="relative px-6 py-7 sm:px-8 sm:py-9"
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/80">
              {String(i + 1).padStart(2, "0")} · {s.label}
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              {s.glow ? (
                <Star
                  aria-hidden
                  className="h-5 w-5 fill-primary text-primary constellation-glow"
                  strokeWidth={0}
                />
              ) : null}
              <span
                className={cn(
                  "stat-numeral text-4xl md:text-5xl",
                  s.glow ? "text-primary" : "text-foreground",
                )}
              >
                {formatCount(s.value)}
              </span>
            </div>
            {s.hint ? (
              <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
                {s.hint}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
