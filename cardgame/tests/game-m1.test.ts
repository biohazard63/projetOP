import { test } from 'node:test'
import assert from 'node:assert/strict'
import { consolidateDefinitions } from '../src/game/cards/adapter'
import { REVIEWED_CARDS } from '../src/game/cards/reviewedCards'
import { M0_RULESET } from '../src/game/rulesets/m0'
import { createGame, applyCommand, getLegalActions, projectState, restoreGame } from '../src/game/core/game'
import { assertGameInvariants } from '../src/game/core/invariants'
import { seededRandom, shuffle } from '../src/game/core/random'
import type { Command, GameInput, GameState } from '../src/game/core/types'
import type { CardInput } from '../src/game/cards/types'

function fixture(seed = 12345): GameInput {
  const inputs: CardInput[] = Object.entries(REVIEWED_CARDS).map(([number, facts]) => ({ ...structuredClone(facts), number, printingKey: `${number}::standard`, databaseIds: [], extensions: [], life: facts.category === 'LEADER' ? 5 : null, lifeEvidence: facts.category === 'LEADER' ? [{ value: 5, field: 'life', language: 'en', checkedAt: '2026-10-10', source: 'https://en.onepiece-cardgame.com/cardlist/?series=569001' }] : [] }))
  // Synthetic test Leader only: not an official card, not persisted or admitted by M0.
  const other = structuredClone(inputs.find(c => c.number === 'ST01-001')!)
  other.number = 'OP99-999'; other.printingKey = 'OP99-999::standard'; other.life = 6
  other.lifeEvidence![0].value = 6
  inputs.push(other)
  const catalog = consolidateDefinitions(inputs)
  assert.deepEqual(catalog.errors, [])
  const main = inputs.filter(i => i.category === 'CHARACTER').map((i, n, all) => ({ printingKey: i.printingKey, quantity: n === all.length - 1 ? 2 : 4 }))
  return { gameId: 'm1-test', seed, chooserId: 'alice', players: [{ id: 'alice', cards: [{ printingKey: 'ST01-001::standard', quantity: 1 }, ...main], donCount: 10 }, { id: 'bob', cards: [{ printingKey: 'OP99-999::standard', quantity: 1 }, ...main], donCount: 10 }], ...catalog, ruleset: { ...structuredClone(M0_RULESET), date: '2026-10-11', allowedNumbers: [...M0_RULESET.allowedNumbers, 'OP99-999'] } }
}
function accepted(state: GameState, partial: Omit<Command, 'id' | 'expectedVersion'> & { choice?: 'FIRST' | 'SECOND'; redraw?: boolean }, id = `cmd-${state.version}`) {
  const result = applyCommand(state, { ...partial, id, expectedVersion: state.version })
  if (!result.ok) assert.fail(result.error)
  return result.state
}
function chosen(input = fixture(), choice: 'FIRST' | 'SECOND' = 'FIRST') {
  return accepted(createGame(input), { actorId: input.chooserId!, type: 'CHOOSE_FIRST', choice })
}
function prepared(input = fixture(), redraw = false) {
  let state = chosen(input)
  state = accepted(state, { actorId: 'alice', type: 'MULLIGAN', redraw })
  return accepted(state, { actorId: 'bob', type: 'MULLIGAN', redraw })
}

