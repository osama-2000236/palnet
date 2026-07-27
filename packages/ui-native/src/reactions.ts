// Reaction vocabulary — the native mirror of packages/ui-web/src/reactions.ts.
// Same six kinds, same path geometry, same tint intent. See the web file for
// why the union is declared locally rather than imported from @baydar/shared,
// and why these are line glyphs rather than emoji.

import { nativeTokens, type NativeTokens } from "./tokens";

export const REACTION_TYPES = [
  "LIKE",
  "CELEBRATE",
  "SUPPORT",
  "LOVE",
  "INSIGHTFUL",
  "FUNNY",
] as const;

export type ReactionKind = (typeof REACTION_TYPES)[number];

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

/** Identical path data to the web twin — one drawing, two renderers. */
export const REACTION_PATHS: Record<ReactionKind, readonly string[]> = {
  LIKE: [
    "M7 11v9H4v-9zM7 11l4-7c1.5 0 2.5 1 2.5 2.5V10h5a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 17.3 20H7",
  ],
  CELEBRATE: [
    "M12 3.5 13.6 9 19 10.6 13.6 12.2 12 17.7 10.4 12.2 5 10.6 10.4 9z",
    "M18.5 16.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z",
    "M5.5 15.5l.5 1.4 1.4.5-1.4.5-.5 1.4-.5-1.4L3.6 17.4l1.4-.5z",
  ],
  SUPPORT: [
    "M12 11.8 10.6 10.5a2 2 0 1 1 2.8-2.8l.6.6.6-.6a2 2 0 1 1 2.8 2.8L12 15z",
    "M4 14v3a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4v-3",
  ],
  LOVE: ["M12 20.5 4.2 13a5 5 0 0 1 7.1-7l.7.7.7-.7a5 5 0 0 1 7.1 7z"],
  INSIGHTFUL: ["M9 17a6 6 0 1 1 6 0v1.5H9z", "M10 21h4"],
  FUNNY: ["M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z", "M8.2 13.5a4.5 4.5 0 0 0 7.6 0"],
};

/** Reaction kinds present on a post, most-used first, capped at `limit`. */
export function topReactions(
  counts: Partial<Record<string, number>> | undefined,
  limit = 3,
): ReactionKind[] {
  if (!counts) return [];
  return REACTION_TYPES.filter((kind) => (counts[kind] ?? 0) > 0)
    .sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0))
    .slice(0, limit);
}

// Re-exported so a consumer that only needs the glyph size does not reach into
// the token bundle for it.
export const REACTION_GLYPH_SIZE = nativeTokens.space[5];
