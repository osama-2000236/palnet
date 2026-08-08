-- Replay protection for the writes a client may retry.
--
-- A member on 2G sends a post, the request times out, the outbox retries, and
-- without this the post exists twice. `Message` already solves it with a
-- natural unique key; this generalises the idea to the writes that have none.
--
-- The stored response is what makes a replay useful rather than merely safe: a
-- 409 does not answer "did my post save?", and the saved post does.

CREATE TABLE "IdempotencyRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseBody" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

-- The uniqueness that does the work. Scoped to the user, not global: two
-- members generating the same client-side UUID must not collide, and a key is
-- only ever presented with the session that created it.
CREATE UNIQUE INDEX "IdempotencyRecord_userId_key_key"
    ON "IdempotencyRecord"("userId", "key");

-- The retention sweep queries by expiry alone.
CREATE INDEX "IdempotencyRecord_expiresAt_idx" ON "IdempotencyRecord"("expiresAt");

ALTER TABLE "IdempotencyRecord"
    ADD CONSTRAINT "IdempotencyRecord_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
