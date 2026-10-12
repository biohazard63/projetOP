-- CreateTable
CREATE TABLE "EngineGame" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "humanSeat" TEXT NOT NULL,
    "botSeat" TEXT NOT NULL,
    "deckRef" TEXT NOT NULL,
    "botDeckRef" TEXT NOT NULL,
    "rulesetId" TEXT NOT NULL,
    "engineVersion" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "state" JSONB NOT NULL,
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "EngineGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngineCommand" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "commandId" TEXT NOT NULL,
    "actorSeat" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "resultVersion" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EngineCommand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EngineGame_userId_status_idx" ON "EngineGame"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EngineCommand_gameId_seq_key" ON "EngineCommand"("gameId", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "EngineCommand_gameId_commandId_key" ON "EngineCommand"("gameId", "commandId");

-- AddForeignKey
ALTER TABLE "EngineGame" ADD CONSTRAINT "EngineGame_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngineCommand" ADD CONSTRAINT "EngineCommand_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "EngineGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

