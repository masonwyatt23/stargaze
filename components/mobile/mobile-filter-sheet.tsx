"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { SearchInput } from "@/components/landing/search-input";
import { SortSelect, type SortValue } from "@/components/landing/sort-select";
import { OssToggle, type OssState } from "@/components/landing/oss-toggle";
import { LanguageSelect } from "@/components/landing/language-select";
import { cn } from "@/lib/utils";

type Props = {
  basePath: string;
  activeQuery: string | null;
  activeSort: SortValue;
  activeOss: OssState;
  activeLanguage: string | null;
  className?: string;
};

/**
 * Mobile-only "Filters" trigger + bottom sheet. The sheet hosts the search
 * input, sort, oss toggle, and language select — all the controls that
 * would otherwise crowd the sticky filter bar on a phone screen.
 *
 * The chip strip stays visible above the deck (rendered separately by
 * `<MobileCategoryStrip>`); this sheet is for the secondary controls.
 */
export function MobileFilterSheet({
  basePath,
  activeQuery,
  activeSort,
  activeOss,
  activeLanguage,
  className,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeCount =
    (activeQuery ? 1 : 0) +
    (activeSort !== "trending" ? 1 : 0) +
    (activeOss !== "any" ? 1 : 0) +
    (activeLanguage ? 1 : 0);

  const clearAll = () => {
    const params = new URLSearchParams(searchParams.toString());
    // Preserve the category param — it's surfaced as chips, not in the sheet.
    const cat = params.get("cat");
    const focus = params.get("focus");
    const next = new URLSearchParams();
    if (cat) next.set("cat", cat);
    if (focus) next.set("focus", focus);
    const qs = next.toString();
    router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open filters"
        className={cn(
          "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors",
          "ring-1 ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          activeCount > 0
            ? "bg-primary/15 text-primary ring-primary/40"
            : "bg-card text-muted-foreground ring-border/60 hover:bg-secondary hover:text-foreground",
          className,
        )}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        <span>Filters</span>
        {activeCount > 0 ? (
          <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {activeCount}
          </span>
        ) : null}
      </button>

      <SheetContent
        side="bottom"
        className="max-h-[85dvh] gap-0 overflow-y-auto rounded-t-2xl pb-[calc(env(safe-area-inset-bottom)+1.5rem)]"
      >
        {/* Drag handle */}
        <div
          aria-hidden
          className="mx-auto -mt-3 mb-3 h-1.5 w-10 rounded-full bg-border/80"
        />

        <div className="flex items-center justify-between gap-3">
          <SheetTitle className="text-base">Refine the deck</SheetTitle>
          <SheetClose asChild>
            <button
              type="button"
              aria-label="Close filters"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </SheetClose>
        </div>

        <div className="mt-5 space-y-5">
          <Section label="Search">
            <SearchInput
              basePath={basePath}
              initialValue={activeQuery ?? ""}
              placeholder="Title, tagline, or description"
            />
          </Section>

          <Section label="Sort">
            <div className="flex flex-wrap gap-2">
              <SortSelect basePath={basePath} active={activeSort} />
            </div>
          </Section>

          <Section label="Source">
            <OssToggle basePath={basePath} active={activeOss} />
          </Section>

          <Section label="Language">
            <LanguageSelect basePath={basePath} active={activeLanguage} />
          </Section>
        </div>

        <div className="sticky bottom-0 mt-6 flex items-center gap-2 border-t border-border/40 bg-card pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearAll}
            disabled={activeCount === 0}
            className="flex-1"
          >
            Clear all
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setOpen(false)}
            className="flex-1"
          >
            See deck{activeCount > 0 ? ` (${activeCount})` : ""}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80">
        {label}
      </p>
      {children}
    </div>
  );
}
