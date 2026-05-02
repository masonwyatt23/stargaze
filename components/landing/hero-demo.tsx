"use client";

import * as React from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { Star, Sparkles } from "lucide-react";
import { GithubIcon } from "@/components/icons/github-icon";
import { cn, formatCount } from "@/lib/utils";

type Sample = {
  title: string;
  tagline: string;
  language: string;
  stars: number;
  isOpenSource: boolean;
  username: string;
  gradient: string;
  /** Single capital letter shown as the card centerpiece. */
  monogram: string;
  /** Optional secondary glyph drawn next to the monogram (typographic only). */
  mark: string;
};

const SAMPLES: Sample[] = [
  {
    title: "Inkwell",
    tagline: "Your typing turns into beautiful prose",
    language: "TypeScript",
    stars: 1280,
    isOpenSource: true,
    username: "lena.codes",
    gradient: "from-violet-500/40 via-fuchsia-500/25 to-amber-400/30",
    monogram: "I",
    mark: "//",
  },
  {
    title: "Drift",
    tagline: "Calm, terminal-native standup notes",
    language: "Rust",
    stars: 4290,
    isOpenSource: true,
    username: "hex.builder",
    gradient: "from-sky-500/40 via-cyan-500/25 to-emerald-400/30",
    monogram: "D",
    mark: "~~",
  },
  {
    title: "Rooftop AI",
    tagline: "Spreadsheets that actually understand you",
    language: "Python",
    stars: 815,
    isOpenSource: true,
    username: "agentic.dev",
    gradient: "from-amber-500/40 via-orange-500/25 to-pink-500/30",
    monogram: "R",
    mark: "++",
  },
];

/**
 * The hero showpiece: a 3-card stack that runs an autonomous swipe
 * animation every ~6s — top card drifts right, a star bursts from
 * its center, and the next card slides up. Pauses on hover so users
 * can read the card.
 */
export function HeroDemo() {
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [phase, setPhase] = React.useState<"rest" | "swipe">("rest");
  const x = useMotionValue(0);
  const rot = useTransform(x, [-200, 0, 200], [-12, 0, 12]);
  const reduceMotion = useReducedMotion();

  const top = SAMPLES[index % SAMPLES.length];
  const next = SAMPLES[(index + 1) % SAMPLES.length];
  const after = SAMPLES[(index + 2) % SAMPLES.length];

  React.useEffect(() => {
    if (paused || reduceMotion) return;
    const t = setTimeout(() => setPhase("swipe"), 4200);
    return () => clearTimeout(t);
  }, [index, paused, reduceMotion]);

  return (
    <div
      className="relative mx-auto h-[440px] w-full max-w-[360px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-hidden
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
            key={`rest-${top.title}`}
            initial={{ x: 0, opacity: 0, y: 10, scale: 0.98 }}
            animate={{ x: 0, opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            style={{ x, rotate: rot }}
            className="absolute inset-0"
          >
            <DeckCard sample={top} depth={0} isTop />
          </motion.div>
        ) : (
          <motion.div
            key={`swipe-${top.title}`}
            initial={{ x: 0, opacity: 1, scale: 1 }}
            animate={{
              x: 320,
              opacity: 0,
              rotate: 18,
              transition: { duration: 0.55, ease: [0.32, 0.72, 0.4, 1] },
            }}
            onAnimationComplete={() => {
              setPhase("rest");
              setIndex((i) => (i + 1) % SAMPLES.length);
            }}
            className="absolute inset-0"
          >
            <DeckCard sample={top} depth={0} isTop />
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
  isTop,
  animate,
}: {
  sample: Sample;
  depth: 0 | 1 | 2;
  isTop?: boolean;
  animate?: React.ComponentProps<typeof motion.div>["animate"];
}) {
  const Wrapper = animate ? motion.div : "div";
  const wrapperProps = animate ? { animate } : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={cn(
        "absolute inset-0 overflow-hidden rounded-[22px] border bg-card shadow-2xl",
        isTop
          ? "border-primary/30 ring-1 ring-primary/20 shadow-primary/10"
          : "border-border/50",
        !isTop && "pointer-events-none",
      )}
      style={animate ? undefined : { zIndex: 10 - depth }}
    >
      <div
        className={cn(
          "relative flex h-[58%] items-center justify-center bg-gradient-to-br",
          sample.gradient,
        )}
      >
        <svg
          aria-hidden
          className="absolute inset-0 h-full w-full opacity-[0.07]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id={`stripe-${sample.title}`}
              width="14"
              height="14"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(35)"
            >
              <line x1="0" y1="0" x2="0" y2="14" stroke="white" strokeWidth="1" />
            </pattern>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill={`url(#stripe-${sample.title})`}
          />
        </svg>
        {/* Editorial monogram instead of emoji — heavy first letter,
            tightly tracked, with a tiny mono glyph alongside it. */}
        <div className="relative flex items-baseline gap-2 text-white drop-shadow-2xl">
          <span className="font-black leading-none tracking-[-0.07em] text-[7rem]">
            {sample.monogram}
          </span>
          <span className="font-mono text-xs tracking-widest text-white/60">
            {sample.mark}
          </span>
        </div>
        {/* Decorative satellite dots */}
        <div
          aria-hidden
          className="pointer-events-none absolute right-6 bottom-6 h-3 w-3 rounded-full border border-white/40"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-12 bottom-7 h-1.5 w-1.5 rounded-full bg-white/40"
        />
        {sample.isOpenSource && (
          <div
            className={cn(
              "absolute right-3 top-3 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide",
              isTop
                ? "bg-primary/95 text-primary-foreground shadow-[0_0_18px_hsl(47_96%_58%/0.6)]"
                : "bg-primary/80 text-primary-foreground",
            )}
          >
            <Star className="h-3 w-3 fill-current" strokeWidth={0} />
            OSS · auto-star
          </div>
        )}
      </div>

      <div className="flex h-[42%] flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-lg font-semibold leading-tight">
            {sample.title}
          </h3>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border/60 px-1.5 py-0.5 text-[11px] text-muted-foreground">
            <Star className="h-3 w-3 fill-primary text-primary" />
            {formatCount(sample.stars)}
          </span>
        </div>
        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {sample.tagline}
        </p>
        <div className="mt-auto flex items-center gap-2 text-[11px]">
          <GithubIcon className="h-3.5 w-3.5 text-muted-foreground/80" />
          <span className="text-muted-foreground">@{sample.username}</span>
          <span className="ml-auto rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-secondary-foreground">
            {sample.language}
          </span>
        </div>
      </div>
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
