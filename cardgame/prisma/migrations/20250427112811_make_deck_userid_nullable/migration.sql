/*
  Warnings:

  - You are about to drop the column `acquiredAt` on the `UserInventory` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "UserInventory" DROP CONSTRAINT "UserInventory_itemId_fkey";

-- DropIndex
DROP INDEX "Achievement_code_key";

-- DropIndex
DROP INDEX "UserAchievement_userId_achievementId_key";

-- AlterTable
ALTER TABLE "Deck" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "UserInventory" DROP COLUMN "acquiredAt",
ADD COLUMN     "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1;
