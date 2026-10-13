import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createGame, applyCommand, getLegalActions, restoreGame } from '../src/game/core/game'
import type { Command, GameInput, GameState, LegalAction } from '../src/game/core/types'
import { engineCatalog, currentEngineRegistry, engineRuleset } from '../src/lib/engine/catalog'
import { evaluateCharacteristics } from '../src/game/effects/characteristics'
import { effectiveStatus } from '../src/game/cards/certification'
import st01Rows from '../carteJson/ST-01/cards-ST-01.json'

type Intent = Command extends infer C ? C extends Command ? Omit<C, 'id' | 'actorId' | 'expectedVersion'> : never : never
type LocalST01Number = 'ST01-002' | 'ST01-004' | 'ST01-007' | 'ST01-011' | 'ST01-012' | 'ST01-013' | 'ST01-015' | 'ST01-016' | 'ST01-017'
function fixture(extraNumbers: LocalST01Number[] = []): GameInput {
  const catalog = engineCatalog()
  const characters = catalog.definitions.filter(card => card.category === 'CHARACTER')
  const cards = [...characters.slice(0, 10).map(card => ({ printingKey: `${card.number}::standard`, quantity: 4 })),
    { printingKey: `${characters[10].number}::standard`, quantity: 3 },
    { printingKey: 'OP01-016::standard', quantity: 1 }, { printingKey: 'OP01-006::standard', quantity: 3 },
    { printingKey: 'OP01-007::standard', quantity: 3 }]
  cards.unshift({ printingKey: 'ST01-001::standard', quantity: 1 })
  const replace = cards.findIndex(entry => entry.printingKey !== 'ST01-001::standard' && entry.quantity > 1)
  cards[replace].quantity--
  cards.push({ printingKey: 'ST01-005::standard', quantity: 1 })
  for (const number of extraNumbers) {
    if (cards.some(entry => entry.printingKey === `${number}::standard`)) continue
    const replaceExtra = cards.findIndex(entry => entry.printingKey !== 'ST01-001::standard' && entry.printingKey !== 'ST01-005::standard' && entry.quantity > 1)
    assert.notEqual(replaceExtra, -1)
    cards[replaceExtra].quantity--
    cards.push({ printingKey: `${number}::standard`, quantity: 1 })
  }
  const ruleset = engineRuleset()
  ruleset.allowedNumbers.push('ST01-005', ...extraNumbers)
  return { ...catalog, gameId: 'm6-local-st01-jinbe', seed: 61013, scope: 'BASIC_TURNS', chooserId: 'alice',
    players: [{ id: 'alice', cards: structuredClone(cards), donCount: 10 }, { id: 'bob', cards: structuredClone(cards), donCount: 10 }], ruleset, effectRegistry: currentEngineRegistry() }
}
function send(state: GameState, actorId: string, intent: Intent): GameState {
  const result = applyCommand(state, { ...intent, id: `m6-local-${state.version}-${intent.type}`, actorId, expectedVersion: state.version })
  assert.ok(result.ok, result.ok ? '' : result.error)
  return result.state
}
function prepareMain(extraNumbers: LocalST01Number[] = [], targetTurn = 3): GameState {
  let state = createGame(fixture(extraNumbers))
  state = send(state, 'alice', { type: 'CHOOSE_FIRST', choice: 'FIRST' })
  for (let index = 0; index < 2; index++) state = send(state, state.decisionPlayerId!, { type: 'MULLIGAN', redraw: false })
  while (state.phase !== 'MAIN') state = send(state, state.activePlayerId!, { type: 'ADVANCE_PHASE' })
  while (state.turn < targetTurn) {
    state = send(state, state.activePlayerId!, { type: 'END_MAIN' })
    while (state.phase !== 'MAIN') state = send(state, state.activePlayerId!, { type: 'ADVANCE_PHASE' })
  }
  return state
}
function moveToHandWithSwap(state: GameState, id: string): void {
  const card = state.instances[id], owner = state.players.find(player => player.id === card.owner)!
  if (card.zone === 'hand') return
  assert.ok(['deck', 'life'].includes(card.zone))
  const replacementId = owner.zones.hand[0]
  const replacement = state.instances[replacementId]
  const sourceZone = card.zone as 'deck' | 'life'
  owner.zones[sourceZone].splice(owner.zones[sourceZone].indexOf(id), 1); owner.zones.hand.push(id)
  owner.zones.hand.splice(owner.zones.hand.indexOf(replacementId), 1)
  if (sourceZone === 'deck') owner.zones.deck.unshift(replacementId)
  else owner.zones.life.push(replacementId)
  card.zone = 'hand'; card.zoneGeneration++; card.faceUp = false
  replacement.zone = sourceZone; replacement.zoneGeneration++; replacement.faceUp = false
}
function playJinbeAndWait(state: GameState): GameState {
  const source = jinbe(state)
  moveToHandWithSwap(state, source)
  const play = getLegalActions(state, 'alice').find(action => action.type === 'PLAY_CARD' && action.instanceId === source)
  assert.ok(play?.type === 'PLAY_CARD')
  state = send(state, 'alice', { type: 'PLAY_CARD', instanceId: source, donIds: play.eligibleDonIds.slice(0, play.cost), replaceId: null })
  state = send(state, 'alice', { type: 'END_MAIN' })
  while (state.phase !== 'MAIN') state = send(state, state.activePlayerId!, { type: 'ADVANCE_PHASE' })
  state = send(state, 'bob', { type: 'END_MAIN' })
  while (state.phase !== 'MAIN') state = send(state, state.activePlayerId!, { type: 'ADVANCE_PHASE' })
  return state
}
function jinbe(state: GameState): string {
  return Object.values(state.instances).find(card => card.owner === 'alice' && card.definitionId?.startsWith('ST01-005@'))!.id
}
function instanceFor(state: GameState, number: string): string {
  const definition = state.catalog.definitions.find(card => card.number === number)!
  return Object.values(state.instances).find(card => card.owner === 'alice' && card.definitionId === definition.definitionId)!.id
}
function playCardFromAnyZone(state: GameState, number: string): GameState {
  const instanceId = instanceFor(state, number)
  moveToHandWithSwap(state, instanceId)
  const action = getLegalActions(state, 'alice').find(candidate => candidate.type === 'PLAY_CARD' && candidate.instanceId === instanceId)
  assert.ok(action?.type === 'PLAY_CARD', `cannot play ${number}; phase=${state.phase} turn=${state.turn} actions=${JSON.stringify(getLegalActions(state, 'alice'))}`)
  return send(state, 'alice', { type: 'PLAY_CARD', instanceId, donIds: action.eligibleDonIds.slice(0, action.cost), replaceId: null })
}
function writeTrace(name: string, value: unknown): void {
  const directory = resolve(process.cwd(), '../docs/game/evidence/m6')
  mkdirSync(directory, { recursive: true })
  writeFileSync(resolve(directory, name), `${JSON.stringify(value, null, 2)}\n`)
}

