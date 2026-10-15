import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { economyAt, parisDay, parisDayStart } from '../src/lib/economy/config'
import { BerryError, claimDailyTreasure, claimGameReward, getWallet } from '../src/lib/economy/ledger'
import { previewResale, sellDuplicates } from '../src/lib/economy/resale'
import { openBooster, openBoosters } from '../src/lib/boosters/service'
import { BoosterError } from '../src/lib/boosters/rules'

// Isolated database only: catalogue restored from the latest backup, synthetic players, no real account.
const url = new URL(process.env.DATABASE_URL || 'invalid://')
if (url.hostname !== '127.0.0.1' || url.port !== '55433' || url.pathname !== '/op_berries_test') throw new Error('Only the isolated op_berries_test on 127.0.0.1:55433 is permitted')
const db = new PrismaClient()
const economy = economyAt()
const player = async () => (await db.user.create({ data: { email: `berries-${randomUUID()}@example.test`, name: 'Synthetic' } })).id
const balance = async (id: string) => (await db.user.findUniqueOrThrow({ where: { id }, select: { berries: true } })).berries
const ledgerSum = async (id: string) => (await db.berryTransaction.aggregate({ where: { userId: id }, _sum: { amount: true } }))._sum.amount ?? 0
const code = (c: string) => (e: unknown) => (e instanceof BerryError || e instanceof BoosterError) && e.code === c
after(async () => db.$disconnect())
before(async () => { assert.ok(await db.card.count() > 1000, 'catalogue restored') })

test('the starting purse is granted once, even to concurrent first visits, and the ledger matches the balance', async () => {
  const id = await player()
  await Promise.all(Array.from({ length: 6 }, () => getWallet(db, id)))
  assert.equal(await balance(id), economy.starterGrant)
  assert.equal(await db.berryTransaction.count({ where: { userId: id, reason: 'STARTER_GRANT' } }), 1)
  assert.equal(await ledgerSum(id), await balance(id))
})

test('the daily treasure pays once per Paris day', async () => {
  const id = await player()
  const first = await claimDailyTreasure(db, id), again = await claimDailyTreasure(db, id)
  assert.equal(first.replayed, false); assert.equal(again.replayed, true)
  assert.equal(await balance(id), economy.starterGrant + economy.rewards.dailyTreasure)
  assert.equal((await getWallet(db, id)).today.treasureClaimed, true)
  const tomorrow = new Date(parisDayStart().getTime() + 26 * 3600_000)
  assert.notEqual(parisDay(tomorrow), parisDay())
  assert.equal((await claimDailyTreasure(db, id, tomorrow)).replayed, false)
})

test('a booster costs its price in the same transaction; a replay pays nothing more; an empty purse credits nothing', async () => {
  const id = await player(), key = randomUUID()
  const first = await openBooster(db, id, 'OP-05', key)
  assert.equal(await balance(id), economy.starterGrant - economy.prices.booster)
  const row = await db.boosterOpening.findUniqueOrThrow({ where: { id: first.opening.id } })
  assert.ok(row.berryTransactionId)
  await openBooster(db, id, 'OP-05', key)
  assert.equal(await balance(id), economy.starterGrant - economy.prices.booster)
  // Spend the rest with a batch, then one more pack is refused without any card.
  const left = Math.floor(await balance(id) / economy.prices.booster)
  for (let i = 0; i < left; i++) await openBooster(db, id, 'OP-05', randomUUID())
  const cards = await db.userCard.aggregate({ where: { userId: id }, _sum: { quantity: true } })
  await assert.rejects(openBooster(db, id, 'OP-05', randomUUID()), code('INSUFFICIENT_BERRIES'))
  assert.deepEqual(await db.userCard.aggregate({ where: { userId: id }, _sum: { quantity: true } }), cards)
  assert.equal(await ledgerSum(id), await balance(id))
})

