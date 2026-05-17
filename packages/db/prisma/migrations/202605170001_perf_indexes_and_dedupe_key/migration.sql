-- Phase 3 perf migration: composite indexes + denormalized columns for hot
-- paths (feed, messaging, notifications). Forward-only and additive — no
-- column drops, no NOT NULL on backfilled rows without a default.
--
-- New columns:
--   * Notification.dedupeKey    — replaces 10-field findFirst with a single
--     stable hash for collapse-on-burst notifications.
--   * ChatRoomMember.lastReadMessageId — denormalized read cursor so the
--     listMyRooms unread count is one bounded WHERE id > … scan instead of a
--     per-room message.count() loop.
--
-- New indexes:
--   * Connection(status, createdAt)        — listing pending/recent requests.
--   * Post(authorId, deletedAt, createdAt) — feed author filter w/ soft-delete.
--   * ChatRoomMember(userId, roomId)       — covering for per-user room scans.
--   * Notification(recipientId, readAt, createdAt) — unread inbox ordering.
--   * Notification(recipientId, dedupeKey, readAt, dismissedAt) — dedupe lookup.

-- ────────────────────────────────────────────────────────────────────────
-- New columns (NULL-able; no rewrite of existing rows).
-- ────────────────────────────────────────────────────────────────────────

ALTER TABLE "Notification"   ADD COLUMN "dedupeKey"         TEXT;
ALTER TABLE "ChatRoomMember" ADD COLUMN "lastReadMessageId" TEXT;

-- ────────────────────────────────────────────────────────────────────────
-- Backfill ChatRoomMember.lastReadMessageId from the existing lastReadAt
-- timestamp. For each member with a non-null lastReadAt, pick the latest
-- message in the same room created at or before that moment.
-- ────────────────────────────────────────────────────────────────────────

UPDATE "ChatRoomMember" AS m
SET    "lastReadMessageId" = sub.id
FROM (
  SELECT DISTINCT ON (cm."id") cm."id" AS member_id, msg."id"
  FROM   "ChatRoomMember" cm
  JOIN   "Message"        msg
         ON  msg."roomId"    = cm."roomId"
         AND msg."createdAt" <= cm."lastReadAt"
  WHERE  cm."lastReadAt" IS NOT NULL
  ORDER  BY cm."id", msg."createdAt" DESC
) AS sub
WHERE  m."id" = sub.member_id;

-- ────────────────────────────────────────────────────────────────────────
-- Backfill Notification.dedupeKey for existing unread rows so dedup begins
-- working immediately instead of after a 30-day churn window.
-- Format: type | actorId | postId | commentId | connectionId | messageId | jobId
-- COALESCE NULLs to "" so the key is purely a function of value-tuple.
-- ────────────────────────────────────────────────────────────────────────

UPDATE "Notification"
SET    "dedupeKey" = CONCAT_WS(
         ':',
         "type"::text,
         COALESCE("actorId",      ''),
         COALESCE("postId",       ''),
         COALESCE("commentId",    ''),
         COALESCE("connectionId", ''),
         COALESCE("messageId",    ''),
         COALESCE("jobId",        '')
       )
WHERE  "readAt"      IS NULL
  AND  "dismissedAt" IS NULL;

-- ────────────────────────────────────────────────────────────────────────
-- Indexes
-- ────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS "Connection_status_createdAt_idx"
  ON "Connection" ("status", "createdAt");

CREATE INDEX IF NOT EXISTS "Post_authorId_deletedAt_createdAt_idx"
  ON "Post" ("authorId", "deletedAt", "createdAt");

CREATE INDEX IF NOT EXISTS "ChatRoomMember_userId_roomId_idx"
  ON "ChatRoomMember" ("userId", "roomId");

CREATE INDEX IF NOT EXISTS "Notification_recipientId_readAt_createdAt_idx"
  ON "Notification" ("recipientId", "readAt", "createdAt");

CREATE INDEX IF NOT EXISTS "Notification_recipientId_dedupeKey_readAt_dismissedAt_idx"
  ON "Notification" ("recipientId", "dedupeKey", "readAt", "dismissedAt");