test('M6 local ST-01 Jinbe resolves its cardJson When Attacking text through the shared scheduler', () => {
  let state = playJinbeAndWait(prepareMain())
  const source = jinbe(state), target = state.players[0].zones.leader[0]
  const definition = state.catalog.definitions.find(card => card.number === 'ST01-005')!
  assert.equal(definition.review.faqChecked, true, 'FAQ/errata re-read in M6 Lot A')
  assert.equal(effectiveStatus(definition), 'PLAYABLE_VERIFIED')
  assert.equal(engineRuleset().allowedNumbers.includes('ST01-005'), true, 'certified in M6 Lot A: admitted in MUGIWARA_FREE')
  assert.equal(definition.review.effectOriginal, '[DON!! x1] [When Attacking] Up to 1 of your Leader or Character cards other than this card gains +1000 power during this turn.')
  const attach = getLegalActions(state, 'alice').find(action => action.type === 'ATTACH_DON' && action.targetIds.includes(source))
  assert.ok(attach?.type === 'ATTACH_DON')
  state = send(state, 'alice', { type: 'ATTACH_DON', donIds: [attach.eligibleDonIds[0]], targetId: source })
  state = send(state, 'alice', { type: 'DECLARE_ATTACK', attackerId: source, targetId: state.players[1].zones.leader[0] })
  assert.equal(state.effects?.choice?.actorId, 'alice')
  const options = getLegalActions(state, 'alice').find(action => action.type === 'ANSWER_CHOICE')
  assert.ok(options?.type === 'ANSWER_CHOICE')
  assert.equal(options.options.some(option => 'instanceId' in option && option.instanceId === source), false, 'the attacking card cannot target itself')
  assert.equal(options.options.some(option => 'instanceId' in option && option.instanceId === target), true)
  assert.equal(getLegalActions(state, 'bob').some(action => action.type === 'ANSWER_CHOICE'), false)
  state = restoreGame(JSON.stringify(state))
  const restoredChoice = getLegalActions(state, 'alice').find(action => action.type === 'ANSWER_CHOICE')
  assert.ok(restoredChoice?.type === 'ANSWER_CHOICE')
  state = send(state, 'alice', { type: 'ANSWER_CHOICE', choiceId: restoredChoice.choiceId, tokens: [restoredChoice.options.find(option => 'instanceId' in option && option.instanceId === target)!.token] })
  assert.equal(evaluateCharacteristics(state, target).power.current, 6000)
  assert.equal(state.effects?.choice, null)
  writeTrace('st01-jinbe-cardjson-trace.json', { source: 'cardgame/carteJson/ST-01/cards-ST-01.json', cardNumber: 'ST01-005', abilityId: 'ST01-005.when-attacking', condition: 'one DON!! attached to source', targetRule: 'up to one own Leader or Character other than the source', operation: '+1000 power until turn end', targetPowerAfter: evaluateCharacteristics(state, target).power.current, restoredDuringPrivateChoice: true, certification: effectiveStatus(definition) })
})

test('M6 local ST-01 Jinbe does not activate its DON!!-gated ability without an attached DON!!', () => {
  let state = playJinbeAndWait(prepareMain())
  const source = jinbe(state)
  state = send(state, 'alice', { type: 'DECLARE_ATTACK', attackerId: source, targetId: state.players[1].zones.leader[0] })
  assert.equal(state.effects?.choice, null)
  assert.equal(state.effects?.scheduler?.batches.flatMap(batch => batch.triggers).some(trigger => trigger.definitionId === 'ST01-005.when-attacking'), false)
})

test('M6 local ST-01 Gum-Gum Jet Pistol is loaded from cardJson as Main and Trigger DSL programs', () => {
  const row = st01Rows.find(card => card.code === 'ST01-015')!
  const catalog = engineCatalog(), registry = currentEngineRegistry()
  const card = catalog.definitions.find(definition => definition.number === row.code)
  assert.ok(card)
  assert.equal(card.review.effectOriginal, row.effect)
  assert.equal(card.review.triggerOriginal, row.trigger)
  assert.equal(card.review.faqChecked, true)
  assert.equal(effectiveStatus(card), 'PLAYABLE_VERIFIED')
  assert.ok(registry.definitions.some(effect => effect.id === 'ST01-015.main-ko-character' && effect.timing === 'MAIN'))
  assert.ok(registry.definitions.some(effect => effect.id === 'ST01-015.main-ko-character.trigger' && effect.timing === 'TRIGGER'))
})

