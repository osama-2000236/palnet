-- CreateTable
CREATE TABLE "SseStreamToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "scope" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SseStreamToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SseStreamToken_tokenHash_idx" ON "SseStreamToken"("tokenHash");

-- CreateIndex
CREATE INDEX "SseStreamToken_userId_idx" ON "SseStreamToken"("userId");

-- CreateIndex
CREATE INDEX "SseStreamToken_expiresAt_idx" ON "SseStreamToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "SseStreamToken" ADD CONSTRAINT "SseStreamToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
