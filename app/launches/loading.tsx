import { LogomarkSVG } from "@/components/icons/logomark";

/**
 * Minimal full-screen loader for `/launches`. Single centered logomark
 * with a subtle pulse + caption. Matches the immersive, no-chrome feel
 * of the wall itself.
 */
export default function LaunchesLoading() {
  return (
    <div className="grid min-h-dvh w-full place-items-center bg-background px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <LogomarkSVG className="size-10 animate-pulse text-primary" />
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground/80">
          Loading launches…
        </p>
      </div>
    </div>
  );
}