test('M6 local ST-01 Gum-Gum Jet Pistol Main KOs only an opposing Character at 6000 power or less', () => {
  let state = prepareMain(['ST01-015'], 5)
  const eventId = instanceFor(state, 'ST01-015')
  moveToHandWithSwap(state, eventId)
  const opponent = state.players[1]
  const targetDefinition = state.catalog.definitions.find(card => card.number === 'ST01-003')!
  const target = Object.values(state.instances).find(card => card.owner === 'bob' && card.definitionId === targetDefinition.definitionId && card.zone === 'deck')!
  opponent.zones.deck.splice(opponent.zones.deck.indexOf(target.id), 1); opponent.zones.characters.push(target.id)
  target.zone = 'characters'; target.zoneGeneration++; target.faceUp = true
  const action = getLegalActions(state, 'alice').find(candidate => candidate.type === 'START_EFFECT' && candidate.effectId.includes('ST01-015.main-ko-character'))
  assert.ok(action?.type === 'START_EFFECT')
  state = send(state, 'alice', { type: 'START_EFFECT', effectId: action.effectId })
  const choice = getLegalActions(state, 'alice').find(candidate => candidate.type === 'ANSWER_CHOICE')
  assert.ok(choice?.type === 'ANSWER_CHOICE' && choice.optional)
  assert.ok(choice.options.some(option => 'instanceId' in option && option.instanceId === target.id))
  state = restoreGame(JSON.stringify(state))
  const resumed = getLegalActions(state, 'alice').find(candidate => candidate.type === 'ANSWER_CHOICE')
  assert.ok(resumed?.type === 'ANSWER_CHOICE')
  state = send(state, 'alice', { type: 'ANSWER_CHOICE', choiceId: resumed.choiceId, tokens: [resumed.options.find(option => 'instanceId' in option && option.instanceId === target.id)!.token] })
  assert.equal(state.instances[target.id].zone, 'trash')
  writeTrace('st01-jet-pistol-main-trace.json', { source: 'cardgame/carteJson/ST-01/cards-ST-01.json', cardNumber: 'ST01-015', selectedTarget: 'ST01-003', targetPower: 3000, result: 'KO confirmed', choiceRestoredFromJson: true, certification: effectiveStatus(state.catalog.definitions.find(card => card.number === 'ST01-015')!) })
})

test('M6 local ST-01 Gum-Gum Jet Pistol Main can decline and excludes Characters above its printed power limit', () => {
  let state = prepareMain(['ST01-015'], 5)
  const eventId = instanceFor(state, 'ST01-015')
  moveToHandWithSwap(state, eventId)
  const targetDefinition = state.catalog.definitions.find(card => card.number === 'ST01-003')!
  const target = Object.values(state.instances).find(card => card.owner === 'bob' && card.definitionId === targetDefinition.definitionId && card.zone === 'deck')!
  const opponent = state.players[1]
  opponent.zones.deck.splice(opponent.zones.deck.indexOf(target.id), 1); opponent.zones.characters.push(target.id)
  target.zone = 'characters'; target.zoneGeneration++; target.faceUp = true
  const highTarget = Object.values(state.instances).find(card => card.owner === 'bob' && card.zone === 'deck' && card.kind === 'CARD')!
  const highTargetDefinition = state.catalog.definitions.find(card => card.number === 'P-016')!
  assert.ok(highTargetDefinition.power !== null && highTargetDefinition.power > 6000)
  highTarget.definitionId = highTargetDefinition.definitionId
  highTarget.printingKey = 'P-016::standard'
  opponent.zones.deck.splice(opponent.zones.deck.indexOf(highTarget.id), 1); opponent.zones.characters.push(highTarget.id)
  highTarget.zone = 'characters'; highTarget.zoneGeneration++; highTarget.faceUp = true
  const action = getLegalActions(state, 'alice').find((candidate): candidate is Extract<LegalAction, { type: 'START_EFFECT' }> => candidate.type === 'START_EFFECT' && candidate.effectId.includes('ST01-015.main-ko-character'))!
  state = send(state, 'alice', { type: 'START_EFFECT', effectId: action.effectId })
  const choice = getLegalActions(state, 'alice').find(candidate => candidate.type === 'ANSWER_CHOICE')!
  assert.equal(choice.options.some(option => 'instanceId' in option && option.instanceId === highTarget.id), false)
  state = send(state, 'alice', { type: 'ANSWER_CHOICE', choiceId: choice.choiceId, tokens: [] })
  assert.equal(state.instances[target.id].zone, 'characters')
  assert.equal(state.instances[highTarget.id].zone, 'characters')
})

test('M6 local ST-01 Gum-Gum Jet Pistol Trigger reuses the declared KO program and resumes the suspended Life damage', () => {
  let state = prepareMain(['ST01-015'], 5)
  const eventId = instanceFor(state, 'ST01-015'), eventCard = state.instances[eventId], owner = state.players[0]
  moveToHandWithSwap(state, eventId)
  const sourceZone = eventCard.zone
  const oldLifeId = owner.zones.life.shift()!
  const oldLife = state.instances[oldLifeId]
  owner.zones.deck.push(oldLifeId); oldLife.zone = 'deck'; oldLife.zoneGeneration++; oldLife.faceUp = false
  owner.zones[sourceZone].splice(owner.zones[sourceZone].indexOf(eventId), 1)
  owner.zones.life.unshift(eventId); eventCard.zone = 'life'; eventCard.zoneGeneration++; eventCard.faceUp = false
  const opponent = state.players[1]
  const targetDefinition = state.catalog.definitions.find(card => card.number === 'ST01-003')!
  const target = Object.values(state.instances).find(card => card.owner === 'bob' && card.definitionId === targetDefinition.definitionId && card.zone === 'deck')!
  opponent.zones.deck.splice(opponent.zones.deck.indexOf(target.id), 1); opponent.zones.characters.push(target.id)
  target.zone = 'characters'; target.zoneGeneration++; target.faceUp = true
  state = restoreGame(JSON.stringify(state))
  state = send(state, 'alice', { type: 'END_MAIN' })
  while (state.phase !== 'MAIN') state = send(state, state.activePlayerId!, { type: 'ADVANCE_PHASE' })
  const attackerId = state.players[1].zones.leader[0]
  state = send(state, 'bob', { type: 'DECLARE_ATTACK', attackerId, targetId: owner.zones.leader[0] })
  state = send(state, 'alice', { type: 'PASS_BLOCKER', battleId: state.battle!.id })
  state = send(state, 'alice', { type: 'PASS_COUNTER', battleId: state.battle!.id })
  state = send(state, 'bob', { type: 'RESOLVE_BATTLE', battleId: state.battle!.id })
  assert.equal(state.battle?.step, 'LIFE_TRIGGER')
  const pending = state.battle!.pendingLifeTrigger!
  state = send(restoreGame(JSON.stringify(state)), 'alice', { type: 'ANSWER_TRIGGER', choiceId: pending.id, activate: true })
  assert.equal(state.effects?.choice?.actorId, 'alice')
  assert.equal(getLegalActions(state, 'bob').some(action => action.type === 'ANSWER_CHOICE'), false)
  state = restoreGame(JSON.stringify(state))
  const choice = getLegalActions(state, 'alice').find(action => action.type === 'ANSWER_CHOICE')!
  state = send(state, 'alice', { type: 'ANSWER_CHOICE', choiceId: choice.choiceId, tokens: [choice.options.find(option => 'instanceId' in option && option.instanceId === target.id)!.token] })
  assert.equal(state.instances[target.id].zone, 'trash')
  assert.equal(state.instances[eventId].zone, 'trash')
  assert.equal(state.battle?.step, 'LIFE_CONTINUE')
  state = send(restoreGame(JSON.stringify(state)), 'bob', { type: 'CONTINUE_LIFE_DAMAGE', battleId: state.battle!.id })
  assert.equal(state.battle, null)
  writeTrace('st01-jet-pistol-trigger-trace.json', { source: 'cardgame/carteJson/ST-01/cards-ST-01.json', cardNumber: 'ST01-015', lifeTriggerAccepted: true, koTarget: 'ST01-003', lifeDamageResumedAfterJsonRestore: true, triggerCardDestination: state.instances[eventId].zone, certification: effectiveStatus(state.catalog.definitions.find(card => card.number === 'ST01-015')!) })
})

