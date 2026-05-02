import { Star } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  /** When true, renders without a Link wrapper. */
  asPlain?: boolean;
  /** Visual size — default is the standard nav size. */
  size?: "sm" | "md" | "lg" | "xl";
};

const SIZES = {
  sm: { star: "h-4 w-4", text: "text-base" },
  md: { star: "h-5 w-5", text: "text-lg" },
  lg: { star: "h-7 w-7", text: "text-2xl" },
  xl: { star: "h-9 w-9", text: "text-4xl" },
} as const;

/**
 * The full Stargaze wordmark: yellow star + "Stargaze" text.
 */
export function Logo({ className, asPlain, size = "md" }: LogoProps) {
  const dims = SIZES[size];

  const inner = (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-bold tracking-tight text-foreground",
        dims.text,
        className,
      )}
    >
      <Star
        className={cn("text-primary fill-primary", dims.star)}
        strokeWidth={1.25}
        aria-hidden
      />
      <span>Stargaze</span>
    </span>
  );

  if (asPlain) return inner;

  return (
    <Link
      href="/"
      className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label="Stargaze home"
    >
      {inner}
    </Link>
  );
}

/**
 * Just the star mark — for tight spaces like favicon-y nav corners.
 */
export function LogoMark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const dims = SIZES[size];
  return (
    <Star
      className={cn("text-primary fill-primary", dims.star, className)}
      strokeWidth={1.25}
      aria-hidden
    />
  );
}
