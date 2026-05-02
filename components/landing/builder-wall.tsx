import { Star } from "lucide-react";

type Quote = {
  body: string;
  author: string;
  context?: string;
  glyph?: "★" | "+" | "→";
};

const DEFAULT_QUOTES: Quote[] = [
  {
    body: "Got 40 stars in an afternoon from a tagline I wrote in five minutes.",
    author: "@vibe-coder",
    context: "shipping AI tools / SF",
    glyph: "★",
  },
  {
    body: "It's like Tinder for GitHub stars — but the kind your CI pipeline cares about.",
    author: "@ship-it-friday",
    context: "indie hackers community",
    glyph: "+",
  },
  {
    body: "Finally a place where my weekend hack gets seen by people who actually star repos.",
    author: "@indie-builder",
    context: "agentic workflows / nyc",
    glyph: "→",
  },
];

/**
 * Builder wall — feels like a hand-curated wall of indie tweets.
 * Off-grid alignment (each card sits at slightly different vertical
 * offset) gives it a pinned-to-corkboard feel.
 */
export function BuilderWall({
  quotes = DEFAULT_QUOTES,
}: {
  quotes?: Quote[];
}) {
  const offsets = [0, 16, -8];
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {quotes.map((q, i) => (
        <figure
          key={q.author}
          className="group relative rounded-2xl border hairline bg-card/70 p-6 backdrop-blur-sm transition-colors hover:border-primary/40"
          style={{
            transform: `translateY(${offsets[i % offsets.length]}px)`,
          }}
        >
          {/* Pin */}
          <span
            aria-hidden
            className="absolute -top-2 left-6 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-[0_0_18px_hsl(47_96%_58%/0.6)]"
          >
            <Star className="h-2.5 w-2.5 fill-current" strokeWidth={0} />
          </span>

          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
            {q.glyph ?? "★"} · field note 0{i + 1}
          </div>

          <blockquote className="mt-4 text-base leading-relaxed text-foreground">
            <span className="text-primary">&ldquo;</span>
            {q.body}
            <span className="text-primary">&rdquo;</span>
          </blockquote>

          <figcaption className="mt-5 flex items-baseline justify-between border-t hairline pt-4">
            <span className="font-mono text-xs text-foreground">
              {q.author}
            </span>
            {q.context ? (
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
                {q.context}
              </span>
            ) : null}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