test('M6 local ST-01 profiles compile Usopp, Rush Luffy, and Diable Jambe from their cardJson text', () => {
  const catalog = engineCatalog(), registry = currentEngineRegistry()
  for (const number of ['ST01-002', 'ST01-012', 'ST01-016']) {
    const raw = st01Rows.find(card => card.code === number)!
    const card = catalog.definitions.find(definition => definition.number === number)
    assert.ok(card, `${number} should be projected from cardJson`)
    assert.equal(card.review.effectOriginal, raw.effect)
    assert.equal(card.review.triggerOriginal, raw.trigger)
    assert.equal(effectiveStatus(card), 'PLAYABLE_VERIFIED')
  }
  assert.ok(registry.definitions.some(effect => effect.id === 'ST01-002.when-attacking-prevent-blocker' && effect.timing === 'WHEN_ATTACKING'))
  assert.ok(registry.definitions.some(effect => effect.id === 'ST01-012.when-attacking-prevent-blocker' && effect.timing === 'WHEN_ATTACKING'))
  assert.ok(registry.definitions.some(effect => effect.id === 'ST01-016.main-prevent-blocker' && effect.timing === 'MAIN'))
  assert.ok(registry.definitions.some(effect => effect.id === 'ST01-016.trigger-ko-blocker' && effect.timing === 'TRIGGER'))
  assert.deepEqual(catalog.definitions.find(card => card.number === 'ST01-012')!.review.combatKeywords, ['RUSH'])
})

function placeBlocker(state: GameState, playerId: string, minimumPower = 0, maximumCost?: number): string {
  const definition = state.catalog.definitions.find(card => card.category === 'CHARACTER' && card.power !== null && card.power >= minimumPower
    && (maximumCost === undefined || (card.cost !== null && card.cost <= maximumCost))
    && card.review.effects.some(effect => effect.kind === 'blocker'))
  assert.ok(definition, `fixture needs a blocker at ${minimumPower}+ power`)
  const player = state.players.find(candidate => candidate.id === playerId)!
  const instanceId = player.zones.deck.find(id => state.instances[id].kind === 'CARD')!
  player.zones.deck.splice(player.zones.deck.indexOf(instanceId), 1); player.zones.characters.push(instanceId)
  const instance = state.instances[instanceId]
  instance.zone = 'characters'; instance.zoneGeneration++; instance.faceUp = true; instance.definitionId = definition.definitionId
  instance.printingKey = state.catalog.printings.find(printing => printing.definitionId === definition.definitionId)!.printingKey
  return instanceId
}

test('M6 ST-01 Rush Luffy attacks on entry and its When Attacking ability suppresses Blocker for that battle', () => {
  let state = playCardFromAnyZone(prepareMain(['ST01-012'], 5), 'ST01-012')
  const source = instanceFor(state, 'ST01-012'), blocker = placeBlocker(state, 'bob')
  const legalAttack = getLegalActions(state, 'alice').find(action => action.type === 'DECLARE_ATTACK')
  assert.ok(legalAttack?.type === 'DECLARE_ATTACK' && legalAttack.attackerIds.includes(source), 'Rush permits an attack on the turn it entered')
  state = send(state, 'alice', { type: 'END_MAIN' })
  while (state.phase !== 'MAIN') state = send(state, state.activePlayerId!, { type: 'ADVANCE_PHASE' })
  state = send(state, 'bob', { type: 'END_MAIN' })
  while (state.phase !== 'MAIN') state = send(state, state.activePlayerId!, { type: 'ADVANCE_PHASE' })
  const attach = getLegalActions(state, 'alice').find(action => action.type === 'ATTACH_DON' && action.targetIds.includes(source))
  assert.ok(attach?.type === 'ATTACH_DON' && attach.eligibleDonIds.length >= 2)
  state = send(state, 'alice', { type: 'ATTACH_DON', donIds: attach.eligibleDonIds.slice(0, 2), targetId: source })
  state = send(state, 'alice', { type: 'DECLARE_ATTACK', attackerId: source, targetId: state.players[1].zones.leader[0] })
  assert.equal(state.effects?.blockerRestrictions?.length, 1)
  assert.equal(getLegalActions(state, 'bob').some(action => action.type === 'ACTIVATE_BLOCKER' && action.blockerIds.includes(blocker)), false)
  const forged = applyCommand(state, { type: 'ACTIVATE_BLOCKER', blockerId: blocker, battleId: state.battle!.id, actorId: 'bob', id: `forged-block-${state.version}`, expectedVersion: state.version })
  assert.equal(forged.ok, false)
  assert.equal(effectiveStatus(state.catalog.definitions.find(card => card.number === 'ST01-012')!), 'PLAYABLE_VERIFIED')
})

