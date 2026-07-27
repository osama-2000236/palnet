// ReactionGlyph — native twin of packages/ui-web/src/ReactionGlyph.tsx.
// Same 24×24 viewBox, same stroke weight, same path data (reactions.ts).

import { Path, Svg } from "react-native-svg";

import { REACTION_PATHS, reactionTint, type ReactionKind } from "./reactions";
import { useThemeTokens } from "./ThemeProvider";

export interface ReactionGlyphProps {
  kind: ReactionKind;
  size?: number;
  /** Explicit colour. Ignored when `tinted` is set. */
  color?: string;
  /** Paint the reaction's own tint from the live theme. */
  tinted?: boolean;
  strokeWidth?: number;
}

export function ReactionGlyph({
  kind,
  size = 18,
  color,
  tinted = false,
  strokeWidth = 1.8,
}: ReactionGlyphProps): JSX.Element {
  const c = useThemeTokens().color;
  const stroke = tinted ? reactionTint(c)[kind] : (color ?? c.inkMuted);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {REACTION_PATHS[kind].map((d) => (
        <Path
          key={d}
          d={d}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}
