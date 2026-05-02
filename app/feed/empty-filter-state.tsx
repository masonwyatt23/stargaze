import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

type EmptyFilterStateProps = {
  query: string | null;
  category: string | null;
};

/**
 * Friendly empty state shown when /feed filters return zero projects.
 * Server component — the "Clear filters" link just navigates back to
 * /feed without any query params.
 */
export function EmptyFilterState({ query, category }: EmptyFilterStateProps) {
  const filters: string[] = [];
  if (query) filters.push(`"${query}"`);
  if (category && category !== "all") filters.push(category.replace("-", " "));

  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/40 p-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary ring-1 ring-border/60">
        <SearchX className="h-7 w-7 text-muted-foreground" />
      </div>
      <h2 className="mt-4 text-xl font-semibold">No matches</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {filters.length > 0 ? (
          <>
            Nothing matched <span className="text-foreground">{filters.join(" · ")}</span>.
            Try a broader search or another category.
          </>
        ) : (
          <>No projects match the current filters.</>
        )}
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button asChild>
          <Link href="/feed">Clear filters</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/projects/new">Submit a project</Link>
        </Button>
      </div>
    </div>
  );
}