test('M6 ST-01 Usopp blocks only Blocker Characters with at least 5000 current power for this battle', () => {
  let state = playCardFromAnyZone(prepareMain(['ST01-002'], 5), 'ST01-002')
  const source = instanceFor(state, 'ST01-002'), strongBlocker = placeBlocker(state, 'bob', 5000), weakBlocker = placeBlocker(state, 'bob', 0)
  const strongPower = evaluateCharacteristics(state, strongBlocker).power.current!
  const weakPower = evaluateCharacteristics(state, weakBlocker).power.current!
  assert.ok(strongPower >= 5000)
  assert.ok(weakPower < 5000)
  state = send(state, 'alice', { type: 'END_MAIN' })
  while (state.phase !== 'MAIN') state = send(state, state.activePlayerId!, { type: 'ADVANCE_PHASE' })
  state = send(state, 'bob', { type: 'END_MAIN' })
  while (state.phase !== 'MAIN') state = send(state, state.activePlayerId!, { type: 'ADVANCE_PHASE' })
  const attach = getLegalActions(state, 'alice').find(action => action.type === 'ATTACH_DON' && action.targetIds.includes(source))
  assert.ok(attach?.type === 'ATTACH_DON' && attach.eligibleDonIds.length >= 2)
  state = send(state, 'alice', { type: 'ATTACH_DON', donIds: attach.eligibleDonIds.slice(0, 2), targetId: source })
  state = send(state, 'alice', { type: 'DECLARE_ATTACK', attackerId: source, targetId: state.players[1].zones.leader[0] })
  const blockers = getLegalActions(state, 'bob').find(action => action.type === 'ACTIVATE_BLOCKER')
  assert.ok(blockers?.type === 'ACTIVATE_BLOCKER')
  assert.equal(blockers.blockerIds.includes(strongBlocker), false)
  assert.equal(blockers.blockerIds.includes(weakBlocker), true)
  assert.equal((state.effects?.blockerRestrictions ?? [])[0]?.minimumBlockerPower, 5000)
})

test('M6 ST-01 Diable Jambe Main selects only a Straw Hat and suppresses Blocker when it attacks this turn', () => {
  let state = prepareMain(['ST01-016'], 5)
  const eventId = instanceFor(state, 'ST01-016'), blocker = placeBlocker(state, 'bob')
  moveToHandWithSwap(state, eventId)
  const start = getLegalActions(state, 'alice').find(action => action.type === 'START_EFFECT' && action.effectId.includes('ST01-016.main-prevent-blocker'))
  assert.ok(start?.type === 'START_EFFECT')
  state = send(state, 'alice', { type: 'START_EFFECT', effectId: start.effectId })
  const choice = getLegalActions(state, 'alice').find(action => action.type === 'ANSWER_CHOICE')
  assert.ok(choice?.type === 'ANSWER_CHOICE' && choice.optional)
  const leader = state.players[0].zones.leader[0]
  assert.ok(choice.options.some(option => 'instanceId' in option && option.instanceId === leader))
  state = restoreGame(state && JSON.stringify(state))
  const restored = getLegalActions(state, 'alice').find(action => action.type === 'ANSWER_CHOICE')!
  const leaderOption = restored.options.find(option => 'instanceId' in option && option.instanceId === leader)!
  state = send(state, 'alice', { type: 'ANSWER_CHOICE', choiceId: restored.choiceId, tokens: [leaderOption.token] })
  state = restoreGame(JSON.stringify(state))
  state = send(state, 'alice', { type: 'DECLARE_ATTACK', attackerId: leader, targetId: state.players[1].zones.leader[0] })
  assert.equal(state.effects?.blockerRestrictions?.some(rule => rule.scope === 'TURN' && rule.subject.instanceId === leader), true)
  assert.equal(getLegalActions(state, 'bob').some(action => action.type === 'ACTIVATE_BLOCKER' && action.blockerIds.includes(blocker)), false)
  assert.equal(effectiveStatus(state.catalog.definitions.find(card => card.number === 'ST01-016')!), 'PLAYABLE_VERIFIED')
})

test('M6 ST-01 Usopp Trigger plays the actual Life card into Characters through a serializable primitive', () => {
  let state = prepareMain(['ST01-002'], 5)
  const cardId = instanceFor(state, 'ST01-002'), card = state.instances[cardId], player = state.players[0]
  moveToHandWithSwap(state, cardId)
  const previousLife = player.zones.life.shift()!, oldLife = state.instances[previousLife]
  player.zones.deck.push(previousLife); oldLife.zone = 'deck'; oldLife.zoneGeneration++; oldLife.faceUp = false
  player.zones.hand.splice(player.zones.hand.indexOf(cardId), 1); player.zones.life.unshift(cardId); card.zone = 'life'; card.zoneGeneration++; card.faceUp = false
  state = send(state, 'alice', { type: 'END_MAIN' })
  while (state.phase !== 'MAIN') state = send(state, state.activePlayerId!, { type: 'ADVANCE_PHASE' })
  const attackerId = state.players[1].zones.leader[0]
  state = send(state, 'bob', { type: 'DECLARE_ATTACK', attackerId, targetId: player.zones.leader[0] })
  state = send(state, 'alice', { type: 'PASS_BLOCKER', battleId: state.battle!.id })
  state = send(state, 'alice', { type: 'PASS_COUNTER', battleId: state.battle!.id })
  state = send(state, 'bob', { type: 'RESOLVE_BATTLE', battleId: state.battle!.id })
  state = send(state, 'alice', { type: 'ANSWER_TRIGGER', choiceId: state.battle!.pendingLifeTrigger!.id, activate: true })
  assert.equal(state.instances[cardId].zone, 'characters')
  assert.ok(state.players[0].zones.characters.includes(cardId))
  assert.equal(state.instances[cardId].playedOnTurn, state.turn)
  assert.equal(state.events.some(event => event.type === 'CARD_PLAYED' && event.publicInstanceId === cardId), true)
  assert.equal(effectiveStatus(state.catalog.definitions.find(definition => definition.number === 'ST01-002')!), 'PLAYABLE_VERIFIED')
})

