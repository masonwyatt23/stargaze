"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GitBranch, Lock, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

export type OssState = "any" | "true" | "false";

type OssToggleProps = {
  basePath: string;
  active: OssState;
  className?: string;
};

const STATES: Array<{
  value: OssState;
  label: string;
  short: string;
  icon: React.ReactNode;
}> = [
  {
    value: "any",
    label: "Any source",
    short: "Any",
    icon: <Sparkles className="h-3.5 w-3.5" />,
  },
  {
    value: "true",
    label: "Open source only",
    short: "OSS",
    icon: <GitBranch className="h-3.5 w-3.5" />,
  },
  {
    value: "false",
    label: "Closed source only",
    short: "Closed",
    icon: <Lock className="h-3.5 w-3.5" />,
  },
];

/**
 * Three-state pill cycling Any → OSS → Closed → Any. URL-driven via `?oss=`.
 *
 * - `?oss` absent / "any" → no filter
 * - `?oss=true`           → only open-source projects
 * - `?oss=false`          → only closed-source projects
 */
export function OssToggle({ basePath, active, className }: OssToggleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const onClick = () => {
    const idx = STATES.findIndex((s) => s.value === active);
    const next = STATES[(idx + 1) % STATES.length].value;

    const params = new URLSearchParams(searchParams.toString());
    if (next === "any") {
      params.delete("oss");
    } else {
      params.set("oss", next);
    }
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
  };

  const current = STATES.find((s) => s.value === active) ?? STATES[0];
  const isActive = active !== "any";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Source filter: ${current.label}. Click to cycle.`}
      title={`${current.label} — click to cycle`}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium transition-colors",
        "ring-1 ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isActive
          ? "bg-primary text-primary-foreground ring-primary/40 shadow-[0_0_18px_hsl(47_96%_58%/0.25)]"
          : "bg-card text-muted-foreground ring-border/60 hover:bg-secondary hover:text-foreground",
        className,
      )}
    >
      {current.icon}
      <span>{current.short}</span>
    </button>
  );
}

/** Validate a raw URL value, falling back to "any". */
export function parseOssParam(raw: string | null | undefined): OssState {
  if (raw === "true" || raw === "false") return raw;
  return "any";
}
