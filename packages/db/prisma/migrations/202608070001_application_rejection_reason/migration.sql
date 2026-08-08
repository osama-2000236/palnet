-- Rejection reasons: every REJECTED application carries why, and the applicant
-- sees it. Nullable because every historical row predates the requirement —
-- the "always set" guarantee is enforced on the write path, not by the column.

CREATE TYPE "RejectionReason" AS ENUM (
    'POSITION_FILLED',
    'EXPERIENCE_INSUFFICIENT',
    'SKILLS_MISMATCH',
    'LOCATION',
    'QUALIFICATION_MISSING',
    'APPLIED_AFTER_CLOSING',
    'OTHER'
);

ALTER TABLE "Application" ADD COLUMN "rejectionReason" "RejectionReason";
ALTER TABLE "Application" ADD COLUMN "rejectionNote" TEXT;
