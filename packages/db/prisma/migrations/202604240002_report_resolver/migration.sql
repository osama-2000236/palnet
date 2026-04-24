-- Add nullable resolver audit field for moderation triage.
ALTER TABLE "Report" ADD COLUMN "resolvedById" TEXT;

ALTER TABLE "Report" ADD CONSTRAINT "Report_resolvedById_fkey"
  FOREIGN KEY ("resolvedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Report_resolvedById_idx" ON "Report"("resolvedById");
