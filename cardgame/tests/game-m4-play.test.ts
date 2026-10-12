import test from 'node:test'
import assert from 'node:assert/strict'
import { MemoryGameRepository } from '../src/lib/engine/repository'
import { PlayService, HUMAN_SEAT, BOT_SEAT } from '../src/lib/engine/service'
import { playHandlers, type DeckSource, type UserDeck } from '../src/lib/engine/http'
import { botIntent } from '../src/lib/engine/bot'
import { engineCatalog, type PrismaCardRow } from '../src/lib/engine/catalog'
import { PURPLE_DECK } from '../src/game/cards/m3PurpleDeck'
import { getLegalActions } from '../src/game/core/game'
import type { GameState } from '../src/game/core/types'

// M4-I3/I4: server-side play service and /api/play handlers on an in-memory repository (the Prisma
// repository runs the same contract in tests/play.integration.ts against an isolated PostgreSQL).
const seeds = () => { let n = 1000; return () => ++n }
const service = (repo = new MemoryGameRepository()) => ({ repo, play: new PlayService(repo, seeds()) })
const noDecks: DeckSource = { userDecks: async () => [], cardRows: async () => [] }
let users = 0
const user = () => `user${++users}${Date.now().toString(36)}`
type View = { gameId: string; version: number; status: string; legalActions: { type: string }[]; projection: { result: unknown; players: { id: string; hand: unknown; counts: Record<string, number> }[] } }
async function started(play: PlayService, uid = user(), deck = 'reference-purple') {
  const reply = await playHandlers.start(uid, { deck: { kind: 'reference', id: deck } }, play, noDecks)
  assert.equal(reply.status, 201, JSON.stringify(reply.body))
  return { uid, game: (reply.body as { game: View }).game }
}
const stateOf = (repo: MemoryGameRepository, id: string) => repo.games.get(id)!.state
function strings(value: unknown, into = new Set<string>()): Set<string> {
  if (typeof value === 'string') into.add(value)
  else if (Array.isArray(value)) value.forEach(v => strings(v, into))
  else if (value && typeof value === 'object') Object.values(value).forEach(v => strings(v, into))
  return into
}
function assertPrivate(view: unknown, state: GameState) {
  const text = JSON.stringify(view), seen = strings(view)
  for (const key of ['"random"', '"seed"', '"catalog"', '"registry"', '"commands"', '"instances"', '"zones"']) assert.equal(text.includes(key), false, `${key} must not leave the server`)
  assert.equal(seen.has(String(state.random.value)), false)
  const bot = state.players.find(p => p.id === BOT_SEAT)!, human = state.players.find(p => p.id === HUMAN_SEAT)!
  // Only the human's own cards that a pending effect makes it look at may appear (e.g. a top-deck search).
  const looked = new Set(Object.keys((view as { privateCards: { options: Record<string, string> } }).privateCards.options))
  for (const id of looked) assert.equal(state.instances[id].owner, HUMAN_SEAT, 'private options are the viewer\'s own cards')
  for (const id of [...bot.zones.hand, ...bot.zones.deck, ...bot.zones.life, ...human.zones.life, ...human.zones.deck.filter(id => !looked.has(id))]) assert.equal(seen.has(id), false, `hidden ${id}`)
}
// Plays the human seat with the deterministic policy (test harness only) through the HTTP handler.
async function playOut(play: PlayService, repo: MemoryGameRepository, uid: string, view: View, limit = 2000) {
  for (let n = 0; n < limit && view.status === 'ACTIVE'; n++) {
    const state = stateOf(repo, view.gameId)
    const intent = botIntent(state, HUMAN_SEAT, getLegalActions(state, HUMAN_SEAT))
    const reply = await playHandlers.command(uid, view.gameId, { id: `h-${view.version}`, expectedVersion: view.version, intent }, play)
    assert.equal(reply.status, 200, JSON.stringify(reply.body))
    view = (reply.body as { game: View }).game
    assertPrivate(view, stateOf(repo, view.gameId))
  }
  return view
}

test('M4-I4: every /api/play handler refuses an anonymous request', async () => {
  const { play } = service()
  for (const reply of [await playHandlers.decks(null, noDecks), await playHandlers.start(null, { deck: { kind: 'reference', id: 'reference-purple' } }, play, noDecks), await playHandlers.active(null, play),
    await playHandlers.view(null, 'g', null, play), await playHandlers.command(null, 'g', {}, play), await playHandlers.concede(null, 'g', { id: 'x' }, play)]) assert.deepEqual(reply, { status: 401, body: { error: 'UNAUTHENTICATED' } })
})

