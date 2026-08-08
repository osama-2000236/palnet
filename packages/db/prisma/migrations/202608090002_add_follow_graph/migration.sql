-- The asymmetric edge, and the four tables that make it usable.
--
-- Baydar had exactly one edge type: Connection, mutual, requiring acceptance.
-- That caps the diaspora's participation at the size of their existing address
-- book — 8.82 million people abroad who mostly do not know each other. A
-- follow costs the person being followed nothing, which is the whole point.

CREATE TYPE "FollowTargetType" AS ENUM ('USER', 'COMPANY', 'TOPIC');

CREATE TABLE "Follow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "targetType" "FollowTargetType" NOT NULL,
    "targetUserId" TEXT,
    "targetCompanyId" TEXT,
    "targetTopicKey" TEXT,
    "targetKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- Prisma cannot express "exactly one of three", and a row with two targets is
-- counted twice by FollowerCount forever.
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_exactly_one_target"
    CHECK (num_nonnulls("targetUserId", "targetCompanyId", "targetTopicKey") = 1);

-- The uniqueness that actually holds. Over the three nullable columns it would
-- not: Postgres treats NULLs in a unique index as distinct, so the same follow
-- would insert twice and both would be counted.
CREATE UNIQUE INDEX "Follow_followerId_targetKey_key" ON "Follow"("followerId", "targetKey");

CREATE INDEX "Follow_targetUserId_idx" ON "Follow"("targetUserId");
CREATE INDEX "Follow_targetCompanyId_idx" ON "Follow"("targetCompanyId");
CREATE INDEX "Follow_targetTopicKey_idx" ON "Follow"("targetTopicKey");
CREATE INDEX "Follow_followerId_targetType_idx" ON "Follow"("followerId", "targetType");

ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey"
    FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_targetUserId_fkey"
    FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_targetCompanyId_fkey"
    FOREIGN KEY ("targetCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Denormalised, because a COUNT(*) on Follow per profile card is the query that
-- kills the feed at 100k rows.
CREATE TABLE "FollowerCount" (
    "targetKey" TEXT NOT NULL,
    "targetType" "FollowTargetType" NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowerCount_pkey" PRIMARY KEY ("targetKey")
);
CREATE INDEX "FollowerCount_targetType_idx" ON "FollowerCount"("targetType");

-- A counter that can go negative is a counter nobody trusts. The reconciliation
-- job repairs drift; this stops the obvious kind reaching the table at all.
ALTER TABLE "FollowerCount" ADD CONSTRAINT "FollowerCount_not_negative" CHECK ("count" >= 0);

CREATE TABLE "FeedMute" (
    "userId" TEXT NOT NULL,
    "mutedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedMute_pkey" PRIMARY KEY ("userId", "mutedId")
);
CREATE INDEX "FeedMute_mutedId_idx" ON "FeedMute"("mutedId");
ALTER TABLE "FeedMute" ADD CONSTRAINT "FeedMute_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeedMute" ADD CONSTRAINT "FeedMute_mutedId_fkey"
    FOREIGN KEY ("mutedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "RestrictedUser" (
    "userId" TEXT NOT NULL,
    "restrictedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RestrictedUser_pkey" PRIMARY KEY ("userId", "restrictedId")
);
CREATE INDEX "RestrictedUser_restrictedId_idx" ON "RestrictedUser"("restrictedId");
ALTER TABLE "RestrictedUser" ADD CONSTRAINT "RestrictedUser_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RestrictedUser" ADD CONSTRAINT "RestrictedUser_restrictedId_fkey"
    FOREIGN KEY ("restrictedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Materialised second-degree adjacency, refreshed nightly. Live degree is a
-- two-hop join per card, which at feed scale is not affordable.
CREATE TABLE "SecondDegree" (
    "userId" TEXT NOT NULL,
    "peerId" TEXT NOT NULL,
    "mutuals" INTEGER NOT NULL,
    "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecondDegree_pkey" PRIMARY KEY ("userId", "peerId")
);
CREATE INDEX "SecondDegree_userId_mutuals_idx" ON "SecondDegree"("userId", "mutuals");
ALTER TABLE "SecondDegree" ADD CONSTRAINT "SecondDegree_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SecondDegree" ADD CONSTRAINT "SecondDegree_peerId_fkey"
    FOREIGN KEY ("peerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SuggestionDismissal" (
    "userId" TEXT NOT NULL,
    "dismissedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuggestionDismissal_pkey" PRIMARY KEY ("userId", "dismissedId")
);
-- The 90-day TTL sweep queries by age alone.
CREATE INDEX "SuggestionDismissal_createdAt_idx" ON "SuggestionDismissal"("createdAt");
ALTER TABLE "SuggestionDismissal" ADD CONSTRAINT "SuggestionDismissal_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SuggestionDismissal" ADD CONSTRAINT "SuggestionDismissal_dismissedId_fkey"
    FOREIGN KEY ("dismissedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: every accepted connection is two follows, because a connection
-- implies a follow in both directions. Without this, every existing member's
-- feed would empty the moment the feed starts reading Follow instead of
-- Connection — which is what phase 5 does.
INSERT INTO "Follow" ("id", "followerId", "targetType", "targetUserId", "targetKey", "createdAt")
SELECT
    md5(random()::text || clock_timestamp()::text)::uuid::text,
    c."requesterId",
    'USER',
    c."receiverId",
    'USER:' || c."receiverId",
    c."updatedAt"
FROM "Connection" c
WHERE c."status" = 'ACCEPTED'
ON CONFLICT ("followerId", "targetKey") DO NOTHING;

INSERT INTO "Follow" ("id", "followerId", "targetType", "targetUserId", "targetKey", "createdAt")
SELECT
    md5(random()::text || clock_timestamp()::text)::uuid::text,
    c."receiverId",
    'USER',
    c."requesterId",
    'USER:' || c."requesterId",
    c."updatedAt"
FROM "Connection" c
WHERE c."status" = 'ACCEPTED'
ON CONFLICT ("followerId", "targetKey") DO NOTHING;

-- And the counters that go with them, so the first profile card served after
-- this migration is not reading zero for somebody with 200 connections.
INSERT INTO "FollowerCount" ("targetKey", "targetType", "count", "updatedAt")
SELECT f."targetKey", f."targetType", count(*), now()
FROM "Follow" f
GROUP BY f."targetKey", f."targetType"
ON CONFLICT ("targetKey") DO UPDATE SET "count" = EXCLUDED."count", "updatedAt" = now();
