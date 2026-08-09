-- Arabic grammatical agreement, as a rendering input.
--
-- This is not "pronouns". A second-person imperative addressed to a woman is a
-- different word, and getting it wrong in every string is the quality signal a
-- native speaker notices first. NULL renders neutral-plural, which is what the
-- catalogs already assume.
--
-- `pronouns` is NOT dropped here. It was free text with no consumer in either
-- client, and its removal is a two-release migration tracked in
-- DEPRECATIONS.json: deprecated at P3, removed at P5.

CREATE TYPE "AddressGender" AS ENUM ('FEMININE', 'MASCULINE', 'NEUTRAL_PLURAL');

ALTER TABLE "Profile" ADD COLUMN "addressGender" "AddressGender";