test('M4-I3: a started game is persisted, private, owned by its user and resumes after a refresh', async () => {
  const { repo, play } = service(), { uid, game } = await started(play)
  assert.equal(game.status, 'ACTIVE'); assert.deepEqual(game.legalActions.map(a => a.type), ['CHOOSE_FIRST'])
  assertPrivate(game, stateOf(repo, game.gameId))
  assert.equal(game.projection.players.find(p => p.id === BOT_SEAT)!.hand, null, 'the bot hand is never projected')
  const refreshed = new PlayService(repo, seeds())
  const resumed = (await playHandlers.active(uid, refreshed)).body as { game: View }
  assert.deepEqual(resumed.game, game, 'a fresh server instance returns the same view')
  assert.equal((await playHandlers.view(uid, game.gameId, null, refreshed)).status, 200)
  for (const reply of [await playHandlers.view(user(), game.gameId, null, play), await playHandlers.command(user(), game.gameId, { id: 'a', expectedVersion: 0, intent: { type: 'CHOOSE_FIRST', choice: 'FIRST' } }, play)])
    assert.deepEqual(reply, { status: 404, body: { error: 'GAME_NOT_FOUND' } }, 'another user sees nothing')
  assert.deepEqual((await playHandlers.start(uid, { deck: { kind: 'reference', id: 'reference-red' } }, play, noDecks)).body, { error: 'ACTIVE_GAME_EXISTS' })
})

test('M4-I3: a second tab with the same version is refused, retries are idempotent, a reused id with another intent conflicts', async () => {
  const { play } = service(), { uid, game } = await started(play)
  const first = await playHandlers.command(uid, game.gameId, { id: 'tab-a', expectedVersion: game.version, intent: { type: 'CHOOSE_FIRST', choice: 'FIRST' } }, play)
  assert.equal(first.status, 200)
  const second = await playHandlers.command(uid, game.gameId, { id: 'tab-b', expectedVersion: game.version, intent: { type: 'CHOOSE_FIRST', choice: 'SECOND' } }, play)
  assert.equal(second.status, 409); assert.equal((second.body as { error: string }).error, 'STALE_VERSION')
  const retry = await playHandlers.command(uid, game.gameId, { id: 'tab-a', expectedVersion: game.version, intent: { type: 'CHOOSE_FIRST', choice: 'FIRST' } }, play)
  assert.equal(retry.status, 200); assert.equal((retry.body as { replayed: boolean }).replayed, true)
  const reused = await playHandlers.command(uid, game.gameId, { id: 'tab-a', expectedVersion: game.version, intent: { type: 'CHOOSE_FIRST', choice: 'SECOND' } }, play)
  assert.equal((reused.body as { error: string }).error, 'COMMAND_ID_CONFLICT')
})

test('M4-I4: the client cannot choose a seat, forge identity fields or send an illegal command', async () => {
  const { repo, play } = service(), { uid, game } = await started(play)
  for (const intent of [{ type: 'CHOOSE_FIRST', choice: 'FIRST', actorId: BOT_SEAT }, { type: 'CHOOSE_FIRST', choice: 'FIRST', expectedVersion: 9 }, { type: 'CHOOSE_FIRST', choice: 'FIRST', id: 'x' }])
    assert.equal((await playHandlers.command(uid, game.gameId, { id: 'f', expectedVersion: game.version, intent }, play)).status, 400)
  assert.equal((await playHandlers.command(uid, game.gameId, { id: 'f', expectedVersion: game.version, intent: { type: 'CHOOSE_FIRST', choice: 'FIRST' }, actorId: BOT_SEAT }, play)).status, 400)
  const illegal = await playHandlers.command(uid, game.gameId, { id: 'g', expectedVersion: game.version, intent: { type: 'END_MAIN' } }, play)
  assert.deepEqual(illegal, { status: 422, body: { error: 'ILLEGAL_ACTION' } })
  assert.equal(repo.games.get(game.gameId)!.version, game.version, 'nothing was stored')
})

test('M4-I4: the server bot answers every decision it owns and a whole game ends with a result', async () => {
  const { repo, play } = service(), { uid, game } = await started(play)
  const end = await playOut(play, repo, uid, game)
  assert.equal(end.status, 'FINISHED')
  const state = stateOf(repo, end.gameId)
  assert.ok(state.result && ['LEADER_DAMAGED_AT_ZERO_LIFE', 'EMPTY_DECK'].includes(state.result.reason)); assert.deepEqual(end.projection.result, state.result)
  assert.ok(state.commands.filter(c => c.actorId === BOT_SEAT).length > 20, 'the bot played its turns server-side')
  assert.equal(repo.commands.get(end.gameId)!.length, state.commands.length, 'every accepted command is logged once')
  assert.deepEqual(repo.commands.get(end.gameId)!.map(c => c.seq), state.commands.map((_, i) => i + 1))
  assert.equal(end.legalActions.length, 0)
  assert.equal((await playHandlers.command(uid, end.gameId, { id: 'late', expectedVersion: end.version, intent: { type: 'END_MAIN' } }, play)).status, 409)
  assert.equal((await playHandlers.active(uid, play)).body && ((await playHandlers.active(uid, play)).body as { game: unknown }).game, null)
})

