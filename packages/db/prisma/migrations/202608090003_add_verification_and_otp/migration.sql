-- Identity verification, and the one-time codes behind it.
--
-- Four methods, because four is what exists in this market. LinkedIn's CLEAR
-- and NFC-passport paths do not operate here, and a product that asks for a
-- document it cannot verify is asking for a photograph of an ID.

CREATE TYPE "VerificationMethod" AS ENUM ('PHONE', 'WORK_EMAIL', 'EDU_EMAIL', 'PROFESSIONAL_BODY');
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED', 'REVOKED', 'EXPIRED');
CREATE TYPE "OtpPurpose" AS ENUM ('PHONE_VERIFY', 'WORK_PROOF_CONFIRM', 'ACCOUNT_RECOVERY');

CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "method" "VerificationMethod" NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "evidenceRef" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- One row per method: re-verifying a phone updates the row rather than
-- accumulating a history nobody reads and every badge query has to filter.
CREATE UNIQUE INDEX "Verification_userId_method_key" ON "Verification"("userId", "method");
CREATE INDEX "Verification_status_expiresAt_idx" ON "Verification"("status", "expiresAt");

ALTER TABLE "Verification" ADD CONSTRAINT "Verification_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hash only. A leaked table of live one-time codes is a leaked table of
-- accounts, and the code is worthless to us after it is checked.
CREATE TABLE "PhoneOtp" (
    "id" TEXT NOT NULL,
    "phoneE164" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "refId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhoneOtp_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PhoneOtp_phoneE164_purpose_expiresAt_idx" ON "PhoneOtp"("phoneE164", "purpose", "expiresAt");
-- The sweep queries by expiry alone.
CREATE INDEX "PhoneOtp_expiresAt_idx" ON "PhoneOtp"("expiresAt");

-- Denormalised from Verification: "can this account be trusted with an
-- off-platform work proof" is asked on every such write, and one column beats
-- a join on the hot path.
ALTER TABLE "User" ADD COLUMN "phoneVerifiedAt" TIMESTAMP(3);
