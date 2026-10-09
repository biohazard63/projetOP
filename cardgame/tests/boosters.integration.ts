import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID, createHash } from 'node:crypto'
import { Prisma } from '@prisma/client'
import { isolatedBoosterDb, seedBoosters } from './seed-boosters'
import { openBooster, getOpening, getBoosterCatalog } from '../src/lib/boosters/service'
import { BoosterError } from '../src/lib/boosters/rules'
const db = isolatedBoosterDb()
const tag = randomUUID(); let userId: string
const canonical = (code: string) => `simulation:${createHash('sha256').update(code).digest('hex')}`
before(async () => { await seedBoosters(db); userId = (await db.user.create({ data: { email: `booster-integration-${tag}@example.test`, name: 'Synthetic booster user' } })).id })
after(async () => db.$disconnect())
const errorCode = (code: string) => (e: unknown) => e instanceof BoosterError && e.code === code
async function quantity(id = userId) { return (await db.userCard.aggregate({ where: { userId: id }, _sum: { quantity: true } }))._sum.quantity || 0 }

test('catalog explicitly distinguishes eligible, empty and incomplete extensions', async () => {
 const catalog = await getBoosterCatalog(db)
 assert.equal(catalog.find(c => c.code === 'OP-TEST')?.packSize, 12)
 assert.equal(catalog.find(c => c.code === 'OP-TEST')?.available, true)
 for (const code of ['OP-EMPTY', 'OP-INCOMPLETE']) assert.equal(catalog.find(c => c.code === code)?.available, false)
})
test('server draw atomically persists ordered cards, receipt and exact collection quantities', async () => {
 const key = randomUUID(); const before = await quantity()
 const { opening } = await openBooster(db, userId, 'OPTEST', key)
 assert.equal(opening.cards.length, 12); assert.ok(opening.creditedAt)
 assert.deepEqual(opening.cards.map(c => c.position), Array.from({ length: 12 }, (_, i) => i + 1))
 assert.equal(await quantity(), before + 12)
 assert.ok(opening.cards.every(c => c.setCode === 'OP-TEST'))
 assert.ok(opening.cards.some(c => c.isDuplicate), 'duplicates within a pack are identified')
 const row = await db.boosterOpening.findUniqueOrThrow({ where: { id: opening.id }, include: { cards: true } })
 assert.equal(row.cards.length, 12); assert.ok(row.rulesSnapshot); assert.deepEqual(row.resultSnapshot, JSON.parse(JSON.stringify(opening)))
 const quantities = new Map<string, number>()
 for (const card of opening.cards) quantities.set(card.id, (quantities.get(card.id) || 0) + 1)
 for (const [cardId, count] of quantities) assert.equal((await db.userCard.findUniqueOrThrow({ where: { userId_cardId: { userId, cardId } } })).quantity, count)
})
test('10 concurrent requests with the same key produce exactly one opening and one credit', async () => {
 const key = randomUUID(); const before = await quantity()
 const results = await Promise.all(Array.from({ length: 10 }, () => openBooster(db, userId, 'OP-TEST', key)))
 assert.equal(new Set(results.map(r => r.opening.id)).size, 1)
 assert.equal(results.filter(r => !r.replayed).length, 1)
 for (const result of results) assert.deepEqual(result.opening, results[0].opening)
 assert.equal(await quantity(), before + 12)
 assert.equal(await db.boosterOpening.count({ where: { userId, idempotencyKey: key } }), 1)
 const replay = await openBooster(db, userId, 'OP-TEST', key)
 assert.equal(replay.replayed, true); assert.equal(await quantity(), before + 12)
 await assert.rejects(openBooster(db, userId, 'OP-OTHER', key), errorCode('IDEMPOTENCY_CONFLICT'))
})
test('8 concurrent distinct operations credit every opening without lost increments', async () => {
 const before = await quantity()
 const results = await Promise.all(Array.from({ length: 8 }, () => openBooster(db, userId, 'OP-TEST', randomUUID())))
 assert.equal(new Set(results.map(r => r.opening.id)).size, 8)
 assert.equal(await quantity(), before + 96)
})
test('unknown users, empty and incomplete sets never receive cards or opening records', async () => {
 const before = await quantity(); const count = await db.boosterOpening.count({ where: { userId } })
 await assert.rejects(openBooster(db, 'nonexistent-user', 'OP-TEST', randomUUID()), errorCode('USER_NOT_FOUND'))
 await assert.rejects(openBooster(db, userId, 'OP-EMPTY', randomUUID()), errorCode('EMPTY_SET'))
 await assert.rejects(openBooster(db, userId, 'OP-INCOMPLETE', randomUUID()), errorCode('INCOMPLETE_SET'))
 assert.equal(await quantity(), before); assert.equal(await db.boosterOpening.count({ where: { userId } }), count)
})
test('history is owned, immutable across card edits, and no longer cascades on card deletion', async () => {
 const { opening } = await openBooster(db, userId, 'OP-TEST', randomUUID())
 assert.equal(await getOpening(db, 'other-user', opening.id), null)
 const card = opening.cards[0]
 await db.card.update({ where: { id: card.id }, data: { name: `Edited ${tag}` } })
 try { assert.deepEqual(await getOpening(db, userId, opening.id), opening) }
 finally { await db.card.update({ where: { id: card.id }, data: { name: card.name } }) }
 await assert.rejects(db.card.delete({ where: { id: card.id } }), (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003')
})
test('an injected collection failure rolls back the entire opening; the same key then succeeds', async () => {
 const victim = await db.user.create({ data: { email: `rollback-${tag}@example.test` } }); const key = randomUUID()
 // Test-only DDL in the guarded isolated database. Reject only this synthetic user.
 await db.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION booster_test_fail_credit() RETURNS trigger AS $$ BEGIN IF NEW."userId" = '${victim.id}' THEN RAISE EXCEPTION 'synthetic failure'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql`)
 await db.$executeRawUnsafe('CREATE TRIGGER booster_test_fail_credit BEFORE INSERT OR UPDATE ON "UserCard" FOR EACH ROW EXECUTE FUNCTION booster_test_fail_credit()')
 try {
  await assert.rejects(openBooster(db, victim.id, 'OP-TEST', key))
  assert.equal(await quantity(victim.id), 0)
  assert.equal(await db.boosterOpening.count({ where: { userId: victim.id } }), 0)
 } finally {
  await db.$executeRawUnsafe('DROP TRIGGER booster_test_fail_credit ON "UserCard"')
  await db.$executeRawUnsafe('DROP FUNCTION booster_test_fail_credit()')
 }
 await openBooster(db, victim.id, 'OP-TEST', key)
 assert.equal(await quantity(victim.id), 12)
})
test('a price requirement is rejected rather than inventing a payment or ignoring it', async () => {
 const code = `PAID-${tag}`
 await db.cardSet.create({ data: { code, name: 'Synthetic paid test', releaseDate: new Date() } })
 await db.booster.create({ data: { id: canonical(code), setCode: code, name: 'Paid fixture', price: 10 } })
 await assert.rejects(openBooster(db, userId, code, randomUUID()), errorCode('PAID_BOOSTER_UNSUPPORTED'))
})
test('legacy history is readable without retroactive credit or guessed duplicate state', async () => {
 const booster = await db.booster.findUniqueOrThrow({ where: { id: canonical('OP-TEST') } })
 const before = await quantity()
 const row = await db.boosterOpening.create({ data: { userId, boosterId: booster.id, cards: { create: { cardId: 'booster-test-OP-TEST-C-0', position: 1 } } } })
 const result = await getOpening(db, userId, row.id)
 assert.equal(result?.legacy, true); assert.equal(result?.creditedAt, null); assert.equal(result?.cards[0].isDuplicate, null)
 assert.equal(await quantity(), before)
})

test('BoosterCard configured weights control eligibility and reject foreign-set links', async () => {
 const code = `WEIGHTS-${tag}`
 await db.cardSet.create({ data: { code, name: 'Weighted synthetic set', releaseDate: new Date() } })
 await db.setRules.create({ data: { code, name: code, rarityCounts: {}, typeCounts: {}, boosterRules: { version: 1, label: 'Test weights', source: 'Synthetic fixture', slots: [{ choices: [{ rarity: 'R', weight: 1 }] }] } } })
 for (const id of ['zero', 'eligible']) await db.card.create({ data: { id: `${id}-${tag}`, code: `${id}-${tag}`, name: id, rarity: 'R', type: 'CHARACTER', color: 'RED', cost: 1, imageUrl: '/images/card-back.jpg', setCode: code } })
 const booster = await db.booster.create({ data: { id: canonical(code), name: code, setCode: code, price: 0, cards: { create: [{ cardId: `zero-${tag}`, probability: 0 }, { cardId: `eligible-${tag}`, probability: 5 }] } } })
 const result = await openBooster(db, userId, code, randomUUID())
 assert.equal(result.opening.cards[0].id, `eligible-${tag}`)
 await db.boosterCard.create({ data: { boosterId: booster.id, cardId: 'booster-test-OP-OTHER-R-0', probability: 1 } })
 await assert.rejects(openBooster(db, userId, code, randomUUID()), errorCode('FOREIGN_CARD'))
})

test('operation keys are scoped to the user and exact extensions cannot collide through aliases', async () => {
 const second = await db.user.create({ data: { email: `key-owner-${tag}@example.test` } })
 const key = randomUUID()
 const first = await openBooster(db, userId, 'OP-TEST', key)
 const other = await openBooster(db, second.id, 'OP-TEST', key)
 assert.notEqual(first.opening.id, other.opening.id); assert.equal(await quantity(second.id), 12)
 const code = `ALIAS-${tag}`.toUpperCase(); const alias = code.replace(/-/g, '')
 for (const setCode of [code, alias]) await db.cardSet.create({ data: { code: setCode, name: 'Alias collision fixture', releaseDate: new Date() } })
 await db.setRules.create({ data: { code, name: code, rarityCounts: {}, typeCounts: {}, boosterRules: { version: 1, label: 'Alias test', source: 'Synthetic fixture', slots: [{ choices: [{ rarity: 'C', weight: 1 }] }] } } })
 await db.card.create({ data: { id: code, code, name: code, rarity: 'C', type: 'CHARACTER', color: 'RED', cost: 1, imageUrl: '/images/card-back.jpg', setCode: code } })
 const aliasKey = randomUUID(); await openBooster(db, userId, code, aliasKey)
 await assert.rejects(openBooster(db, userId, alias, aliasKey), errorCode('IDEMPOTENCY_CONFLICT'))
})
