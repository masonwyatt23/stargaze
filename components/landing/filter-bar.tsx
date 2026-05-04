"use client";

import { CategoryChipBar, type CategoryChip } from "./category-chip-bar";
import { LanguageSelect } from "./language-select";
import { OssToggle, type OssState } from "./oss-toggle";
import { SearchInput } from "./search-input";
import { ShuffleButton } from "./shuffle-button";
import { SortSelect, type SortValue } from "./sort-select";
import { MobileFilterSheet } from "@/components/mobile/mobile-filter-sheet";

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
  activeSort?: SortValue;
  activeOss?: OssState;
  activeLanguage?: string | null;
  basePath?: string;
  categories?: CategoryChip[];
  /**
   * Hide the third row (sort / oss / language / shuffle). Useful if a future
   * surface wants the bar without these controls — defaults to false so the
   * feed gets the full bar.
   */
  hideAdvanced?: boolean;
};

/**
 * Sticky filter bar above the swipe deck.
 *
 * Desktop (md+): three rows — search, category chips, sort/oss/lang/shuffle.
 * Mobile (<md):  one row — chips + a "Filters" button that opens a bottom
 *                sheet containing search + the secondary controls. Keeps
 *                screen real-estate for the deck itself.
 *
 * Every control preserves the other params on change so deep-linking is
 * trivial — `?q=cli&sort=fresh&oss=true&lang=Rust` is a valid URL.
 */
export function FilterBar({
  activeCategory,
  activeQuery,
  activeSort = "trending",
  activeOss = "any",
  activeLanguage = null,
  basePath = "/feed",
  categories = FEED_CATEGORIES,
  hideAdvanced = false,
}: FilterBarProps) {
  return (
    <div className="sticky top-12 z-30 -mx-4 mb-3 border-b border-border/40 bg-background/85 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/65 md:top-16 md:mb-4 md:py-3">
      {/* Mobile: one row, chips + Filters trigger */}
      <div className="flex items-center gap-2 md:hidden">
        <div className="min-w-0 flex-1">
          <CategoryChipBar
            categories={categories}
            active={activeCategory}
            basePath={basePath}
          />
        </div>
        {hideAdvanced ? null : (
          <MobileFilterSheet
            basePath={basePath}
            activeQuery={activeQuery}
            activeSort={activeSort}
            activeOss={activeOss}
            activeLanguage={activeLanguage}
          />
        )}
      </div>

      {/* Desktop: full filter stack */}
      <div className="hidden flex-col gap-2.5 md:flex">
        <SearchInput
          basePath={basePath}
          initialValue={activeQuery ?? ""}
          placeholder="Search projects by title, tagline, or description"
        />
        <CategoryChipBar
          categories={categories}
          active={activeCategory}
          basePath={basePath}
        />
        {hideAdvanced ? null : (
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <SortSelect basePath={basePath} active={activeSort} />
            <OssToggle basePath={basePath} active={activeOss} />
            <LanguageSelect basePath={basePath} active={activeLanguage} />
            <div className="ml-auto">
              <ShuffleButton variant="pill" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
