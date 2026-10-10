-- Additive catalogue staging. No ALTER/DROP/DELETE or change to existing Card/player tables.
CREATE TABLE IF NOT EXISTS "CatalogIdentity" ("number" TEXT PRIMARY KEY);
CREATE TABLE IF NOT EXISTS "CatalogVariant" (
  "key" TEXT PRIMARY KEY, "number" TEXT NOT NULL REFERENCES "CatalogIdentity"("number") ON DELETE RESTRICT,
  "artToken" TEXT NOT NULL, "payload" JSONB NOT NULL, "digest" TEXT NOT NULL,
  UNIQUE ("number", "artToken")
);
CREATE TABLE IF NOT EXISTS "CatalogEdition" ("code" TEXT PRIMARY KEY, "family" TEXT NOT NULL, "name" JSONB NOT NULL);
CREATE TABLE IF NOT EXISTS "CatalogMembership" (
  "variantKey" TEXT NOT NULL REFERENCES "CatalogVariant"("key") ON DELETE RESTRICT,
  "editionCode" TEXT NOT NULL REFERENCES "CatalogEdition"("code") ON DELETE RESTRICT,
  PRIMARY KEY ("variantKey", "editionCode")
);
CREATE TABLE IF NOT EXISTS "CatalogImage" (
  "variantKey" TEXT NOT NULL REFERENCES "CatalogVariant"("key") ON DELETE RESTRICT,
  "key" TEXT NOT NULL, "payload" JSONB NOT NULL, PRIMARY KEY ("variantKey", "key")
);
CREATE TABLE IF NOT EXISTS "CatalogTranslation" (
  "variantKey" TEXT NOT NULL REFERENCES "CatalogVariant"("key") ON DELETE RESTRICT,
  "field" TEXT NOT NULL, "payload" JSONB NOT NULL, PRIMARY KEY ("variantKey", "field")
);
CREATE TABLE IF NOT EXISTS "CatalogLegacyLink" (
  "cardId" TEXT NOT NULL REFERENCES "Card"("id") ON DELETE RESTRICT,
  "variantKey" TEXT NOT NULL REFERENCES "CatalogVariant"("key") ON DELETE RESTRICT,
  PRIMARY KEY ("cardId", "variantKey")
);
CREATE TABLE IF NOT EXISTS "CatalogImportRun" (
  "digest" TEXT PRIMARY KEY, "completedAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "counts" JSONB NOT NULL
);
