/*
  Warnings:

  - You are about to drop the column `opponentLifePoints` on the `GameState` table. All the data in the column will be lost.
  - You are about to drop the column `playerLifePoints` on the `GameState` table. All the data in the column will be lost.
  - You are about to drop the column `setupPhase` on the `GameState` table. All the data in the column will be lost.
  - The `playerDeck` column on the `GameState` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `playerHand` column on the `GameState` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `playerField` column on the `GameState` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `playerDonDeck` column on the `GameState` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `playerTrash` column on the `GameState` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `playerDonAddedThisTurn` column on the `GameState` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `playerUsedDonDeck` column on the `GameState` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `playerDiscardPile` column on the `GameState` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `opponentDeck` column on the `GameState` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `opponentHand` column on the `GameState` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `opponentField` column on the `GameState` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `opponentDonDeck` column on the `GameState` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `opponentTrash` column on the `GameState` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `opponentDonAddedThisTurn` column on the `GameState` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `opponentUsedDonDeck` column on the `GameState` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `opponentDiscardPile` column on the `GameState` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `activeDeckId` on the `User` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."GameState" DROP CONSTRAINT "GameState_opponentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."GameState" DROP CONSTRAINT "GameState_playerId_fkey";

-- AlterTable
ALTER TABLE "public"."GameState" DROP COLUMN "opponentLifePoints",
DROP COLUMN "playerLifePoints",
DROP COLUMN "setupPhase",
ADD COLUMN     "opponentLife" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN     "playerLife" INTEGER NOT NULL DEFAULT 4,
DROP COLUMN "playerDeck",
ADD COLUMN     "playerDeck" JSONB[],
DROP COLUMN "playerHand",
ADD COLUMN     "playerHand" JSONB[],
DROP COLUMN "playerField",
ADD COLUMN     "playerField" JSONB[],
DROP COLUMN "playerDonDeck",
ADD COLUMN     "playerDonDeck" JSONB[],
DROP COLUMN "playerTrash",
ADD COLUMN     "playerTrash" JSONB[],
DROP COLUMN "playerDonAddedThisTurn",
ADD COLUMN     "playerDonAddedThisTurn" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "playerUsedDonDeck",
ADD COLUMN     "playerUsedDonDeck" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "playerDiscardPile",
ADD COLUMN     "playerDiscardPile" JSONB[],
DROP COLUMN "opponentDeck",
ADD COLUMN     "opponentDeck" JSONB[],
DROP COLUMN "opponentHand",
ADD COLUMN     "opponentHand" JSONB[],
DROP COLUMN "opponentField",
ADD COLUMN     "opponentField" JSONB[],
DROP COLUMN "opponentDonDeck",
ADD COLUMN     "opponentDonDeck" JSONB[],
DROP COLUMN "opponentTrash",
ADD COLUMN     "opponentTrash" JSONB[],
DROP COLUMN "opponentDonAddedThisTurn",
ADD COLUMN     "opponentDonAddedThisTurn" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "opponentUsedDonDeck",
ADD COLUMN     "opponentUsedDonDeck" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "opponentDiscardPile",
ADD COLUMN     "opponentDiscardPile" JSONB[];

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "activeDeckId";

-- AddForeignKey
ALTER TABLE "public"."GameState" ADD CONSTRAINT "GameState_opponentId_fkey" FOREIGN KEY ("opponentId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GameState" ADD CONSTRAINT "GameState_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
