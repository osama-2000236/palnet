-- Where a member is, where they are from, and the gap between jobs.
--
-- `country` carried both meanings and could only answer one. 8.82 million
-- Palestinians abroad against 5.56 million at home makes "where from" and
-- "where now" two different questions, and the diaspora can only find each
-- other by the first.

CREATE TYPE "CareerBreakReason" AS ENUM (
    'CAREER_BREAK_STUDY', 'CAREER_BREAK_CARE', 'CAREER_BREAK_HEALTH',
    'CAREER_BREAK_DISPLACEMENT', 'CAREER_BREAK_DETENTION',
    'CAREER_BREAK_TRAVEL', 'CAREER_BREAK_OTHER'
);

ALTER TABLE "Profile" ADD COLUMN "residenceCountry" TEXT NOT NULL DEFAULT 'PS';
ALTER TABLE "Profile" ADD COLUMN "originGovernorate" TEXT;
ALTER TABLE "Profile" ADD COLUMN "diasporaVisible" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Profile" ADD COLUMN "careerBreakFrom" TIMESTAMP(3);
ALTER TABLE "Profile" ADD COLUMN "careerBreakTo" TIMESTAMP(3);
ALTER TABLE "Profile" ADD COLUMN "careerBreakReason" "CareerBreakReason";

-- Backfill: every existing member's residence is what `country` already said.
-- Without this, everybody defaults to PS and the diaspora search returns the
-- home market.
UPDATE "Profile" SET "residenceCountry" = "country";

CREATE INDEX "Profile_originGovernorate_idx" ON "Profile"("originGovernorate");
CREATE INDEX "Profile_residenceCountry_idx" ON "Profile"("residenceCountry");

-- A break that ends before it starts is a typo, and one stored is a date range
-- every reader has to defend against.
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_career_break_ordered"
    CHECK ("careerBreakTo" IS NULL OR "careerBreakFrom" IS NULL OR "careerBreakTo" >= "careerBreakFrom");
