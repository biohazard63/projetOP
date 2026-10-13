import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { certificationErrors, certificationOf, effectiveStatus } from '../src/game/cards/certification'
import { M3_ABILITY_CARDS, M3_ABILITY_REGISTRY } from '../src/game/cards/m3Abilities'
import { REVIEWED_CARDS } from '../src/game/cards/reviewedCards'
import { createGame, applyCommand, getLegalActions, projectState, restoreGame } from '../src/game/core/game'
import type { GameInput, GameState, Command } from '../src/game/core/types'
import { engineCatalog, engineRegistry, engineRuleset } from '../src/lib/engine/catalog'
import { evaluateCharacteristics } from '../src/game/effects/characteristics'
import { validateRegistry } from '../src/game/effects/contracts'

type Intent = Command extends infer C ? C extends Command ? Omit<C, 'id' | 'actorId' | 'expectedVersion'> : never : never

function fixture(): GameInput {
  const reviewed = Object.entries(REVIEWED_CARDS).map(([number, facts]) => ({ ...structuredClone(facts), number,
    printingKey: `${number}::standard`, extensions: [], databaseIds: [], life: facts.category === 'LEADER' ? 5 : null,
    lifeEvidence: facts.category === 'LEADER' ? [{ field: 'life' as const, value: 5, source: 'https://en.onepiece-cardgame.com/cardlist/?series=569001', checkedAt: '2026-10-12', language: 'en' as const }] : [] }))
  const catalog = engineCatalog()
  const chars = reviewed.filter(card => card.category === 'CHARACTER')
  const deck = [...chars.slice(0, 10).map(card => ({ printingKey: card.printingKey, quantity: 4 })),
    { printingKey: chars[10].printingKey, quantity: 3 }, { printingKey: 'OP01-016::standard', quantity: 1 },
    { printingKey: 'OP01-006::standard', quantity: 3 }, { printingKey: 'OP01-007::standard', quantity: 3 }]
  deck.unshift({ printingKey: 'ST01-001::standard', quantity: 1 })
  const ruleset = engineRuleset()
  return { definitions: catalog.definitions, printings: catalog.printings,
    gameId: 'm6-official-op01', seed: 61007, scope: 'BASIC_TURNS', chooserId: 'alice',
    players: [{ id: 'alice', cards: structuredClone(deck), donCount: 10 }, { id: 'bob', cards: structuredClone(deck), donCount: 10 }],
    ruleset, effectRegistry: engineRegistry() }
}
function send(state: GameState, actorId: string, intent: Intent): GameState {
  const result = applyCommand(state, { ...intent, id: `m6-${state.version}-${intent.type}`, actorId, expectedVersion: state.version })
  assert.ok(result.ok, result.ok ? '' : result.error)
  return result.state
}
function prepareMain(): GameState {
  let state = createGame(fixture())
  state = send(state, 'alice', { type: 'CHOOSE_FIRST', choice: 'FIRST' })
  for (let n = 0; n < 2; n++) state = send(state, state.decisionPlayerId!, { type: 'MULLIGAN', redraw: false })
  while (state.phase !== 'MAIN') state = send(state, state.activePlayerId!, { type: 'ADVANCE_PHASE' })
  while (state.turn < 3) {
    state = send(state, state.activePlayerId!, { type: 'END_MAIN' })
    while (state.phase !== 'MAIN') state = send(state, state.activePlayerId!, { type: 'ADVANCE_PHASE' })
  }
  return state
}
function numberOf(state: GameState, id: string): string { return state.catalog.definitions.find(d => d.definitionId === state.instances[id].definitionId)!.number }
function moveTo(state: GameState, id: string, to: 'hand' | 'characters', rested = false): void {
  const instance = state.instances[id], owner = state.players.find(p => p.id === instance.owner)!
  owner.zones[instance.zone].splice(owner.zones[instance.zone].indexOf(id), 1)
  owner.zones[to].push(id); instance.zone = to; instance.zoneGeneration++; instance.rested = rested; instance.faceUp = to === 'characters'
}
function placeOnTopOfDeck(state: GameState, id: string): void {
  const instance = state.instances[id], owner = state.players.find(p => p.id === instance.owner)!
  owner.zones[instance.zone].splice(owner.zones[instance.zone].indexOf(id), 1)
  owner.zones.deck.unshift(id); instance.zone = 'deck'; instance.zoneGeneration++; instance.faceUp = false
}
function findNumber(state: GameState, owner: string, number: string): string {
  return Object.values(state.instances).find(i => i.owner === owner && numberOf(state, i.id) === number && ['deck', 'hand'].includes(i.zone))!.id
}
function writeTrace(name: string, trace: unknown): void {
  const directory = resolve(process.cwd(), '../docs/game/evidence/m6')
  mkdirSync(directory, { recursive: true })
  writeFileSync(resolve(directory, name), `${JSON.stringify(trace, null, 2)}\n`)
}

