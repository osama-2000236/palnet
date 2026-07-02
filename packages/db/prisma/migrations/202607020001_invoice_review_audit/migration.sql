-- Operator review audit trail for admin billing review (Sprint 25).
-- Rollback: ALTER TABLE "Invoice" DROP COLUMN "reviewedById", DROP COLUMN "reviewedAt", DROP COLUMN "reviewNote";
ALTER TABLE "Invoice"
  ADD COLUMN "reviewedById" TEXT,
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "reviewNote" TEXT;
