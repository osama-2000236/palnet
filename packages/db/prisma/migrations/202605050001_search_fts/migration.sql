ALTER TABLE "Post"
  ADD COLUMN IF NOT EXISTS "searchVector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce("body", ''))
  ) STORED;

CREATE INDEX IF NOT EXISTS "Post_searchVector_idx"
  ON "Post"
  USING GIN ("searchVector");

ALTER TABLE "Profile"
  ADD COLUMN IF NOT EXISTS "searchVector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector(
      'simple',
      coalesce("firstName", '') || ' ' ||
      coalesce("lastName", '') || ' ' ||
      coalesce("handle", '') || ' ' ||
      coalesce("headline", '') || ' ' ||
      coalesce("about", '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS "Profile_searchVector_idx"
  ON "Profile"
  USING GIN ("searchVector");

ALTER TABLE "Company"
  ADD COLUMN IF NOT EXISTS "searchVector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector(
      'simple',
      coalesce("name", '') || ' ' ||
      coalesce("tagline", '') || ' ' ||
      coalesce("industry", '') || ' ' ||
      coalesce("about", '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS "Company_searchVector_idx"
  ON "Company"
  USING GIN ("searchVector");
