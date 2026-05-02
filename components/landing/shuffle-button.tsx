"use client";

import { useRouter } from "next/navigation";
import { Shuffle } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

type ShuffleButtonProps = {
  /** Visual variant — `icon` for the nav, `pill` for the filter bar. */
  variant?: "icon" | "pill";
  /** Optional className override. */
  className?: string;
  /** Optional aria-label override. */
  label?: string;
};

/**
 * "Surprise me" button. Pushes the user to `/api/random`, which 302s to a
 * random live project's share page.
 *
 * We use `router.push` (not a plain `<Link>`) so an in-flight click shows
 * the Next.js loading state instead of the browser hanging on a redirect.
 */
export function ShuffleButton({
  variant = "pill",
  className,
  label = "Surprise me — open a random project",
}: ShuffleButtonProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  const onClick = () => {
    setPending(true);
    router.push("/api/random");
    // Fail-open: if the redirect doesn't fire (404 etc), drop the spinner
    // after a beat so the button doesn't look stuck.
    setTimeout(() => setPending(false), 1500);
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        title="Surprise me"
        disabled={pending}
        className={cn(
          "relative inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors",
          "hover:bg-accent hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-wait disabled:opacity-60",
          className,
        )}
      >
        <Shuffle
          className={cn("h-[18px] w-[18px]", pending && "animate-pulse")}
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      disabled={pending}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium transition-colors",
        "ring-1 ring-inset ring-primary/40 bg-primary/10 text-primary",
        "hover:bg-primary/20 hover:ring-primary/60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:cursor-wait disabled:opacity-70",
        className,
      )}
    >
      <Shuffle className={cn("h-3.5 w-3.5", pending && "animate-pulse")} />
      <span>Surprise me</span>
    </button>
  );
}
