import { cn } from "@/lib/utils";

/**
 * Editorial section divider: small mono caption + horizontal hairline +
 * optional inline "§ ##" mark. Used between every major section so the
 * landing reads like a research bulletin rather than a stack of cards.
 */
export function SectionFrame({
  index,
  caption,
  meta,
  className,
}: {
  index: number;
  caption: string;
  meta?: string;
  className?: string;
}) {
  const padded = String(index).padStart(2, "0");
  return (
    <div
      className={cn(
        "flex items-baseline gap-3 pb-3 mono-caption",
        className,
      )}
    >
      <span className="text-primary/90 tabular">§ {padded}</span>
      <span className="hidden h-px flex-1 bg-foreground/10 sm:block" />
      <span className="text-foreground/80">{caption}</span>
      {meta ? (
        <>
          <span className="hidden h-px w-12 bg-foreground/10 sm:block" />
          <span>{meta}</span>
        </>
      ) : null}
    </div>
  );
}
