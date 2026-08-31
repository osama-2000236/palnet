// Reaction vocabulary — the native mirror of packages/ui-web/src/reactions.ts.
// Same six kinds, same path geometry, same tint intent. See the web file for
// why the vocabulary is not imported from @baydar/shared, and why these are
// line glyphs rather than emoji.
//
// The kinds, the geometry and `topReactions` now come from
// `@baydar/ui-tokens/glyphs`, which both twins import — this file used to
// restate them verbatim under a comment reading "Identical path data to the
// web twin". Only the tint stays platform-specific.

import type { ReactionKind } from "@baydar/ui-tokens/glyphs";

import type { NativeTokens } from "./tokens";

export {
  REACTION_TYPES,
  REACTION_PATHS,
  topReactions,
  type ReactionKind,
} from "@baydar/ui-tokens/glyphs";

/** Tint per reaction, resolved from the *live* theme rather than module scope. */
export function reactionTint(color: NativeTokens["color"]): Record<ReactionKind, string> {
  return {
    LIKE: color.brand600,
    CELEBRATE: color.accent600,
    SUPPORT: color.success,
    LOVE: color.danger,
    INSIGHTFUL: color.warning,
    FUNNY: color.info,
  };
}
