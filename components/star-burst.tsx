"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type StarBurstProps = {
  /** When true, the burst animation plays. */
  active: boolean;
  className?: string;
};

/**
 * Visual flourish: a yellow brand star scales up from center with a soft halo
 * and trailing sparks, then fades. Pure animation — no data, no callbacks.
 *
 * Sibling overlay; should be absolutely positioned by the parent so it does
 * not block the swipe animation underneath.
 */
export function StarBurst({ active, className }: StarBurstProps) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="star-burst"
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className={cn(
            "pointer-events-none absolute inset-0 z-50 flex items-center justify-center",
            className,
          )}
        >
          {/* Soft halo */}
          <motion.div
            initial={{ scale: 0.4, opacity: 0.0 }}
            animate={{ scale: 2.2, opacity: 0 }}
            transition={{ duration: 0.65, ease: "easeOut" }}
            className="absolute h-40 w-40 rounded-full bg-primary/30 blur-2xl"
          />

          {/* Inner ring */}
          <motion.div
            initial={{ scale: 0.2, opacity: 0.7 }}
            animate={{ scale: 1.6, opacity: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="absolute h-24 w-24 rounded-full border-2 border-primary"
          />

          {/* The star */}
          <motion.div
            initial={{ scale: 0.2, rotate: -25, opacity: 0 }}
            animate={{
              scale: [0.2, 1.4, 1.1],
              rotate: [-25, 10, 0],
              opacity: [0, 1, 0],
            }}
            transition={{ duration: 0.7, times: [0, 0.45, 1], ease: "easeOut" }}
            className="relative drop-shadow-[0_0_30px_hsl(47_96%_58%/0.7)]"
          >
            <Star
              className="h-24 w-24 fill-primary text-primary"
              strokeWidth={1.25}
            />
          </motion.div>

          {/* Spark trails — eight short rays radiating out */}
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            const dx = Math.cos(angle) * 90;
            const dy = Math.sin(angle) * 90;
            return (
              <motion.span
                key={i}
                initial={{ x: 0, y: 0, opacity: 0, scale: 0.3 }}
                animate={{ x: dx, y: dy, opacity: [0, 1, 0], scale: 1 }}
                transition={{ duration: 0.6, ease: "easeOut", delay: 0.05 }}
                className="absolute h-1.5 w-1.5 rounded-full bg-primary"
              />
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
