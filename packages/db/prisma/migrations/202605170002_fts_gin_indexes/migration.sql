-- Full-text search GIN indexes for people/post/job search.
--
-- Dictionary choice: 'simple' (not 'english' or 'arabic'). 'english' stems
-- Arabic into nonsense; 'arabic' stems English into nonsense. 'simple' just
-- lowercases and tokenises on whitespace/punctuation, which is what an
-- Arabic-first, mixed-language network actually needs. Closes #7.
--
-- Indexes are functional GINs on a concatenated to_tsvector expression. The
-- query side in search.service.ts uses the same expression so the planner
-- can pick the index.

-- ────────────────────────────────────────────────────────────────────────
-- Profile  →  handle + firstName + lastName + headline
-- ────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS "Profile_fts_idx"
  ON "Profile"
  USING GIN (
    to_tsvector(
      'simple',
      COALESCE("handle",    '') || ' ' ||
      COALESCE("firstName", '') || ' ' ||
      COALESCE("lastName",  '') || ' ' ||
      COALESCE("headline",  '')
    )
  );

-- ────────────────────────────────────────────────────────────────────────
-- Post  →  body
-- ────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS "Post_fts_idx"
  ON "Post"
  USING GIN (
    to_tsvector('simple', COALESCE("body", ''))
  );

-- ────────────────────────────────────────────────────────────────────────
-- Job  →  title + description
-- ────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS "Job_fts_idx"
  ON "Job"
  USING GIN (
    to_tsvector(
      'simple',
      COALESCE("title",       '') || ' ' ||
      COALESCE("description", '')
    )
  );
