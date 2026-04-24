-- Admin depth: suspensions, post takedowns, report appeals, audit log.
-- All additions are additive; no existing data is destroyed.

-- ─── New enums ───────────────────────────────────────────────────────────
CREATE TYPE "AuditAction" AS ENUM (
  'USER_SUSPEND',
  'USER_UNSUSPEND',
  'POST_TAKEDOWN',
  'POST_RESTORE',
  'REPORT_RESOLVE',
  'REPORT_APPEAL_REVIEW'
);

CREATE TYPE "AppealStatus" AS ENUM ('PENDING', 'UPHELD', 'DENIED');

-- ─── User: suspension ───────────────────────────────────────────────────
ALTER TABLE "User"
  ADD COLUMN "suspendedAt"     TIMESTAMP(3),
  ADD COLUMN "suspendedReason" TEXT,
  ADD COLUMN "suspendedById"   TEXT;

ALTER TABLE "User"
  ADD CONSTRAINT "User_suspendedById_fkey"
  FOREIGN KEY ("suspendedById")
  REFERENCES "User"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE INDEX "User_suspendedAt_idx" ON "User"("suspendedAt");

-- ─── Post: takedown ─────────────────────────────────────────────────────
ALTER TABLE "Post"
  ADD COLUMN "takedownAt"     TIMESTAMP(3),
  ADD COLUMN "takedownReason" TEXT,
  ADD COLUMN "takedownById"   TEXT;

ALTER TABLE "Post"
  ADD CONSTRAINT "Post_takedownById_fkey"
  FOREIGN KEY ("takedownById")
  REFERENCES "User"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE INDEX "Post_takedownAt_idx" ON "Post"("takedownAt");

-- ─── Report: appeal ─────────────────────────────────────────────────────
ALTER TABLE "Report"
  ADD COLUMN "appealedAt"         TIMESTAMP(3),
  ADD COLUMN "appealNote"         TEXT,
  ADD COLUMN "appealStatus"       "AppealStatus",
  ADD COLUMN "appealDecisionNote" TEXT,
  ADD COLUMN "appealReviewedAt"   TIMESTAMP(3),
  ADD COLUMN "appealReviewedById" TEXT;

ALTER TABLE "Report"
  ADD CONSTRAINT "Report_appealReviewedById_fkey"
  FOREIGN KEY ("appealReviewedById")
  REFERENCES "User"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE INDEX "Report_appealedAt_idx" ON "Report"("appealedAt");
CREATE INDEX "Report_appealStatus_idx" ON "Report"("appealStatus");

-- ─── AuditLog ───────────────────────────────────────────────────────────
CREATE TABLE "AuditLog" (
  "id"             TEXT         NOT NULL,
  "actorId"        TEXT         NOT NULL,
  "action"         "AuditAction" NOT NULL,
  "targetUserId"   TEXT,
  "targetPostId"   TEXT,
  "targetReportId" TEXT,
  "note"           TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_actorId_fkey"
  FOREIGN KEY ("actorId")
  REFERENCES "User"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_targetUserId_fkey"
  FOREIGN KEY ("targetUserId")
  REFERENCES "User"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
CREATE INDEX "AuditLog_targetUserId_idx" ON "AuditLog"("targetUserId");
CREATE INDEX "AuditLog_targetPostId_idx" ON "AuditLog"("targetPostId");
CREATE INDEX "AuditLog_targetReportId_idx" ON "AuditLog"("targetReportId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
