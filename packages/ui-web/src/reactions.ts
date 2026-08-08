// Reaction vocabulary — shared by ReactionGlyph, ReactionPicker and PostCard,
// and mirrored verbatim in packages/ui-native/src/reactions.ts.
//
// Why this exists at all: `ReactionType` has had six members in the Prisma
// schema and the shared enum since the schema was written, `PUT
// /posts/:id/reaction` has always accepted all six, and the post DTO has always
// returned `viewer.reaction` as the type — but every client collapsed it to a
// boolean and hard-coded `type: "LIKE"`. Five sixths of a shipped feature had
// no way to be reached.
//
// The union is declared here rather than imported from @baydar/shared on
// purpose: ui-web depends only on ui-tokens, clsx and tailwind-merge, and stays
// framework- and domain-neutral (see PostMediaItem's local `kind` union for the
// same call). The host maps the API enum onto this.
//
// No emoji. CLAUDE.md: "Emoji in product chrome. User-generated content only."
// That rule is also the differentiator — the category paints reactions as
// colour emoji badges, so Baydar draws them as line glyphs on the same 24×24
// grid and 1.8 stroke as every other icon in the system, tinted from the
// palette. They read as part of the interface, not stickers dropped onto it.

export const REACTION_TYPES = [
  "LIKE",
  "CELEBRATE",
  "SUPPORT",
  "LOVE",
  "INSIGHTFUL",
  "FUNNY",
] as const;

export type ReactionKind = (typeof REACTION_TYPES)[number];

/**
 * Tint per reaction, as a Tailwind text-colour class. Drawn from the existing
 * palette only — no new colour enters the system for this. LIKE stays brand
 * because it is the default and the one already painted in the stats pip.
 */
export const REACTION_TINT: Record<ReactionKind, string> = {
  LIKE: "text-brand-600",
  CELEBRATE: "text-accent-600",
  SUPPORT: "text-success",
  LOVE: "text-danger",
  INSIGHTFUL: "text-warning",
  FUNNY: "text-info",
};

/**
 * 24×24 path data, stroked with `currentColor`. Kept as data rather than JSX so
 * the native twin can render the identical geometry through react-native-svg
 * without a second set of hand-drawn shapes drifting from this one.
 */
export const REACTION_PATHS: Record<ReactionKind, readonly string[]> = {
  // Reuses Icon's `thumb` geometry exactly — the same gesture must not have two
  // drawings depending on whether it is an action or a reaction.
  LIKE: [
    "M7 11v9H4v-9zM7 11l4-7c1.5 0 2.5 1 2.5 2.5V10h5a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 17.3 20H7",
  ],
  // A burst: one four-point spark plus two smaller ones. Congratulation without
  // a party popper, which would be an illustration rather than a glyph.
  CELEBRATE: [
    "M12 3.5 13.6 9 19 10.6 13.6 12.2 12 17.7 10.4 12.2 5 10.6 10.4 9z",
    "M18.5 16.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z",
    "M5.5 15.5l.5 1.4 1.4.5-1.4.5-.5 1.4-.5-1.4L3.6 17.4l1.4-.5z",
  ],
  // A heart carried on an open palm — hands under, not a handshake, which at
  // 18px turns to mush.
  SUPPORT: [
    "M12 11.8 10.6 10.5a2 2 0 1 1 2.8-2.8l.6.6.6-.6a2 2 0 1 1 2.8 2.8L12 15z",
    "M4 14v3a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4v-3",
  ],
  LOVE: ["M12 20.5 4.2 13a5 5 0 0 1 7.1-7l.7.7.7-.7a5 5 0 0 1 7.1 7z"],
  // A lamp, for the insight. Filament plus base, no rays — rays are the
  // "brightness" glyph and read as a setting.
  INSIGHTFUL: ["M9 17a6 6 0 1 1 6 0v1.5H9z", "M10 21h4"],
  // A smile in a circle. No eyes: two dots at 18px are noise, and the arc alone
  // is unambiguous.
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
