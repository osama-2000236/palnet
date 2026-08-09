-- The off-platform work proof, and the voucher's skin in the game.
--
-- Most work in this market is done for somebody who is not on Baydar: a
-- household, a shopkeeper, a contractor with a phone and no email. A proof
-- system that only counts confirmations from registered accounts would refuse
-- to see the majority of the work it exists to record.
--
-- So the worker names a phone number, that number gets one OTP, and confirming
-- with it is worth the same as an in-app confirmation. What is stored is the
-- SHA-256 of the E.164 number and nothing else -- a table of phone numbers
-- belonging to people who never signed up is somebody else's data, and it is
-- kept here only to route the code and to stop one client counting twice.

ALTER TABLE "WorkProof" ADD COLUMN "clientPhoneHash" TEXT;

-- One proof per (worker, occupation, client) on the off-platform path.
--
-- The existing unique on ("workerId","occupationKey","applicationId") does not
-- bind here, because Postgres treats NULLs as distinct: without this a worker
-- could file the same job for the same client a hundred times, each row NULL
-- in applicationId, and walk up the ladder alone. Partial, so the on-platform
-- rows -- which have an applicationId and no phone hash -- are untouched.
CREATE UNIQUE INDEX "WorkProof_offplatform_unique"
    ON "WorkProof" ("workerId", "occupationKey", "clientPhoneHash")
    WHERE "applicationId" IS NULL;

-- An upheld dispute against a vouchee costs the voucher their vouch capacity
-- for a window. Suspension, not revocation: the vouches they already made stay
-- standing, because cancelling them punishes the vouchees for their sponsor's
-- judgement. Without a cost, a vouch is a favour, and a favour economy is what
-- the ladder exists to replace.
ALTER TABLE "User" ADD COLUMN "vouchSuspendedUntil" TIMESTAMP(3);
