"use client";

import * as React from "react";
import Link from "next/link";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { Sparkles, Star } from "lucide-react";
import { GithubIcon } from "@/components/icons/github-icon";
import { cn, formatCount } from "@/lib/utils";

/** Shape passed in from the landing page (subset of FeedProject). */
export type HeroDemoProject = {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  github_language: string | null;
  github_stars: number | null;
  is_open_source: boolean;
  user: {
    github_username: string;
    avatar_url: string | null;
  } | null;
  /** First screenshot URL — preferred over monogram. */
  cover_url: string | null;
};

/** Pretty fallback gradients per index — used when a card has no cover. */
const GRADIENTS = [
  "from-violet-500/40 via-fuchsia-500/25 to-amber-400/30",
  "from-sky-500/40 via-cyan-500/25 to-emerald-400/30",
  "from-amber-500/40 via-orange-500/25 to-pink-500/30",
  "from-emerald-500/40 via-teal-500/25 to-sky-400/30",
  "from-rose-500/40 via-pink-500/25 to-violet-400/30",
];

/**
 * The hero showpiece: a 3-card stack that loops a swipe + star-burst
 * every ~6s. Now driven by REAL projects from the deck (passed in via
 * `projects`), so visitors see actual indie work the moment the page paints.
 *
 * If `projects` is empty or undefined, falls back to a small set of
 * placeholder mock cards (kept around for the rare zero-data case).
 */
