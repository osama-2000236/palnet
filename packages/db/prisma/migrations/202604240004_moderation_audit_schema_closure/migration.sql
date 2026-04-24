-- Align clean deploys with moderation audit fields already present in schema.
-- This migration adds storage only; Sprint 12 still exposes no suspend,
-- takedown, appeal, or automated moderation action APIs.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuditAction') THEN
        CREATE TYPE "AuditAction" AS ENUM (
            'USER_SUSPEND',
            'USER_UNSUSPEND',
            'POST_TAKEDOWN',
            'POST_RESTORE',
            'REPORT_RESOLVE',
            'REPORT_APPEAL_REVIEW'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AppealStatus') THEN
        CREATE TYPE "AppealStatus" AS ENUM ('PENDING', 'UPHELD', 'DENIED');
    END IF;
END $$;

ALTER TABLE "User"
    ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "suspendedById" TEXT,
    ADD COLUMN IF NOT EXISTS "suspendedReason" TEXT;

ALTER TABLE "Post"
    ADD COLUMN IF NOT EXISTS "takedownAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "takedownById" TEXT,
    ADD COLUMN IF NOT EXISTS "takedownReason" TEXT;

ALTER TABLE "Report"
    ADD COLUMN IF NOT EXISTS "appealDecisionNote" TEXT,
    ADD COLUMN IF NOT EXISTS "appealNote" TEXT,
    ADD COLUMN IF NOT EXISTS "appealReviewedAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "appealReviewedById" TEXT,
    ADD COLUMN IF NOT EXISTS "appealStatus" "AppealStatus",
    ADD COLUMN IF NOT EXISTS "appealedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "targetUserId" TEXT,
    "targetPostId" TEXT,
    "targetReportId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_targetUserId_idx" ON "AuditLog"("targetUserId");
CREATE INDEX IF NOT EXISTS "AuditLog_targetPostId_idx" ON "AuditLog"("targetPostId");
CREATE INDEX IF NOT EXISTS "AuditLog_targetReportId_idx" ON "AuditLog"("targetReportId");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

CREATE INDEX IF NOT EXISTS "Post_takedownAt_idx" ON "Post"("takedownAt");
CREATE INDEX IF NOT EXISTS "Report_appealedAt_idx" ON "Report"("appealedAt");
CREATE INDEX IF NOT EXISTS "Report_appealStatus_idx" ON "Report"("appealStatus");
CREATE INDEX IF NOT EXISTS "User_suspendedAt_idx" ON "User"("suspendedAt");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_suspendedById_fkey') THEN
        ALTER TABLE "User"
            ADD CONSTRAINT "User_suspendedById_fkey"
            FOREIGN KEY ("suspendedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Post_takedownById_fkey') THEN
        ALTER TABLE "Post"
            ADD CONSTRAINT "Post_takedownById_fkey"
            FOREIGN KEY ("takedownById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Report_appealReviewedById_fkey') THEN
        ALTER TABLE "Report"
            ADD CONSTRAINT "Report_appealReviewedById_fkey"
            FOREIGN KEY ("appealReviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AuditLog_actorId_fkey') THEN
        ALTER TABLE "AuditLog"
            ADD CONSTRAINT "AuditLog_actorId_fkey"
            FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AuditLog_targetUserId_fkey') THEN
        ALTER TABLE "AuditLog"
            ADD CONSTRAINT "AuditLog_targetUserId_fkey"
            FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
