-- CreateTable
CREATE TABLE "BoosterOpeningCard" (
    "id" TEXT NOT NULL,
    "boosterOpeningId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "BoosterOpeningCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BoosterOpeningCard_boosterOpeningId_position_key" ON "BoosterOpeningCard"("boosterOpeningId", "position");

-- AddForeignKey
ALTER TABLE "BoosterOpeningCard" ADD CONSTRAINT "BoosterOpeningCard_boosterOpeningId_fkey" FOREIGN KEY ("boosterOpeningId") REFERENCES "BoosterOpening"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoosterOpeningCard" ADD CONSTRAINT "BoosterOpeningCard_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