test('M6 ST-01 Diable Jambe Trigger privately selects and KOs only an opposing Blocker costing at most 3', () => {
  let state = prepareMain(['ST01-016'], 5)
  const cardId = instanceFor(state, 'ST01-016'), card = state.instances[cardId], owner = state.players[0]
  moveToHandWithSwap(state, cardId)
  const previousLife = owner.zones.life.shift()!, oldLife = state.instances[previousLife]
  owner.zones.deck.push(previousLife); oldLife.zone = 'deck'; oldLife.zoneGeneration++; oldLife.faceUp = false
  owner.zones.hand.splice(owner.zones.hand.indexOf(cardId), 1); owner.zones.life.unshift(cardId); card.zone = 'life'; card.zoneGeneration++; card.faceUp = false
  const blocker = placeBlocker(state, 'bob', 0, 3)
  const invalidBlocker = placeBlocker(state, 'bob', 0, 3)
  state = send(state, 'alice', { type: 'END_MAIN' })
  while (state.phase !== 'MAIN') state = send(state, state.activePlayerId!, { type: 'ADVANCE_PHASE' })
  state = send(state, 'bob', { type: 'DECLARE_ATTACK', attackerId: state.players[1].zones.leader[0], targetId: owner.zones.leader[0] })
  state = send(state, 'alice', { type: 'PASS_BLOCKER', battleId: state.battle!.id })
  state = send(state, 'alice', { type: 'PASS_COUNTER', battleId: state.battle!.id })
  state = send(state, 'bob', { type: 'RESOLVE_BATTLE', battleId: state.battle!.id })
  state = restoreGame(JSON.stringify(state))
  state = send(state, 'alice', { type: 'ANSWER_TRIGGER', choiceId: state.battle!.pendingLifeTrigger!.id, activate: true })
  assert.equal(state.effects?.choice?.actorId, 'alice')
  assert.equal(getLegalActions(state, 'bob').some(action => action.type === 'ANSWER_CHOICE'), false)
  const choice = getLegalActions(state, 'alice').find(action => action.type === 'ANSWER_CHOICE')!
  assert.ok(choice.options.some(option => 'instanceId' in option && option.instanceId === blocker))
  state = restoreGame(JSON.stringify(state))
  const restored = getLegalActions(state, 'alice').find(action => action.type === 'ANSWER_CHOICE')!
  const option = restored.options.find(candidate => 'instanceId' in candidate && candidate.instanceId === blocker)!
  state = send(state, 'alice', { type: 'ANSWER_CHOICE', choiceId: restored.choiceId, tokens: [option.token] })
  assert.equal(state.instances[blocker].zone, 'trash')
  assert.equal(state.instances[invalidBlocker].zone, 'characters')
  assert.equal(state.instances[cardId].zone, 'trash')
  assert.equal(effectiveStatus(state.catalog.definitions.find(definition => definition.number === 'ST01-016')!), 'PLAYABLE_VERIFIED')
})

test('M6 local ST-01 Jinbe permits declining its up-to-one target after the condition is met', () => {
  let state = playJinbeAndWait(prepareMain())
  const source = jinbe(state)
  const attach = getLegalActions(state, 'alice').find(action => action.type === 'ATTACH_DON' && action.targetIds.includes(source))
  assert.ok(attach?.type === 'ATTACH_DON')
  state = send(state, 'alice', { type: 'ATTACH_DON', donIds: [attach.eligibleDonIds[0]], targetId: source })
  state = send(state, 'alice', { type: 'DECLARE_ATTACK', attackerId: source, targetId: state.players[1].zones.leader[0] })
  const choice = getLegalActions(state, 'alice').find(action => action.type === 'ANSWER_CHOICE')
  assert.ok(choice?.type === 'ANSWER_CHOICE')
  assert.equal(choice.optional, true)
  assert.equal(choice.min, 0)
  assert.equal(evaluateCharacteristics(state, state.players[0].zones.leader[0]).power.current, 5000)
  state = send(state, 'alice', { type: 'ANSWER_CHOICE', choiceId: choice.choiceId, tokens: [] })
  assert.equal(evaluateCharacteristics(state, state.players[0].zones.leader[0]).power.current, 5000)
  assert.equal(state.effects?.choice, null)
})

test('M6 local ST-01 Brook and Thousand Sunny are compiled from cardJson into generic effect definitions', () => {
  const catalog = engineCatalog()
  const registry = currentEngineRegistry()
  for (const [number, abilityId, timing] of [
    ['ST01-011', 'ST01-011.on-play-attach-rested-don', 'ON_PLAY'],
    ['ST01-017', 'ST01-017.activate-main-boost', 'ACTIVATE_MAIN'],
  ] as const) {
    const row = st01Rows.find(card => card.code === number)!
    const definition = catalog.definitions.find(card => card.number === number)
    const ability = registry.definitions.find(effect => effect.id === abilityId)
    assert.ok(definition, `${number} must be projected from cardJson`)
    assert.equal(definition.review.effectOriginal, row.effect)
    assert.equal(definition.review.faqChecked, true)
    assert.equal(effectiveStatus(definition), 'PLAYABLE_VERIFIED')
    assert.ok(ability, `${abilityId} must be in the current DSL registry`)
    assert.equal(ability.timing, timing)
  }
  const zoroRow = st01Rows.find(card => card.code === 'ST01-013')!
  const zoro = catalog.definitions.find(card => card.number === 'ST01-013')
  assert.ok(zoro)
  assert.equal(zoro.review.effectOriginal, zoroRow.effect)
  assert.equal(zoro.review.faqChecked, true)
  assert.equal(effectiveStatus(zoro), 'PLAYABLE_VERIFIED')
  assert.ok(registry.continuous?.some(effect => effect.id === 'ST01-013.attached-don-power' && effect.definitionId === zoro.definitionId))
})

test('M6 local ST-01 Sanji retains conditional Rush as a data-driven rule, not a printed always-on keyword', () => {
  const raw = st01Rows.find(card => card.code === 'ST01-004')!
  const card = engineCatalog().definitions.find(definition => definition.number === 'ST01-004')
  assert.ok(card, 'Sanji must be imported from the local cardJson row')
  assert.equal(card.review.effectOriginal, raw.effect)
  assert.equal(card.review.combatKeywords?.includes('RUSH') ?? false, false, 'DON!! x2 makes Rush conditional, not a permanent printed keyword')
  assert.equal(effectiveStatus(card), 'PLAYABLE_VERIFIED')
})

