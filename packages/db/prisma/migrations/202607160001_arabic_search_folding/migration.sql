-- Arabic search folding for FTS.
--
-- The 'simple' dictionary lowercases and tokenises but does zero Arabic
-- orthography folding, so "احمد" never matched "أحمد", "مبرمجه" never
-- matched "مبرمجة", and any tashkeel broke matching entirely.
--
-- baydar_fold() applies Lucene ArabicNormalizer semantics:
--   • strip tashkeel (U+064B–U+0652), superscript alef (U+0670), tatweel (U+0640)
--   • alef variants أ إ آ ٱ → bare alef ا
--   • alef maqsura ى → yeh ي
--   • teh marbuta ة → heh ه
--
-- MUST stay equivalent to foldArabic() in packages/shared/src/arabic-fold.ts.
-- The GIN indexes below and every FTS query in search.service.ts /
-- jobs.service.ts fold with this function; the index expression and the
-- query expression must match exactly for the planner to use the index.

CREATE OR REPLACE FUNCTION baydar_fold(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$
  SELECT translate(
    regexp_replace(input, '[\u064B-\u0652\u0670\u0640]', '', 'g'),
    'أإآٱىة',
    'اااايه'
  );
$$;

-- Rebuild the three functional GIN indexes on the folded expression.

DROP INDEX IF EXISTS "Profile_fts_idx";
CREATE INDEX "Profile_fts_idx"
  ON "Profile"
  USING GIN (
    to_tsvector(
      'simple',
      baydar_fold(
        COALESCE("handle",    '') || ' ' ||
        COALESCE("firstName", '') || ' ' ||
        COALESCE("lastName",  '') || ' ' ||
        COALESCE("headline",  '')
      )
    )
  );

DROP INDEX IF EXISTS "Post_fts_idx";
CREATE INDEX "Post_fts_idx"
  ON "Post"
  USING GIN (
    to_tsvector('simple', baydar_fold(COALESCE("body", '')))
  );

DROP INDEX IF EXISTS "Job_fts_idx";
CREATE INDEX "Job_fts_idx"
  ON "Job"
  USING GIN (
    to_tsvector(
      'simple',
      baydar_fold(
        COALESCE("title",       '') || ' ' ||
        COALESCE("description", '')
      )
    )
  );
