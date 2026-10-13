import test from 'node:test'
import assert from 'node:assert/strict'
import { loadStarterDeckSource, compareStarterDeckToEngine, attachDatabaseQuantities } from '../src/game/cards/starterDeckSource'
import { engineCatalog } from '../src/lib/engine/catalog'

test('M6 reads ST-01 directly from cardJson and preserves all 17 distinct local card records', () => {
  const deck = loadStarterDeckSource('ST-01')
  assert.equal(deck.deckId, 'ST-01')
  assert.equal(deck.records.length, 17)
  assert.equal(new Set(deck.records.map(card => card.number)).size, 17)
  assert.deepEqual(deck.records.filter(card => card.category === 'LEADER').map(card => card.number), ['ST01-001'])
  const luffy = deck.records.find(card => card.number === 'ST01-001')!
  // M6 (user request, 2026-10-13): a Leader's `cost` field carries its official Life; there is still no `life` field.
  assert.equal(luffy.cost, 5)
  assert.equal('life' in luffy.source, false, 'the local card JSON has no Leader Life field')
  assert.equal(luffy.effectText, deck.records.find(card => card.number === 'ST01-001')!.source.effect)
  assert.equal(luffy.printingKey, 'ST01-001::standard')
})

test('M6 compares local ST-01 records with the engine without claiming the missing copies or abilities are playable', () => {
  const deck = loadStarterDeckSource('ST-01')
  const coverage = compareStarterDeckToEngine(deck, engineCatalog().definitions)
  assert.equal(coverage.cardTypes, 17)
  assert.equal(coverage.leaderCount, 1)
  assert.equal(coverage.databaseCompositionStatus, 'NOT_ATTACHED', 'card rows and deck composition are separate sources')
  assert.ok(coverage.recognized.length > 0)
  // M6 Lot A certified all 17 ST-01 numbers: none is reported as an unverified effect any more.
  assert.ok(coverage.recognized.some(card => card.number === 'ST01-002' && card.certified))
  assert.equal(coverage.recognized.length, 17)
  assert.ok(coverage.unverifiedEffects.every(card => card.unsupportedText.length > 0))
  assert.equal(coverage.unverifiedEffects.length, 0)
})

test('M6 joins database deck quantities to local cardJson by canonical card number without changing source rows', () => {
  const deck = loadStarterDeckSource('ST-01')
  const composition = attachDatabaseQuantities(deck, [
    { code: 'ST01-001', quantity: 1 },
    { code: 'ST01-002_p2', quantity: 2 },
    { code: 'ST01-002', quantity: 2 },
    { code: 'ST01-015', quantity: 4 },
  ])
  assert.equal(composition.source, 'DATABASE_DECK_CARDS')
  assert.deepEqual(composition.entries.filter(entry => ['ST01-001', 'ST01-002', 'ST01-015'].includes(entry.number)), [
    { number: 'ST01-001', quantity: 1, matchedLocalPrintings: ['ST01-001::standard'] },
    { number: 'ST01-002', quantity: 4, matchedLocalPrintings: ['ST01-002::standard'] },
    { number: 'ST01-015', quantity: 4, matchedLocalPrintings: ['ST01-015::standard'] },
  ])
  assert.equal(composition.totalCards, 9)
  assert.equal(deck.records.find(card => card.number === 'ST01-001')!.source.code, 'ST01-001')
})

test('M6 refuses invalid database deck quantities instead of inferring a default', () => {
  const deck = loadStarterDeckSource('ST-01')
  assert.throws(() => attachDatabaseQuantities(deck, [{ code: 'ST01-001', quantity: 0 }]), /INVALID_DATABASE_DECK_QUANTITY/)
  assert.throws(() => attachDatabaseQuantities(deck, [{ code: 'OP01-001', quantity: 1 }]), /DATABASE_CARD_NOT_IN_STARTER_SOURCE/)
})

test('M6 local starter loader reports missing ST-22 explicitly and rejects path-like set identifiers', () => {
  assert.throws(() => loadStarterDeckSource('ST-22'), /STARTER_SOURCE_NOT_FOUND/)
  assert.throws(() => loadStarterDeckSource('../ST-01'), /INVALID_STARTER_ID/)
})

test('M6 normalizes every locally present Starter Deck format and preserves repeated canonical cards as printings', () => {
  const missing: string[] = []
  for (let number = 1; number <= 36; number++) {
    const deckId = `ST-${String(number).padStart(2, '0')}`
    try {
      const deck = loadStarterDeckSource(deckId)
      assert.ok(deck.records.length > 0, `${deckId} must contain local card rows`)
      assert.ok(deck.leaders.length > 0, `${deckId} must identify its Leader(s)`)
      assert.equal(new Set(deck.records.map(card => card.printingKey)).size, deck.records.length)
    } catch (error) {
      if (number === 22 && error instanceof Error && /STARTER_SOURCE_NOT_FOUND/.test(error.message)) missing.push(deckId)
      else throw error
    }
  }
  assert.deepEqual(missing, ['ST-22'])
  const st13 = loadStarterDeckSource('ST-13')
  assert.equal(st13.records.length, 35)
  assert.equal(st13.uniqueNumbers.length, 19)
})
