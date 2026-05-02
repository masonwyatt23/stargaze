import Link from "next/link";
import { LogomarkSVG } from "@/components/icons/logomark";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  /** When true, renders without a Link wrapper. */
  asPlain?: boolean;
  /** Visual size — default is the standard nav size. */
  size?: "sm" | "md" | "lg" | "xl";
};

const SIZES = {
  sm: { mark: "size-4", text: "text-base" },
  md: { mark: "size-5", text: "text-lg" },
  lg: { mark: "size-7", text: "text-2xl" },
  xl: { mark: "size-10", text: "text-4xl" },
} as const;

/**
 * Full Stargaze wordmark: custom logomark + "Stargaze" text.
 */
export function Logo({ className, asPlain, size = "md" }: LogoProps) {
  const dims = SIZES[size];

  const inner = (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-bold tracking-tight",
        dims.text,
        className,
      )}
    >
      <LogomarkSVG className={cn("text-primary", dims.mark)} />
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
 * Just the logomark — for tight spaces (mobile bottom nav, social
 * card corners, loading states).
 */
export function LogoMark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const dims = SIZES[size];
  return <LogomarkSVG className={cn("text-primary", dims.mark, className)} />;
}
