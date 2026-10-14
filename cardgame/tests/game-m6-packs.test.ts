import { ST03_ST04_LOCAL_CARDS } from '../src/game/cards/m6LocalST03ST04Cards'
import { ST05_ST06_LOCAL_CARDS } from '../src/game/cards/m6LocalST05ST06Cards'
import assert from 'node:assert/strict'
import test from 'node:test'
import { loadCardPacks } from '../src/game/cards/packs'
import { M3_FULL_REGISTRY } from '../src/game/cards/m3PurpleDeck'
import { M5_CARDS } from '../src/game/cards/m5Catalog'
import { engineCatalog, m3EngineCatalog } from '../src/lib/engine/catalog'
import { ST01_LOCAL_CARDS } from '../src/game/cards/m6LocalStarterCards'
import { ST02_LOCAL_CARDS } from '../src/game/cards/m6LocalST02Cards'
import { ST08_LOCAL_CARDS } from '../src/game/cards/m6LocalST08Cards'
import { ST07_LOCAL_CARDS } from '../src/game/cards/m6LocalST07Cards'
import { ST12_LOCAL_CARDS } from '../src/game/cards/m6LocalST12Cards'
import { ST03_OP_LOCAL_CARDS } from '../src/game/cards/m6LocalST03OPCards'
import { REPRINT_LOCAL_CARDS } from '../src/game/cards/m6LocalReprintCards'
import { ST14_LOCAL_CARDS } from '../src/game/cards/m6LocalST14Cards'
import { ST17_OFFICIAL_CARDS } from '../src/game/cards/m6OfficialST17Cards'
import { ST18_OFFICIAL_CARDS } from '../src/game/cards/m6OfficialST18Cards'
import { ST19_OFFICIAL_CARDS } from '../src/game/cards/m6OfficialST19Cards'
import { ST21_OFFICIAL_CARDS } from '../src/game/cards/m6OfficialST21Cards'
import { ST23_OFFICIAL_CARDS } from '../src/game/cards/m6OfficialST23Cards'
import { ST25_OFFICIAL_CARDS } from '../src/game/cards/m6OfficialST25Cards'
import { ST28_OFFICIAL_CARDS } from '../src/game/cards/m6OfficialST28Cards'
import { ST20_OFFICIAL_CARDS } from '../src/game/cards/m6OfficialST20Cards'
import { ST15_OFFICIAL_CARDS } from '../src/game/cards/m6OfficialST15Cards'
import { ST16_OFFICIAL_CARDS } from '../src/game/cards/m6OfficialST16Cards'
import { ST26_OFFICIAL_CARDS } from '../src/game/cards/m6OfficialST26Cards'
import { ST31_OFFICIAL_CARDS } from '../src/game/cards/m6OfficialST31Cards'
import { ST09_LOCAL_CARDS } from '../src/game/cards/m6LocalST09Cards'
import { ST11_LOCAL_CARDS } from '../src/game/cards/m6LocalST11Cards'
import { ST10_LOCAL_CARDS } from '../src/game/cards/m6LocalST10Cards'
import type { CardInput } from '../src/game/cards/types'
import { createGame, applyCommand, getLegalActions } from '../src/game/core/game'
import type { Command, GameInput } from '../src/game/core/types'
import { M3_RULESET } from '../src/game/rulesets/m3'
import { PURPLE_DECK } from '../src/game/cards/m3PurpleDeck'

const baseCards: CardInput[] = m3EngineCatalog().definitions.map(card => ({
  number: card.number, printingKey: `${card.number}::standard`, databaseIds: [], nameFr: card.nameFr, rulesName: card.rulesName,
  category: card.category, colors: card.colors, attributes: card.attributes, traits: card.traits,
  cost: card.cost, power: card.power, counter: card.counter, life: card.life, block: card.block,
  extensions: [], lifeEvidence: card.lifeEvidence, review: card.review,
}))
// A synthetic future printing proves the data contract. It is deliberately not a real Bandai card.
function futurePack() {
  const template = structuredClone(M5_CARDS[0])
  const card: CardInput = {
    ...template,
    number: 'ST99-001', printingKey: 'ST99-001::standard', databaseIds: [],
    nameFr: 'Fixture future', rulesName: 'Fixture future', extensions: ['TEST-FUTURE-SET'],
    colors: ['PURPLE'], cost: 1,
    review: {
      ...template.review!, revision: 'm6-fixture-1',
      effectOriginal: '[On Play] Draw 1 card. (Synthetic test fixture.)',
      effects: [{ kind: 'declarative', abilityIds: ['ST99-001.on-play'] }],
      requiredCapabilities: ['declarative'],
    },
  }
  return {
    packId: 'TEST-FUTURE-SET', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const,
    cards: [card],
    effects: { definitions: [{
      id: 'ST99-001.on-play', revision: '1', dslVersion: '1.3.0',
      source: { kind: 'CARD_DEFINITION' as const, definitionId: 'ST99-001@m6-fixture-1', zone: 'characters' as const },
      timing: 'ON_PLAY' as const, condition: { kind: 'ALWAYS' as const }, cost: { kind: 'NONE' as const },
      usage: { kind: 'UNLIMITED' as const },
      program: [{ kind: 'OPERATION' as const, operation: { primitive: 'drawCards' as const, version: '1.0.0' as const, player: 'CONTROLLER' as const, audience: 'CONTROLLER' as const, amount: 1 } }],
    }] },
  }
}

