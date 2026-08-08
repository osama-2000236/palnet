// BandwidthChip — the mode the product is currently in, shown, not hidden.
//
// خفيف / عادي / كامل. A member on 2G whose feed looks sparse and whose images
// are grey rectangles will conclude the app is broken unless something on
// screen says otherwise, and a setting buried three taps deep says nothing.
//
// Presentational on purpose. It takes the current mode, the labels and a
// handler; it does not know what the next mode is, where the mode is stored,
// or what any of them cost. That decision lives in `@baydar/shared`, which the
// hosts already import and the kits deliberately do not — so there is one
// cycle order rather than a copy per platform waiting to disagree.
//
// Tapping cycles rather than opening a menu: three options is short enough,
// and a menu would be a `Menu` on web and an `ActionSheet` on native, which is
// a platform split for a control with three states.

import type { JSX } from "react";

import { Chip } from "./Chip";

export type BandwidthChipMode = "light" | "normal" | "full";

export interface BandwidthChipProps {
  mode: BandwidthChipMode;
  /** Arabic-first labels, supplied by the app's catalog. */
  labels: Record<BandwidthChipMode, string>;
  /**
   * The full accessible sentence, e.g. «وضع البيانات: خفيف. اضغط للتبديل».
   * Required: "خفيف" alone tells a screen-reader user nothing about what it is.
   */
  label: string;
  /** Advance to the next mode. The host owns what "next" means. */
  onClick: () => void;
  size?: "sm" | "md";
  className?: string;
}

// ponytail: no icon. Three signal glyphs would be three new names in both Icon
// unions, and خفيف / عادي / كامل are already three distinct words. Add one if
// the label ever has to be truncated away.

export function BandwidthChip({
  mode,
  labels,
  label,
  onClick,
  size = "sm",
  className,
}: BandwidthChipProps): JSX.Element {
  return (
    <Chip size={size} className={className} title={label} onClick={onClick}>
      {labels[mode]}
    </Chip>
  );
}
