-- Per-user notification preferences (email + push opt-in matrix).
-- Stored as JSONB so the event×channel matrix can evolve without schema churn.
-- NULL = use server defaults (see DEFAULT_NOTIFICATION_PREFERENCES in @baydar/shared).
ALTER TABLE "User" ADD COLUMN "notificationPreferences" JSONB;
