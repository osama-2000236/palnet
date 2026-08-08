-- EmployerCreditKind.APPLICATION_BOOST is removed outright rather than
-- deprecated: it has no writer, no reader and no rows, and it is permanently
-- unbuildable. An application boost is money buying rank, which Rule 1 forbids
-- (docs/linkedin-parity-2026-08 §4.2). Leaving the member in place invites
-- somebody to implement the obvious thing.
--
-- Postgres cannot drop an enum member, so the type is recreated. The USING cast
-- would fail on a surviving row, but with "invalid input value for enum", which
-- reads like a bug in the migration rather than a fact about the data — hence
-- the guard, which says what is actually wrong and what to do about it.

DO $$
DECLARE
  stragglers bigint;
BEGIN
  SELECT count(*) INTO stragglers
  FROM "EmployerCredit"
  WHERE "kind"::text = 'APPLICATION_BOOST';

  IF stragglers > 0 THEN
    RAISE EXCEPTION
      'APPLICATION_BOOST credits exist (% row(s)). Rule 1 forbids the feature, so these cannot be honoured; refund or void them before this migration runs.',
      stragglers;
  END IF;
END $$;

ALTER TYPE "EmployerCreditKind" RENAME TO "EmployerCreditKind_old";

CREATE TYPE "EmployerCreditKind" AS ENUM ('FEATURED_SLOT', 'JOB_POST');

ALTER TABLE "EmployerCredit"
  ALTER COLUMN "kind" TYPE "EmployerCreditKind"
  USING ("kind"::text::"EmployerCreditKind");

DROP TYPE "EmployerCreditKind_old";
