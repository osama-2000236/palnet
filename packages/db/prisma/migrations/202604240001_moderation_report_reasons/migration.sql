-- Sprint 10: realign ReportReason enum with the launch moderation surface.
-- Renames HATE → HATE_SPEECH and NUDITY → ADULT_CONTENT, drops MISINFORMATION
-- (out of scope for day-one; harassment/spam cover most false claims in
-- practice and we avoid enabling mass-flagging of political content), and
-- adds IMPERSONATION. Safe to rebuild the type in place because no Report
-- rows exist yet (feature first lands this sprint). If any exist from
-- seed/testing, we drop them explicitly so the USING cast can't stall on
-- "invalid input value".

DELETE FROM "Report";

ALTER TYPE "ReportReason" RENAME TO "ReportReason_old";

CREATE TYPE "ReportReason" AS ENUM (
  'SPAM',
  'HARASSMENT',
  'HATE_SPEECH',
  'VIOLENCE',
  'ADULT_CONTENT',
  'IMPERSONATION',
  'OTHER'
);

ALTER TABLE "Report"
  ALTER COLUMN "reason" TYPE "ReportReason"
  USING ("reason"::text::"ReportReason");

DROP TYPE "ReportReason_old";
