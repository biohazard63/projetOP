/*
  Warnings:

  - You are about to drop the column `opponentLife` on the `GameState` table. All the data in the column will be lost.
  - You are about to drop the column `playerLife` on the `GameState` table. All the data in the column will be lost.
  - The `playerDonAddedThisTurn` column on the `GameState` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `opponentDonAddedThisTurn` column on the `GameState` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `playerDeck` on the `GameState` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `playerHand` on the `GameState` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `playerField` on the `GameState` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `playerDonDeck` on the `GameState` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `playerTrash` on the `GameState` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `playerUsedDonDeck` on the `GameState` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `playerDiscardPile` on the `GameState` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `opponentDeck` on the `GameState` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `opponentHand` on the `GameState` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `opponentField` on the `GameState` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `opponentDonDeck` on the `GameState` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `opponentTrash` on the `GameState` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `opponentUsedDonDeck` on the `GameState` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `opponentDiscardPile` on the `GameState` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "GameState" DROP CONSTRAINT "GameState_opponentId_fkey";

-- DropForeignKey
ALTER TABLE "GameState" DROP CONSTRAINT "GameState_playerId_fkey";

-- AlterTable
ALTER TABLE "GameState" DROP COLUMN "opponentLife",
DROP COLUMN "playerLife",
ADD COLUMN     "opponentLifePoints" INTEGER NOT NULL DEFAULT 4000,
ADD COLUMN     "playerLifePoints" INTEGER NOT NULL DEFAULT 4000,
ADD COLUMN     "setupPhase" TEXT,
DROP COLUMN "playerDeck",
ADD COLUMN     "playerDeck" JSONB NOT NULL,
DROP COLUMN "playerHand",
ADD COLUMN     "playerHand" JSONB NOT NULL,
DROP COLUMN "playerField",
ADD COLUMN     "playerField" JSONB NOT NULL,
DROP COLUMN "playerDonDeck",
ADD COLUMN     "playerDonDeck" JSONB NOT NULL,
DROP COLUMN "playerTrash",
ADD COLUMN     "playerTrash" JSONB NOT NULL,
DROP COLUMN "playerDonAddedThisTurn",
ADD COLUMN     "playerDonAddedThisTurn" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "playerUsedDonDeck",
ADD COLUMN     "playerUsedDonDeck" JSONB NOT NULL,
DROP COLUMN "playerDiscardPile",
ADD COLUMN     "playerDiscardPile" JSONB NOT NULL,
DROP COLUMN "opponentDeck",
ADD COLUMN     "opponentDeck" JSONB NOT NULL,
DROP COLUMN "opponentHand",
ADD COLUMN     "opponentHand" JSONB NOT NULL,
DROP COLUMN "opponentField",
ADD COLUMN     "opponentField" JSONB NOT NULL,
DROP COLUMN "opponentDonDeck",
ADD COLUMN     "opponentDonDeck" JSONB NOT NULL,
DROP COLUMN "opponentTrash",
ADD COLUMN     "opponentTrash" JSONB NOT NULL,
DROP COLUMN "opponentDonAddedThisTurn",
ADD COLUMN     "opponentDonAddedThisTurn" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "opponentUsedDonDeck",
ADD COLUMN     "opponentUsedDonDeck" JSONB NOT NULL,
DROP COLUMN "opponentDiscardPile",
ADD COLUMN     "opponentDiscardPile" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "activeDeckId" TEXT;

-- AddForeignKey
ALTER TABLE "GameState" ADD CONSTRAINT "GameState_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameState" ADD CONSTRAINT "GameState_opponentId_fkey" FOREIGN KEY ("opponentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
