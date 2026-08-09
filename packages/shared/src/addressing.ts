import { AddressGender } from "./identity-enums";

// Talking TO somebody in Arabic.
//
// English gets away with one second person. Arabic does not: «أضِف» to a man,
// «أضيفي» to a woman, «أضيفوا» to a group or to somebody being addressed
// politely. Every imperative in the product — add, complete, confirm, upload —
// is one of three words, and a form that says «أضِف» to a woman is the first
// thing a native speaker notices and the last thing they forgive.
//
// This is a rendering input, not a pronoun and not an identity field. It has
// exactly three values because Arabic grammar has exactly three, and it is
// optional because a member who has not said gets the polite plural.

/**
 * Three variants of one string, keyed by how the reader is addressed.
 *
 * `neutral` is required; the other two are optional, because most strings do
 * not address the reader at all and forcing three copies of every one of them
 * would triple a catalog to no purpose.
 */
export interface AddressedForms {
  neutral: string;
  feminine?: string;
  masculine?: string;
}

/**
 * The right form for this reader.
 *
 * Falls back to `neutral` in every uncertain case — no gender recorded, a form
 * the catalog did not author, a non-Arabic locale. The polite plural is always
 * grammatical and never wrong about somebody, which is the property that makes
 * it the safe default rather than a placeholder.
 */
export function addressed(forms: AddressedForms, gender: AddressGender | null | undefined): string {
  if (gender === AddressGender.FEMININE) return forms.feminine ?? forms.neutral;
  if (gender === AddressGender.MASCULINE) return forms.masculine ?? forms.neutral;
  return forms.neutral;
}

/**
 * The i18next key suffix for this reader, or "" for the neutral form.
 *
 * Mobile's catalogs are flat key-value, so a gendered string is authored as
 * three sibling keys: `profile.add`, `profile.add_feminine`,
 * `profile.add_masculine`. Web's ICU catalogs express the same thing as a
 * `select`, which is why `addressed()` above exists as well — the two i18n
 * dialects cannot express each other and both need the same decision made in
 * one place.
 */
export function addressSuffix(gender: AddressGender | null | undefined): string {
  if (gender === AddressGender.FEMININE) return "_feminine";
  if (gender === AddressGender.MASCULINE) return "_masculine";
  return "";
}
