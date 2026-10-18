-- Prepared only: applying this migration requires explicit authorization.
CREATE TABLE "IssueReport" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'NEW',
  "cardSnapshot" JSONB,
  "context" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IssueReport_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "IssueReport_userId_requestId_key" ON "IssueReport"("userId", "requestId");
CREATE INDEX "IssueReport_status_createdAt_id_idx" ON "IssueReport"("status", "createdAt", "id");
ALTER TABLE "IssueReport" ADD CONSTRAINT "IssueReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
