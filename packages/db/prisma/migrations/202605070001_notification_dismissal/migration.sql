-- Add soft-dismiss support for notifications.
ALTER TABLE "Notification" ADD COLUMN "dismissedAt" TIMESTAMP(3);

-- Support owner list queries that exclude dismissed rows.
CREATE INDEX "Notification_recipientId_dismissedAt_idx" ON "Notification"("recipientId", "dismissedAt");
