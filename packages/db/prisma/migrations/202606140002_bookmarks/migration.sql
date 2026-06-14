-- Persist saved jobs/posts with server-owned targets.

CREATE TYPE "BookmarkType" AS ENUM ('POST', 'JOB');

CREATE TABLE "Bookmark" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "BookmarkType" NOT NULL,
  "postId" TEXT,
  "jobId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Bookmark_target_check" CHECK (
    ("type" = 'POST' AND "postId" IS NOT NULL AND "jobId" IS NULL) OR
    ("type" = 'JOB' AND "jobId" IS NOT NULL AND "postId" IS NULL)
  )
);

ALTER TABLE "Bookmark"
  ADD CONSTRAINT "Bookmark_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Bookmark"
  ADD CONSTRAINT "Bookmark_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Bookmark"
  ADD CONSTRAINT "Bookmark_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Bookmark_userId_createdAt_idx" ON "Bookmark"("userId", "createdAt");
CREATE INDEX "Bookmark_postId_idx" ON "Bookmark"("postId");
CREATE INDEX "Bookmark_jobId_idx" ON "Bookmark"("jobId");

CREATE UNIQUE INDEX "Bookmark_userId_postId_key"
  ON "Bookmark"("userId", "postId")
  WHERE "postId" IS NOT NULL;

CREATE UNIQUE INDEX "Bookmark_userId_jobId_key"
  ON "Bookmark"("userId", "jobId")
  WHERE "jobId" IS NOT NULL;