test('M6 official card pack contains reviewed OP01-006 and OP01-007 declarative abilities', () => {
  const numbers = new Set(M3_ABILITY_CARDS.map(card => card.number))
  assert.ok(numbers.has('OP01-006'), 'Otama is not yet loaded into the reviewed engine catalogue')
  assert.ok(numbers.has('OP01-007'), 'Caribou is not yet loaded into the reviewed engine catalogue')
  assert.doesNotThrow(() => validateRegistry(structuredClone(M3_ABILITY_REGISTRY)))
})

test('M6 official Otama lowers only a chosen opposing Character and permits choosing zero', () => {
  let state = prepareMain()
  const target = findNumber(state, 'bob', 'ST01-008')
  moveTo(state, target, 'characters')
  const unselected = findNumber(state, 'bob', 'ST01-003')
  moveTo(state, unselected, 'characters')
  const selectedPowerBefore = evaluateCharacteristics(state, target).power.current
  const unselectedPowerBefore = evaluateCharacteristics(state, unselected).power.current
  const otama = findNumber(state, 'alice', 'OP01-006')
  moveTo(state, otama, 'hand')
  const play = getLegalActions(state, 'alice').find(action => action.type === 'PLAY_CARD' && action.instanceId === otama)
  assert.ok(play?.type === 'PLAY_CARD')
  state = send(state, 'alice', { type: 'PLAY_CARD', instanceId: otama, donIds: play.eligibleDonIds.slice(0, play.cost), replaceId: null })
  const choice = getLegalActions(state, 'alice').find(action => action.type === 'ANSWER_CHOICE')
  assert.ok(choice?.type === 'ANSWER_CHOICE')
  assert.equal(choice.min, 0); assert.equal(choice.max, 1)
  assert.equal(getLegalActions(state, 'bob').some(action => action.type === 'ANSWER_CHOICE'), false)
  assert.deepEqual(choice.options.map(option => 'instanceId' in option ? option.instanceId : undefined), [target, unselected])
  state = send(state, 'alice', { type: 'ANSWER_CHOICE', choiceId: choice.choiceId, tokens: [choice.options.find(option => 'instanceId' in option && option.instanceId === target)!.token] })
  assert.equal(selectedPowerBefore, 5000)
  assert.equal(evaluateCharacteristics(state, target).power.current, 3000)
  assert.equal(unselectedPowerBefore, 3000)
  assert.equal(evaluateCharacteristics(state, unselected).power.current, unselectedPowerBefore)
  assert.ok(restoreGame(JSON.stringify(state)))
  writeTrace('official-op01-006-target.json', { ruleset: state.ruleset.id, rulesVersion: state.ruleset.rulesVersion, card: 'OP01-006', target: 'ST01-008', selectedPowerBefore, selectedPowerAfter: evaluateCharacteristics(state, target).power.current, unselectedPowerBefore, unselectedPowerAfter: evaluateCharacteristics(state, unselected).power.current, optional: true, pendingChoicePrivateToController: true, restored: true })
})

