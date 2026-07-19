-- Job alerts: saved job search per user + a notification type for matches.

ALTER TYPE "NotificationType" ADD VALUE 'JOB_ALERT';

CREATE TABLE "JobAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "q" TEXT,
    "city" TEXT,
    "type" "JobType",
    "locationMode" "JobLocationMode",
    "industry" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobAlert_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "JobAlert_userId_idx" ON "JobAlert"("userId");

ALTER TABLE "JobAlert" ADD CONSTRAINT "JobAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
