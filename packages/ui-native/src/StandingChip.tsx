// StandingChip — native twin of packages/ui-web/src/StandingChip.tsx.
//
// Same prop vocabulary: value / label / srLabel / suspended / suspendedLabel /
// size. Native has no `className`. Same rule on both platforms: rung 1 is
// neutral, because a declared trade is not an achievement.

import { Badge, type BadgeSize, type BadgeTone } from "./Badge";

export type StandingValue = 1 | 2 | 3 | 4;

export interface StandingChipProps {
  value: StandingValue;
  /** The rung's name, already localised: «مهنة معلنة» … «معلّم». */
  label: string;
  /** The spoken sentence, e.g. «نجّار — معلّم». */
  srLabel?: string;
  suspended?: boolean;
  suspendedLabel?: string;
  size?: BadgeSize;
}

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
}: StandingChipProps): JSX.Element {
  if (suspended) {
    return (
      <Badge tone="warning" size={size} dot srLabel={suspendedLabel ?? label}>
        {suspendedLabel ?? label}
      </Badge>
    );
  }

  return (
    <Badge tone={VALUE_TONE[value]} size={size} dot={value >= 3} srLabel={srLabel ?? label}>
      {label}
    </Badge>
  );
}
