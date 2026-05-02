import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Stargaze logomark — a 5-pointed star with motion-trail strokes
 * suggesting a swipe. Uses `currentColor` so it inherits text color;
 * Stargaze brand uses `text-primary` (yellow `#FACC15`) on dark surfaces.
 *
 * Sizes via Tailwind (`size-5`, `h-8 w-8`, etc.) on the `className` prop.
 */
export function LogomarkSVG({
  className,
  ...props
}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="Stargaze"
      className={cn("inline-block", className)}
      {...props}
    >
      {/* Motion-trail strokes — suggest a card swiped right */}
      <path
        d="M2 16 L9 16"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.22}
      />
      <path
        d="M4 11.5 L10 11.5"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.45}
      />
      <path
        d="M4 20.5 L10 20.5"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.45}
      />
      {/* 5-pointed star, center (20.5, 16), outer R ≈ 10.5 */}
      <path
        d="M20.5 5.5 L22.85 12.7 L30.5 12.7 L24.32 17.16 L26.65 24.4 L20.5 19.95 L14.35 24.4 L16.68 17.16 L10.5 12.7 L18.15 12.7 Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default LogomarkSVG;
