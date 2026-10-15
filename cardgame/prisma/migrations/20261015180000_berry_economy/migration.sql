-- AlterTable
ALTER TABLE "User" ADD COLUMN     "berries" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "BoosterOpening" ADD COLUMN     "berryTransactionId" TEXT,
ADD COLUMN     "displayId" TEXT,
ADD COLUMN     "displayIndex" INTEGER;

-- CreateTable
CREATE TABLE "BerryTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BerryTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VirtualDisplay" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "setCode" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "plan" JSONB NOT NULL,
    "nextIndex" INTEGER NOT NULL DEFAULT 0,
    "rulesVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "VirtualDisplay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BerryTransaction_userId_createdAt_idx" ON "BerryTransaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "BerryTransaction_userId_reason_createdAt_idx" ON "BerryTransaction"("userId", "reason", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BerryTransaction_userId_idempotencyKey_key" ON "BerryTransaction"("userId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "VirtualDisplay_userId_setCode_completedAt_idx" ON "VirtualDisplay"("userId", "setCode", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BoosterOpening_displayId_displayIndex_key" ON "BoosterOpening"("displayId", "displayIndex");

-- AddForeignKey
ALTER TABLE "BoosterOpening" ADD CONSTRAINT "BoosterOpening_displayId_fkey" FOREIGN KEY ("displayId") REFERENCES "VirtualDisplay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BerryTransaction" ADD CONSTRAINT "BerryTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VirtualDisplay" ADD CONSTRAINT "VirtualDisplay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- A balance can never go below zero (purchases are refused before, this is the last line of defence).
ALTER TABLE "User" ADD CONSTRAINT "User_berries_non_negative" CHECK ("berries" >= 0);

-- At most one open virtual box per player and extension.
CREATE UNIQUE INDEX "VirtualDisplay_open_per_set_key" ON "VirtualDisplay"("userId", "setCode") WHERE "completedAt" IS NULL;