export function HeroDemo({ projects }: { projects?: HeroDemoProject[] }) {
  // Use real projects if available, else fall back to mock samples.
  const cards = React.useMemo<HeroDemoProject[]>(() => {
    if (projects && projects.length >= 3) return projects.slice(0, 6);
    return MOCK_FALLBACK;
  }, [projects]);

  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [phase, setPhase] = React.useState<"rest" | "swipe">("rest");
  const x = useMotionValue(0);
  const rot = useTransform(x, [-200, 0, 200], [-12, 0, 12]);
  const reduceMotion = useReducedMotion();

  const top = cards[index % cards.length];
  const next = cards[(index + 1) % cards.length];
  const after = cards[(index + 2) % cards.length];

  React.useEffect(() => {
    if (paused || reduceMotion) return;
    const t = setTimeout(() => setPhase("swipe"), 4200);
    return () => clearTimeout(t);
  }, [index, paused, reduceMotion]);

  return (
    <div
      className="relative mx-auto h-[380px] w-full max-w-[360px] sm:h-[440px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse at center, hsl(47 96% 58% / 0.18) 0%, transparent 60%)",
        }}
      />

      <DeckCard
        sample={after}
        depth={2}
        accentIndex={(index + 2) % GRADIENTS.length}
        animate={{
          y: 16,
          scale: 0.92,
          opacity: 0.55,
          transition: { duration: 0.8, ease: "easeOut" },
        }}
      />

      <DeckCard
        sample={next}
        depth={1}
        accentIndex={(index + 1) % GRADIENTS.length}
        animate={{
          y: 8,
          scale: 0.96,
          opacity: 0.85,
          transition: { duration: 0.8, ease: "easeOut" },
        }}
      />

      <AnimatePresence mode="popLayout">
        {phase === "rest" ? (
          <motion.div
            key={`rest-${top.id}`}
            initial={{ x: 0, opacity: 0, y: 10, scale: 0.98 }}
            animate={{ x: 0, opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            style={{ x, rotate: rot }}
            className="absolute inset-0"
          >
            <DeckCard sample={top} depth={0} accentIndex={index % GRADIENTS.length} isTop />
          </motion.div>
        ) : (
          <motion.div
            key={`swipe-${top.id}`}
            initial={{ x: 0, opacity: 1, scale: 1 }}
            animate={{
              x: 320,
              opacity: 0,
              rotate: 18,
              transition: { duration: 0.55, ease: [0.32, 0.72, 0.4, 1] },
            }}
            onAnimationComplete={() => {
              setPhase("rest");
              setIndex((i) => (i + 1) % cards.length);
            }}
            className="absolute inset-0"
          >
            <DeckCard sample={top} depth={0} accentIndex={index % GRADIENTS.length} isTop />
            <StarBurst />
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={cn(
          "pointer-events-none absolute bottom-[-44px] left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-primary/30 bg-card/80 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-lg backdrop-blur",
          reduceMotion && "opacity-70",
        )}
      >
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span>
          swipe right →{" "}
          <span className="text-primary">stars the repo</span>
        </span>
      </div>
    </div>
  );
}

function DeckCard({
  sample,
  depth,
  accentIndex,
  isTop,
  animate,
}: {
  sample: HeroDemoProject;
  depth: 0 | 1 | 2;
  accentIndex: number;
  isTop?: boolean;
  animate?: React.ComponentProps<typeof motion.div>["animate"];
}) {
  const Wrapper = animate ? motion.div : "div";
  const wrapperProps = animate ? { animate } : {};
  const gradient = GRADIENTS[accentIndex];
  const initials =
    sample.title.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || "★";

  // Wrap the top card in a Link so visitors can actually click through.
  // Behind cards stay non-interactive.
  const inner = (
    <>
      {/* Cover region */}
      <div
        className={cn(
          "relative h-[58%] overflow-hidden bg-gradient-to-br",
          gradient,
        )}
      >
        {sample.cover_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={sample.cover_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="font-black text-white drop-shadow-2xl tracking-[-0.07em] text-[6rem] leading-none">
              {initials}
            </span>
          </div>
        )}
        {/* Subtle striped overlay */}
        <svg
          aria-hidden
          className="absolute inset-0 h-full w-full opacity-[0.04]"
        >
          <defs>
            <pattern
              id={`stripe-${sample.id}`}
              width="14"
              height="14"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(35)"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="14"
                stroke="white"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#stripe-${sample.id})`} />
        </svg>
        {/* OSS sticker */}
        {sample.is_open_source ? (
          <div
            className={cn(
              "absolute right-3 top-3 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide",
              isTop
                ? "bg-primary/95 text-primary-foreground shadow-[0_0_18px_hsl(47_96%_58%/0.6)]"
                : "bg-primary/85 text-primary-foreground",
            )}
          >
            <Star className="h-3 w-3 fill-current" strokeWidth={0} />
            OSS · auto-star
          </div>
        ) : (
          <div className="absolute right-3 top-3 inline-flex items-center rounded-md bg-background/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">
            Closed
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex h-[42%] flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-lg font-semibold leading-tight">
            {sample.title}
          </h3>
          {sample.github_stars != null ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border/60 px-1.5 py-0.5 text-[11px] text-muted-foreground">
              <Star className="h-3 w-3 fill-primary text-primary" strokeWidth={0} />
              {formatCount(sample.github_stars)}
            </span>
          ) : null}
        </div>
        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {sample.tagline}
        </p>
        <div className="mt-auto flex items-center gap-2 text-[11px] text-muted-foreground">
          <GithubIcon className="h-3.5 w-3.5 text-muted-foreground/80" />
          <span className="truncate">@{sample.user?.github_username ?? "indie"}</span>
          {sample.github_language ? (
            <span className="ml-auto rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-secondary-foreground">
              {sample.github_language}
            </span>
          ) : null}
        </div>
      </div>
    </>
  );

  return (
    <Wrapper
      {...wrapperProps}
      className={cn(
        "absolute inset-0 overflow-hidden rounded-[22px] border bg-card shadow-2xl",
        isTop
          ? "border-primary/30 ring-1 ring-primary/20 shadow-primary/10"
          : "border-border/50 pointer-events-none",
      )}
      style={animate ? undefined : { zIndex: 10 - depth }}
    >
      {isTop && sample.slug !== "_mock" ? (
        <Link
          href={`/p/${sample.slug}`}
          className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {inner}
        </Link>
      ) : (
        inner
      )}
    </Wrapper>
  );
}

function StarBurst() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{
        opacity: [0, 1, 1, 0],
        scale: [0.5, 1.4, 1.6, 1.8],
        transition: { duration: 0.7, times: [0, 0.2, 0.6, 1] },
      }}
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
    >
      <div className="relative">
        <Star
          className="h-24 w-24 fill-primary text-primary drop-shadow-[0_0_40px_hsl(47_96%_58%/0.65)]"
          strokeWidth={0}
        />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <motion.div
            key={deg}
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 1, 0],
              x: Math.cos((deg * Math.PI) / 180) * 60,
              y: Math.sin((deg * Math.PI) / 180) * 60,
            }}
            transition={{ duration: 0.6 }}
            className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary"
          />
        ))}
      </div>
    </motion.div>
  );
}

function useReducedMotion() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** Fallback samples used only when the deck has fewer than 3 real projects. */
const MOCK_FALLBACK: HeroDemoProject[] = [
  {
    id: "_mock_1",
    slug: "_mock",
    title: "Inkwell",
    tagline: "Your typing turns into beautiful prose",
    github_language: "TypeScript",
    github_stars: 1280,
    is_open_source: true,
    user: { github_username: "lena.codes", avatar_url: null },
    cover_url: null,
  },
  {
    id: "_mock_2",
    slug: "_mock",
    title: "Drift",
    tagline: "Calm, terminal-native standup notes",
    github_language: "Rust",
    github_stars: 4290,
    is_open_source: true,
    user: { github_username: "hex.builder", avatar_url: null },
    cover_url: null,
  },
  {
    id: "_mock_3",
    slug: "_mock",
    title: "Rooftop AI",
    tagline: "Spreadsheets that actually understand you",
    github_language: "Python",
    github_stars: 815,
    is_open_source: true,
    user: { github_username: "agentic.dev", avatar_url: null },
    cover_url: null,
  },
];
