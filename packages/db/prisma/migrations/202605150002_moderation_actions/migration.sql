CREATE TABLE "ModerationAction" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "reportId" TEXT,
    "action" TEXT NOT NULL,
    "note" TEXT,
    "targetUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationAction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ModerationAction_reportId_idx" ON "ModerationAction"("reportId");
CREATE INDEX "ModerationAction_actorId_idx" ON "ModerationAction"("actorId");
CREATE INDEX "ModerationAction_targetUserId_idx" ON "ModerationAction"("targetUserId");
CREATE INDEX "ModerationAction_createdAt_idx" ON "ModerationAction"("createdAt");
