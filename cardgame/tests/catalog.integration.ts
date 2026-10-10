import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { assertLocalDatabase, importCatalog, prepareSchema, previewImport } from '../scripts/catalog/database'
import { rebuild } from '../scripts/catalog/core'
import { openBooster, getOpening } from '../src/lib/boosters/service'
import { seedBoosters } from './seed-boosters'

const url = process.env.DATABASE_URL || ''
assertLocalDatabase(url, true)
const db = new PrismaClient({ datasourceUrl: url }); const tag = randomUUID().replaceAll('-', '').slice(0, 8)
const code = `ZZ${parseInt(tag, 16)}-001`
const raw = { id: `${code}_legacy`, code, name: 'Carte de test', type: 'PERSONNAGE', power: '1000', rarity: 'C', image: `https://fr.onepiece-cardgame.com/images/cardlist/card/${code}.webp`, extension: 'Extension de test [ZZ-01]', effect: 'Piochez 1 carte.' }
const catalog = rebuild([{ raw, source: { file: `fixture-${tag}`, setCode: 'ZZ-01' } }, { raw, source: { file: `fixture-reprint-${tag}`, setCode: 'ZZ-02' } }, { raw: { ...raw, id: `${code}_p1`, image: raw.image.replace('.webp', '_p1.webp') }, source: { file: `fixture-alt-${tag}`, setCode: 'ZZ-01' } }]).catalog
let userId: string; let openingId: string
async function protectedRows() {
  return db.$transaction(async tx => ({
    cards: await tx.card.findMany({ orderBy: { id: 'asc' } }),
    collection: await tx.userCard.findMany({ orderBy: { id: 'asc' } }),
    decks: await tx.deck.findMany({ orderBy: { id: 'asc' } }),
    versions: await tx.deckVersion.findMany({ orderBy: { id: 'asc' } }),
    deckCards: await tx.deckCard.findMany({ orderBy: { id: 'asc' } }),
    openings: await tx.boosterOpening.findMany({ orderBy: { id: 'asc' } }),
    openingCards: await tx.boosterOpeningCard.findMany({ orderBy: { id: 'asc' } }),
    favorites: await tx.favoriteCard.findMany({ orderBy: { id: 'asc' } }),
    rules: await tx.setRules.findMany({ orderBy: { id: 'asc' } }),
  }))
}
before(async () => {
  await seedBoosters(db)
  userId = (await db.user.create({ data: { email: `catalog-${tag}@example.test` } })).id
  await db.card.create({ data: { id: raw.id, code, name: 'Original legacy name', type: 'CHARACTER', color: 'Red', cost: 1, power: 1000, rarity: 'C', imageUrl: raw.image } })
  await db.userCard.create({ data: { userId, cardId: raw.id, quantity: 7 } })
  await db.deck.create({ data: { name: `Catalogue reference ${tag}`, userId, versions: { create: { name: 'Legacy', cards: { create: { cardId: raw.id, quantity: 4 } } } } } })
  openingId = (await openBooster(db, userId, 'OP-999991', randomUUID())).opening.id
})
after(async () => db.$disconnect())
test('additive schema preparation preserves every existing player/card/rules row', async () => {
  const before = await protectedRows(); await prepareSchema(db); assert.deepEqual(await protectedRows(), before)
})
test('dry run performs no writes and reports exact legacy mapping without reassignment', async () => {
  const before = await protectedRows(); const p = await previewImport(db, catalog)
  assert.equal(p.playerRowsAffected, 0); assert.equal(p.legacyCardRowsUpdated, 0)
  assert.ok(p.legacyMappings.some(m => (m as { legacyId: string }).legacyId === raw.id))
  assert.deepEqual(await protectedRows(), before)
})
test('transaction failure leaves no catalogue identity, variant or successful run', async () => {
  await assert.rejects(importCatalog(db, catalog, 1), /Injected/)
  const rows = await db.$queryRaw<{ count: bigint }[]>`SELECT count(*) FROM "CatalogVariant" WHERE "number"=${code}`
  assert.equal(Number(rows[0].count), 0)
})
test('two identical and concurrent imports create exactly two variants, three memberships, one receipt', async () => {
  const before = await protectedRows()
  const results = await Promise.all([importCatalog(db, catalog), importCatalog(db, catalog)])
  assert.equal(results.filter(r => r.replayed).length, 1)
  assert.equal((await importCatalog(db, catalog)).replayed, true)
  const rows = await db.$queryRaw<{ count: bigint }[]>`SELECT count(*) FROM "CatalogVariant" WHERE "number"=${code}`
  assert.equal(Number(rows[0].count), 2)
  const links = await db.$queryRaw<{ count: bigint }[]>`SELECT count(*) FROM "CatalogMembership" m JOIN "CatalogVariant" v ON v."key"=m."variantKey" WHERE v."number"=${code}`
  assert.equal(Number(links[0].count), 3)
  assert.deepEqual(await protectedRows(), before)
  assert.equal((await previewImport(db, catalog)).variantsToUpdate.length, 0, 'Repeated dry-run must not report fictitious changes from JSONB key order')
})
test('partial later import cannot remove earlier art, reprints, translations or legacy links', async () => {
  const before = await protectedRows()
  const partial = rebuild([{ raw: { ...raw, name: 'Test', effect: '', image: '' }, source: { file: `partial-${tag}`, setCode: 'ZZ-01', language: 'en' } }]).catalog
  await importCatalog(db, partial)
  const rows = await db.$queryRaw<{ payload: typeof catalog.variants[number] }[]>`SELECT "payload" FROM "CatalogVariant" WHERE "key"=${catalog.variants.find(v => v.artToken === 'standard')!.key}`
  assert.equal(rows[0].payload.extensions.length, 2); assert.equal(rows[0].payload.images.length, 1)
  assert.equal(rows[0].payload.text.effect.fr, 'Piochez 1 carte.')
  const links = await db.$queryRaw<{ count: bigint }[]>`SELECT count(*) FROM "CatalogLegacyLink" WHERE "cardId"=${raw.id}`
  assert.equal(Number(links[0].count), 1)
  assert.deepEqual(await protectedRows(), before)
})
test('recorded opening and existing deck references remain identical after catalogue imports', async () => {
  assert.ok(await getOpening(db, userId, openingId))
  assert.equal((await db.userCard.findUniqueOrThrow({ where: { userId_cardId: { userId, cardId: raw.id } } })).quantity, 7)
  assert.equal((await db.deckCard.findMany({ where: { cardId: raw.id } }))[0].quantity, 4)
  assert.equal((await db.card.findUniqueOrThrow({ where: { id: raw.id } })).name, 'Original legacy name')
})
