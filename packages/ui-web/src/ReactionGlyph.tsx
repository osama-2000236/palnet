// ReactionGlyph — one of the six reaction marks, on Icon's 24×24 grid.
//
// Not a `case` inside Icon.tsx: that file is at 279 lines against qa:design's
// 300-line ceiling, and six more glyphs would push it over. The split is also
// honest — reactions are their own vocabulary with their own tint scale, not
// general chrome icons.

import { cx } from "./cx";
import { REACTION_PATHS, REACTION_TINT, type ReactionKind } from "./reactions";

export interface ReactionGlyphProps {
  kind: ReactionKind;
  size?: number;
  /** Paint the reaction's own tint instead of inheriting `currentColor`. */
  tinted?: boolean;
  strokeWidth?: number;
  className?: string;
}

export function ReactionGlyph({
  kind,
  size = 18,
  tinted = false,
  strokeWidth = 1.8,
  className,
}: ReactionGlyphProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cx(tinted && REACTION_TINT[kind], className)}
    >
      {REACTION_PATHS[kind].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
