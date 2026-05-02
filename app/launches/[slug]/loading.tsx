import { LogomarkSVG } from "@/components/icons/logomark";

/**
 * Minimal pulse skeleton for `/launches/[slug]`. Mirrors the parent
 * `/launches/loading.tsx` — single centered logomark with a quiet
 * caption — so the route handoff feels like the same surface, just
 * paused.
 */
export default function LaunchSlugLoading() {
  return (
    <div className="grid min-h-dvh w-full place-items-center bg-background px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <LogomarkSVG className="size-10 animate-pulse text-primary" />
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground/80">
          Loading launch…
        </p>
      </div>
    </div>
  );
}
