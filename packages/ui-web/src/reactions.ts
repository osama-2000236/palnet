// Reaction vocabulary — shared by ReactionGlyph, ReactionPicker and PostCard.
//
// Why this exists at all: `ReactionType` has had six members in the Prisma
// schema and the shared enum since the schema was written, `PUT
// /posts/:id/reaction` has always accepted all six, and the post DTO has always
// returned `viewer.reaction` as the type — but every client collapsed it to a
// boolean and hard-coded `type: "LIKE"`. Five sixths of a shipped feature had
// no way to be reached.
//
// The vocabulary and the geometry now live in `@baydar/ui-tokens/glyphs`, which
// the native twin imports from too — they used to be two verbatim copies. That
// package is still not `@baydar/shared`: ui-web depends only on ui-tokens, clsx
// and tailwind-merge, and stays framework- and domain-neutral (see
// PostCardMedia's local `kind` union for the same call). The host maps the API
// enum onto this.
//
// What stays here is the half that cannot be shared: the tint, which is a
// Tailwind class on web and a resolved theme colour on native.

import type { ReactionKind } from "@baydar/ui-tokens/glyphs";

export {
  REACTION_TYPES,
  REACTION_PATHS,
  topReactions,
  type ReactionKind,
} from "@baydar/ui-tokens/glyphs";

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
