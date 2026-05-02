import { cn } from "@/lib/utils";

export type DailyBucket = {
  /** ISO date — YYYY-MM-DD, midnight UTC. */
  date: string;
  count: number;
};

type Props = {
  data: DailyBucket[];
  className?: string;
};

const VW = 100;
const VH = 30;

/**
 * Big polished bar chart for the 30-day right-swipe trend. Server-
 * rendered SVG (no client JS). Each bar carries a `<title>` so hovering
 * any bar reveals the date + count via the browser's native tooltip.
 *
 * The chart wraps `<Sparkline>`'s visual idiom (brand-yellow bars,
 * baseline rule) but re-implements it inline so we can:
 *   - control bar widths to match the larger viewbox cleanly
 *   - layer a soft yellow glow under the bars for that "punchy" feel
 *   - emit `<title>` tooltips per bar
 *   - render axis labels (start / mid / end date) below
 */
export function DashboardChart({ data, className }: Props) {
  const safeData = data.length > 0 ? data : [{ date: "", count: 0 }];
  const peak = Math.max(1, ...safeData.map((d) => d.count));
  const count = safeData.length;
  const innerW = VW - 3;
  const slot = innerW / count;
  const barW = Math.max(slot * 0.65, 0.6);
  const total = safeData.reduce((acc, d) => acc + d.count, 0);

  const startLabel = formatLabel(safeData[0]?.date);
  const midLabel = formatLabel(safeData[Math.floor(count / 2)]?.date);
  const endLabel = formatLabel(safeData[count - 1]?.date);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          Right-swipes · last 30 days
        </div>
        <div className="text-sm font-medium tabular-nums text-foreground">
          {total.toLocaleString()} total
        </div>
      </div>

      <svg
        role="img"
        aria-label="Daily right-swipes over the past 30 days"
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="none"
        className="h-32 w-full overflow-visible md:h-40"
      >
        <defs>
          <linearGradient id="dash-bar" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#FACC15" stopOpacity={1} />
            <stop offset="100%" stopColor="#FACC15" stopOpacity={0.65} />
          </linearGradient>
          <filter id="dash-glow" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="0.6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Baseline */}
        <line
          x1={0}
          x2={VW}
          y1={VH - 0.5}
          y2={VH - 0.5}
          stroke="currentColor"
          strokeWidth={0.5}
          opacity={0.18}
        />

        {/* Quartile guideline (50%) */}
        <line
          x1={0}
          x2={VW}
          y1={VH / 2}
          y2={VH / 2}
          stroke="currentColor"
          strokeWidth={0.25}
          opacity={0.08}
          strokeDasharray="0.5 0.8"
        />

        {safeData.map((d, i) => {
          const h = (d.count / peak) * (VH - 2);
          const x = 1.5 + i * slot + (slot - barW) / 2;
          const y = VH - h;
          return (
            <rect
              key={`${d.date}-${i}`}
              x={x}
              y={y}
              width={barW}
              height={Math.max(h, 0.4)}
              rx={0.5}
              fill="url(#dash-bar)"
              filter="url(#dash-glow)"
            >
              <title>
                {formatTooltip(d.date)}: {d.count}{" "}
                {d.count === 1 ? "right-swipe" : "right-swipes"}
              </title>
            </rect>
          );
        })}
      </svg>

      <div className="flex items-center justify-between text-[11px] tabular-nums text-muted-foreground">
        <span>{startLabel}</span>
        <span>{midLabel}</span>
        <span>{endLabel}</span>
      </div>
    </div>
  );
}

function formatLabel(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatTooltip(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default DashboardChart;
