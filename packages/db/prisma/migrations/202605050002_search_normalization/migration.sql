CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION baydar_search_normalize(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT unaccent(
    translate(
      regexp_replace(
        coalesce(input, ''),
        '[' || chr(1600) || chr(1611) || '-' || chr(1631) || chr(1648) || ']',
        '',
        'g'
      ),
      chr(1573) || chr(1571) || chr(1570) || chr(1649),
      repeat(chr(1575), 4)
    )
  );
$$;

DROP INDEX IF EXISTS "Post_searchVector_idx";
ALTER TABLE "Post" DROP COLUMN IF EXISTS "searchVector";
ALTER TABLE "Post"
  ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', baydar_search_normalize("body"))
  ) STORED;
CREATE INDEX "Post_searchVector_idx"
  ON "Post"
  USING GIN ("searchVector");

DROP INDEX IF EXISTS "Profile_searchVector_idx";
ALTER TABLE "Profile" DROP COLUMN IF EXISTS "searchVector";
ALTER TABLE "Profile"
  ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector(
      'simple',
      baydar_search_normalize(
        coalesce("firstName", '') || ' ' ||
        coalesce("lastName", '') || ' ' ||
        coalesce("handle", '') || ' ' ||
        coalesce("headline", '') || ' ' ||
        coalesce("about", '')
      )
    )
  ) STORED;
CREATE INDEX "Profile_searchVector_idx"
  ON "Profile"
  USING GIN ("searchVector");

DROP INDEX IF EXISTS "Company_searchVector_idx";
ALTER TABLE "Company" DROP COLUMN IF EXISTS "searchVector";
ALTER TABLE "Company"
  ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector(
      'simple',
      baydar_search_normalize(
        coalesce("name", '') || ' ' ||
        coalesce("tagline", '') || ' ' ||
        coalesce("industry", '') || ' ' ||
        coalesce("about", '')
      )
    )
  ) STORED;
CREATE INDEX "Company_searchVector_idx"
  ON "Company"
  USING GIN ("searchVector");
