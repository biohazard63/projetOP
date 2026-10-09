/*
  Warnings:

  - The `playerUsedDonDeck` column on the `GameState` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `opponentUsedDonDeck` column on the `GameState` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."GameState" DROP COLUMN "playerUsedDonDeck",
ADD COLUMN     "playerUsedDonDeck" JSONB[],
DROP COLUMN "opponentUsedDonDeck",
ADD COLUMN     "opponentUsedDonDeck" JSONB[];
