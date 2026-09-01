// Glyph geometry shared by the web and native design-system twins.
//
// Path data is a DRAWING, not a token — it has no light/dark variant and never
// reaches `tokens.css`, which is why it lives in its own module and its own
// `@baydar/ui-tokens/glyphs` entry point rather than inside the `tokens`
// object that `scripts/build-tokens.mjs` compiles to CSS.
//
// It lives here because `ui-tokens` is the only package both `ui-web` and
// `ui-native` already depend on. Both twins used to declare these constants
// verbatim — `reactions.ts` carried the same six path tables on each side under
// a comment reading "Identical path data to the web twin — one drawing, two
// renderers", and `Icon.tsx` carried the same 700-character cog string twice
// under "Shared verbatim with the web twin". Two copies of one drawing is a
// drift waiting to happen, and the Icon twins have already drifted (25 web
// paths against 27 native).
//
// Everything below is renderer-agnostic: no JSX, no `className`, no
// `react-native-svg`. Each platform maps this data onto its own primitive —
// `<path>` on web, `<Path>` on native — and owns its own colour resolution.

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
 * 24×24 path data for the reaction glyphs, stroked with the caller's colour.
 *
 * No emoji. CLAUDE.md: "Emoji in product chrome. User-generated content only."
 * That rule is also the differentiator — the category paints reactions as
 * colour emoji badges, so Baydar draws them as line glyphs on the same 24×24
 * grid and 1.8 stroke as every other icon in the system.
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

/** Cog outline for the `gear` glyph, on the same 24×24 viewBox. */
export const GEAR_TEETH =
  "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z";
