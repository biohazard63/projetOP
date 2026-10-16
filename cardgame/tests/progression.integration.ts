import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { syncProgress } from '../src/lib/progression/service'
import { PROGRESSION, levelReward, rankOf } from '../src/lib/progression/config'
import { economyAt } from '../src/lib/economy/config'
import { openBooster } from '../src/lib/boosters/service'

// Isolated database only (catalogue restored from the latest backup, synthetic players).
const url = new URL(process.env.DATABASE_URL || 'invalid://')
if (url.hostname !== '127.0.0.1' || url.port !== '55433' || url.pathname !== '/op_berries_test') throw new Error('Only the isolated op_berries_test on 127.0.0.1:55433 is permitted')
const db = new PrismaClient()
after(async () => db.$disconnect())
const player = async (berries = 0) => (await db.user.create({ data: { email: `progress-${randomUUID()}@example.test`, name: 'Synthetic', berries } })).id
const balance = async (id: string) => (await db.user.findUniqueOrThrow({ where: { id } })).berries
const ledgerSum = async (id: string) => (await db.berryTransaction.aggregate({ where: { userId: id }, _sum: { amount: true } }))._sum.amount ?? 0
async function game(userId: string, o: { level?: string; win?: boolean; turns?: number; life?: number; concede?: boolean } = {}) {
  const win = o.win ?? true
  await db.engineGame.create({ data: { userId, status: 'FINISHED', humanSeat: 'P1', botSeat: 'P2', deckRef: 't', botDeckRef: 't', botLevel: o.level ?? 'normal', rulesetId: 't', engineVersion: 't', version: 1, finishedAt: new Date(),
    state: { players: [{ id: 'P1', turns: o.turns ?? 8, zones: { life: Array(o.life ?? 2).fill('x') } }, { id: 'P2', turns: 8, zones: { life: [] } }] },
    result: { reason: o.concede ? 'CONCESSION' : 'LEADER_DAMAGED_AT_ZERO_LIFE', winnerId: win ? 'P1' : 'P2', loserIds: [win ? 'P2' : 'P1'] } } })
}

test('a new player has nothing to unlock and a sync is idempotent', async () => {
  const id = await player()
  const first = await syncProgress(db, id), again = await syncProgress(db, id)
  assert.deepEqual(first.unlocks, []); assert.deepEqual(again.unlocks, [])
  assert.equal(first.progress.account.level, 1); assert.equal(first.progress.account.title, 'Mousse')
  assert.ok(first.progress.secrets.every(s => !s.unlocked && s.name === '???'))
})

test('opening 5 boosters unlocks Pilleur Bronze I once, pays it and the account levels reached', async () => {
  const id = await player(100_000)
  for (let i = 0; i < 5; i++) await openBooster(db, id, 'OP-05', randomUUID())
  const before = await balance(id), sync = await syncProgress(db, id)
  const pilleur = sync.unlocks.filter(u => u.id === 'pilleur')
  assert.deepEqual(pilleur.map(u => u.label), ['Bronze I'])
  const paid = sync.unlocks.reduce((n, u) => n + u.berries, 0)
  assert.equal(await balance(id), before + paid)
  assert.ok(sync.progress.account.level >= 2, `level ${sync.progress.account.level}`)
  assert.equal((await syncProgress(db, id)).unlocks.length, 0)
  assert.equal(await balance(id), before + paid)
  assert.equal(await ledgerSum(id) + 100_000, await balance(id), 'every credit and debit is in the ledger (the 100 000 ฿ are seeded directly)')
  const view = sync.progress.badges.find(b => b.id === 'pilleur')!
  assert.equal(view.nextLabel, 'Bronze II'); assert.equal(view.next, 15); assert.equal(view.value, 5)
})

test('every reached level of a badge is paid, not only the last one', async () => {
  const id = await player()
  for (let i = 0; i < 10; i++) await game(id, { level: 'hard' })
  const sync = await syncProgress(db, id)
  const yonko = sync.unlocks.filter(u => u.id === 'yonko').map(u => u.label)
  assert.deepEqual(yonko, ['Bronze I', 'Bronze II', 'Bronze III', 'Argent I', 'Argent II'])
  const paid = await db.berryTransaction.findMany({ where: { userId: id, idempotencyKey: { startsWith: 'badge:yonko:' } } })
  assert.equal(paid.reduce((n, t) => n + t.amount, 0), [1, 2, 3, 4, 5].reduce((n, l) => n + rankOf(l).reward, 0))
})

test('secret badges: easy loss, blitz, remontada, 5 concessions and a full purse', async () => {
  const id = await player(150_000)
  await game(id, { level: 'easy', win: false })
  await game(id, { turns: 5 })
  await game(id, { life: 0 })
  for (let i = 0; i < 5; i++) await game(id, { win: false, concede: true })
  const sync = await syncProgress(db, id)
  const secrets = sync.unlocks.filter(u => u.kind === 'secret').map(u => u.id).sort()
  assert.deepEqual(secrets, ['blitz', 'pacifiste', 'radin', 'remontada', 'tel-est-pris'])
  assert.ok(sync.progress.secrets.filter(s => s.unlocked).every(s => s.name !== '???'))
  assert.equal((await syncProgress(db, id)).unlocks.filter(u => u.kind === 'secret').length, 0)
  assert.equal(await db.berryTransaction.count({ where: { userId: id, idempotencyKey: { startsWith: 'secret:' } } }), 5)
})

test('account levels are each paid once, with the bigger rewards every 5 and 10 levels', async () => {
  const id = await player()
  for (let i = 0; i < 60; i++) await game(id, { level: 'hard' })
  const sync = await syncProgress(db, id), levels = sync.unlocks.filter(u => u.kind === 'level')
  assert.ok(levels.length >= 5, `${levels.length} levels`)
  for (const l of levels) assert.equal(l.berries, levelReward(Number(l.id.slice(6))))
  const user = await db.user.findUniqueOrThrow({ where: { id } })
  assert.equal(user.accountLevel, sync.progress.account.level)
  assert.equal(await db.berryTransaction.count({ where: { userId: id, reason: 'LEVEL' } }), sync.progress.account.level - 1)
  assert.equal(PROGRESSION.ranks.length, 5); assert.ok(economyAt().prices.display <= rankOf(13).reward)
})
