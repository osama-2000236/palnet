-- Sprint 15: extend NotificationType so moderation outcomes can be surfaced
-- to the affected user (suspended/unsuspended, post taken-down/restored,
-- appeal reviewed). Payload lives in Notification.data JSON — no new columns.

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MODERATION_USER_SUSPENDED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MODERATION_USER_UNSUSPENDED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MODERATION_POST_TAKEDOWN';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MODERATION_POST_RESTORED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MODERATION_APPEAL_REVIEWED';
