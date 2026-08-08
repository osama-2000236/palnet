// BandwidthChip - native twin of packages/ui-web/src/BandwidthChip.tsx.
//
// Same prop vocabulary: mode / labels / label / size. Native has no
// `className` and takes `onPress` where web takes `onClick` — the two
// differences PARITY.md's rule already allows, and nothing else.
//
// Presentational on purpose; see the web twin for why the cycle order lives in
// `@baydar/shared` rather than in either kit.

import { Chip } from "./Chip";

export type BandwidthChipMode = "light" | "normal" | "full";

export interface BandwidthChipProps {
  mode: BandwidthChipMode;
  /** Arabic-first labels, supplied by the app's catalog. */
  labels: Record<BandwidthChipMode, string>;
  /** The full spoken sentence, e.g. «وضع البيانات: خفيف. اضغط للتبديل». */
  label: string;
  /** Advance to the next mode. The host owns what "next" means. */
  onPress: () => void;
  size?: "sm" | "md";
}

// ponytail: no icon, for the same reason as the web twin — three signal glyphs
// would be three new names in both Icon unions, and خفيف / عادي / كامل are
// already three distinct words.

export function BandwidthChip({
  mode,
  labels,
  label,
  onPress,
  size = "sm",
}: BandwidthChipProps): JSX.Element {
  return (
    <Chip size={size} accessibilityLabel={label} onPress={onPress}>
      {labels[mode]}
    </Chip>
  );
}
