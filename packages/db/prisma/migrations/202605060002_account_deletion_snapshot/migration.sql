-- Add a reversible snapshot column for account deletion restore.
ALTER TABLE "User" ADD COLUMN "pendingDeletionSnapshot" JSONB;