test('a batch is paid pack by pack and refused as a whole when the purse is short', async () => {
  const id = await player()
  await openBoosters(db, id, 'OP-01', randomUUID(), 5)
  assert.equal(await balance(id), economy.starterGrant - 5 * economy.prices.booster)
  const openings = await db.boosterOpening.count({ where: { userId: id } })
  await assert.rejects(openBoosters(db, id, 'OP-01', randomUUID(), 10), code('INSUFFICIENT_BERRIES'))
  assert.equal(await db.boosterOpening.count({ where: { userId: id } }), openings)
  assert.equal(await balance(id), economy.starterGrant - 5 * economy.prices.booster)
})

async function game(userId: string, over: { level?: string; won?: boolean; turns?: number; concession?: boolean; finishedAt?: Date } = {}) {
  const human = 'P1', bot = 'P2', won = over.won ?? true
  const row = await db.engineGame.create({ data: { userId, status: 'FINISHED', humanSeat: human, botSeat: bot, deckRef: 'test', botDeckRef: 'test', botLevel: over.level ?? 'normal', rulesetId: 'test', engineVersion: 'test', version: 1,
    state: { players: [{ id: human, turns: over.turns ?? 6 }, { id: bot, turns: over.turns ?? 6 }] }, result: { reason: over.concession ? 'CONCESSION' : 'LEADER_DAMAGED_AT_ZERO_LIFE', winnerId: won ? human : bot, loserIds: [won ? bot : human] }, finishedAt: over.finishedAt ?? new Date() } })
  return row.id
}

test('a finished game pays by level, doubled on a win, once, and never for a concession, a short game or yesterday', async () => {
  const id = await player()
  const win = await claimGameReward(db, id, await game(id, { level: 'hard', won: true }))
  assert.equal(win.amount, economy.rewards.botGame.hard * economy.rewards.winMultiplier)
  const loss = await claimGameReward(db, id, await game(id, { level: 'easy', won: false }))
  assert.equal(loss.amount, economy.rewards.botGame.easy)
  const replay = await claimGameReward(db, id, (await db.berryTransaction.findFirstOrThrow({ where: { userId: id, reason: 'BOT_GAME' }, orderBy: { createdAt: 'asc' } })).idempotencyKey.slice(5))
  assert.equal(replay.replayed, true)
  await assert.rejects(claimGameReward(db, id, await game(id, { concession: true, won: false })), code('CONCEDED'))
  await assert.rejects(claimGameReward(db, id, await game(id, { turns: 2 })), code('GAME_TOO_SHORT'))
  await assert.rejects(claimGameReward(db, id, await game(id, { finishedAt: new Date(parisDayStart().getTime() - 3600_000) })), code('GAME_TOO_OLD'))
  const other = await player()
  await assert.rejects(claimGameReward(db, other, await game(id)), code('GAME_NOT_FOUND'))
})

test('game rewards stop at the daily cap, the last one being trimmed', async () => {
  const id = await player(), each = economy.rewards.botGame.hard * economy.rewards.winMultiplier
  let earned = 0
  for (let i = 0; i < Math.ceil(economy.rewards.dailyGameCap / each); i++) earned += (await claimGameReward(db, id, await game(id, { level: 'hard' }))).amount
  assert.equal(earned, economy.rewards.dailyGameCap)
  await assert.rejects(claimGameReward(db, id, await game(id, { level: 'hard' })), code('DAILY_CAP'))
})