test('M4-I4: conceding finishes the game as a defeat and frees the user for a new game', async () => {
  const { play } = service(), { uid, game } = await started(play, user(), 'reference-red')
  const reply = await playHandlers.concede(uid, game.gameId, { id: 'give-up' }, play)
  const view = (reply.body as { game: View & { projection: { result: { reason: string; winnerId: string } } } }).game
  assert.equal(view.status, 'FINISHED'); assert.equal(view.projection.result.reason, 'CONCESSION'); assert.equal(view.projection.result.winnerId, BOT_SEAT)
  assert.equal((await playHandlers.concede(uid, game.gameId, { id: 'give-up' }, play)).status, 200, 'retry is a replay')
  assert.equal((await started(play, uid)).game.status, 'ACTIVE')
})

test('M4-I2: stored decks are bridged from Prisma rows, checked before start, and conflicts or unknown cards are refused', async () => {
  const { definitions } = engineCatalog()
  const rows: PrismaCardRow[] = [], cards: { cardId: string; quantity: number }[] = []
  const fr: Record<string, string> = { LEADER: 'LEADER', CHARACTER: 'PERSONNAGE', EVENT: 'ÉVÉNEMENT' }
  for (const entry of PURPLE_DECK) {
    const number = entry.printingKey.split('::')[0], d = definitions.find(def => def.number === number)!
    const alt = number === 'ST04-016'
    rows.push({ id: `card-${number}${alt ? '-p1' : ''}`, code: number, name: d.rulesName, type: fr[d.category], color: 'Violet', cost: d.category === 'LEADER' ? 5 : d.cost, power: d.power, counter: d.counter === null ? null : String(d.counter), imageUrl: `https://example.test/${number}.png`, isAltArt: alt, isParallel: alt, isSpecial: false })
    cards.push({ cardId: rows.at(-1)!.id, quantity: entry.quantity })
  }
  const decks: UserDeck[] = [{ id: 'legal', name: 'Mon Kaido', cards }, { id: 'conflict', name: 'Mauvaise donnée', cards: cards.map(c => ({ ...c })) }, { id: 'unknown', name: 'Carte hors moteur', cards: [...cards.slice(1), { cardId: 'card-OP05-119', quantity: 2 }, { cardId: cards[0].cardId, quantity: 1 }].filter((c, i, all) => all.findIndex(o => o.cardId === c.cardId) === i) }]
  const conflictRow = { ...rows[1], id: 'card-bad', power: 9999 }
  decks[1].cards[1] = { cardId: 'card-bad', quantity: decks[1].cards[1].quantity }
  const source: DeckSource = { userDecks: async () => decks, cardRows: async ids => [...rows, conflictRow, { ...rows[1], id: 'card-OP05-119', code: 'OP05-119' }].filter(r => ids.includes(r.id)) }
  const uid = user(), { play, repo } = service()
  const list = (await playHandlers.decks(uid, source)).body as { reference: { id: string; ok: boolean }[]; user: { id: string; ok: boolean; errors: string[] }[] }
  assert.ok(list.reference.every(d => d.ok), 'the three reference decks are playable')
  assert.deepEqual(list.user.map(d => [d.id, d.ok]), [['legal', true], ['conflict', false], ['unknown', false]])
  assert.match(list.user[1].errors[0], /^CARD_DATA_CONFLICT:card-bad$/); assert.ok(list.user[2].errors.some(e => e === 'NOT_IN_ENGINE_CATALOG:card-OP05-119'))
  assert.equal((await playHandlers.start(uid, { deck: { kind: 'user', deckId: 'conflict' } }, play, source)).status, 422)
  assert.equal((await playHandlers.start(uid, { deck: { kind: 'user', deckId: 'someone-else' } }, play, source)).status, 404)
  const ok = await playHandlers.start(uid, { deck: { kind: 'user', deckId: 'legal' } }, play, source)
  assert.equal(ok.status, 201)
  const state = stateOf(repo, (ok.body as { game: View }).game.gameId)
  assert.ok(state.catalog.printings.some(p => p.printingKey === 'ST04-016::_p1' && p.databaseIds.includes('card-ST04-016-p1')), 'alternative art maps to the same definition')
  assert.equal(repo.games.get((ok.body as { game: View }).game.gameId)!.botDeckRef, 'reference-red', 'a purple deck faces the red reference bot')
})
