import { cn } from "@/lib/utils";

export type SparklineProps = {
  /** Bar values, ordered left-to-right (oldest -> newest). */
  data: number[];
  /** Optional max — defaults to max(data). Useful for shared scales. */
  max?: number;
  /** Tailwind sizing — controls SVG width/height via w-* h-* classes. */
  className?: string;
  /** Optional aria-label for screen readers. */
  ariaLabel?: string;
};

/**
 * A tiny inline-SVG bar sparkline. Server-renderable (no client JS).
 * Brand-yellow bars on a faint baseline; the most recent bar (rightmost)
 * gets a stronger fill so the eye lands on "today".
 *
 * Sizing is controlled via Tailwind on `className` (e.g. `h-10 w-32`).
 * The SVG uses `preserveAspectRatio="none"` and a 100x30 viewBox so bars
 * stretch to fill whatever box you give it.
 */
export function Sparkline({
  data,
  max,
  className,
  ariaLabel = "Activity sparkline",
}: SparklineProps) {
  const safeData = data.length > 0 ? data : [0];
  const peak = Math.max(max ?? 0, ...safeData, 1);
  const count = safeData.length;

  // viewBox 100 wide, 30 tall — independent of pixel size.
  const VW = 100;
  const VH = 30;
  // Leave 1.5 units of horizontal padding so the first/last bar don't clip.
  const innerW = VW - 3;
  // Each bar gets a slot of width slot; leave a small gap for breathability.
  const slot = innerW / count;
  const barW = Math.max(slot * 0.7, 0.6);
  const baseline = VH;

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${VW} ${VH}`}
      preserveAspectRatio="none"
      className={cn("inline-block overflow-visible", className)}
    >
      {/* Baseline rule */}
      <line
        x1={0}
        x2={VW}
        y1={VH - 0.5}
        y2={VH - 0.5}
        stroke="currentColor"
        strokeWidth={0.5}
        opacity={0.15}
      />
      {safeData.map((v, i) => {
        const h = (v / peak) * (VH - 2);
        const x = 1.5 + i * slot + (slot - barW) / 2;
        const y = baseline - h;
        const isLast = i === count - 1;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barW}
            // 0.5 minimum so empty days still register as a tick
            height={Math.max(h, 0.5)}
            rx={0.4}
            className={cn(
              "transition-opacity",
              isLast ? "fill-primary" : "fill-primary/55",
            )}
          />
        );
      })}
    </svg>
  );
}

export default Sparkline;
