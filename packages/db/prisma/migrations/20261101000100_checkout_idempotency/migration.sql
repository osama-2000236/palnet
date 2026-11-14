ALTER TABLE "Invoice"
  ADD COLUMN "checkoutKey" TEXT,
  ADD COLUMN "checkoutFingerprint" TEXT,
  ADD COLUMN "checkoutProcessingAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Invoice_checkoutKey_key" ON "Invoice"("checkoutKey");
