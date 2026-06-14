-- Enforce one ledger row per idempotent Karama reference.
-- PostgreSQL permits multiple NULL values in a unique index, so regular
-- awards without refType/refId stay append-only while referenced awards
-- such as profile-complete, endorsements, redemptions, and decay become
-- database-enforced no-ops on replay.
CREATE UNIQUE INDEX "KaramaLedger_userId_reason_refType_refId_key"
  ON "KaramaLedger"("userId", "reason", "refType", "refId");
