import test from 'node:test'
import assert from 'node:assert/strict'
import { MemoryGameRepository } from '../src/lib/engine/repository'
import { PlayService } from '../src/lib/engine/service'
import { playHandlers, type DeckSource } from '../src/lib/engine/http'
import { REFERENCE_DECKS } from '../src/lib/engine/decks'

// The player picks the bot's deck (any offered reference or Starter deck) or lets the server draw one at random.
const source: DeckSource = { userDecks: async () => [], cardRows: async () => [] }
let n = 0
const setup = (seeds: number[]) => { const repo = new MemoryGameRepository(); let i = 0; return { repo, play: new PlayService(repo, () => seeds[i++ % seeds.length]), uid: `opp${++n}${Date.now().toString(36)}` } }
const botDeckOf = (repo: MemoryGameRepository, reply: { body: unknown }) => repo.games.get((reply.body as { game: { gameId: string } }).game.gameId)!.botDeckRef

test('a chosen opponent deck is used by the bot; unknown ids are refused', async () => {
  const { repo, play, uid } = setup([7])
  const reply = await playHandlers.start(uid, { deck: { kind: 'reference', id: 'starter-st01' }, opponent: { kind: 'reference', id: 'starter-st24' } }, play, source)
  assert.equal(reply.status, 201); assert.equal(botDeckOf(repo, reply), 'starter-st24')
  const other = setup([7])
  assert.equal((await playHandlers.start(other.uid, { deck: { kind: 'reference', id: 'starter-st01' }, opponent: { kind: 'reference', id: 'nope' } }, other.play, source)).status, 404)
  assert.equal((await playHandlers.start(other.uid, { deck: { kind: 'reference', id: 'starter-st01' }, opponent: 'anything' }, other.play, source)).status, 400)
})

test('a random opponent is drawn from the server seed among the playable Starter decks', async () => {
  const seen = new Set<string>()
  for (const seed of [3, 10, 25, 41]) {
    const { repo, play, uid } = setup([seed])
    const reply = await playHandlers.start(uid, { deck: { kind: 'reference', id: 'starter-st13-st13-001' }, opponent: 'random', botLevel: 'easy' }, play, source)
    assert.equal(reply.status, 201)
    const bot = botDeckOf(repo, reply); const starters = REFERENCE_DECKS.filter(d => d.id.startsWith('starter-')); assert.equal(bot, starters[seed % starters.length].id); seen.add(bot)
  }
  assert.equal(seen.size, 4)
})

test('without an opponent the previous rule stays: a purple deck faces the red reference, others the purple one', async () => {
  const { repo, play, uid } = setup([5])
  assert.equal(botDeckOf(repo, await playHandlers.start(uid, { deck: { kind: 'reference', id: 'starter-st02' } }, play, source)), 'reference-purple')
})
