// Does this line hard-code a colour?
//
// Split out of `qa-design.mjs` so it can be tested against known-good and
// known-bad strings. A gate this repo cannot break on purpose is a gate nobody
// should trust, and this one was quietly wrong: `#120` in a comment — a pull
// request reference — reads as a three-digit hex colour, so writing "closes
// #120" in a source comment failed the design gate.

/** 3, 6 or 8 hex digits after a `#`, the three lengths CSS accepts. */
const HEX = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;

/**
 * A whole-line comment. Colours belong in tokens, but *documenting* one — "the
 * underline measured #526030" — is how the design decisions in this repo get
 * recorded, and commented-out code ships nothing.
 *
 * Only leading-position comment markers count. Anything cleverer means deciding
 * whether a `//` sits inside a string literal, and a regex that guesses at that
 * is a worse bug than the one being fixed.
 */
const WHOLE_LINE_COMMENT = /^\s*(?:\/\/|\/\*|\*(?!\/)|\*\/|<!--)/;

/**
 * `#` + exactly three decimal digits: an issue or PR reference, not a colour.
 *
 * The two readings genuinely overlap — `#120` is a valid hex triplet — so this
 * picks the overwhelmingly more likely one. Six- and eight-digit matches are
 * left alone even when all-decimal, because `#526030` is this product's brand
 * colour and no issue tracker here reaches six digits.
 */
const ISSUE_REF = /^#\d{3}$/;

/** Every hard-coded colour on `line`. Empty when there is none. */
export function hardcodedColors(line) {
  if (WHOLE_LINE_COMMENT.test(line)) return [];
  return [...line.matchAll(HEX)].map((m) => m[0]).filter((hex) => !ISSUE_REF.test(hex));
}