test('M6 official Otama choosing zero does not create a power modifier', () => {
  let state = prepareMain()
  const target = findNumber(state, 'bob', 'ST01-008')
  moveTo(state, target, 'characters')
  const otama = findNumber(state, 'alice', 'OP01-006')
  moveTo(state, otama, 'hand')
  const play = getLegalActions(state, 'alice').find(action => action.type === 'PLAY_CARD' && action.instanceId === otama)
  assert.ok(play?.type === 'PLAY_CARD')
  state = send(state, 'alice', { type: 'PLAY_CARD', instanceId: otama, donIds: play.eligibleDonIds.slice(0, play.cost), replaceId: null })
  const choice = getLegalActions(state, 'alice').find(action => action.type === 'ANSWER_CHOICE')
  assert.ok(choice?.type === 'ANSWER_CHOICE')
  state = send(state, 'alice', { type: 'ANSWER_CHOICE', choiceId: choice.choiceId, tokens: [] })
  assert.equal(evaluateCharacteristics(state, target).power.current, 5000)
  assert.equal(state.effects!.powerModifiers!.length, 0)
  writeTrace('official-op01-006-decline.json', { ruleset: state.ruleset.id, card: 'OP01-006', choice: 'zero targets', targetPowerAfter: 5000, modifiersCreated: 0 })
})

test('M6 official OP01-016 Nami resolves its private search through the /play MUGIWARA_FREE catalogue', () => {
  let state = prepareMain()
  const nami = findNumber(state, 'alice', 'OP01-016')
  moveTo(state, nami, 'hand')
  const eligible = findNumber(state, 'alice', 'ST01-008')
  placeOnTopOfDeck(state, eligible)
  const play = getLegalActions(state, 'alice').find(action => action.type === 'PLAY_CARD' && action.instanceId === nami)
  assert.ok(play?.type === 'PLAY_CARD')
  state = send(state, 'alice', { type: 'PLAY_CARD', instanceId: nami, donIds: play.eligibleDonIds.slice(0, play.cost), replaceId: null })
  const select = getLegalActions(state, 'alice').find(action => action.type === 'ANSWER_CHOICE')
  assert.ok(select?.type === 'ANSWER_CHOICE')
  assert.equal(state.effects?.choice?.visibility, 'PRIVATE')
  assert.equal(getLegalActions(state, 'bob').some(action => action.type === 'ANSWER_CHOICE'), false)
  assert.equal(select.options.some(option => 'instanceId' in option && option.instanceId === eligible), true)
  const bobView = projectState(state, 'bob')
  assert.equal(JSON.stringify(bobView).includes(eligible), false)
  state = send(state, 'alice', { type: 'ANSWER_CHOICE', choiceId: select.choiceId, tokens: [select.options.find(option => 'instanceId' in option && option.instanceId === eligible)!.token] })
  assert.equal(state.instances[eligible].zone, 'hand')
  const order = getLegalActions(state, 'alice').find(action => action.type === 'ANSWER_CHOICE')
  assert.ok(order?.type === 'ANSWER_CHOICE')
  assert.equal(state.effects?.choice?.choiceType, 'ORDER')
  assert.equal(state.effects?.choice?.visibility, 'PRIVATE')
  state = send(state, 'alice', { type: 'ANSWER_CHOICE', choiceId: order.choiceId, tokens: order.options.map(option => option.token) })
  assert.equal(state.effects?.choice, null)
  assert.ok(restoreGame(JSON.stringify(state)))
  writeTrace('official-op01-016-search.json', { ruleset: state.ruleset.id, rulesVersion: state.ruleset.rulesVersion, card: 'OP01-016', lookedAt: 5, selectedTrait: 'Straw Hat Crew', selectedCard: 'ST01-008', selectedDestination: state.instances[eligible].zone, remainingCards: 'ordered at bottom by the player', choicePrivateToController: true, restored: true })
})

