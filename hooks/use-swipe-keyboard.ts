"use client";

import { useEffect } from "react";

type SwipeDirection = "right" | "left";

type Options = {
  /** Called when ArrowRight or `s` is pressed. */
  onRight: () => void;
  /** Called when ArrowLeft or `x` is pressed. */
  onLeft: () => void;
  /** Set to true to disable the listener (e.g. when a modal is open). */
  disabled?: boolean;
};

/**
 * Registers global keydown handlers for ←/→ arrow keys, plus `s` (star/save)
 * and `x` (skip), and invokes the corresponding callback. Pressing keys while
 * focused inside an input, textarea, or contenteditable does nothing.
 *
 * Shortcut summary surfaced to users:
 *   →  or  s   →  Save / star
 *   ←  or  x   →  Skip
 */
export function useSwipeKeyboard({ onRight, onLeft, disabled }: Options): void {
  useEffect(() => {
    if (disabled) return;

    const handle = (event: KeyboardEvent) => {
      // Ignore typing inside form controls.
      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          target.isContentEditable
        ) {
          return;
        }
      }

      // Ignore when modifier keys are held — preserves browser shortcuts.
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      let direction: SwipeDirection | null = null;
      if (event.key === "ArrowRight" || event.key === "s" || event.key === "S") {
        direction = "right";
      } else if (
        event.key === "ArrowLeft" ||
        event.key === "x" ||
        event.key === "X"
      ) {
        direction = "left";
      }

      if (direction === null) return;

      event.preventDefault();
      if (direction === "right") onRight();
      else onLeft();
    };

    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [onRight, onLeft, disabled]);
}
