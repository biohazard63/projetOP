/*
  Warnings:

  - You are about to drop the column `name` on the `SetRules` table. All the data in the column will be lost.
  - You are about to drop the column `releaseDate` on the `SetRules` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SetRules" DROP COLUMN "name",
DROP COLUMN "releaseDate";
