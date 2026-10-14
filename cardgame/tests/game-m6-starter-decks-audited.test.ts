import test from 'node:test'
import assert from 'node:assert/strict'
import { engineCatalog, currentEngineRegistry, engineRuleset } from '../src/lib/engine/catalog'
import { REFERENCE_DECKS, deckEligibility } from '../src/lib/engine/decks'
import { playMatch } from '../src/lib/engine/strategy'

// Every audited Starter Deck offered in /play: exact 51 cards, legal under MUGIWARA_FREE, and a full bot game ends with a
// winner without fallback or refused command.
const offered = REFERENCE_DECKS.filter(d => d.id.startsWith('starter-'))
test('audited Starter Decks offered in /play are legal and finish complete bot games without fallback or refused commands', () => {
  const { definitions, printings } = engineCatalog()
  const ids = offered.map(d => d.id)
  for (const id of ['starter-st03', 'starter-st05', 'starter-st10-st10-001', 'starter-st10-st10-002', 'starter-st10-st10-003', 'starter-st11']) assert.ok(ids.includes(id), id)
  offered.forEach((deck, index) => {
    assert.equal(deck.entries.reduce((sum, entry) => sum + entry.quantity, 0), 51, deck.id)
    assert.deepEqual(deckEligibility(deck.entries), { ok: true, errors: [] }, deck.id)
    const opponent = REFERENCE_DECKS[index % 2 ? 1 : 0]
    const result = playMatch({ definitions, printings, gameId: `${deck.id}-audit`, seed: 600 + index, scope: 'BASIC_TURNS', chooserId: 'p1', ruleset: engineRuleset(), effectRegistry: currentEngineRegistry(),
      players: [{ id: 'p1', cards: structuredClone(deck.entries), donCount: 10 }, { id: 'p2', cards: structuredClone(opponent.entries), donCount: 10 }] }, { p1: 'normal', p2: 'normal' })
    assert.ok(result.winner, `${deck.id} should reach a winner`)
    assert.equal(result.fallbacks, 0, `${deck.id}: no bot fallback`)
    assert.equal(result.refused, 0, `${deck.id}: no refused command`)
  })
})
