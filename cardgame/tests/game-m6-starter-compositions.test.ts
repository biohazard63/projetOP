import test from 'node:test'
import assert from 'node:assert/strict'
import compositions from '../src/game/cards/starter-compositions.json'
import { STARTER_DECKS } from '../src/game/cards/starterDecks'

test('verified ST-04 and ST-06 aliases produce exact 50-card manifests and become eligible for /play', () => {
  for (const deckCode of ['ST-04', 'ST-06']) {
    const composition = compositions.decks.find(deck => deck.deckCode === deckCode)!
    assert.equal(composition.unresolved, 0)
    assert.equal(composition.leaders.length, 1)
    const mainCount = composition.entries.filter(entry => entry.number !== composition.leaders[0]).reduce((sum, entry) => sum + entry.quantity, 0)
    assert.equal(mainCount, 50)
    assert.ok(STARTER_DECKS.some(deck => deck.deckCode === deckCode), `${deckCode} should be offered only after all its entries are certified`)
  }
})

test('ST-05 remains unavailable while its title mappings are ambiguous (ST-03 is resolved by the rebuild script lookup)', () => {
  for (const deckCode of ['ST-05']) {
    const composition = compositions.decks.find(deck => deck.deckCode === deckCode)!
    assert.ok(composition.unresolved > 0)
    assert.ok(!STARTER_DECKS.some(deck => deck.deckCode === deckCode))
    assert.ok(composition.entries.filter(entry => entry.status === 'AMBIGUOUS').every(entry => (entry.candidates?.length ?? 0) === 2))
  }
})