test('M6 card packs preserve prior definitions and add the executable local ST-01 profile', () => {
  const compiled = loadCardPacks(M3_FULL_REGISTRY, [
    { packId: 'M3_BASE', schemaVersion: 1, rulesVersion: '1.2.1', cards: baseCards },
    { packId: 'M5_VANILLA_AND_BLOCKER', schemaVersion: 1, rulesVersion: '1.2.1', cards: M5_CARDS },
  ])
  const catalog = engineCatalog()
  // M6 lots B/C plus ST-07, ST-08 and ST-12 are added on top of the earlier catalog.
  const local = ST01_LOCAL_CARDS.length + ST02_LOCAL_CARDS.length + ST03_ST04_LOCAL_CARDS.length + ST05_ST06_LOCAL_CARDS.length + ST07_LOCAL_CARDS.length + ST08_LOCAL_CARDS.length + ST09_LOCAL_CARDS.length + ST10_LOCAL_CARDS.length + ST11_LOCAL_CARDS.length + ST12_LOCAL_CARDS.length + ST03_OP_LOCAL_CARDS.length + REPRINT_LOCAL_CARDS.length + ST14_LOCAL_CARDS.length + ST17_OFFICIAL_CARDS.length + ST18_OFFICIAL_CARDS.length + ST19_OFFICIAL_CARDS.length + ST21_OFFICIAL_CARDS.length + ST23_OFFICIAL_CARDS.length + ST25_OFFICIAL_CARDS.length + ST28_OFFICIAL_CARDS.length + ST20_OFFICIAL_CARDS.length + ST15_OFFICIAL_CARDS.length + ST16_OFFICIAL_CARDS.length + ST26_OFFICIAL_CARDS.length + ST31_OFFICIAL_CARDS.length
  assert.equal(catalog.definitions.length, compiled.definitions.length + local)
  assert.equal(catalog.printings.length, compiled.printings.length + local)
  const catalogIds = new Set(catalog.definitions.map(card => card.definitionId))
  assert.ok(compiled.definitions.every(card => catalogIds.has(card.definitionId)), 'all earlier definition IDs remain available')
  assert.ok(catalog.definitions.some(card => card.definitionId === 'ST01-005@m6-cardjson-2026-10-13'))
  assert.ok(catalog.definitions.some(card => card.definitionId === 'ST08-009@m6-cardjson-2026-10-13'))
  for (const number of ['ST01-004', 'ST01-011', 'ST01-013', 'ST01-017']) assert.ok(catalog.definitions.some(card => card.number === number))
})

test('a future series adds a declarative card and known primitive without a core change', () => {
  const result = loadCardPacks(M3_FULL_REGISTRY, [
    { packId: 'M3_BASE', schemaVersion: 1, rulesVersion: '1.2.1', cards: baseCards },
    futurePack(),
  ])
  assert.ok(result.definitions.some(card => card.definitionId === 'ST99-001@m6-fixture-1'))
  assert.ok(result.registry.definitions.some(effect => effect.id === 'ST99-001.on-play' && effect.program[0]?.kind === 'OPERATION' && effect.program[0].operation.primitive === 'drawCards'))
  assert.equal(JSON.stringify(result), JSON.stringify(loadCardPacks(M3_FULL_REGISTRY, [
    { packId: 'M3_BASE', schemaVersion: 1, rulesVersion: '1.2.1', cards: baseCards }, futurePack(),
  ])), 'pack loading is deterministic and JSON serializable')
})

