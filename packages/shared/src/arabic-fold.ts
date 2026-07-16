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
