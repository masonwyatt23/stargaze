"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import type { DBProjectMedia } from "@/lib/types/db";
import { cn } from "@/lib/utils";

export type MediaGalleryProps = {
  media: DBProjectMedia[];
  /** When true, the active video (if any) auto-plays muted. Set false on
   * non-top deck cards so we don't burn battery on background videos. */
  autoPlay?: boolean;
  /** When true, large dot indicators + arrow nav appear. Use in detail sheet. */
  showControls?: boolean;
  className?: string;
  /** Aspect ratio class — defaults to 16:10. Detail sheet may pass 16:9. */
  aspectClass?: string;
};

/**
 * Swipeable carousel of project screenshots and videos. Used inside
 * `<ProjectCard>` (compact, no chrome) and inside the project detail sheet
 * (with arrows + dot indicators).
 */
export function MediaGallery({
  media,
  autoPlay = false,
  showControls = false,
  className,
  aspectClass = "aspect-[16/10]",
}: MediaGalleryProps) {
  const ordered = [...media].sort((a, b) => a.order_index - b.order_index);
  const [rawIndex, setIndex] = useState(0);
  // Clamp during render to avoid an effect (React 19 idiom).
  const index = ordered.length > 0 ? Math.min(rawIndex, ordered.length - 1) : 0;
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Auto-play / pause the active video when autoPlay flips.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (autoPlay) {
      v.play().catch(() => {
        /* Browsers may block autoplay; muted should usually pass. */
      });
    } else {
      v.pause();
    }
  }, [autoPlay, index]);

  if (ordered.length === 0) {
    return (
      <div
        className={cn(
          aspectClass,
          "relative w-full overflow-hidden rounded-t-2xl bg-gradient-to-br from-muted to-secondary",
          className,
        )}
      >
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <span className="text-sm">No preview</span>
        </div>
      </div>
    );
  }

  const current = ordered[index];
  const goPrev = () => setIndex((i) => (i - 1 + ordered.length) % ordered.length);
  const goNext = () => setIndex((i) => (i + 1) % ordered.length);

  return (
    <div
      className={cn(
        aspectClass,
        "relative w-full overflow-hidden rounded-t-2xl bg-black",
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={current.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="absolute inset-0"
        >
          {current.type === "video" ? (
            <video
              ref={videoRef}
              src={current.url}
              poster={current.thumbnail_url ?? undefined}
              className="h-full w-full object-cover"
              muted
              playsInline
              loop
              autoPlay={autoPlay}
              preload="metadata"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={current.url}
              alt=""
              className="h-full w-full object-cover"
              draggable={false}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Subtle gradient at the bottom so text below the media never collides
          with light pixels in the screenshot. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent"
      />

      {/* Video badge — small play indicator if the active media is a video */}
      {current.type === "video" && !autoPlay && (
        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
          <Play className="h-3 w-3 fill-white" strokeWidth={0} />
          <span>Demo</span>
        </div>
      )}

      {/* Multi-item controls */}
      {ordered.length > 1 && (
        <>
          {showControls && (
            <>
              <button
                type="button"
                aria-label="Previous media"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Next media"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Dot indicators */}
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
            {ordered.map((m, i) => (
              <button
                key={m.id}
                type="button"
                aria-label={`Go to media ${i + 1}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex(i);
                }}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index
                    ? "w-6 bg-white"
                    : "w-1.5 bg-white/50 hover:bg-white/75",
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
