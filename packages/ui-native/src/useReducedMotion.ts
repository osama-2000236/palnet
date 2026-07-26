// A4.4 — the OS "reduce motion" setting, for native.
//
// Prerequisite for every other motion item: web has honoured
// `prefers-reduced-motion` since `globals.css`, native honoured nothing, so any
// animation added here would have shipped unguarded to vestibular-sensitive
// users.
//
// Built on `AccessibilityInfo`, which is core React Native — no Expo API (the
// kit is framework-neutral, CLAUDE.md) and no new dependency.

import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * `true` when the user has asked the OS to reduce motion.
 *
 * Starts `false` and corrects on the first async read. That order matters: the
 * alternative is starting `true` and animating *into* motion a moment later,
 * which is the one outcome the setting exists to prevent.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) setReduced(value);
      })
      .catch(() => {
        // Unsupported platform — motion stays on, which is the current
        // behaviour rather than a regression.
      });

    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduced;
}