// Comprehensive v1.2.1 §§5-1, 5-2: exactly two players, one Leader, 50 + 10 cards.
test('M1 creates 122 unique instances and initializes all zones without mutating inputs', () => {
  const input = fixture(); const before = JSON.stringify(input)
  const state = createGame(input)
  assert.equal(JSON.stringify(input), before)
  assert.equal(Object.keys(state.instances).length, 122)
  assert.equal(new Set(Object.keys(state.instances)).size, 122)
  assert.equal(state.phase, 'CHOOSE_FIRST'); assert.equal(state.activePlayerId, null)
  for (const p of state.players) {
    assert.equal(p.zones.deck.length, 50); assert.equal(p.zones.donDeck.length, 10)
    assert.equal(p.zones.leader.length, 1); assert.equal(p.zones.cost.length, 0)
    assert.equal(p.zones.life.length, 0); assert.equal(p.zones.hand.length, 0)
  }
  assertGameInvariants(state)
})
test('M1 validates decks, DON count, player identity, data provenance and ruleset before shuffling', () => {
  let input = fixture(); input.players[0].donCount = 9
  assert.throws(() => createGame(input), /EXACTLY_TEN_DON/)
  input = fixture(); input.players[0].cards[1].quantity = 3
  assert.throws(() => createGame(input), /EXACTLY_FIFTY_MAIN/)
  input = fixture(); input.players[1].id = 'alice'
  assert.throws(() => createGame(input), /INVALID_GAME_OR_PLAYERS/)
  input = fixture(); input.definitions.find(d => d.category === 'LEADER')!.life = null
  assert.throws(() => createGame(input), /INVALID_CATALOG_DEFINITION/)
  input = fixture(); input.ruleset.date = '2026-10-13'
  assert.throws(() => createGame(input), /RESTRICTIONS_OUT_OF_DATE/)
  input = fixture(); input.ruleset.competitive = true
  assert.throws(() => createGame(input), /FORMAT_NOT_VERIFIED/)
  input = fixture(); input.players[0].cards[1].quantity = 5
  assert.throws(() => createGame(input), /TOO_MANY_COPIES/)
  input = fixture(); input.definitions[0].colors = ['BLUE']
  assert.throws(() => createGame(input), /INCOMPATIBLE_COLOR/)
})
// §§5-2-1-4/5: chooser decides first OR second, not automatically the winner going first.
test('M1 chooser may choose second; only chooser has the decision action', () => {
  const state = createGame(fixture())
  assert.deepEqual(getLegalActions(state, 'bob'), [])
  assert.equal(getLegalActions(state, 'alice')[0].type, 'CHOOSE_FIRST')
  const next = accepted(state, { actorId: 'alice', type: 'CHOOSE_FIRST', choice: 'SECOND' })
  assert.equal(next.firstPlayerId, 'bob'); assert.equal(next.decisionPlayerId, 'bob')
  for (const p of next.players) assert.equal(p.zones.hand.length, 5)
  assert.equal(applyCommand(next, { id: 'wrong-order', expectedVersion: next.version, actorId: 'alice', type: 'MULLIGAN', redraw: false }).ok, false)
})
test('M1 random determination is injected and reproducible, supporting either chooser', () => {
  const input = fixture(); delete input.chooserId
  const low = { id: 'test-low', next: (value: number) => ({ value: value + 1, sample: 0 }) }
  const high = { id: 'test-high', next: (value: number) => ({ value: value + 1, sample: 0.99 }) }
  assert.equal(createGame(input, low).chooserId, 'alice')
  assert.equal(createGame(input, high).chooserId, 'bob')
  assert.deepEqual(createGame(input), createGame(input))
  const bad = { id: 'bad', next: (value: number) => ({ value, sample: 1 }) }
  assert.throws(() => createGame(input, bad), /INVALID_RNG_OUTPUT/)
  assert.throws(() => createGame({ ...input, seed: 0 }), /INVALID_SEED/)
})
// §5-2-1-6: all five cards returned, full reshuffle, one redraw; first player decides first.
test('M1 full mulligan uses the entire deck once and conserves every instance', () => {
  const state = chosen(); const before = JSON.stringify(state)
  const next = accepted(state, { actorId: 'alice', type: 'MULLIGAN', redraw: true })
  assert.equal(JSON.stringify(state), before)
  assert.equal(next.players[0].mulligan, 'REDRAWN')
  assert.equal(next.players[0].zones.hand.length, 5)
  assert.equal(next.random.draws - state.random.draws, 49)
  assert.deepEqual(new Set([...next.players[0].zones.deck, ...next.players[0].zones.hand]), new Set([...state.players[0].zones.deck, ...state.players[0].zones.hand]))
  assert.equal(next.decisionPlayerId, 'bob')
  assert.deepEqual(getLegalActions(next, 'alice'), [])
  assert.equal(applyCommand(next, { id: 'again', actorId: 'alice', expectedVersion: next.version, type: 'MULLIGAN', redraw: true }).ok, false)
  assertGameInvariants(next)
})
// §§2-9, 5-2-1-7: Life after both decisions; deck top becomes bottom Life.
test('M1 Life is Leader-specific, reversed from deck and remains hidden from its owner', () => {
  let state = chosen()
  state = accepted(state, { actorId: 'alice', type: 'MULLIGAN', redraw: false })
  assert.equal(state.players[0].zones.life.length, 0)
  const tops = state.players.map(p => p.zones.deck.slice(0, p.id === 'alice' ? 5 : 6))
  const next = accepted(state, { actorId: 'bob', type: 'MULLIGAN', redraw: false })
  assert.deepEqual(next.players[0].zones.life, tops[0].reverse())
  assert.deepEqual(next.players[1].zones.life, tops[1].reverse())
  assert.equal(next.players[0].zones.deck.length, 40); assert.equal(next.players[1].zones.deck.length, 39)
  assert.equal(next.phase, 'REFRESH'); assert.equal(next.turn, 1); assert.equal(next.activePlayerId, 'alice')
  assert.equal(next.automaticPlayReady, false); assert.deepEqual(getLegalActions(next, 'alice'), [])
})
test('M1 same seed and commands give identical states, including after JSON rehydration', () => {
  assert.deepEqual(prepared(fixture(31), true), prepared(fixture(31), true))
  assert.notDeepEqual(prepared(fixture(31), true).players[0].zones.deck, prepared(fixture(32), true).players[0].zones.deck)
  const state = chosen()
  const restored = restoreGame(JSON.stringify(state))
  assert.deepEqual(restored, state)
  const command = { id: 'replay', actorId: 'alice', expectedVersion: state.version, type: 'MULLIGAN', redraw: true }
  assert.deepEqual(applyCommand(state, command), applyCommand(restored, command))
  assert.deepEqual(restoreGame(JSON.stringify(prepared())), prepared())
})
// §§3-2, 3-4, 3-10: secret zones and server randomness must not escape in views/logs.
test('M1 projections disclose only own hand, public cards and counts; spectator sees no hand', () => {
  const state = prepared(); const before = JSON.stringify(state)
  const view = projectState(state, 'alice'); const json = JSON.stringify(view)
  assert.equal(view.players[0].hand!.length, 5); assert.equal(view.players[1].hand, null)
  for (const p of state.players) for (const id of [...p.zones.deck, ...p.zones.life]) assert.equal(json.includes(`"${id}"`), false)
  for (const id of state.players[1].zones.hand) assert.equal(json.includes(`"${id}"`), false)
  assert.equal('random' in view, false); assert.equal('instances' in view, false); assert.equal('commands' in view, false); assert.equal('catalog' in view, false)
  assert.equal(projectState(state, null).players.every(p => p.hand === null), true)
  assert.throws(() => projectState(state, 'intruder'), /UNKNOWN_VIEWER/)
  assert.equal(view.players[1].donDeck.length, 10, 'DON deck is an open area (§3-3)')
  view.players[0].hand![0].id = 'changed'
  assert.equal(JSON.stringify(state), before)
})
test('M1 stale, spoofed, extra fields, invalid phase and malformed commands never mutate state', () => {
  const state = chosen(); const before = JSON.stringify(state)
  const commands = [null, [], {}, { id: 'x', actorId: 'alice', expectedVersion: 0, type: 'MULLIGAN', redraw: false }, { id: 'x', actorId: 'stranger', expectedVersion: 1, type: 'MULLIGAN', redraw: false }, { id: 'x', actorId: 'alice', expectedVersion: 1, type: 'MULLIGAN', redraw: 'yes' }, { id: 'x', actorId: 'alice', expectedVersion: 1, type: 'MULLIGAN', redraw: false, cardIds: [] }, { id: 'x', actorId: 'alice', expectedVersion: 1, type: 'ACTIVATE_EFFECT' }]
  for (const command of commands) assert.equal(applyCommand(state, command).ok, false)
  assert.equal(JSON.stringify(state), before)
  assert.equal(applyCommand(prepared(), { id: 'late', actorId: 'alice', expectedVersion: 3, type: 'MULLIGAN', redraw: false }).ok, false)
})
test('M1 duplicate command is idempotent and same ID with changed intent is rejected', () => {
  const state = chosen()
  const command = { id: 'one', actorId: 'alice', expectedVersion: state.version, type: 'MULLIGAN', redraw: true }
  const result = applyCommand(state, command); if (!result.ok) assert.fail(result.error)
  const replay = applyCommand(result.state, { ...command }); if (!replay.ok) assert.fail(replay.error)
  assert.equal(replay.replayed, true); assert.deepEqual(replay.state, result.state); assert.deepEqual(replay.events, [])
  assert.deepEqual(applyCommand(result.state, { ...command, redraw: false }), { ok: false, error: 'COMMAND_ID_CONFLICT' })
})
test('M1 invariants reject lost, duplicated or misplaced cards and invalid snapshots', () => {
  const state = prepared()
  const lost = structuredClone(state); lost.players[0].zones.deck.pop()
  assert.throws(() => restoreGame(JSON.stringify(lost)), /CARD_CONSERVATION|INVALID_SETUP_COUNTS/)
  const duplicate = structuredClone(state); duplicate.players[0].zones.hand[0] = duplicate.players[0].zones.deck[0]
  assert.throws(() => assertGameInvariants(duplicate), /DUPLICATE_OR_MISPLACED/)
  const foreign = structuredClone(state); foreign.instances[foreign.players[0].zones.hand[0]].owner = 'bob'
  assert.throws(() => assertGameInvariants(foreign), /CARD_CONSERVATION|MISPLACED/)
  const phase = structuredClone(state); phase.phase = 'MAIN'
  assert.deepEqual(applyCommand(phase, {}), { ok: false, error: 'INVALID_STATE' })
  assert.throws(() => restoreGame(JSON.stringify(projectState(state, 'alice'))))
})
test('M1 failed injected RNG rolls back the entire mulligan', () => {
  const state = chosen(); const before = JSON.stringify(state)
  const command = { id: 'failed', actorId: 'alice', expectedVersion: state.version, type: 'MULLIGAN', redraw: true }
  assert.deepEqual(applyCommand(state, command, { id: seededRandom.id, next: () => { throw new Error('RNG_FAILED') } }), { ok: false, error: 'RNG_FAILED' })
  assert.equal(JSON.stringify(state), before)
  assert.deepEqual(applyCommand(state, command, { id: 'wrong', next: seededRandom.next }), { ok: false, error: 'RNG_ALGORITHM_MISMATCH' })
})
test('M1 conservation and deterministic setup hold across 100 seeded mulligan combinations', () => {
  for (let seed = 1; seed <= 100; seed++) {
    let state = chosen(fixture(seed), seed % 2 ? 'FIRST' : 'SECOND')
    for (let step = 0; step < 2; step++) {
      state = accepted(state, { actorId: state.decisionPlayerId!, type: 'MULLIGAN', redraw: (seed + step) % 2 === 0 })
      assertGameInvariants(state)
    }
    assert.equal(state.phase, 'REFRESH'); assert.equal(Object.keys(state.instances).length, 122)
  }
})
test('M1 Fisher-Yates is an injected shuffle, not sort with random comparisons', () => {
  const random = { algorithm: 'test', value: 1, draws: 0 }
  const values = [1, 2, 3, 4]
  assert.deepEqual(shuffle(values, random, { id: 'test', next: v => ({ value: v + 1, sample: 0 }) }), [2, 3, 4, 1])
  assert.deepEqual(values, [1, 2, 3, 4]); assert.equal(random.draws, 3)
})
test('M1 prepares two real M0 decks while preventing execution of their unsupported effects', () => {
  const input = fixture()
  input.definitions = input.definitions.filter(d => d.number !== 'OP99-999')
  input.printings = input.printings.filter(p => !p.printingKey.startsWith('OP99-999'))
  input.players[1].cards[0].printingKey = 'ST01-001::standard'
  input.ruleset.allowedNumbers = Object.keys(REVIEWED_CARDS)
  const state = prepared(input)
  assert.deepEqual(state.players.map(p => p.zones.life.length), [5, 5])
  assert.deepEqual(state.unsupportedEffects, ['blocker', 'giveRestedDon'])
  assert.equal(state.automaticPlayReady, false)
  assert.deepEqual(applyCommand(state, { id: 'effect', actorId: 'alice', expectedVersion: 3, type: 'ACTIVATE_EFFECT', instanceId: state.players[0].zones.leader[0] }), { ok: false, error: 'INVALID_COMMAND' })
  // Even claiming a capability in supplied ruleset cannot expand the implemented command set.
  input.ruleset.capabilities = ['giveRestedDon', 'blocker']
  assert.equal(prepared(input).automaticPlayReady, false)
})
test('M1 no default Life; explicit zero is kept and ambiguous evidence is rejected', () => {
  const input = fixture()
  const leader = input.definitions.find(d => d.number === 'OP99-999')!
  leader.life = 0; leader.lifeEvidence[0].value = 0
  assert.equal(prepared(input).players[1].zones.life.length, 0)
  leader.lifeEvidence.push({ ...leader.lifeEvidence[0], value: 6 })
  assert.throws(() => createGame(input), /INVALID_CATALOG_DEFINITION/)
})
test('M1 rejects a setup timing disguised as a known effect and out-of-order restored decisions', () => {
  const incomplete = fixture()
  const missingProgram = incomplete.definitions.find(d => d.number === 'ST01-001')!.review
  missingProgram.effects = []; missingProgram.requiredCapabilities = []
  assert.throws(() => createGame(incomplete), /INCOMPLETE_EFFECT_PROGRAM/)
  const input = fixture()
  const effect = input.definitions.find(d => d.number === 'ST01-001')!.review.effects[0]
  Object.assign(effect, { timing: 'START_GAME' })
  assert.throws(() => createGame(input), /UNSUPPORTED_SETUP_EFFECT/)
  const state = chosen(); state.players[1].mulligan = 'KEPT'
  assert.throws(() => restoreGame(JSON.stringify(state)), /MULLIGAN_OUT_OF_ORDER/)
})
