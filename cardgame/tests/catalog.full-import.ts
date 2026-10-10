import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { PrismaClient } from '@prisma/client'
import { assertLocalDatabase, importCatalog, prepareSchema, previewImport } from '../scripts/catalog/database'
import { MASTER, readJson, writeJson } from '../scripts/catalog/files'
import { digest, type Catalog } from '../scripts/catalog/core'
import { readiness } from '../scripts/catalog/readiness'

const url = process.env.DATABASE_URL || ''; assertLocalDatabase(url, true)
const db = new PrismaClient({ datasourceUrl: url })
after(async () => db.$disconnect())
async function protectedDigest() {
  return db.$transaction(async tx => digest(JSON.stringify({
    cards: await tx.card.findMany({ orderBy: { id: 'asc' } }), userCards: await tx.userCard.findMany({ orderBy: { id: 'asc' } }),
    decks: await tx.deck.findMany({ orderBy: { id: 'asc' } }), versions: await tx.deckVersion.findMany({ orderBy: { id: 'asc' } }), deckCards: await tx.deckCard.findMany({ orderBy: { id: 'asc' } }),
    openings: await tx.boosterOpening.findMany({ orderBy: { id: 'asc' } }), openingCards: await tx.boosterOpeningCard.findMany({ orderBy: { id: 'asc' } }), favorites: await tx.favoriteCard.findMany({ orderBy: { id: 'asc' } }),
    sets: await tx.cardSet.findMany({ orderBy: { id: 'asc' } }), rarities: await tx.cardRarity.findMany({ orderBy: { id: 'asc' } }), rules: await tx.setRules.findMany({ orderBy: { id: 'asc' } }),
  })))
}
test('complete reconstructed catalogue imports twice without changes to existing app/player tables', async () => {
  const catalog = await readJson<Catalog>(MASTER)
  const before = await protectedDigest(); await prepareSchema(db)
  const preview = await previewImport(db, catalog)
  const first = await importCatalog(db, catalog); const second = await importCatalog(db, catalog)
  assert.equal(second.replayed, true); assert.equal(await protectedDigest(), before)
  const keys = await db.$queryRawUnsafe<{ key: string }[]>('SELECT "key" FROM "CatalogVariant"')
  const existing = new Set(keys.map(k => k.key))
  assert.ok(catalog.variants.every(v => existing.has(v.key)))
  const allLinks = await db.$queryRawUnsafe<{ variantKey: string; editionCode: string }[]>('SELECT "variantKey","editionCode" FROM "CatalogMembership"')
  const links = new Set(allLinks.map(l => `${l.variantKey}@${l.editionCode}`))
  assert.ok(catalog.variants.every(v => v.extensions.every(e => links.has(`${v.key}@${e}`))))
  await writeJson('../docs/catalog/evidence/full-import.json', { status: 'PASS', isolated: true, variants: catalog.variants.length, extensions: catalog.extensions.length, memberships: catalog.variants.reduce((n, v) => n + v.extensions.length, 0), legacyRowsModified: 0, protectedRowsDigestBefore: before, protectedRowsDigestAfter: await protectedDigest(), first, second, previewCounts: { variantsCreated: preview.variantsToCreate.length, variantsUpdated: preview.variantsToUpdate.length, conflicts: preview.conflicts.length, missingTranslations: preview.missingTranslations.length } })
})
test('French export is accepted by the current Prisma Card model and rolled back', async () => {
  const { records } = await readiness()
  const before = await protectedDigest()
  await assert.rejects(db.$transaction(async tx => {
    const result = await tx.card.createMany({ data: records.map((r, i) => ({ ...r.data, id: `catalog-export-test:${i}`, setCode: null })) })
    assert.equal(result.count, records.length)
    throw new Error('EXPECTED_EXPORT_ROLLBACK')
  }, { timeout: 60000 }), /EXPECTED_EXPORT_ROLLBACK/)
  assert.equal(await protectedDigest(), before)
})
