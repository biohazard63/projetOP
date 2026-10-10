-- Preserve all cards and references; absent printed costs remain NULL, never zero.
ALTER TABLE "Card" ALTER COLUMN "cost" DROP NOT NULL;
