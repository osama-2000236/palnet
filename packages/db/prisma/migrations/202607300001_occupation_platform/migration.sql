-- CreateEnum
CREATE TYPE "PayBasis" AS ENUM ('MONTHLY', 'DAILY', 'HOURLY', 'PER_JOB', 'PER_PIECE', 'COMMISSION');

-- CreateEnum
CREATE TYPE "CompanyKind" AS ENUM ('EMPLOYER', 'FIRM', 'SHOP', 'WORKSHOP', 'FOOD', 'FARM', 'SOLO');

-- CreateEnum
CREATE TYPE "WorkProofStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DECLINED', 'EXPIRED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "StandingReason" AS ENUM ('EARNED', 'VOUCHED', 'FOUNDING', 'SUSPENDED', 'DEMOTED', 'REINSTATED');

-- CreateEnum
CREATE TYPE "PracticeStatus" AS ENUM ('TRAINEE', 'PRACTISING', 'NON_PRACTISING');

-- CreateEnum
CREATE TYPE "LicenceStatus" AS ENUM ('DECLARED', 'VERIFIED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TopicSource" AS ENUM ('AUTHOR_OCCUPATION', 'HASHTAG', 'COMPANY', 'TEXT_MATCH', 'GOVERNORATE');

-- CreateEnum
CREATE TYPE "SignalKind" AS ENUM ('POST_EXPAND', 'POST_DWELL', 'LINK_CLICK', 'PROFILE_VISIT', 'SEARCH_QUERY', 'JOB_APPLY', 'NOT_INTERESTED', 'HIDE_POST');

-- CreateEnum
CREATE TYPE "RequirementLevel" AS ENUM ('MUST', 'NICE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'STANDING_ADVANCED';
ALTER TYPE "NotificationType" ADD VALUE 'WORK_PROOF_REQUESTED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "JobType" ADD VALUE 'SEASONAL';
ALTER TYPE "JobType" ADD VALUE 'DAY_LABOR';
ALTER TYPE "JobType" ADD VALUE 'PIECE_WORK';
ALTER TYPE "JobType" ADD VALUE 'APPRENTICESHIP';
ALTER TYPE "JobType" ADD VALUE 'FREELANCE';

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "acceptingWork" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasWorkshop" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "servesAtClientSite" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "isWorkSample" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "kind" "CompanyKind" NOT NULL DEFAULT 'EMPLOYER';

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "durationDays" INTEGER,
ADD COLUMN     "licenceBodyKey" TEXT,
ADD COLUMN     "minStanding" INTEGER,
ADD COLUMN     "mustSkills" TEXT[],
ADD COLUMN     "occupationKey" TEXT,
ADD COLUMN     "payBasis" "PayBasis" NOT NULL DEFAULT 'MONTHLY',
ADD COLUMN     "requiresLicence" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "screeningQuestions" JSONB,
ADD COLUMN     "startsAt" TIMESTAMP(3),
ALTER COLUMN "companyId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "attachedProofIds" TEXT[],
ADD COLUMN     "availableFrom" TIMESTAMP(3),
ADD COLUMN     "expectedPay" INTEGER,
ADD COLUMN     "expectedPayBasis" "PayBasis",
ADD COLUMN     "matchSnapshot" JSONB,
ADD COLUMN     "portfolioPostIds" TEXT[],
ADD COLUMN     "screeningAnswers" JSONB;

-- CreateTable
CREATE TABLE "OccupationClaim" (
    "profileId" TEXT NOT NULL,
    "occupationKey" TEXT NOT NULL,
    "declaredYears" INTEGER,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OccupationClaim_pkey" PRIMARY KEY ("profileId","occupationKey")
);

-- CreateTable
CREATE TABLE "WorkProof" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "clientUserId" TEXT,
    "clientCompanyId" TEXT,
    "occupationKey" TEXT NOT NULL,
    "jobId" TEXT,
    "applicationId" TEXT,
    "city" TEXT,
    "summary" TEXT,
    "status" "WorkProofStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "confirmExpiresAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkProof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Standing" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "occupationKey" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "reason" "StandingReason" NOT NULL DEFAULT 'EARNED',
    "suspendedAt" TIMESTAMP(3),
    "attainedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Standing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vouch" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "voucheeId" TEXT NOT NULL,
    "occupationKey" TEXT NOT NULL,
    "note" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vouch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Licence" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "companyId" TEXT,
    "occupationKey" TEXT NOT NULL,
    "bodyKey" TEXT NOT NULL,
    "number" TEXT,
    "status" "LicenceStatus" NOT NULL DEFAULT 'DECLARED',
    "practice" "PracticeStatus" NOT NULL DEFAULT 'PRACTISING',
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Licence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostTopic" (
    "postId" TEXT NOT NULL,
    "topicKey" TEXT NOT NULL,
    "source" "TopicSource" NOT NULL,

    CONSTRAINT "PostTopic_pkey" PRIMARY KEY ("postId","topicKey")
);

-- CreateTable
CREATE TABLE "InterestWeight" (
    "userId" TEXT NOT NULL,
    "topicKey" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterestWeight_pkey" PRIMARY KEY ("userId","topicKey")
);

-- CreateTable
CREATE TABLE "FeedSlate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postIds" TEXT[],
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedSlate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopicMute" (
    "userId" TEXT NOT NULL,
    "topicKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TopicMute_pkey" PRIMARY KEY ("userId","topicKey")
);

