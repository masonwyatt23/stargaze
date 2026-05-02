import { cn } from "@/lib/utils";

type Props = {
  value: string;
  label?: string;
  className?: string;
};

/**
 * Tiny mono coordinate marker — used at hero corners to lend an
 * "observation deck" feel. Pure decoration.
 */
export function CoordinateMark({ value, label, className }: Props) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/60",
        className,
      )}
    >
      {label ? <span className="text-primary/70">{label}</span> : null}
      <span className="tabular text-foreground/70">{value}</span>
    </div>
  );
}
