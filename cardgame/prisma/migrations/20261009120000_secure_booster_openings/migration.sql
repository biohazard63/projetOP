-- Additive: legacy openings retain null receipts and are never credited retroactively.
ALTER TABLE "BoosterOpening" ADD COLUMN "idempotencyKey" TEXT,
ADD COLUMN "creditedAt" TIMESTAMP(3), ADD COLUMN "resultSnapshot" JSONB, ADD COLUMN "rulesSnapshot" JSONB;
CREATE UNIQUE INDEX "BoosterOpening_userId_idempotencyKey_key" ON "BoosterOpening"("userId", "idempotencyKey");
CREATE INDEX "BoosterOpening_userId_openedAt_id_idx" ON "BoosterOpening"("userId", "openedAt", "id");
-- Protect the recorded history against catalogue deletion cascades.
ALTER TABLE "BoosterOpening" DROP CONSTRAINT "BoosterOpening_boosterId_fkey";
ALTER TABLE "BoosterOpening" ADD CONSTRAINT "BoosterOpening_boosterId_fkey" FOREIGN KEY ("boosterId") REFERENCES "Booster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BoosterOpeningCard" DROP CONSTRAINT "BoosterOpeningCard_cardId_fkey";
ALTER TABLE "BoosterOpeningCard" ADD CONSTRAINT "BoosterOpeningCard_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
