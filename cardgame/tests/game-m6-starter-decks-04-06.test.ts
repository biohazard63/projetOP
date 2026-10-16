import { scopedInput } from './helpers/m6'
import test from 'node:test'
import assert from 'node:assert/strict'
import { engineCatalog, currentEngineRegistry, engineRuleset } from '../src/lib/engine/catalog'
import { REFERENCE_DECKS, deckEligibility } from '../src/lib/engine/decks'
import { playMatch } from '../src/lib/engine/strategy'

test('resolved ST-04 and ST-06 compositions are legal and finish complete bot games without fallback or refused commands', () => {
  const { definitions, printings } = engineCatalog()
  const opponent = REFERENCE_DECKS.find(deck => deck.id === 'reference-red')!
  assert.ok(opponent)
  for (const [deckId, seed] of [['starter-st04', 41], ['starter-st06', 43]] as const) {
    const deck = REFERENCE_DECKS.find(candidate => candidate.id === deckId)
    assert.ok(deck, `${deckId} must be offered once its 51 cards are resolved and certified`)
    assert.equal(deck!.entries.reduce((sum, entry) => sum + entry.quantity, 0), 51)
    assert.deepEqual(deckEligibility(deck!.entries), { ok: true, errors: [] })
    const result = playMatch(scopedInput({ definitions, printings, gameId: deckId, seed, scope: 'BASIC_TURNS', chooserId: 'p1', ruleset: engineRuleset(), effectRegistry: currentEngineRegistry(),
      players: [{ id: 'p1', cards: structuredClone(deck!.entries), donCount: 10 }, { id: 'p2', cards: structuredClone(opponent.entries), donCount: 10 }] }), { p1: 'normal', p2: 'normal' })
    assert.ok(result.winner, `${deckId} should reach a winner`)
    assert.equal(result.fallbacks, 0, `${deckId} should not use bot fallback actions`)
    assert.equal(result.refused, 0, `${deckId} should not submit illegal commands`)
  }
})