test('M6 official Caribou On K.O. resolves only after a confirmed battle K.O. and filters current power', () => {
  let state = prepareMain()
  const caribou = findNumber(state, 'bob', 'OP01-007')
  moveTo(state, caribou, 'characters', true)
  const eligible = findNumber(state, 'alice', 'ST01-003')
  moveTo(state, eligible, 'characters')
  const tooStrong = findNumber(state, 'alice', 'ST01-008')
  moveTo(state, tooStrong, 'characters')
  const attacker = state.players[0].zones.leader[0]
  state = send(state, 'alice', { type: 'DECLARE_ATTACK', attackerId: attacker, targetId: caribou })
  state = send(state, 'bob', { type: 'PASS_BLOCKER', battleId: state.battle!.id })
  state = send(state, 'bob', { type: 'PASS_COUNTER', battleId: state.battle!.id })
  state = send(state, 'alice', { type: 'RESOLVE_BATTLE', battleId: state.battle!.id })
  assert.equal(state.instances[caribou].zone, 'trash')
  assert.ok(state.events.some(event => event.type === 'CHARACTER_KO' && event.publicInstanceId === caribou))
  const choice = getLegalActions(state, 'bob').find(action => action.type === 'ANSWER_CHOICE')
  assert.ok(choice?.type === 'ANSWER_CHOICE')
  assert.equal(getLegalActions(state, 'alice').some(action => action.type === 'ANSWER_CHOICE'), false)
  assert.equal(choice.options.some(option => 'instanceId' in option && option.instanceId === eligible), true)
  assert.equal(choice.options.some(option => 'instanceId' in option && option.instanceId === tooStrong), false)
  state = send(state, 'bob', { type: 'ANSWER_CHOICE', choiceId: choice.choiceId, tokens: [choice.options.find(option => 'instanceId' in option && option.instanceId === eligible)!.token] })
  assert.equal(state.instances[eligible].zone, 'trash')
  assert.equal(state.instances[tooStrong].zone, 'characters')
  assert.equal(state.effects!.cardOperations!.filter(operation => operation.type === 'KO' && operation.outcome === 'CONFIRMED').length >= 2, true)
  assert.ok(restoreGame(JSON.stringify(state)))
  writeTrace('official-op01-007-on-ko.json', { ruleset: state.ruleset.id, rulesVersion: state.ruleset.rulesVersion, card: 'OP01-007', cause: 'confirmed battle K.O.', eligibleTarget: 'ST01-003', excludedTarget: 'ST01-008', targetAfter: state.instances[eligible].zone, excludedAfter: state.instances[tooStrong].zone, triggerControllerOnly: true, restored: true })
})

test('M6 official OP01 ability cards have valid revision-bound certifications in the /play catalog', () => {
  for (const number of ['OP01-006', 'OP01-007', 'OP01-016', 'OP06-013']) {
    const card = M3_ABILITY_CARDS.find(item => item.number === number)!
    const definition = engineCatalog().definitions.find(item => item.number === number)!
    const cert = certificationOf(definition.definitionId)
    assert.ok(cert)
    assert.deepEqual(certificationErrors(cert, definition, M3_ABILITY_REGISTRY), [])
    assert.equal(effectiveStatus(definition), 'PLAYABLE_VERIFIED')
    assert.equal(engineRuleset().allowedNumbers.includes(number), true)
  }
})

test('M6 server catalogue uses the extended strict registry rather than an ID-specific runtime path', () => {
  const catalog = engineCatalog()
  const ids = new Set(catalog.definitions.map(definition => definition.definitionId))
  assert.ok(ids.has('OP01-006@m6-2026-10-12'))
  assert.ok(ids.has('OP01-007@m6-2026-10-12'))
  assert.ok(engineRegistry().definitions.some(definition => definition.id === 'OP01-006.on-play-power'))
  assert.ok(engineRegistry().definitions.some(definition => definition.id === 'OP01-007.on-ko'))
  assert.ok(ids.has('OP01-016@m3-2026-10-12'))
  assert.ok(engineRegistry().definitions.some(definition => definition.id === 'OP01-016.search'))
  assert.ok(ids.has('OP06-013@official-2026-10-11'))
  assert.ok(engineRegistry().definitions.some(definition => definition.id === 'OP06-013.on-play-film-search.trigger'))
})
