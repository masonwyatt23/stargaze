"use client";

import { CategoryChipBar, type CategoryChip } from "./category-chip-bar";
import { SearchInput } from "./search-input";

const FEED_CATEGORIES: CategoryChip[] = [
  { value: "ai-tool", label: "AI" },
  { value: "dev-utility", label: "Dev tools" },
  { value: "game", label: "Games" },
  { value: "saas", label: "SaaS" },
  { value: "other", label: "Other" },
];

type FilterBarProps = {
  activeCategory: string | null;
  activeQuery: string | null;
  basePath?: string;
  categories?: CategoryChip[];
};

/**
 * Sticky filter bar above the swipe deck. Hosts the debounced search
 * input and the horizontal chip strip — both URL-driven so links are
 * shareable.
 */
export function FilterBar({
  activeCategory,
  activeQuery,
  basePath = "/feed",
  categories = FEED_CATEGORIES,
}: FilterBarProps) {
  return (
    <div className="sticky top-16 z-30 -mx-4 mb-4 border-b border-border/40 bg-background/80 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex flex-col gap-2.5">
        <SearchInput
          basePath={basePath}
          initialValue={activeQuery ?? ""}
          placeholder="Search projects by title or tagline"
        />
        <CategoryChipBar
          categories={categories}
          active={activeCategory}
          basePath={basePath}
        />
      </div>
    </div>
  );
}
