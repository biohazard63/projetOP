import test from 'node:test'
import assert from 'node:assert/strict'
import { engineCatalog, currentEngineRegistry, engineRuleset } from '../src/lib/engine/catalog'
import { REFERENCE_DECKS, deckEligibility } from '../src/lib/engine/decks'
import { playMatch } from '../src/lib/engine/strategy'

test('the ST-03 composition of the rebuild script (Desert Spada OP01-088 x4, Perfume Femur OP07-057 x2) is offered, legal and finishes bot games', async () => {
  const compositions = (await import('../src/game/cards/starter-compositions.json')).default as { decks: { deckCode: string; unresolved: number; entries: { name: string; number: string | null; quantity: number }[] }[] }
  const st03 = compositions.decks.find(d => d.deckCode === 'ST-03')!
  assert.equal(st03.unresolved, 0)
  assert.deepEqual(st03.entries.filter(e => !e.number?.startsWith('ST03-')).map(e => [e.name, e.number, e.quantity]), [['Desert Spada', 'OP01-088', 4], ['Perfume Femur', 'OP07-057', 2]])
  const { definitions, printings } = engineCatalog()
  const deck = REFERENCE_DECKS.find(candidate => candidate.id === 'starter-st03')
  assert.ok(deck, 'starter-st03 must be offered once its 51 cards are resolved and certified')
  assert.equal(deck!.entries.reduce((sum, entry) => sum + entry.quantity, 0), 51)
  assert.deepEqual(deckEligibility(deck!.entries), { ok: true, errors: [] })
  for (const [opponentId, seed] of [['reference-red', 31], ['starter-st03', 32], ['starter-st12', 33]] as const) {
    const opponent = REFERENCE_DECKS.find(candidate => candidate.id === opponentId)!
    assert.ok(opponent, opponentId)
    const result = playMatch({ definitions, printings, gameId: `starter-st03-${opponentId}`, seed, scope: 'BASIC_TURNS', chooserId: 'p1', ruleset: engineRuleset(), effectRegistry: currentEngineRegistry(),
      players: [{ id: 'p1', cards: structuredClone(deck!.entries), donCount: 10 }, { id: 'p2', cards: structuredClone(opponent.entries), donCount: 10 }] }, { p1: 'normal', p2: 'normal' })
    assert.ok(result.winner, `ST-03 vs ${opponentId} should reach a winner`)
    assert.equal(result.fallbacks, 0, `ST-03 vs ${opponentId}: no bot fallback`)
    assert.equal(result.refused, 0, `ST-03 vs ${opponentId}: no refused command`)
  }
})
