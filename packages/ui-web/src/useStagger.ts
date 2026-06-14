import { tokens } from "@baydar/ui-tokens";

/** Per-item entrance delay (ms), capped so long lists never lag.
 *  index 0..max → 0,40,80…; beyond `max` → 0 (item appears immediately). */
export function staggerDelay(index: number): number {
  const { step, max } = tokens.motion.stagger;
  return index < max ? index * step : 0;
}