test('resale sells only copies above the kept count (more when a deck uses them), once per key', async () => {
  const id = await player()
  const [common, rare] = await db.card.findMany({ where: { setCode: 'OP-01', rarity: { in: ['C', 'SR'] }, isAltArt: false }, orderBy: [{ rarity: 'asc' }, { id: 'asc' }], distinct: ['rarity'], take: 2 })
  await db.userCard.createMany({ data: [{ userId: id, cardId: common.id, quantity: 7 }, { userId: id, cardId: rare.id, quantity: 6 }] })
  const deck = await db.deck.create({ data: { name: 'Test', userId: id, versions: { create: { name: 'v1', cards: { create: { cardId: rare.id, quantity: 5 } } } } } })
  const preview = await previewResale(db, id)
  const unit = (r: string) => economy.resale.values[r]
  assert.deepEqual(preview.items.map(i => [i.cardId, i.extra]).sort(), [[common.id, 3], [rare.id, 1]].sort())
  assert.equal(preview.total, 3 * unit(common.rarity) + unit(rare.rarity))
  const key = randomUUID(), sold = await sellDuplicates(db, id, key), again = await sellDuplicates(db, id, key)
  assert.equal(sold.amount, preview.total); assert.equal(again.replayed, true)
  assert.equal((await db.userCard.findFirstOrThrow({ where: { userId: id, cardId: common.id } })).quantity, economy.resale.keepCopies)
  assert.equal((await db.userCard.findFirstOrThrow({ where: { userId: id, cardId: rare.id } })).quantity, 5)
  await assert.rejects(sellDuplicates(db, id, randomUUID()), code('NOTHING_TO_SELL'))
  assert.equal(await ledgerSum(id), await balance(id))
  assert.ok(deck.id)
})

test('the database refuses a negative balance even outside the service', async () => {
  const id = await player()
  await assert.rejects(db.user.update({ where: { id }, data: { berries: -1 } }))
})

test('single packs walk through one virtual display: exactly 2 alternates, 7 SR, 8 Leaders over 24 packs, then a new box', async () => {
  const id = await player()
  await db.user.update({ where: { id }, data: { berries: 100_000 } })
  const openings = []
  for (let i = 0; i < 24; i++) openings.push((await openBooster(db, id, 'OP-05', randomUUID())).opening)
  const rows = await db.boosterOpening.findMany({ where: { userId: id }, select: { displayId: true, displayIndex: true } })
  assert.equal(new Set(rows.map(r => r.displayId)).size, 1)
  assert.deepEqual(rows.map(r => r.displayIndex).sort((a, b) => a! - b!), Array.from({ length: 24 }, (_, i) => i))
  const box = await db.virtualDisplay.findFirstOrThrow({ where: { userId: id } })
  assert.ok(box.completedAt); assert.equal(box.nextIndex, 24)
  const last2 = openings.flatMap(o => o.cards.slice(10))
  assert.equal(last2.filter(c => c.drawTier === 'ALT').length, 2)
  assert.equal(openings.filter(o => o.cards[11].drawTier === 'SR').length, 7)
  assert.equal(openings.filter(o => o.cards[10].drawTier === 'L').length, 8)
  await openBooster(db, id, 'OP-05', randomUUID())
  assert.equal(await db.virtualDisplay.count({ where: { userId: id } }), 2)
})

test('a display is a fresh box paid once at the display price, without touching the open box of single packs', async () => {
  const id = await player()
  await db.user.update({ where: { id }, data: { berries: 50_000 } })
  await openBooster(db, id, 'OP-09', randomUUID())
  const open = await db.virtualDisplay.findFirstOrThrow({ where: { userId: id, completedAt: null } })
  const before = await balance(id), key = randomUUID()
  const display = await openBoosters(db, id, 'OP-09', key, 24)
  assert.equal(display.openings.length, 24)
  assert.equal(await balance(id), before - economy.prices.display)
  assert.equal(display.openings.flatMap(o => o.cards.slice(10)).filter(c => c.drawTier === 'ALT').length, 2)
  assert.equal((await db.virtualDisplay.findUniqueOrThrow({ where: { id: open.id } })).nextIndex, 1)
  const again = await openBoosters(db, id, 'OP-09', key, 24)
  assert.equal(again.replayed, true); assert.equal(await balance(id), before - economy.prices.display)
  assert.equal(await db.berryTransaction.count({ where: { userId: id, reason: 'DISPLAY_PURCHASE' } }), 1)
})

test('a display above the balance credits nothing and creates no box', async () => {
  const id = await player()
  const boxes = await db.virtualDisplay.count({ where: { userId: id } })
  await assert.rejects(openBoosters(db, id, 'OP-09', randomUUID(), 24), code('INSUFFICIENT_BERRIES'))
  assert.equal(await db.virtualDisplay.count({ where: { userId: id } }), boxes)
  assert.equal(await db.boosterOpening.count({ where: { userId: id } }), 0)
})
