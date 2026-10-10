-- Unknown publication dates stay NULL. No existing date or reference is changed.
ALTER TABLE "CardSet" ALTER COLUMN "releaseDate" DROP NOT NULL;
