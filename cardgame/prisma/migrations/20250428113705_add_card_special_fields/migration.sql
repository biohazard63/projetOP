-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "isAltArt" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isParallel" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isSpecial" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "hasStarterDecks" BOOLEAN NOT NULL DEFAULT false;
