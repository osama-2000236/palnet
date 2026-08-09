// Arabic search folding — Lucene ArabicNormalizer semantics.
//
// Folds the orthographic variants that make naive Arabic matching fail:
//   • strips tashkeel (U+064B–U+0652), superscript alef (U+0670), tatweel (U+0640)
//   • alef variants أ إ آ ٱ → bare alef ا
//   • alef maqsura ى → yeh ي
//   • teh marbuta ة → heh ه
//
// MUST stay equivalent to the SQL `baydar_fold()` function
// (packages/db/prisma/migrations/202607160001_arabic_search_folding) — the
// GIN indexes and every FTS query fold with the SQL twin, and client-side
// matching (normalizeCity) folds with this one.
export function foldArabic(input: string): string {
  return input
    .replace(/[ً-ْٰـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
}

// The skill-clustering key.
//
// "JS", "Javascript", "javascript" and «جافاسكربت» are one skill typed four
// ways, and endorsement counts scatter across the fragments until nobody's
// number means anything. This is the key several Skill rows share; the oldest
// row in a cluster is its canonical, and the rest point at it.
//
// Latin case matters here in a way it does not in search: "JavaScript" and
// "javascript" are the same skill, so the lowercase is on top of the fold.
//
// MUST stay equivalent to the SQL in migration 202608090009, which is
// literally `lower(btrim(regexp_replace(baydar_fold(name), '\s+', ' ', 'g')))`.
// arabic-fold.spec.ts pins the two against each other.
export function foldSkillName(name: string): string {
  return foldArabic(name).toLowerCase().trim().replace(/\s+/g, " ");
}
