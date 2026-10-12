-- AlterTable
ALTER TABLE "EngineGame" ADD COLUMN     "botLevel" TEXT NOT NULL DEFAULT 'normal';

-- CreateIndex
CREATE INDEX "EngineGame_userId_finishedAt_idx" ON "EngineGame"("userId", "finishedAt");