test('a card from a new data pack executes its existing On Play primitive in the current game core', () => {
  const compiled = loadCardPacks(M3_FULL_REGISTRY, [
    { packId: 'M3_BASE', schemaVersion: 1, rulesVersion: '1.2.1', cards: baseCards }, futurePack(),
  ])
  const ruleset = structuredClone(M3_RULESET)
  ruleset.allowedNumbers.push('ST99-001')
  const deck = structuredClone(PURPLE_DECK).flatMap(entry => {
    if (entry.printingKey !== 'ST04-009::standard') return [entry]
    return [{ ...entry, quantity: entry.quantity - 1 }]
  }).filter(entry => entry.quantity > 0)
  deck.push({ printingKey: 'ST99-001::standard', quantity: 1 })
  const input: GameInput = {
    definitions: compiled.definitions, printings: compiled.printings, gameId: 'm6-future-play', seed: 77,
    chooserId: 'alice', scope: 'BASIC_TURNS' as const, ruleset, effectRegistry: compiled.registry,
    players: [{ id: 'alice', cards: structuredClone(deck), donCount: 10 }, { id: 'bob', cards: structuredClone(deck), donCount: 10 }],
  }
  let state = createGame(input)
  type Intent = Command extends infer C ? C extends Command ? Omit<C, 'id' | 'actorId' | 'expectedVersion'> : never : never
  const send = (actorId: string, intent: Intent) => {
    const result = applyCommand(state, { ...intent, actorId, id: `m6-${state.version}`, expectedVersion: state.version })
    assert.ok(result.ok, result.ok ? '' : result.error)
    if (result.ok) state = result.state
  }
  send('alice', { type: 'CHOOSE_FIRST', choice: 'FIRST' })
  send('alice', { type: 'MULLIGAN', redraw: false })
  send('bob', { type: 'MULLIGAN', redraw: false })
  while (state.phase !== 'MAIN') send('alice', { type: 'ADVANCE_PHASE' })
  const alice = state.players.find(player => player.id === 'alice')!
  const synthetic = alice.zones.deck.find(id => state.instances[id]?.definitionId === 'ST99-001@m6-fixture-1')!
  alice.zones.deck.splice(alice.zones.deck.indexOf(synthetic), 1)
  alice.zones.hand.push(synthetic)
  state.instances[synthetic]!.zone = 'hand'
  state.instances[synthetic]!.zoneGeneration++
  const beforeHand = alice.zones.hand.length
  const beforeDeck = alice.zones.deck.length
  const action = getLegalActions(state, 'alice').find(item => item.type === 'PLAY_CARD' && item.instanceId === synthetic)
  assert.ok(action && action.type === 'PLAY_CARD')
  send('alice', { type: 'PLAY_CARD', instanceId: synthetic, donIds: action.eligibleDonIds.slice(0, 1), replaceId: null })
  const afterAlice = state.players.find(player => player.id === 'alice')!
  assert.equal(state.instances[synthetic]!.zone, 'characters')
  assert.equal(afterAlice.zones.hand.length, beforeHand, 'playing one card and drawing one card leaves hand size unchanged')
  assert.equal(afterAlice.zones.deck.length, beforeDeck - 1)
  assert.ok(state.events.some(event => event.type === 'DRAWN' && event.actorId === 'alice'), 'the card data definition resolved drawCards through the existing interpreter')
})

test('future packs fail closed on unknown primitives and unbound card abilities', () => {
  const unknownPrimitive = structuredClone(futurePack()) as unknown as Record<string, unknown>
  const effects = unknownPrimitive.effects as { definitions: Array<{ program: Array<{ operation: { primitive: string } }> }> }
  effects.definitions[0]!.program[0]!.operation.primitive = 'inventedPrimitive'
  assert.throws(() => loadCardPacks(M3_FULL_REGISTRY, [
    { packId: 'M3_BASE', schemaVersion: 1, rulesVersion: '1.2.1', cards: baseCards }, unknownPrimitive,
  ]), /INVALID_CARD_PACK/)

  const unbound = futurePack()
  unbound.effects.definitions[0]!.id = 'ST99-001.missing'
  assert.throws(() => loadCardPacks(M3_FULL_REGISTRY, [
    { packId: 'M3_BASE', schemaVersion: 1, rulesVersion: '1.2.1', cards: baseCards }, unbound,
  ]), /UNRESOLVED_CARD_ABILITY/)
})

test('pack IDs and conflicting/unknown card schemas are rejected', () => {
  const pack = { packId: 'DUP', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: baseCards }
  assert.throws(() => loadCardPacks(M3_FULL_REGISTRY, [pack, pack]), /DUPLICATE_PACK_ID/)
  assert.throws(() => loadCardPacks(M3_FULL_REGISTRY, [{ ...pack, cards: [...baseCards, { ...baseCards[0], surprise: true }] }]), /INVALID_PACK_CARD/)
  assert.throws(() => loadCardPacks(M3_FULL_REGISTRY, [{ ...pack, rulesVersion: '9.9.9' }]), /INVALID_CARD_PACK/)
})