test('M6 local ST-01 Sanji gains Rush only after attaching two DON!! and can attack on its entry turn', () => {
  let state = playCardFromAnyZone(prepareMain(['ST01-004'], 5), 'ST01-004')
  const sanji = instanceFor(state, 'ST01-004')
  const attacksBefore = getLegalActions(state, 'alice').find(action => action.type === 'DECLARE_ATTACK')
  assert.ok(!attacksBefore || attacksBefore.type !== 'DECLARE_ATTACK' || !attacksBefore.attackerIds.includes(sanji))
  const attach = getLegalActions(state, 'alice').find(action => action.type === 'ATTACH_DON' && action.targetIds.includes(sanji))
  assert.ok(attach?.type === 'ATTACH_DON' && attach.eligibleDonIds.length >= 2)
  state = send(state, 'alice', { type: 'ATTACH_DON', donIds: attach.eligibleDonIds.slice(0, 1), targetId: sanji })
  const attacksWithOneDon = getLegalActions(state, 'alice').find(action => action.type === 'DECLARE_ATTACK')
  assert.ok(!attacksWithOneDon || attacksWithOneDon.type !== 'DECLARE_ATTACK' || !attacksWithOneDon.attackerIds.includes(sanji))
  const attachSecond = getLegalActions(state, 'alice').find(action => action.type === 'ATTACH_DON' && action.targetIds.includes(sanji))
  assert.ok(attachSecond?.type === 'ATTACH_DON')
  state = send(state, 'alice', { type: 'ATTACH_DON', donIds: [attachSecond.eligibleDonIds[0]], targetId: sanji })
  state = restoreGame(JSON.stringify(state))
  const attacksAfter = getLegalActions(state, 'alice').find(action => action.type === 'DECLARE_ATTACK')
  assert.ok(attacksAfter?.type === 'DECLARE_ATTACK' && attacksAfter.attackerIds.includes(sanji))
  const targetId = state.players[1].zones.leader[0]
  state = send(state, 'alice', { type: 'DECLARE_ATTACK', attackerId: sanji, targetId })
  assert.equal(state.battle?.attacker.instanceId, sanji)
  writeTrace('st01-sanji-cardjson-trace.json', { source: 'cardgame/carteJson/ST-01/cards-ST-01.json', cardNumber: 'ST01-004', conditionalKeywordId: 'ST01-004.conditional-rush', attachedDon: 2, rushGranted: true, attackDeclaredOnEntryTurn: true, certification: 'DATA_VALID_EFFECT_PENDING' })
})

test('M6 local ST-01 Brook attaches up to two rested DON!! to one chosen character and survives JSON recovery', () => {
  let state = playCardFromAnyZone(prepareMain(['ST01-011']), 'ST01-011')
  const firstChoice = getLegalActions(state, 'alice').find(action => action.type === 'ANSWER_CHOICE')
  assert.ok(firstChoice?.type === 'ANSWER_CHOICE')
  assert.equal(firstChoice.max, 2)
  assert.equal(getLegalActions(state, 'bob').some(action => action.type === 'ANSWER_CHOICE'), false)
  assert.ok(firstChoice.options.length >= 2)
  state = restoreGame(JSON.stringify(state))
  const restoredDonChoice = getLegalActions(state, 'alice').find(action => action.type === 'ANSWER_CHOICE')
  assert.ok(restoredDonChoice?.type === 'ANSWER_CHOICE')
  state = send(state, 'alice', { type: 'ANSWER_CHOICE', choiceId: restoredDonChoice.choiceId, tokens: restoredDonChoice.options.slice(0, 2).map(option => option.token) })
  const targetChoice = getLegalActions(state, 'alice').find(action => action.type === 'ANSWER_CHOICE')
  assert.ok(targetChoice?.type === 'ANSWER_CHOICE')
  const leader = state.players[0].zones.leader[0]
  const targetOption = targetChoice.options.find(option => 'instanceId' in option && option.instanceId === leader)
  assert.ok(targetOption)
  state = send(state, 'alice', { type: 'ANSWER_CHOICE', choiceId: targetChoice.choiceId, tokens: [targetOption.token] })
  assert.equal(Object.values(state.instances).filter(card => card.zone === 'attached' && card.attachedTo === leader).length, 2)
  assert.equal(state.effects?.choice, null)
  writeTrace('st01-brook-cardjson-trace.json', { source: 'cardgame/carteJson/ST-01/cards-ST-01.json', cardNumber: 'ST01-011', abilityId: 'ST01-011.on-play-attach-rested-don', restedDonSelected: 2, oneRecipient: leader, attachedDonAfterResolution: 2, choiceRestoredFromJson: true, certification: 'DATA_VALID_EFFECT_PENDING' })
})

test('M6 local ST-01 Thousand Sunny rests as its activation cost and boosts only a Straw Hat target', () => {
  let state = playCardFromAnyZone(prepareMain(['ST01-017']), 'ST01-017')
  const source = instanceFor(state, 'ST01-017'), leader = state.players[0].zones.leader[0]
  const before = evaluateCharacteristics(state, leader).power.current
  assert.ok(before !== null)
  const start = getLegalActions(state, 'alice').find(action => action.type === 'START_EFFECT' && action.effectId.includes('ST01-017.activate-main-boost'))
  assert.ok(start?.type === 'START_EFFECT')
  state = send(state, 'alice', { type: 'START_EFFECT', effectId: start.effectId })
  assert.equal(state.instances[source].rested, true)
  const choice = getLegalActions(state, 'alice').find(action => action.type === 'ANSWER_CHOICE')
  assert.ok(choice?.type === 'ANSWER_CHOICE')
  assert.ok(choice.options.some(option => 'instanceId' in option && option.instanceId === leader))
  state = restoreGame(JSON.stringify(state))
  const restored = getLegalActions(state, 'alice').find(action => action.type === 'ANSWER_CHOICE')
  assert.ok(restored?.type === 'ANSWER_CHOICE')
  const leaderOption = restored.options.find(option => 'instanceId' in option && option.instanceId === leader)!
  state = send(state, 'alice', { type: 'ANSWER_CHOICE', choiceId: restored.choiceId, tokens: [leaderOption.token] })
  assert.equal(evaluateCharacteristics(state, leader).power.current, before + 1000)
  assert.equal(state.effects?.choice, null)
  writeTrace('st01-sunny-cardjson-trace.json', { source: 'cardgame/carteJson/ST-01/cards-ST-01.json', cardNumber: 'ST01-017', abilityId: 'ST01-017.activate-main-boost', cost: 'rest source Stage', target: leader, targetTrait: 'Straw Hat Crew', powerBefore: before, powerAfter: evaluateCharacteristics(state, leader).power.current, choiceRestoredFromJson: true, certification: 'DATA_VALID_EFFECT_PENDING' })
})

