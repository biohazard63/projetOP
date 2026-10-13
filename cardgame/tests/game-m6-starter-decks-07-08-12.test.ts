import test from 'node:test'
import assert from 'node:assert/strict'
import { engineCatalog, currentEngineRegistry, engineRuleset } from '../src/lib/engine/catalog'
import { REFERENCE_DECKS, deckEligibility } from '../src/lib/engine/decks'
import { playMatch } from '../src/lib/engine/strategy'

test('resolved ST-07, ST-08 and ST-12 compositions are offered, legal and finish complete bot games without fallback or refused commands', () => {
  const { definitions, printings } = engineCatalog()
  for (const [deckId, opponents] of [['starter-st07', [['reference-red', 71], ['starter-st07', 72], ['starter-st08', 73]]], ['starter-st08', [['reference-red', 81], ['starter-st08', 82], ['starter-st06', 83]]], ['starter-st12', [['reference-red', 121], ['starter-st12', 122], ['starter-st07', 123]]]] as const) {
    const deck = REFERENCE_DECKS.find(candidate => candidate.id === deckId)
    assert.ok(deck, `${deckId} must be offered once its 51 cards are resolved and certified`)
    assert.equal(deck!.entries.reduce((sum, entry) => sum + entry.quantity, 0), 51)
    assert.deepEqual(deckEligibility(deck!.entries), { ok: true, errors: [] })
    for (const [opponentId, seed] of opponents) {
      const opponent = REFERENCE_DECKS.find(candidate => candidate.id === opponentId)!
      assert.ok(opponent, opponentId)
      const result = playMatch({ definitions, printings, gameId: `${deckId}-${opponentId}`, seed, scope: 'BASIC_TURNS', chooserId: 'p1', ruleset: engineRuleset(), effectRegistry: currentEngineRegistry(),
        players: [{ id: 'p1', cards: structuredClone(deck!.entries), donCount: 10 }, { id: 'p2', cards: structuredClone(opponent.entries), donCount: 10 }] }, { p1: 'normal', p2: 'normal' })
      assert.ok(result.winner, `${deckId} vs ${opponentId} should reach a winner`)
      assert.equal(result.fallbacks, 0, `${deckId} vs ${opponentId}: no bot fallback`)
      assert.equal(result.refused, 0, `${deckId} vs ${opponentId}: no refused command`)
    }
  }
})

test('an equal-quantity ambiguous group gives the same deck list whatever the mapping (ST-12); an unequal group stays blocked (ST-05)', async () => {
  const { equalQuantityGroups, STARTER_DECKS } = await import('../src/game/cards/starterDecks')
  const compositions = (await import('../src/game/cards/starter-compositions.json')).default as { decks: { deckCode: string; entries: Parameters<typeof equalQuantityGroups>[0] }[] }
  const st12 = compositions.decks.find(d => d.deckCode === 'ST-12')!
  assert.deepEqual([...equalQuantityGroups(st12.entries)!], [['ST12-016', 2], ['ST12-017', 2]])
  assert.equal(st12.entries.find(e => e.name === 'Elephant Tuna')?.number, 'ST12-009')
  const deck = STARTER_DECKS.find(d => d.deckCode === 'ST-12')!
  assert.equal(deck.entries.find(e => e.printingKey === 'ST12-016::standard')?.quantity, 2)
  assert.equal(deck.entries.find(e => e.printingKey === 'ST12-017::standard')?.quantity, 2)
  assert.equal(equalQuantityGroups(compositions.decks.find(d => d.deckCode === 'ST-05')!.entries), null, 'ST-05')
})
