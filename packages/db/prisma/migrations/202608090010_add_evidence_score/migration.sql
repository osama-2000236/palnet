-- The one number that answers "why should I believe this person".
--
-- Cached on the profile and recomputed on write — never on read, which would
-- be a five-table fan-out per person card. Zero here; the recompute job fills
-- it, and a nightly reconciliation catches any profile whose updatedAt moved
-- without the score moving. That count is the canary for a missed write path.
--
-- Used only to order a candidate list an employer has already opened. Never
-- the feed, never public search, and no paid input touches it — Rule 1.

ALTER TABLE "Profile" ADD COLUMN "evidenceScore" INTEGER NOT NULL DEFAULT 0;

-- 0..100 by construction. A score outside it means the formula changed and
-- something did not, which is worth failing on rather than rendering.
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_evidence_score_range"
    CHECK ("evidenceScore" >= 0 AND "evidenceScore" <= 100);
