// Per-item entrance delay for list-stagger choreography.
// Pairs with the `animate-enter-up` utility (Tailwind preset) and the
// reduced-motion guard in globals.css.

import { tokens } from "@baydar/ui-tokens";

/**
 * Entrance delay (ms) for a list item at `index`.
 *
 * Items 0..max-1 fan out at `step` ms apart; anything past `max` appears
 * immediately (delay 0) so long lists never lag behind a perceptible budget.
 * With the defaults (step 40, max 6) the last staggered item lands at
 * 6×40 = 240ms = `--dur-slow`.
 */
export function staggerDelay(index: number): number {
  const { step, max } = tokens.motion.stagger;
  return index < max ? index * step : 0;
}