-- CreateIndex
CREATE INDEX "OccupationClaim_occupationKey_idx" ON "OccupationClaim"("occupationKey");

-- CreateIndex
CREATE INDEX "WorkProof_workerId_occupationKey_status_idx" ON "WorkProof"("workerId", "occupationKey", "status");

-- CreateIndex
CREATE INDEX "WorkProof_clientUserId_idx" ON "WorkProof"("clientUserId");

-- CreateIndex
CREATE INDEX "WorkProof_status_confirmExpiresAt_idx" ON "WorkProof"("status", "confirmExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkProof_workerId_occupationKey_applicationId_key" ON "WorkProof"("workerId", "occupationKey", "applicationId");

-- CreateIndex
CREATE INDEX "Standing_occupationKey_value_idx" ON "Standing"("occupationKey", "value");

-- CreateIndex
CREATE UNIQUE INDEX "Standing_userId_occupationKey_key" ON "Standing"("userId", "occupationKey");

-- CreateIndex
CREATE INDEX "Vouch_voucheeId_occupationKey_idx" ON "Vouch"("voucheeId", "occupationKey");

-- CreateIndex
CREATE UNIQUE INDEX "Vouch_voucherId_voucheeId_occupationKey_key" ON "Vouch"("voucherId", "voucheeId", "occupationKey");

-- CreateIndex
CREATE INDEX "Licence_companyId_idx" ON "Licence"("companyId");

-- CreateIndex
CREATE INDEX "Licence_status_expiresAt_idx" ON "Licence"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Licence_userId_occupationKey_bodyKey_key" ON "Licence"("userId", "occupationKey", "bodyKey");

-- CreateIndex
CREATE INDEX "PostTopic_topicKey_idx" ON "PostTopic"("topicKey");

-- CreateIndex
CREATE INDEX "InterestWeight_userId_weight_idx" ON "InterestWeight"("userId", "weight");

-- CreateIndex
CREATE INDEX "FeedSlate_userId_generatedAt_idx" ON "FeedSlate"("userId", "generatedAt");

-- CreateIndex
CREATE INDEX "FeedSlate_expiresAt_idx" ON "FeedSlate"("expiresAt");

-- CreateIndex
CREATE INDEX "Company_kind_idx" ON "Company"("kind");

-- CreateIndex
CREATE INDEX "Job_occupationKey_isActive_idx" ON "Job"("occupationKey", "isActive");

-- CreateIndex
CREATE INDEX "Job_type_isActive_idx" ON "Job"("type", "isActive");

-- AddForeignKey
ALTER TABLE "OccupationClaim" ADD CONSTRAINT "OccupationClaim_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkProof" ADD CONSTRAINT "WorkProof_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkProof" ADD CONSTRAINT "WorkProof_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkProof" ADD CONSTRAINT "WorkProof_clientCompanyId_fkey" FOREIGN KEY ("clientCompanyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkProof" ADD CONSTRAINT "WorkProof_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkProof" ADD CONSTRAINT "WorkProof_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Standing" ADD CONSTRAINT "Standing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vouch" ADD CONSTRAINT "Vouch_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vouch" ADD CONSTRAINT "Vouch_voucheeId_fkey" FOREIGN KEY ("voucheeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Licence" ADD CONSTRAINT "Licence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Licence" ADD CONSTRAINT "Licence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostTopic" ADD CONSTRAINT "PostTopic_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterestWeight" ADD CONSTRAINT "InterestWeight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedSlate" ADD CONSTRAINT "FeedSlate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicMute" ADD CONSTRAINT "TopicMute_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

