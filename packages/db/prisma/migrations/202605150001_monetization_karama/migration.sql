-- Sprint 23A: monetization plans/subscriptions/invoices/payments + Karama
-- Points reputation system + two-sided peer ratings. Schema additions and
-- new enums only — no destructive changes to existing tables.

-- CreateEnum
CREATE TYPE "PlanCode" AS ENUM ('EMPLOYER_FREE', 'EMPLOYER_BASIC', 'EMPLOYER_PRO', 'FEATURED_SLOT', 'USER_PREMIUM');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PAID', 'VOID', 'UNCOLLECTIBLE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CARD', 'BANK_TRANSFER', 'POINTS');

-- CreateEnum
CREATE TYPE "EmployerCreditKind" AS ENUM ('FEATURED_SLOT', 'JOB_POST', 'APPLICATION_BOOST');

-- CreateEnum
CREATE TYPE "KaramaReason" AS ENUM ('PROFILE_COMPLETE', 'ENDORSEMENT', 'VERIFIED_HIRE', 'RATING_RECEIVED', 'REPORT_UPHELD', 'FIRST_POST', 'REDEEM_BOOST_APPLICATION', 'REDEEM_PREMIUM', 'REDEEM_FEATURED_PROFILE', 'DECAY', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "RatingContext" AS ENUM ('CANDIDATE_RATES_EMPLOYER', 'EMPLOYER_RATES_CANDIDATE');

-- AlterTable: User gains a denormalized Karama balance (ledger remains source of truth)
ALTER TABLE "User" ADD COLUMN "karamaBalance" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "code" "PlanCode" NOT NULL,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "intervalDays" INTEGER,
    "features" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plan_code_key" ON "Plan"("code");

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "companyId" TEXT,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'INCOMPLETE',
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "providerSubscriptionId" TEXT,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");
CREATE INDEX "Subscription_companyId_idx" ON "Subscription"("companyId");
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "planId" TEXT,
    "userId" TEXT,
    "companyId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'OPEN',
    "method" "PaymentMethod" NOT NULL DEFAULT 'CARD',
    "providerInvoiceId" TEXT,
    "bankReceiptUrl" TEXT,
    "dueAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Invoice_userId_idx" ON "Invoice"("userId");
CREATE INDEX "Invoice_companyId_idx" ON "Invoice"("companyId");
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "providerPaymentId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "EmployerCredit" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "kind" "EmployerCreditKind" NOT NULL,
    "remaining" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployerCredit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmployerCredit_companyId_kind_idx" ON "EmployerCredit"("companyId", "kind");

-- AddForeignKey
ALTER TABLE "EmployerCredit" ADD CONSTRAINT "EmployerCredit_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "KaramaLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" "KaramaReason" NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KaramaLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KaramaLedger_userId_createdAt_idx" ON "KaramaLedger"("userId", "createdAt");
CREATE INDEX "KaramaLedger_reason_idx" ON "KaramaLedger"("reason");

-- AddForeignKey
ALTER TABLE "KaramaLedger" ADD CONSTRAINT "KaramaLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "UserRating" (
    "id" TEXT NOT NULL,
    "raterId" TEXT NOT NULL,
    "rateeId" TEXT NOT NULL,
    "context" "RatingContext" NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "jobId" TEXT,
    "applicationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserRating_raterId_rateeId_context_jobId_key" ON "UserRating"("raterId", "rateeId", "context", "jobId");
CREATE INDEX "UserRating_rateeId_context_idx" ON "UserRating"("rateeId", "context");
CREATE INDEX "UserRating_raterId_idx" ON "UserRating"("raterId");

-- AddForeignKey
ALTER TABLE "UserRating" ADD CONSTRAINT "UserRating_raterId_fkey" FOREIGN KEY ("raterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserRating" ADD CONSTRAINT "UserRating_rateeId_fkey" FOREIGN KEY ("rateeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed: starter plans. Idempotent so re-running migrations on existing DB
-- updates names/prices but does not delete subscriptions.
INSERT INTO "Plan" ("id", "code", "name", "priceCents", "currency", "intervalDays", "features", "createdAt")
VALUES
  ('plan_employer_free', 'EMPLOYER_FREE', 'Employer Free', 0, 'USD', 30, '{"activeJobs": 1, "featured": false}'::jsonb, CURRENT_TIMESTAMP),
  ('plan_employer_basic', 'EMPLOYER_BASIC', 'Employer Basic', 2900, 'USD', 30, '{"activeJobs": 5, "featured": false, "analytics": "basic"}'::jsonb, CURRENT_TIMESTAMP),
  ('plan_employer_pro', 'EMPLOYER_PRO', 'Employer Pro', 9900, 'USD', 30, '{"activeJobs": 25, "featuredSlots": 1, "analytics": "advanced", "csvExport": true}'::jsonb, CURRENT_TIMESTAMP),
  ('plan_featured_slot', 'FEATURED_SLOT', 'Featured Slot (7 days)', 4900, 'USD', NULL, '{"durationDays": 7}'::jsonb, CURRENT_TIMESTAMP),
  ('plan_user_premium', 'USER_PREMIUM', 'Diaspora Premium', 500, 'USD', 30, '{"whoViewedMe": true, "analytics": true, "verifiedBadge": true}'::jsonb, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "priceCents" = EXCLUDED."priceCents",
  "currency" = EXCLUDED."currency",
  "intervalDays" = EXCLUDED."intervalDays",
  "features" = EXCLUDED."features";