test('M6 local ST-01 Zoro uses the shared continuous characteristic evaluator when DON!! is attached', () => {
  let state = prepareMain(['ST01-013'], 5)
  const source = instanceFor(state, 'ST01-013')
  state = playCardFromAnyZone(state, 'ST01-013')
  assert.equal(evaluateCharacteristics(state, source).power.current, 5000)
  const attach = getLegalActions(state, 'alice').find(action => action.type === 'ATTACH_DON' && action.targetIds.includes(source))
  assert.ok(attach?.type === 'ATTACH_DON')
  state = send(state, 'alice', { type: 'ATTACH_DON', donIds: [attach.eligibleDonIds[0]], targetId: source })
  assert.equal(evaluateCharacteristics(state, source).power.current, 7000, 'attached DON!! contributes +1000 this turn and the card condition contributes +1000')
  assert.equal(state.effects?.registry.continuous?.some(effect => effect.id === 'ST01-013.attached-don-power'), true)
  writeTrace('st01-zoro-cardjson-trace.json', { source: 'cardgame/carteJson/ST-01/cards-ST-01.json', cardNumber: 'ST01-013', continuousId: 'ST01-013.attached-don-power', attachedDon: 1, printedPower: 5000, currentPowerDuringControllerTurn: evaluateCharacteristics(state, source).power.current, certification: 'DATA_VALID_EFFECT_PENDING' })
})

test('M6 ST-01 Leader Luffy reuses the generic once-per-turn rested-DON attachment ability', () => {
  let state = prepareMain()
  state = playCardFromAnyZone(state, 'ST01-003')
  const leader = state.players[0].zones.leader[0]
  const start = getLegalActions(state, 'alice').find(action => action.type === 'START_EFFECT' && action.effectId.includes('ST01-001.activate-main-give-rested-don'))
  assert.ok(start?.type === 'START_EFFECT')
  state = send(state, 'alice', { type: 'START_EFFECT', effectId: start.effectId })
  const donChoice = getLegalActions(state, 'alice').find(action => action.type === 'ANSWER_CHOICE')
  assert.ok(donChoice?.type === 'ANSWER_CHOICE')
  assert.equal(donChoice.max, 1)
  const donOption = donChoice.options[0]
  assert.ok(donOption)
  state = send(state, 'alice', { type: 'ANSWER_CHOICE', choiceId: donChoice.choiceId, tokens: [donOption.token] })
  const targetChoice = getLegalActions(state, 'alice').find(action => action.type === 'ANSWER_CHOICE')
  assert.ok(targetChoice?.type === 'ANSWER_CHOICE')
  const leaderOption = targetChoice.options.find(option => 'instanceId' in option && option.instanceId === leader)!
  state = send(state, 'alice', { type: 'ANSWER_CHOICE', choiceId: targetChoice.choiceId, tokens: [leaderOption.token] })
  assert.equal(Object.values(state.instances).filter(card => card.zone === 'attached' && card.attachedTo === leader).length, 1)
  assert.equal(getLegalActions(state, 'alice').some(action => action.type === 'START_EFFECT' && action.effectId.includes('ST01-001.activate-main-give-rested-don')), false)
  writeTrace('st01-luffy-cardjson-trace.json', { source: 'cardgame/carteJson/ST-01/cards-ST-01.json', cardNumber: 'ST01-001', abilityId: 'ST01-001.activate-main-give-rested-don', oncePerTurn: true, target: leader, attachedDonAfterResolution: 1, repeatedActivationOffered: false, certification: effectiveStatus(state.catalog.definitions.find(card => card.number === 'ST01-001')!) })
})

test('M6 ST-01 Nami may attach the selected rested DON!! to herself through the shared effect path', () => {
  let state = playCardFromAnyZone(prepareMain(['ST01-007']), 'ST01-007')
  const nami = instanceFor(state, 'ST01-007')
  const start = getLegalActions(state, 'alice').find(action => action.type === 'START_EFFECT' && action.effectId.includes('ST01-007.activate-main-give-rested-don'))
  assert.ok(start?.type === 'START_EFFECT')
  state = send(state, 'alice', { type: 'START_EFFECT', effectId: start.effectId })
  const donChoice = getLegalActions(state, 'alice').find(action => action.type === 'ANSWER_CHOICE')
  assert.ok(donChoice?.type === 'ANSWER_CHOICE')
  const donOption = donChoice.options[0]
  assert.ok(donOption)
  state = send(state, 'alice', { type: 'ANSWER_CHOICE', choiceId: donChoice.choiceId, tokens: [donOption.token] })
  const targetChoice = getLegalActions(state, 'alice').find(action => action.type === 'ANSWER_CHOICE')
  assert.ok(targetChoice?.type === 'ANSWER_CHOICE')
  const namiOption = targetChoice.options.find(option => 'instanceId' in option && option.instanceId === nami)
  assert.ok(namiOption, 'Nami is a legal recipient of her own ability')
  state = send(state, 'alice', { type: 'ANSWER_CHOICE', choiceId: targetChoice.choiceId, tokens: [namiOption.token] })
  assert.equal(Object.values(state.instances).filter(card => card.zone === 'attached' && card.attachedTo === nami).length, 1)
  writeTrace('st01-nami-cardjson-trace.json', { source: 'cardgame/carteJson/ST-01/cards-ST-01.json', cardNumber: 'ST01-007', abilityId: 'ST01-007.activate-main-give-rested-don', selfTargetAllowed: true, target: nami, attachedDonAfterResolution: 1, certification: effectiveStatus(state.catalog.definitions.find(card => card.number === 'ST01-007')!) })
})
