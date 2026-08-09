// StandingChip — the craft ladder, rendered.
//
// Four rungs, and rung 1 is the important one: it says «مهنة معلنة», a declared
// trade with nothing behind it yet, and it must not look like an achievement.
// A product that showed every claimant a badge would be a product where the
// badge means nothing, which is exactly what this ladder exists to avoid.
//
// The host supplies every string. ui-web spells no Arabic.

import type { JSX } from "react";

import { Badge, type BadgeSize, type BadgeTone } from "./Badge";

export type StandingValue = 1 | 2 | 3 | 4;

export interface StandingChipProps {
  value: StandingValue;
  /** The rung's name, already localised: «مهنة معلنة» … «معلّم». */
  label: string;
  /** The spoken sentence, e.g. «نجّار — معلّم». */
  srLabel?: string;
  /** Set when a report is upheld. Renders muted and struck from the ladder. */
  suspended?: boolean;
  /** Copy for a suspended standing, e.g. «قيد المراجعة». */
  suspendedLabel?: string;
  size?: BadgeSize;
  className?: string;
}

/**
 * Rung 1 is neutral on purpose — declared, unproven, and it should read that
 * way at a glance. The tone only warms once somebody else has acted.
 */
const VALUE_TONE: Record<StandingValue, BadgeTone> = {
  1: "neutral",
  2: "success",
  3: "brand",
  4: "accent",
};

export function StandingChip({
  value,
  label,
  srLabel,
  suspended = false,
  suspendedLabel,
  size = "md",
  className,
}: StandingChipProps): JSX.Element {
  // Suspension is warning-toned rather than hidden: a member whose standing is
  // under review should be able to see that, and so should anybody who was
  // about to hire them.
  if (suspended) {
    return (
      <Badge tone="warning" size={size} dot srLabel={suspendedLabel ?? label} className={className}>
        {suspendedLabel ?? label}
      </Badge>
    );
  }

  return (
    <Badge
      tone={VALUE_TONE[value]}
      size={size}
      dot={value >= 3}
      srLabel={srLabel ?? label}
      className={className}
    >
      {label}
    </Badge>
  );
}
