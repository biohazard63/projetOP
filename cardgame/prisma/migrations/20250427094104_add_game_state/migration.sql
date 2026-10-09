/*
  Warnings:

  - You are about to drop the column `emailVerified` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `image` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `points` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Account` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Session` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_UserCollection` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `password` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_userId_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_userId_fkey";

-- DropForeignKey
ALTER TABLE "_UserCollection" DROP CONSTRAINT "_UserCollection_A_fkey";

-- DropForeignKey
ALTER TABLE "_UserCollection" DROP CONSTRAINT "_UserCollection_B_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "emailVerified",
DROP COLUMN "image",
DROP COLUMN "points",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "password" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "Account";

-- DropTable
DROP TABLE "Session";

-- DropTable
DROP TABLE "_UserCollection";

-- CreateTable
CREATE TABLE "GameState" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "playerId" TEXT NOT NULL,
    "opponentId" TEXT NOT NULL,
    "currentPhase" TEXT NOT NULL,
    "currentPlayer" TEXT NOT NULL,
    "turnNumber" INTEGER NOT NULL DEFAULT 1,
    "winner" TEXT,
    "gameOver" BOOLEAN NOT NULL DEFAULT false,
    "isFirstTurn" BOOLEAN NOT NULL DEFAULT true,
    "canPlayCard" BOOLEAN NOT NULL DEFAULT false,
    "canAttack" BOOLEAN NOT NULL DEFAULT false,
    "canEndTurn" BOOLEAN NOT NULL DEFAULT false,
    "hasKeptHand" BOOLEAN NOT NULL DEFAULT false,
    "playerLife" INTEGER NOT NULL DEFAULT 4,
    "playerLeader" JSONB,
    "playerDeck" JSONB[],
    "playerHand" JSONB[],
    "playerField" JSONB[],
    "playerDonDeck" JSONB[],
    "playerTrash" JSONB[],
    "playerActiveDon" INTEGER NOT NULL DEFAULT 0,
    "playerDonAddedThisTurn" BOOLEAN NOT NULL DEFAULT false,
    "playerUsedDonDeck" BOOLEAN NOT NULL DEFAULT false,
    "playerDiscardPile" JSONB[],
    "opponentLife" INTEGER NOT NULL DEFAULT 4,
    "opponentLeader" JSONB,
    "opponentDeck" JSONB[],
    "opponentHand" JSONB[],
    "opponentField" JSONB[],
    "opponentDonDeck" JSONB[],
    "opponentTrash" JSONB[],
    "opponentActiveDon" INTEGER NOT NULL DEFAULT 0,
    "opponentDonAddedThisTurn" BOOLEAN NOT NULL DEFAULT false,
    "opponentUsedDonDeck" BOOLEAN NOT NULL DEFAULT false,
    "opponentDiscardPile" JSONB[],

    CONSTRAINT "GameState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CardToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CardToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_CardToUser_B_index" ON "_CardToUser"("B");

-- AddForeignKey
ALTER TABLE "GameState" ADD CONSTRAINT "GameState_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameState" ADD CONSTRAINT "GameState_opponentId_fkey" FOREIGN KEY ("opponentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CardToUser" ADD CONSTRAINT "_CardToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CardToUser" ADD CONSTRAINT "_CardToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
