import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { PrismaGameRepository } from '../src/lib/engine/repository'
import { PlayService, HUMAN_SEAT } from '../src/lib/engine/service'
import { playHandlers, PrismaDeckSource } from '../src/lib/engine/http'
import { botIntent } from '../src/lib/engine/bot'
import { getLegalActions } from '../src/game/core/game'

// M4-I3 Prisma contract on an ISOLATED database only:
// DATABASE_URL=postgresql://mugiwara@127.0.0.1:55433/op_play_test node --import tsx --test tests/play.integration.ts
const target = new URL(process.env.DATABASE_URL || 'invalid://')
if (target.hostname !== '127.0.0.1' || target.port !== '55433' || target.pathname !== '/op_play_test') throw new Error('Isolated database required')
const db = new PrismaClient()
const repo = new PrismaGameRepository(db), play = new PlayService(repo)

test.before(async () => {
  const [row] = await db.$queryRaw<{ db: string; port: number }[]>`select current_database() as db, inet_server_port() as port`
  assert.deepEqual({ db: row.db, port: Number(row.port) }, { db: 'op_play_test', port: 55433 }, 'connected to the isolated database')
})
test.after(async () => { await db.$disconnect() })
async function makeUser() { return db.user.create({ data: { email: `play-${randomUUID()}@example.test`, name: 'Play fixture' } }) }

test('M4-I3 (PostgreSQL): compare-and-set lets exactly one of two concurrent writers win', async () => {
  const user = await makeUser()
  const view = await play.start(user.id, { ref: 'reference-purple', entries: (await import('../src/lib/engine/decks')).REFERENCE_DECKS[0].entries })
  const stored = (await repo.findById(view.gameId))!
  const next = { version: stored.version + 1, state: stored.state, status: stored.status, result: null }
  const results = await Promise.all([repo.commit(stored.id, stored.version, next, [{ seq: 900, commandId: 'race-a', actorSeat: HUMAN_SEAT, type: 'TEST', payload: {}, resultVersion: next.version }]),
    repo.commit(stored.id, stored.version, next, [{ seq: 901, commandId: 'race-b', actorSeat: HUMAN_SEAT, type: 'TEST', payload: {}, resultVersion: next.version }])])
  assert.deepEqual(results.sort(), [false, true])
  assert.equal((await db.engineCommand.count({ where: { gameId: stored.id, commandId: { in: ['race-a', 'race-b'] } } })), 1, 'the losing transaction left no command')
  assert.equal((await repo.findById(stored.id))!.version, stored.version + 1)
})

test('M4-I3 (PostgreSQL): a game is created once, played through the handlers, resumed by a new client and conceded', async () => {
  const user = await makeUser()
  const source = new PrismaDeckSource(db)
  const created = await playHandlers.start(user.id, { deck: { kind: 'reference', id: 'reference-red' } }, play, source)
  assert.equal(created.status, 201)
  assert.equal((await playHandlers.start(user.id, { deck: { kind: 'reference', id: 'reference-red' } }, play, source)).status, 409, 'one active game per user')
  let view = (created.body as { game: { gameId: string; version: number; status: string } }).game
  for (let n = 0; n < 40 && view.status === 'ACTIVE'; n++) {
    const state = (await repo.findById(view.gameId))!.state
    const reply = await playHandlers.command(user.id, view.gameId, { id: `h-${view.version}`, expectedVersion: view.version, intent: botIntent(state, HUMAN_SEAT, getLegalActions(state, HUMAN_SEAT)) }, play)
    assert.equal(reply.status, 200, JSON.stringify(reply.body)); view = (reply.body as { game: typeof view }).game
  }
  const other = new PrismaClient(), fresh = new PlayService(new PrismaGameRepository(other))
  const resumed = (await playHandlers.active(user.id, fresh)).body as { game: { version: number; gameId: string } }
  assert.equal(resumed.game.version, view.version); assert.equal(resumed.game.gameId, view.gameId)
  await other.$disconnect()
  const row = await db.engineGame.findUniqueOrThrow({ where: { id: view.gameId }, include: { commands: { orderBy: { seq: 'asc' } } } })
  assert.equal(row.commands.length, (row.state as { commands: unknown[] }).commands.length)
  assert.deepEqual(row.commands.map(c => c.seq), row.commands.map((_, i) => i + 1))
  const conceded = await playHandlers.concede(user.id, view.gameId, { id: 'stop' }, play)
  assert.equal((conceded.body as { game: { status: string } }).game.status, 'FINISHED')
  const finished = await db.engineGame.findUniqueOrThrow({ where: { id: view.gameId } })
  assert.equal(finished.status, 'FINISHED'); assert.ok(finished.finishedAt); assert.equal((finished.result as { reason: string }).reason, 'CONCESSION')
})

test('M4-I3 (PostgreSQL): the stored user decks are read without any write', async () => {
  const user = await makeUser(), before = await Promise.all([db.deck.count(), db.card.count(), db.userCard.count(), db.coinTransaction.count()])
  const reply = await playHandlers.decks(user.id, new PrismaDeckSource(db))
  assert.equal(reply.status, 200)
  assert.deepEqual(await Promise.all([db.deck.count(), db.card.count(), db.userCard.count(), db.coinTransaction.count()]), before)
})

test('M5 (PostgreSQL): the bot level is stored, statistics are derived per user, owned-card compatibility is read-only', async () => {
  const user = await makeUser(), other = await makeUser()
  const created = await playHandlers.start(user.id, { deck: { kind: 'reference', id: 'reference-purple' }, botLevel: 'hard' }, play, new PrismaDeckSource(db))
  assert.equal(created.status, 201)
  const game = (created.body as { game: { gameId: string; botLevel: string } }).game
  assert.equal(game.botLevel, 'hard'); assert.equal((await db.engineGame.findUniqueOrThrow({ where: { id: game.gameId } })).botLevel, 'hard')
  await playHandlers.concede(user.id, game.gameId, { id: 'm5-stop' }, play)
  const stats = (await playHandlers.stats(user.id, play)).body as { stats: { played: number; losses: number; concessions: number; byLevel: Record<string, { played: number }> } }
  assert.deepEqual([stats.stats.played, stats.stats.losses, stats.stats.concessions, stats.stats.byLevel.hard.played], [1, 1, 1, 1])
  assert.equal(((await playHandlers.stats(other.id, play)).body as { stats: { played: number } }).stats.played, 0)
  const set = await db.cardSet.upsert({ where: { code: 'M5-TEST' }, update: {}, create: { code: 'M5-TEST', name: 'M5 fixture', releaseDate: new Date() } })
  const card = await db.card.create({ data: { id: `m5-${randomUUID()}`, code: 'ST04-009', name: 'Ginrummy', type: 'PERSONNAGE', color: 'Violet', cost: 1, power: 3000, counter: '1000', rarity: 'C', imageUrl: 'https://example.test/x.png', setCode: set.code } })
  await db.userCard.create({ data: { userId: user.id, cardId: card.id, quantity: 1 } })
  const before = await Promise.all([db.userCard.count(), db.coinTransaction.count(), db.deck.count()])
  const decks = (await playHandlers.decks(user.id, new PrismaDeckSource(db))).body as { collection: { owned: number; recognised: number; certified: number } }
  assert.deepEqual(decks.collection, { owned: 1, recognised: 1, certified: 1 })
  assert.deepEqual(await Promise.all([db.userCard.count(), db.coinTransaction.count(), db.deck.count()]), before)
})
