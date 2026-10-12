import { M0_GIVE_DON_PROGRAMS } from '../src/game/cards/m0Programs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { consolidateDefinitions } from '../src/game/cards/adapter'
import { REVIEWED_CARDS } from '../src/game/cards/reviewedCards'
import { M0_RULESET } from '../src/game/rulesets/m0'
import { createGame, applyCommand, getLegalActions, projectState, restoreGame } from '../src/game/core/game'
import type { CardInput } from '../src/game/cards/types'
import type { GameInput, GameState, LegalAction } from '../src/game/core/types'
import { operationSpecSchema, validateRegistry, type EffectRegistry } from '../src/game/effects/contracts'
import { createEffectRuntime } from '../src/game/effects/runtime'
import { assertGameInvariants } from '../src/game/core/invariants'
import { OFFICIAL_ABILITY_CARDS, OFFICIAL_ABILITY_REGISTRY } from '../src/game/cards/officialAbilities'
import { evaluateCharacteristics } from '../src/game/effects/characteristics'
import { applyEffectCommand } from '../src/game/effects/runtime'
import { processDefeat } from '../src/game/core/turns'

function fixture(): GameInput {
  const cards: CardInput[] = Object.entries(REVIEWED_CARDS).map(([number, facts]) => ({ ...structuredClone(facts), number, printingKey: `${number}::standard`, extensions: [], databaseIds: [], life: facts.category === 'LEADER' ? 5 : null, lifeEvidence: facts.category === 'LEADER' ? [{ field: 'life', value: 5, source: 'https://en.onepiece-cardgame.com/cardlist/?series=569001', checkedAt: '2026-10-10', language: 'en' }] : [] }))
  const catalog = consolidateDefinitions(cards); assert.deepEqual(catalog.errors, [])
  const characters = cards.filter(c => c.category === 'CHARACTER')
  const deck = characters.slice(0, 12).map(c => ({ printingKey: c.printingKey, quantity: 4 }))
  deck.push({ printingKey: characters[12].printingKey, quantity: 2 })
  deck.unshift({ printingKey: 'ST01-001::standard', quantity: 1 })
  return { ...catalog, gameId: 'm2-game', seed: 77, scope: 'BASIC_TURNS', chooserId: 'alice', players: [{ id: 'alice', cards: structuredClone(deck), donCount: 10 }, { id: 'bob', cards: structuredClone(deck), donCount: 10 }], ruleset: structuredClone(M0_RULESET) }
}
function fixtureWithBattleOnKo(): GameInput {
  const options = fixture(), target = options.definitions.find(d => d.number === 'ST01-003')!
  target.review.effects = [{ kind: 'declarative', abilityIds: ['TEST-FUTURE-SET.battle-onko'] }]
  target.review.requiredCapabilities = ['declarative']
  target.review.effectOriginal = '[On K.O.] fixture: choose a card you control.'
  const registry: EffectRegistry = { version: '1.2.0', dslVersion: '1.2.0', restrictions: [], replacements: [], definitions: [{
    id: 'TEST-FUTURE-SET.battle-onko', revision: '1', dslVersion: '1.2.0', source: { kind: 'CARD_DEFINITION', definitionId: target.definitionId, zone: 'characters' },
    timing: 'ON_KO', condition: { kind: 'ALWAYS' }, cost: { kind: 'NONE' }, usage: { kind: 'UNLIMITED' }, program: [
      { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'OWN_FIELD' }, min: 0, max: 1, optional: true, bind: 'target', visibility: 'PRIVATE' },
      { kind: 'OPERATION', operation: { primitive: 'addPower', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC', subjectBinding: 'target', amount: 1000, duration: 'THIS_TURN' } },
    ],
  }] }
  return { ...options, effectRegistry: registry }
}
function writeEvidence(name: string, value: unknown) {
  const directory = resolve(process.cwd(), '../docs/game/evidence/m2')
  mkdirSync(directory, { recursive: true })
  writeFileSync(resolve(directory, name), `${JSON.stringify(value, null, 2)}\n`)
}
function writeM25Evidence(name: string, value: unknown) {
  const directory = resolve(process.cwd(), '../docs/game/evidence/m2_5')
  mkdirSync(directory, { recursive: true })
  writeFileSync(resolve(directory, name), `${JSON.stringify(value, null, 2)}\n`)
}
function writeUniversalEvidence(name: string, value: unknown) {
  const directory = resolve(process.cwd(), '../docs/game/evidence/universal-ability')
  mkdirSync(directory, { recursive: true })
  writeFileSync(resolve(directory, name), `${JSON.stringify(value, null, 2)}\n`)
}
function isStartEffect(action: LegalAction | undefined): action is Extract<LegalAction, { type: 'START_EFFECT' }> { return action?.type === 'START_EFFECT' }
function prepared(targetTurn = 3, input: GameInput = fixture()): GameState {
  let s = createGame(input)
  let r = applyCommand(s, { id: 'first', actorId: 'alice', expectedVersion: s.version, type: 'CHOOSE_FIRST', choice: 'FIRST' }); assert.ok(r.ok); s = r.state
  for (let n = 0; n < 2; n++) { r = applyCommand(s, { id: `keep-${n}`, actorId: s.decisionPlayerId!, expectedVersion: s.version, type: 'MULLIGAN', redraw: false }); assert.ok(r.ok); s = r.state }
  while (s.phase !== 'MAIN') { r = applyCommand(s, { id: `phase-${s.version}`, actorId: s.activePlayerId!, expectedVersion: s.version, type: 'ADVANCE_PHASE' }); assert.ok(r.ok); s = r.state }
  while (s.turn < targetTurn) {
    r = applyCommand(s, { id: `end-${s.version}`, actorId: s.activePlayerId!, expectedVersion: s.version, type: 'END_MAIN' }); assert.ok(r.ok); s = r.state
    for (let n = 0; n < 4; n++) { r = applyCommand(s, { id: `phase-${s.version}`, actorId: s.activePlayerId!, expectedVersion: s.version, type: 'ADVANCE_PHASE' }); assert.ok(r.ok); s = r.state }
  }
  return s
}

test('universal engine: a confirmed attack schedules and suspends its declarative When Attacking ability', () => {
  const input = fixture(), leader = input.definitions.find(d => d.number === 'ST01-001')!
  const abilityId = 'TEST-FUTURE-SET.when-attacking'
  leader.review.effects = [{ kind: 'declarative', abilityIds: [abilityId] }]
  leader.review.requiredCapabilities = ['declarative']
  input.effectRegistry = { version: '1.2.0', dslVersion: '1.2.0', restrictions: [], replacements: [], definitions: [{
    id: abilityId, revision: '1', dslVersion: '1.2.0', source: { kind: 'CARD_DEFINITION', definitionId: leader.definitionId, zone: 'leader' },
    timing: 'WHEN_ATTACKING', condition: { kind: 'ALWAYS' }, cost: { kind: 'NONE' }, usage: { kind: 'UNLIMITED' }, program: [
      { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'OWN_FIELD' }, min: 1, max: 1, optional: false, bind: 'target', visibility: 'PRIVATE' },
      { kind: 'OPERATION', operation: { primitive: 'addPower', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC', subjectBinding: 'target', amount: 1000, duration: 'THIS_TURN' } },
    ],
  }] }
  let s = prepared(3, input), attacker = s.players[0].zones.leader[0], target = s.players[1].zones.leader[0]
  const result = applyCommand(s, { id: 'when-attacking', actorId: 'alice', expectedVersion: s.version, type: 'DECLARE_ATTACK', attackerId: attacker, targetId: target })
  assert.ok(result.ok, result.ok ? '' : result.error)
  if (!result.ok) return
  s = result.state
  assert.equal(s.effects!.choice?.actorId, 'alice')
  assert.equal(s.effects!.scheduler!.batches.flatMap(batch => batch.triggers).some(trigger => trigger.definitionId === abilityId), true)
  assert.equal(getLegalActions(s, 'bob').some(action => action.type === 'PASS_BLOCKER'), false)
  assert.equal(getLegalActions(s, 'alice').some(action => action.type === 'ANSWER_CHOICE'), true)
  writeUniversalEvidence('when-attacking.json', { test: 'synthetic TEST-FUTURE-SET only', commands: s.commands.slice(-1), event: s.events.at(-1), trigger: s.effects!.scheduler!.batches.flatMap(batch => batch.triggers).find(trigger => trigger.definitionId === abilityId), privateChoiceController: s.effects!.choice?.actorId, stateRestores: true })
  assert.doesNotThrow(() => restoreGame(JSON.stringify(s)))
})

test('universal engine: On Block uses the same scheduler and does not expose its pending choice to the attacker', () => {
  const input = fixture(), blocker = input.definitions.find(d => d.number === 'ST01-006')!
  const abilityId = 'TEST-FUTURE-SET.on-block'
  blocker.review.effects = [...blocker.review.effects, { kind: 'declarative', abilityIds: [abilityId] }]
  blocker.review.requiredCapabilities = ['blocker', 'declarative']
  input.effectRegistry = { version: '1.2.0', dslVersion: '1.2.0', restrictions: [], replacements: [], definitions: [{
    id: abilityId, revision: '1', dslVersion: '1.2.0', source: { kind: 'CARD_DEFINITION', definitionId: blocker.definitionId, zone: 'characters' },
    timing: 'ON_BLOCK', condition: { kind: 'ALWAYS' }, cost: { kind: 'NONE' }, usage: { kind: 'UNLIMITED' }, program: [
      { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'OWN_FIELD' }, min: 1, max: 1, optional: false, bind: 'target', visibility: 'PRIVATE' },
      { kind: 'OPERATION', operation: { primitive: 'addPower', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC', subjectBinding: 'target', amount: 1000, duration: 'THIS_TURN' } },
    ],
  }] }
  let s = prepared(3, input), attacker = s.players[0].zones.leader[0], target = s.players[1].zones.leader[0]
  const blockerId = s.players[1].zones.deck.find(id => s.instances[id].definitionId === blocker.definitionId)!
  s.players[1].zones.deck.splice(s.players[1].zones.deck.indexOf(blockerId), 1); s.players[1].zones.characters.push(blockerId)
  s.instances[blockerId].zone = 'characters'; s.instances[blockerId].faceUp = true; s.instances[blockerId].zoneGeneration++
  let result = applyCommand(s, { id: 'on-block-attack', actorId: 'alice', expectedVersion: s.version, type: 'DECLARE_ATTACK', attackerId: attacker, targetId: target })
  assert.ok(result.ok, result.ok ? '' : result.error); if (!result.ok) return; s = result.state
  result = applyCommand(s, { id: 'on-block', actorId: 'bob', expectedVersion: s.version, type: 'ACTIVATE_BLOCKER', blockerId, battleId: s.battle!.id })
  assert.ok(result.ok, result.ok ? '' : result.error); if (!result.ok) return; s = result.state
  assert.equal(s.effects!.choice?.actorId, 'bob')
  assert.equal(s.effects!.scheduler!.batches.flatMap(batch => batch.triggers).some(trigger => trigger.definitionId === abilityId), true)
  assert.equal(JSON.stringify(projectState(s, 'alice')).includes(s.effects!.choice!.id), false)
  writeUniversalEvidence('on-block.json', { test: 'synthetic TEST-FUTURE-SET only', commands: s.commands.slice(-2), events: s.events.slice(-2), trigger: s.effects!.scheduler!.batches.flatMap(batch => batch.triggers).find(trigger => trigger.definitionId === abilityId), privateChoiceController: s.effects!.choice?.actorId, attackerProjectionContainsChoiceId: false, stateRestores: true })
  assert.doesNotThrow(() => restoreGame(JSON.stringify(s)))
})

test('universal engine: official OP06-009 Shuraiya resolves When Attacking, On Block and Counter in one battle', () => {
  const input = fixture()
  const official = consolidateDefinitions(OFFICIAL_ABILITY_CARDS)
  assert.deepEqual(official.errors, [])
  input.definitions.push(...official.definitions)
  input.printings.push(...official.printings)
  input.ruleset.allowedNumbers.push('OP06-009')
  input.effectRegistry = structuredClone(OFFICIAL_ABILITY_REGISTRY)
  const replaceOneCard = (playerIndex: number, number: string) => {
    const deck = input.players[playerIndex].cards
    const removable = deck.find(entry => entry.quantity > 1)!
    removable.quantity--
    deck.push({ printingKey: `${number}::standard`, quantity: 1 })
  }
  replaceOneCard(0, 'OP06-009')
  replaceOneCard(1, 'OP06-009')
  let s = prepared(3, input)
  const moveToCharacters = (owner: number, number: string) => {
    const player = s.players[owner]
    const instanceId = player.zones.deck.find(id => s.instances[id].definitionId?.startsWith(`${number}@`))!
    player.zones.deck.splice(player.zones.deck.indexOf(instanceId), 1)
    player.zones.characters.push(instanceId)
    const instance = s.instances[instanceId]
    instance.zone = 'characters'; instance.zoneGeneration++; instance.faceUp = true; instance.playedOnTurn = s.turn - 1
    return instanceId
  }
  const attacker = moveToCharacters(0, 'OP06-009')
  const blocker = moveToCharacters(1, 'OP06-009')
  // Give the attacker one DON!!; Shuraiya copies the 5000 Leader power, then the DON!! applies.
  const attachedDon = s.players[0].zones.cost.pop()!
  s.players[0].zones.attached.push(attachedDon)
  s.instances[attachedDon].zone = 'attached'; s.instances[attachedDon].zoneGeneration++; s.instances[attachedDon].attachedTo = attacker
  const targetLeader = s.players[1].zones.leader[0]
  let result = applyCommand(s, { id: 'official-shuraiya-attack', actorId: 'alice', expectedVersion: s.version, type: 'DECLARE_ATTACK', attackerId: attacker, targetId: targetLeader })
  assert.ok(result.ok, result.ok ? '' : result.error); if (!result.ok) return; s = result.state
  assert.equal(s.effects?.usage[Object.keys(s.effects!.usage)[0]], 1, 'the Once Per Turn ability is marked when its automatic activation starts')
  const attackerPower = evaluateCharacteristics(s, attacker).power
  assert.equal(attackerPower.base, 5000)
  assert.equal(attackerPower.current, 6000, '5000 copied base power plus the attached DON!!')
  result = applyCommand(s, { id: 'official-shuraiya-block', actorId: 'bob', expectedVersion: s.version, type: 'ACTIVATE_BLOCKER', blockerId: blocker, battleId: s.battle!.id })
  assert.ok(result.ok, result.ok ? '' : result.error); if (!result.ok) return; s = result.state
  assert.equal(evaluateCharacteristics(s, blocker).power.base, 5000, 'On Block copies the opposing Leader’s power at activation')
  const counters = s.players[1].zones.hand.filter(id => s.catalog.definitions.find(d => d.definitionId === s.instances[id].definitionId)?.counter === 1000).slice(0, 2)
  assert.equal(counters.length, 2)
  for (const [index, cardId] of counters.entries()) {
    result = applyCommand(s, { id: `official-shuraiya-counter-${index}`, actorId: 'bob', expectedVersion: s.version, type: 'PLAY_COUNTER_CHARACTER', cardId, targetId: blocker, battleId: s.battle!.id })
    assert.ok(result.ok, result.ok ? '' : result.error); if (!result.ok) return; s = result.state
  }
  result = applyCommand(s, { id: 'official-pass-counter', actorId: 'bob', expectedVersion: s.version, type: 'PASS_COUNTER', battleId: s.battle!.id })
  assert.ok(result.ok, result.ok ? '' : result.error); if (!result.ok) return; s = result.state
  result = applyCommand(s, { id: 'official-resolve-battle', actorId: 'alice', expectedVersion: s.version, type: 'RESOLVE_BATTLE', battleId: s.battle!.id })
  assert.ok(result.ok, result.ok ? '' : result.error); if (!result.ok) return; s = result.state
  assert.equal(s.battle, null, 'the battle reaches its end after the power comparison')
  assert.equal(s.instances[blocker].zone, 'characters', 'two Counter Characters raise the blocker above Shuraiya’s 6000 attack')
  assert.doesNotThrow(() => assertGameInvariants(restoreGame(JSON.stringify(s))))
  writeUniversalEvidence('official-combat-shuraiya-op06-009.json', { seed: 77, cards: ['OP06-009', 'ST01-001'], attackPower: attackerPower, blockerBasePower: evaluateCharacteristics(s, blocker).power.base, countersUsed: 2, battleCompleted: s.battle === null, events: s.events.filter(event => ['ATTACK_DECLARED', 'BLOCKER_ACTIVATED', 'COUNTER_PLAYED', 'BATTLE_RESOLVED'].includes(event.type)) })
})

test('universal engine: certification is limited to official cards whose full listed capabilities have executable definitions', () => {
  const certified = OFFICIAL_ABILITY_CARDS.filter(card => card.review?.playabilityStatus === 'PLAYABLE_VERIFIED').map(card => card.number).sort()
  assert.deepEqual(certified, ['OP06-009', 'OP06-013', 'OP06-017', 'OP06-018'])
  for (const number of certified) {
    const card = OFFICIAL_ABILITY_CARDS.find(candidate => candidate.number === number)!
    assert.equal(card.review!.faqChecked, true); assert.equal(card.review!.errataChecked, true)
    assert.ok(card.review!.references.length > 0)
    for (const ability of card.review!.effects.filter(effect => effect.kind === 'declarative').flatMap(effect => effect.abilityIds)) {
      assert.ok(OFFICIAL_ABILITY_REGISTRY.definitions.some(definition => definition.id === ability || definition.id === `${ability}.trigger`))
    }
    if (card.review!.triggerOriginal) assert.ok(OFFICIAL_ABILITY_REGISTRY.definitions.some(definition => definition.timing === 'TRIGGER' && definition.source.kind === 'CARD_DEFINITION' && definition.source.definitionId === `${number}@official-2026-10-11`))
  }
})

test('universal engine: official OP06-017 Counter Event pays its printed cost and optional Life for +3000', () => {
  const input = fixture(), official = consolidateDefinitions(OFFICIAL_ABILITY_CARDS)
  assert.deepEqual(official.errors, [])
  input.definitions.push(...official.definitions); input.printings.push(...official.printings)
  input.ruleset.allowedNumbers.push('OP06-009', 'OP06-017'); input.effectRegistry = structuredClone(OFFICIAL_ABILITY_REGISTRY)
  const deck = input.players[1].cards, removable = deck.find(entry => entry.quantity > 1)!
  removable.quantity--; deck.push({ printingKey: 'OP06-017::standard', quantity: 1 })
  let s = prepared(3, input)
  const bob = s.players[1], eventId = bob.zones.deck.find(id => s.instances[id].definitionId === 'OP06-017@official-2026-10-11')!
  bob.zones.deck.splice(bob.zones.deck.indexOf(eventId), 1); bob.zones.hand.push(eventId); s.instances[eventId].zone = 'hand'; s.instances[eventId].zoneGeneration++
  const attacker = s.players[0].zones.leader[0], target = bob.zones.leader[0]
  let result = applyCommand(s, { id: 'meteor-attack', actorId: 'alice', expectedVersion: s.version, type: 'DECLARE_ATTACK', attackerId: attacker, targetId: target })
  assert.ok(result.ok, result.ok ? '' : result.error); if (!result.ok) return; s = result.state
  result = applyCommand(s, { id: 'meteor-pass-blocker', actorId: 'bob', expectedVersion: s.version, type: 'PASS_BLOCKER', battleId: s.battle!.id })
  assert.ok(result.ok, result.ok ? '' : result.error); if (!result.ok) return; s = result.state
  const paymentDonIds = bob.zones.cost.filter(id => !s.instances[id].rested).slice(0, 2), paidLife = bob.zones.life[0]
  result = applyCommand(s, { id: 'meteor-counter', actorId: 'bob', expectedVersion: s.version, type: 'PLAY_COUNTER_EVENT', cardId: eventId, battleId: s.battle!.id, paymentDonIds, donMinusIds: [], targetId: target, lifePayment: true })
  assert.ok(result.ok, result.ok ? '' : result.error); if (!result.ok) return; s = result.state
  assert.equal(s.instances[eventId].zone, 'trash'); assert.equal(s.instances[paidLife].zone, 'hand'); assert.equal(s.instances[paidLife].faceUp, false)
  assert.equal(evaluateCharacteristics(s, target).power.current, 8000)
  result = applyCommand(s, { id: 'meteor-pass-counter', actorId: 'bob', expectedVersion: s.version, type: 'PASS_COUNTER', battleId: s.battle!.id })
  assert.ok(result.ok, result.ok ? '' : result.error); if (!result.ok) return; s = result.state
  result = applyCommand(s, { id: 'meteor-resolve-battle', actorId: 'alice', expectedVersion: s.version, type: 'RESOLVE_BATTLE', battleId: s.battle!.id })
  assert.ok(result.ok, result.ok ? '' : result.error); if (!result.ok) return; s = result.state
  assert.equal(s.battle, null); assert.equal(s.players[1].zones.life.length, 4)
  assert.equal(s.events.filter(e => e.type === 'LIFE_PAID').length, 1)
  assert.doesNotThrow(() => assertGameInvariants(restoreGame(JSON.stringify(s))))
  writeUniversalEvidence('official-counter-event-op06-017.json', { seed: 77, card: 'OP06-017', paidPrintedCost: paymentDonIds.length, paidOptionalLife: true, powerAfter: 8000, opponentLifeAfterBattle: s.players[1].zones.life.length, events: s.events.slice(-5) })
})

function triggerBattleInput() {
  const input = fixture(), official = consolidateDefinitions(OFFICIAL_ABILITY_CARDS)
  assert.deepEqual(official.errors, [])
  input.definitions.push(...official.definitions); input.printings.push(...official.printings)
  input.ruleset.allowedNumbers.push('OP06-009', 'OP06-013', 'OP06-017', 'OP06-018'); input.effectRegistry = structuredClone(OFFICIAL_ABILITY_REGISTRY)
  const deck = input.players[1].cards
  for (const number of ['OP06-018', 'OP06-013', 'OP06-009']) {
    const removable = deck.find(entry => entry.quantity > 1)!
    removable.quantity--; deck.push({ printingKey: `${number}::standard`, quantity: 1 })
  }
  return input
}
function prepareOfficialTriggerBattle() {
  let s = prepared(3, triggerBattleInput()), defender = s.players[1]
  const trigger = Object.values(s.instances).find(i => i.owner === defender.id && i.definitionId === 'OP06-018@official-2026-10-11')!
  const triggerWasLife = trigger.zone === 'life'
  defender.zones[trigger.zone].splice(defender.zones[trigger.zone].indexOf(trigger.id), 1)
  if (!triggerWasLife) {
    const displaced = defender.zones.life.pop()!
    defender.zones.deck.push(displaced); s.instances[displaced].zone = 'deck'; s.instances[displaced].zoneGeneration++; s.instances[displaced].faceUp = false
  }
  defender.zones.life.unshift(trigger.id); trigger.zone = 'life'; trigger.zoneGeneration++; trigger.faceUp = false; trigger.rested = false
  const alice = s.players[0], character = alice.zones.deck.find(id => s.catalog.definitions.find(d => d.definitionId === s.instances[id].definitionId)?.number === 'ST01-003')!
  alice.zones.deck.splice(alice.zones.deck.indexOf(character), 1); alice.zones.characters.push(character)
  s.instances[character].zone = 'characters'; s.instances[character].zoneGeneration++; s.instances[character].faceUp = true
  return { state: s, triggerId: trigger.id, targetCharacterId: character }
}
function attackLeaderToDamage(state: GameState) {
  let s = state, result = applyCommand(s, { id: 'official-trigger-attack', actorId: 'alice', expectedVersion: s.version, type: 'DECLARE_ATTACK', attackerId: s.players[0].zones.leader[0], targetId: s.players[1].zones.leader[0] })
  assert.ok(result.ok, result.ok ? '' : result.error); if (!result.ok) return s; s = result.state
  result = applyCommand(s, { id: 'official-trigger-pass-block', actorId: 'bob', expectedVersion: s.version, type: 'PASS_BLOCKER', battleId: s.battle!.id })
  assert.ok(result.ok, result.ok ? '' : result.error); if (!result.ok) return s; s = result.state
  result = applyCommand(s, { id: 'official-trigger-pass-counter', actorId: 'bob', expectedVersion: s.version, type: 'PASS_COUNTER', battleId: s.battle!.id })
  assert.ok(result.ok, result.ok ? '' : result.error); if (!result.ok) return s; s = result.state
  result = applyCommand(s, { id: 'official-trigger-resolve-damage', actorId: 'alice', expectedVersion: s.version, type: 'RESOLVE_BATTLE', battleId: s.battle!.id })
  assert.ok(result.ok, result.ok ? '' : result.error); if (!result.ok) return s; return result.state
}

test('universal engine: OP06-018 Trigger suspends Life damage, resolves its real K.O. choice and resumes after JSON restore', () => {
  const setup = prepareOfficialTriggerBattle(); let s = attackLeaderToDamage(setup.state)
  assert.equal(s.battle?.step, 'LIFE_TRIGGER'); assert.equal(s.players[1].zones.life[0], setup.triggerId)
  const prompt = getLegalActions(s, 'bob').find(action => action.type === 'ANSWER_TRIGGER')
  assert.ok(prompt?.type === 'ANSWER_TRIGGER')
  assert.equal(getLegalActions(s, 'alice').some(action => action.type === 'ANSWER_TRIGGER'), false)
  const bobView = projectState(s, 'bob'), aliceView = projectState(s, 'alice')
  assert.equal(JSON.stringify(aliceView).includes(setup.triggerId), false)
  assert.doesNotThrow(() => restoreGame(JSON.stringify(s)))
  const triggerAnswer = { id: 'official-trigger-accept', actorId: 'bob', expectedVersion: s.version, type: 'ANSWER_TRIGGER' as const, choiceId: prompt!.choiceId, activate: true }
  let result = applyCommand(restoreGame(JSON.stringify(s)), triggerAnswer)
  assert.ok(result.ok, result.ok ? '' : result.error); if (!result.ok) return; s = result.state
  const replayedTriggerAnswer = applyCommand(s, triggerAnswer)
  assert.ok(replayedTriggerAnswer.ok && replayedTriggerAnswer.replayed)
  assert.equal(replayedTriggerAnswer.state.events.filter(e => e.type === 'TRIGGER_ACTIVATED').length, 1)
  assert.equal(s.battle?.step, 'LIFE_CONTINUE'); assert.equal(s.instances[setup.triggerId].zone, 'temporary')
  const choice = s.effects!.choice
  assert.ok(choice); assert.equal(choice.actorId, 'bob')
  assert.equal(JSON.stringify(projectState(s, 'alice')).includes(choice!.id), true, 'the chosen Character is public and its target-selection choice is public')
  const targetOption = choice!.options.find(option => option.presence.instanceId === setup.targetCharacterId)!
  result = applyCommand(restoreGame(JSON.stringify(s)), { id: 'official-trigger-ko-target', actorId: 'bob', expectedVersion: s.version, type: 'ANSWER_CHOICE', choiceId: choice!.id, tokens: [targetOption.token] })
  assert.ok(result.ok, result.ok ? '' : result.error); if (!result.ok) return; s = result.state
  assert.equal(s.instances[setup.targetCharacterId].zone, 'trash'); assert.equal(s.instances[setup.triggerId].zone, 'trash')
  assert.equal(s.events.some(e => e.type === 'CHARACTER_KO' && e.publicInstanceId === setup.targetCharacterId), true)
  assert.equal(s.players[1].zones.life.length, 4)
  result = applyCommand(s, { id: 'official-trigger-resume-damage', actorId: 'alice', expectedVersion: s.version, type: 'CONTINUE_LIFE_DAMAGE', battleId: s.battle!.id })
  assert.ok(result.ok, result.ok ? '' : result.error); if (!result.ok) return; s = result.state
  assert.equal(s.battle, null); assert.equal(s.players[1].zones.life.length, 4)
  assert.equal(s.events.some(e => e.type === 'CARD_REVEALED' && e.revealedCard?.definitionId === 'OP06-018@official-2026-10-11'), true)
  assert.doesNotThrow(() => assertGameInvariants(restoreGame(JSON.stringify(s))))
  writeUniversalEvidence('official-trigger-op06-018.json', { seed: 77, card: 'OP06-018', triggerLifeInstance: setup.triggerId, privatePromptForDefender: !!bobView.battle?.lifeTrigger && !JSON.stringify(aliceView).includes(setup.triggerId), choiceTarget: setup.targetCharacterId, targetZone: s.instances[setup.targetCharacterId].zone, triggerZone: s.instances[setup.triggerId].zone, lifeRemaining: s.players[1].zones.life.length, resumedAfterJson: true })
})

test('universal engine: declining OP06-018 Trigger adds Life to hand unrevealed and does not run its K.O.', () => {
  const setup = prepareOfficialTriggerBattle(); let s = attackLeaderToDamage(setup.state)
  const prompt = getLegalActions(s, 'bob').find(action => action.type === 'ANSWER_TRIGGER')
  assert.ok(prompt?.type === 'ANSWER_TRIGGER')
  const result = applyCommand(s, { id: 'official-trigger-decline', actorId: 'bob', expectedVersion: s.version, type: 'ANSWER_TRIGGER', choiceId: prompt!.choiceId, activate: false })
  assert.ok(result.ok, result.ok ? '' : result.error); if (!result.ok) return; s = result.state
  assert.equal(s.instances[setup.triggerId].zone, 'hand'); assert.equal(s.instances[setup.triggerId].faceUp, false)
  assert.equal(s.instances[setup.targetCharacterId].zone, 'characters')
  assert.equal(s.events.some(e => e.type === 'CARD_REVEALED' || e.type === 'TRIGGER_ACTIVATED'), false)
  assert.equal(JSON.stringify(projectState(s, 'alice')).includes(setup.triggerId), false)
  const resumed = applyCommand(s, { id: 'official-trigger-decline-resume', actorId: 'alice', expectedVersion: s.version, type: 'CONTINUE_LIFE_DAMAGE', battleId: s.battle!.id })
  assert.ok(resumed.ok); if (!resumed.ok) return
  assert.equal(resumed.state.battle, null); assert.doesNotThrow(() => assertGameInvariants(resumed.state))
})

test('universal engine: official OP06-013 Trigger privately searches, reveals a FILM card, orders the rest, then resumes Life damage', () => {
  let s = prepared(3, triggerBattleInput()), bob = s.players[1]
  const trigger = Object.values(s.instances).find(i => i.owner === bob.id && i.definitionId === 'OP06-013@official-2026-10-11')!
  const film = Object.values(s.instances).find(i => i.owner === bob.id && i.definitionId === 'OP06-009@official-2026-10-11')!
  for (const card of [trigger, film]) bob.zones[card.zone].splice(bob.zones[card.zone].indexOf(card.id), 1)
  const displaced = bob.zones.life.pop()!
  bob.zones.deck.push(displaced); s.instances[displaced].zone = 'deck'; s.instances[displaced].zoneGeneration++; s.instances[displaced].faceUp = false
  bob.zones.life.unshift(trigger.id); trigger.zone = 'life'; trigger.zoneGeneration++; trigger.faceUp = false
  bob.zones.deck.unshift(film.id); film.zone = 'deck'; film.zoneGeneration++; film.faceUp = false
  const alice = s.players[0], defender = bob.zones.leader[0]
  let result = applyCommand(s, { id: 'film-trigger-attack', actorId: 'alice', expectedVersion: s.version, type: 'DECLARE_ATTACK', attackerId: alice.zones.leader[0], targetId: defender })
  assert.ok(result.ok, result.ok ? '' : result.error); if (!result.ok) return; s = result.state
  result = applyCommand(s, { id: 'film-trigger-pass-block', actorId: 'bob', expectedVersion: s.version, type: 'PASS_BLOCKER', battleId: s.battle!.id })
  assert.ok(result.ok, result.ok ? '' : result.error); if (!result.ok) return; s = result.state
  result = applyCommand(s, { id: 'film-trigger-pass-counter', actorId: 'bob', expectedVersion: s.version, type: 'PASS_COUNTER', battleId: s.battle!.id })
  assert.ok(result.ok, result.ok ? '' : result.error); if (!result.ok) return; s = result.state
  result = applyCommand(s, { id: 'film-trigger-resolve', actorId: 'alice', expectedVersion: s.version, type: 'RESOLVE_BATTLE', battleId: s.battle!.id })
  assert.ok(result.ok, result.ok ? '' : result.error); if (!result.ok) return; s = result.state
  const triggerPrompt = getLegalActions(s, 'bob').find(a => a.type === 'ANSWER_TRIGGER')
  assert.ok(triggerPrompt?.type === 'ANSWER_TRIGGER')
  result = applyCommand(s, { id: 'film-trigger-accept', actorId: 'bob', expectedVersion: s.version, type: 'ANSWER_TRIGGER', choiceId: triggerPrompt!.choiceId, activate: true })
  assert.ok(result.ok, result.ok ? '' : result.error); if (!result.ok) return; s = result.state
  assert.equal(s.effects!.choice?.choiceType, 'SELECT'); assert.equal(s.effects!.choice?.actorId, 'bob')
  assert.equal(s.effects!.choice?.options.some(option => option.presence.instanceId === film.id), true)
  assert.equal(JSON.stringify(projectState(s, 'alice')).includes(s.effects!.choice!.id), false)
  assert.doesNotThrow(() => restoreGame(JSON.stringify(s)))
  const selection = s.effects!.choice!, filmOption = selection.options.find(option => option.presence.instanceId === film.id)!
  const invalid = applyCommand(s, { id: 'film-search-forged', actorId: 'bob', expectedVersion: s.version, type: 'ANSWER_CHOICE', choiceId: selection.id, tokens: ['not-an-option'] })
  assert.equal(invalid.ok, false)
  const selectionCommand = { id: 'film-search-select', actorId: 'bob', expectedVersion: s.version, type: 'ANSWER_CHOICE' as const, choiceId: selection.id, tokens: [filmOption.token] }
  result = applyCommand(restoreGame(JSON.stringify(s)), selectionCommand)
  assert.ok(result.ok, result.ok ? '' : result.error); if (!result.ok) return; s = result.state
  const selectionReplay = applyCommand(s, selectionCommand)
  assert.ok(selectionReplay.ok && selectionReplay.replayed); assert.deepEqual(selectionReplay.state, s)
  assert.equal(s.instances[film.id].zone, 'hand'); assert.equal(s.instances[film.id].faceUp, false)
  assert.equal(s.events.some(e => e.type === 'CARD_REVEALED' && e.revealedCard?.definitionId === film.definitionId), true)
  assert.equal(s.effects!.choice?.choiceType, 'ORDER')
  const ordering = s.effects!.choice!, reversed = [...ordering.options].reverse().map(option => option.token)
  result = applyCommand(restoreGame(JSON.stringify(s)), { id: 'film-search-order', actorId: 'bob', expectedVersion: s.version, type: 'ANSWER_CHOICE', choiceId: ordering.id, tokens: reversed })
  assert.ok(result.ok, result.ok ? '' : result.error); if (!result.ok) return; s = result.state
  assert.equal(s.battle?.step, 'LIFE_CONTINUE'); assert.equal(s.instances[trigger.id].zone, 'trash')
  result = applyCommand(s, { id: 'film-trigger-resume-damage', actorId: 'alice', expectedVersion: s.version, type: 'CONTINUE_LIFE_DAMAGE', battleId: s.battle!.id })
  assert.ok(result.ok, result.ok ? '' : result.error); if (!result.ok) return; s = result.state
  assert.equal(s.battle, null); assert.equal(s.players[1].zones.life.length, 4)
  assert.doesNotThrow(() => assertGameInvariants(restoreGame(JSON.stringify(s))))
  writeUniversalEvidence('official-trigger-search-op06-013.json', { card: 'OP06-013', chosen: 'OP06-009', choicesPrivateBeforeReveal: true, revealedByEffect: true, remainderOrderedAndBottomed: true, resumedAfterRestore: true, triggerZone: s.instances[trigger.id].zone, resultLife: s.players[1].zones.life.length })
})

test('universal engine: official OP06-013 On Play executes the same declarative search program', () => {
  const input = triggerBattleInput(), deck = input.players[0].cards
  for (const number of ['OP06-013', 'OP06-009']) { const entry = deck.find(item => item.quantity > 1)!; entry.quantity--; deck.push({ printingKey: `${number}::standard`, quantity: 1 }) }
  let s = prepared(3, input), alice = s.players[0]
  const luffy = Object.values(s.instances).find(i => i.owner === alice.id && i.definitionId === 'OP06-013@official-2026-10-11')!
  const film = Object.values(s.instances).find(i => i.owner === alice.id && i.definitionId === 'OP06-009@official-2026-10-11')!
  alice.zones.deck.splice(alice.zones.deck.indexOf(luffy.id), 1); alice.zones.hand.push(luffy.id); luffy.zone = 'hand'; luffy.zoneGeneration++
  alice.zones.deck.splice(alice.zones.deck.indexOf(film.id), 1); alice.zones.deck.unshift(film.id); film.zoneGeneration++
  const play = getLegalActions(s, 'alice').find(a => a.type === 'PLAY_CARD' && a.instanceId === luffy.id)
  assert.ok(play?.type === 'PLAY_CARD' && play.cost === 2)
  let result = applyCommand(s, { id: 'film-onplay-play', actorId: 'alice', expectedVersion: s.version, type: 'PLAY_CARD', instanceId: luffy.id, donIds: play!.eligibleDonIds.slice(0, 2), replaceId: null })
  assert.ok(result.ok, result.ok ? '' : result.error); if (!result.ok) return; s = result.state
  const choice = s.effects!.choice!
  assert.equal(choice.choiceType, 'SELECT'); assert.equal(choice.options.some(option => option.presence.instanceId === film.id), true)
  let answer = applyCommand(restoreGame(JSON.stringify(s)), { id: 'film-onplay-select', actorId: 'alice', expectedVersion: s.version, type: 'ANSWER_CHOICE', choiceId: choice.id, tokens: [choice.options.find(option => option.presence.instanceId === film.id)!.token] })
  assert.ok(answer.ok, answer.ok ? '' : answer.error); if (!answer.ok) return; s = answer.state
  const order = s.effects!.choice!
  answer = applyCommand(s, { id: 'film-onplay-order', actorId: 'alice', expectedVersion: s.version, type: 'ANSWER_CHOICE', choiceId: order.id, tokens: order.options.map(option => option.token) })
  assert.ok(answer.ok, answer.ok ? '' : answer.error); if (!answer.ok) return; s = answer.state
  assert.equal(s.instances[luffy.id].zone, 'characters'); assert.equal(s.instances[film.id].zone, 'hand')
  assert.equal(s.events.some(e => e.type === 'CARD_REVEALED' && e.revealedCard?.definitionId === film.definitionId), true)
  assert.equal(s.effects!.active!.status, 'COMPLETED'); assert.doesNotThrow(() => assertGameInvariants(restoreGame(JSON.stringify(s))))
  writeUniversalEvidence('official-onplay-search-op06-013.json', { seed: 77, played: 'OP06-013', selected: 'OP06-009', abilityCompleted: s.effects!.active!.status === 'COMPLETED', publicRevealEvent: s.events.find(event => event.type === 'CARD_REVEALED'), privateSelectionBeforeReveal: true, remainderMovedToBottom: true })
})

test('universal engine: complete official cross-set battle resolves Shuraiya, Meteor-Strike Counter and OP06-013 Trigger', () => {
  const input = triggerBattleInput()
  for (const number of ['OP06-009']) { const entry = input.players[0].cards.find(item => item.quantity > 1)!; entry.quantity--; input.players[0].cards.push({ printingKey: `${number}::standard`, quantity: 1 }) }
  { const entry = input.players[1].cards.find(item => item.quantity > 1)!; entry.quantity--; input.players[1].cards.push({ printingKey: 'OP06-017::standard', quantity: 1 }) }
  let s = prepared(3, input), alice = s.players[0], bob = s.players[1]
  const takeCharacter = (playerIndex: number, number: string) => {
    const player = s.players[playerIndex], id = player.zones.deck.find(cardId => s.catalog.definitions.find(d => d.definitionId === s.instances[cardId].definitionId)?.number === number)!
    player.zones.deck.splice(player.zones.deck.indexOf(id), 1); player.zones.characters.push(id)
    s.instances[id].zone = 'characters'; s.instances[id].zoneGeneration++; s.instances[id].faceUp = true; s.instances[id].playedOnTurn = s.turn - 1
    return id
  }
  const attacker = takeCharacter(0, 'OP06-009'), buffTarget = takeCharacter(1, 'ST01-003')
  const attached = alice.zones.cost.pop()!; alice.zones.attached.push(attached); Object.assign(s.instances[attached], { zone: 'attached', zoneGeneration: s.instances[attached].zoneGeneration + 1, attachedTo: attacker })
  const eventCard = bob.zones.deck.find(id => s.instances[id].definitionId === 'OP06-017@official-2026-10-11')!
  bob.zones.deck.splice(bob.zones.deck.indexOf(eventCard), 1); bob.zones.hand.push(eventCard); s.instances[eventCard].zone = 'hand'; s.instances[eventCard].zoneGeneration++
  const lifeTrigger = bob.zones.deck.find(id => s.instances[id].definitionId === 'OP06-013@official-2026-10-11')!
  bob.zones.deck.splice(bob.zones.deck.indexOf(lifeTrigger), 1)
  const displaced = bob.zones.life.pop()!; bob.zones.deck.push(displaced); s.instances[displaced].zone = 'deck'; s.instances[displaced].zoneGeneration++; s.instances[displaced].faceUp = false
  bob.zones.life.unshift(lifeTrigger); s.instances[lifeTrigger].zone = 'life'; s.instances[lifeTrigger].zoneGeneration++; s.instances[lifeTrigger].faceUp = false
  const filmSearchTarget = bob.zones.deck.find(id => s.instances[id].definitionId === 'OP06-009@official-2026-10-11')!
  bob.zones.deck.splice(bob.zones.deck.indexOf(filmSearchTarget), 1); bob.zones.deck.unshift(filmSearchTarget); s.instances[filmSearchTarget].zoneGeneration++
  const targetLeader = bob.zones.leader[0]
  let result = applyCommand(s, { id: 'cross-set-attack', actorId: 'alice', expectedVersion: s.version, type: 'DECLARE_ATTACK', attackerId: attacker, targetId: targetLeader })
  assert.ok(result.ok, result.ok ? '' : result.error); if (!result.ok) return; s = result.state
  result = applyCommand(s, { id: 'cross-set-pass-blocker', actorId: 'bob', expectedVersion: s.version, type: 'PASS_BLOCKER', battleId: s.battle!.id })
  assert.ok(result.ok, result.ok ? '' : result.error); if (!result.ok) return; s = result.state
  const payment = s.players[1].zones.cost.filter(id => !s.instances[id].rested).slice(0, 2)
  result = applyCommand(s, { id: 'cross-set-counter-event', actorId: 'bob', expectedVersion: s.version, type: 'PLAY_COUNTER_EVENT', cardId: eventCard, battleId: s.battle!.id, paymentDonIds: payment, donMinusIds: [], targetId: null, lifePayment: false })
  assert.ok(result.ok, result.ok ? '' : result.error); if (!result.ok) return; s = result.state
  assert.equal(evaluateCharacteristics(s, attacker).power.current, 6000); assert.equal(evaluateCharacteristics(s, buffTarget).power.current, 3000, 'declining OP06-017’s optional Life cost skips its power effect')
  result = applyCommand(s, { id: 'cross-set-pass-counter', actorId: 'bob', expectedVersion: s.version, type: 'PASS_COUNTER', battleId: s.battle!.id })
  assert.ok(result.ok); if (!result.ok) return; s = result.state
  result = applyCommand(s, { id: 'cross-set-resolve-attack', actorId: 'alice', expectedVersion: s.version, type: 'RESOLVE_BATTLE', battleId: s.battle!.id })
  assert.ok(result.ok, result.ok ? '' : result.error); if (!result.ok) return; s = result.state
  const triggerPrompt = getLegalActions(s, 'bob').find(a => a.type === 'ANSWER_TRIGGER')
  assert.ok(triggerPrompt?.type === 'ANSWER_TRIGGER')
  result = applyCommand(restoreGame(JSON.stringify(s)), { id: 'cross-set-accept-trigger', actorId: 'bob', expectedVersion: s.version, type: 'ANSWER_TRIGGER', choiceId: triggerPrompt!.choiceId, activate: true })
  assert.ok(result.ok, result.ok ? '' : result.error); if (!result.ok) return; s = result.state
  const search = s.effects!.choice!, chosen = search.options.find(option => option.presence.instanceId === filmSearchTarget)!
  result = applyCommand(s, { id: 'cross-set-select-film', actorId: 'bob', expectedVersion: s.version, type: 'ANSWER_CHOICE', choiceId: search.id, tokens: [chosen.token] })
  assert.ok(result.ok, result.ok ? '' : result.error); if (!result.ok) return; s = result.state
  const order = s.effects!.choice!
  result = applyCommand(restoreGame(JSON.stringify(s)), { id: 'cross-set-order-search', actorId: 'bob', expectedVersion: s.version, type: 'ANSWER_CHOICE', choiceId: order.id, tokens: order.options.map(option => option.token) })
  assert.ok(result.ok, result.ok ? '' : result.error); if (!result.ok) return; s = result.state
  result = applyCommand(s, { id: 'cross-set-resume-life', actorId: 'alice', expectedVersion: s.version, type: 'CONTINUE_LIFE_DAMAGE', battleId: s.battle!.id })
  assert.ok(result.ok, result.ok ? '' : result.error); if (!result.ok) return; s = result.state
  assert.equal(s.battle, null); assert.equal(s.instances[lifeTrigger].zone, 'trash'); assert.equal(s.instances[lifeTrigger].faceUp, true)
  assert.equal(s.instances[filmSearchTarget].zone, 'hand'); assert.equal(s.events.some(e => e.type === 'COUNTER_PLAYED' && e.publicInstanceId === eventCard), true)
  assert.equal(s.events.filter(e => e.type === 'LIFE_DAMAGED').length, 1)
  assert.doesNotThrow(() => assertGameInvariants(restoreGame(JSON.stringify(s))))
  writeUniversalEvidence('official-cross-set-battle-op06-009-017-013.json', { seed: 77, officialCards: ['OP06-009', 'OP06-017', 'OP06-013'], declarations: s.events.filter(e => ['ATTACK_DECLARED', 'COUNTER_PLAYED', 'TRIGGER_ACTIVATED', 'LIFE_DAMAGED'].includes(e.type)), lifeCardFinalZone: s.instances[lifeTrigger].zone, searchedFilmFinalZone: s.instances[filmSearchTarget].zone, suspendedAndRestored: true, battleCompleted: s.battle === null })
})

test('universal engine: OP06-018 Main is offered from hand only in Main Phase and its official two-step effect resolves', () => {
  const input = triggerBattleInput(), entry = input.players[0].cards.find(item => item.quantity > 1)!
  entry.quantity--; input.players[0].cards.push({ printingKey: 'OP06-018::standard', quantity: 1 })
  let s = prepared(3, input), alice = s.players[0]
  const eventId = alice.zones.deck.find(id => s.instances[id].definitionId === 'OP06-018@official-2026-10-11')!
  alice.zones.deck.splice(alice.zones.deck.indexOf(eventId), 1); alice.zones.hand.push(eventId)
  s.instances[eventId].zone = 'hand'; s.instances[eventId].zoneGeneration++
  const opponentCharacter = s.players[1].zones.deck[0]!
  s.catalog.definitions.find(d => d.definitionId === s.instances[opponentCharacter].definitionId)!.power = 7000
  s.players[1].zones.deck.splice(s.players[1].zones.deck.indexOf(opponentCharacter), 1); s.players[1].zones.characters.push(opponentCharacter)
  s.instances[opponentCharacter].zone = 'characters'; s.instances[opponentCharacter].zoneGeneration++; s.instances[opponentCharacter].faceUp = true
  assert.ok(alice.zones.cost.filter(id => !s.instances[id].rested).length >= 2, 'setup must provide the Event printed DON!! cost')
  assert.equal(s.activePlayerId, 'alice')
  const ownCharacter = alice.zones.deck[0]!
  alice.zones.deck.splice(0, 1); alice.zones.characters.push(ownCharacter)
  s.instances[ownCharacter].zone = 'characters'; s.instances[ownCharacter].zoneGeneration++; s.instances[ownCharacter].faceUp = true
  const action = getLegalActions(s, 'alice').find(candidate => candidate.type === 'START_EFFECT' && candidate.effectId.startsWith('OP06-018.main-power-condition:'))
  assert.ok(isStartEffect(action), 'official [Main] Event must be activatable from hand')
  assert.equal(getLegalActions(s, 'bob').some(candidate => candidate.type === 'START_EFFECT'), false)
  let result = applyCommand(s, { id:'gatling-main', actorId:'alice', expectedVersion:s.version, type:'START_EFFECT', effectId:action!.effectId })
  assert.ok(result.ok, result.ok ? '' : result.error); if (!result.ok) return; s=result.state
  assert.equal(s.instances[eventId].zone, 'trash')
  assert.equal(s.effects!.choice?.actorId, 'alice')
  const first = s.effects!.choice!
  const leaderId = alice.zones.leader[0]
  const leaderOption = first.options.find(option=>option.presence.instanceId===leaderId)!
  result = applyCommand(restoreGame(JSON.stringify(s)), { id:'gatling-main-first-target',actorId:'alice',expectedVersion:s.version,type:'ANSWER_CHOICE',choiceId:first.id,tokens:[leaderOption.token] })
  assert.ok(result.ok, result.ok ? '' : result.error); if (!result.ok) return; s=result.state
  const second = s.effects!.choice!
  assert.equal(second.options.some(option=>option.presence.instanceId===ownCharacter),true)
  const characterOption=second.options.find(option=>option.presence.instanceId===ownCharacter)!
  result=applyCommand(restoreGame(JSON.stringify(s)),{id:'gatling-main-second-target',actorId:'alice',expectedVersion:s.version,type:'ANSWER_CHOICE',choiceId:second.id,tokens:[characterOption.token]})
  assert.ok(result.ok, result.ok ? '' : result.error); if (!result.ok) return; s=result.state
  assert.equal(s.effects!.active?.status,'COMPLETED')
  assert.equal(evaluateCharacteristics(s,leaderId).power.current,8000)
  assert.equal(evaluateCharacteristics(s,ownCharacter).power.current,6000)
  const payments=s.effects!.payments!.filter(payment=>payment.resolutionId===s.effects!.active!.id)
  assert.equal(payments.length,2, 'effect cost and printed Event cost have separate payment records')
  assert.equal(payments.reduce((count,payment)=>count+payment.paidOperationIds.length,0),2)
  assert.doesNotThrow(()=>assertGameInvariants(restoreGame(JSON.stringify(s))))
})

test('universal engine: OP06-017 Main pays its optional Life cost before applying +3000', () => {
  const input=triggerBattleInput(), entries=input.players[0].cards, removable=entries.find(entry=>entry.quantity>1)!
  removable.quantity--; entries.push({printingKey:'OP06-017::standard',quantity:1})
  let s=prepared(3,input), alice=s.players[0]
  const eventId=alice.zones.deck.find(id=>s.instances[id].definitionId==='OP06-017@official-2026-10-11')!
  alice.zones.deck.splice(alice.zones.deck.indexOf(eventId),1);alice.zones.hand.push(eventId);s.instances[eventId].zone='hand';s.instances[eventId].zoneGeneration++
  const target=alice.zones.leader[0], paidLife=alice.zones.life[0]
  const action=getLegalActions(s,'alice').find(candidate=>candidate.type==='START_EFFECT'&&candidate.effectId.startsWith('OP06-017.main-life-power:'))
  assert.ok(isStartEffect(action))
  let result=applyCommand(s,{id:'meteor-main-pay',actorId:'alice',expectedVersion:s.version,type:'START_EFFECT',effectId:action!.effectId,payOptionalCost:true})
  assert.ok(result.ok,result.ok?'':result.error);if(!result.ok)return;s=result.state
  assert.equal(s.instances[paidLife].zone,'hand');assert.equal(s.instances[paidLife].faceUp,false);assert.equal(s.instances[eventId].zone,'trash')
  const choice=s.effects!.choice!, option=choice.options.find(item=>item.presence.instanceId===target)!
  result=applyCommand(restoreGame(JSON.stringify(s)),{id:'meteor-main-target',actorId:'alice',expectedVersion:s.version,type:'ANSWER_CHOICE',choiceId:choice.id,tokens:[option.token]})
  assert.ok(result.ok,result.ok?'':result.error);if(!result.ok)return;s=result.state
  assert.equal(evaluateCharacteristics(s,target).power.current,8000)
  assert.equal(s.effects!.payments!.reduce((sum,payment)=>sum+payment.paidOperationIds.length,0),2)
  assert.doesNotThrow(()=>assertGameInvariants(restoreGame(JSON.stringify(s))))
})

test('universal engine: declining OP06-017 Main optional Life cost consumes printed Event cost but skips its effect',()=>{
  const input=triggerBattleInput(),entries=input.players[0].cards,removable=entries.find(entry=>entry.quantity>1)!
  removable.quantity--;entries.push({printingKey:'OP06-017::standard',quantity:1})
  let s=prepared(3,input),alice=s.players[0]
  const eventId=alice.zones.deck.find(id=>s.instances[id].definitionId==='OP06-017@official-2026-10-11')!
  alice.zones.deck.splice(alice.zones.deck.indexOf(eventId),1);alice.zones.hand.push(eventId);s.instances[eventId].zone='hand';s.instances[eventId].zoneGeneration++
  const target=alice.zones.leader[0],lifeBefore=alice.zones.life.length
  const action=getLegalActions(s,'alice').find(candidate=>candidate.type==='START_EFFECT'&&candidate.effectId.startsWith('OP06-017.main-life-power:'))
  assert.ok(isStartEffect(action))
  const result=applyCommand(s,{id:'meteor-main-decline',actorId:'alice',expectedVersion:s.version,type:'START_EFFECT',effectId:action.effectId})
  assert.ok(result.ok,result.ok?'':result.error);if(!result.ok)return;s=result.state
  assert.equal(s.instances[eventId].zone,'trash');assert.equal(s.players[0].zones.life.length,lifeBefore)
  assert.equal(s.effects!.active?.status,'COMPLETED');assert.equal(evaluateCharacteristics(s,target).power.current,5000)
})

test('universal engine: [Activate: Main] validates phase, pays REST_SOURCE and enforces Once Per Turn',()=>{
  const input=fixture(),sourceDefinition=input.definitions.find(definition=>definition.number==='ST01-003')!
  const abilityId='TEST-FUTURE-SET.activate-main'
  sourceDefinition.review.effects=[{kind:'declarative',abilityIds:[abilityId]}];sourceDefinition.review.requiredCapabilities=['declarative']
  sourceDefinition.review.effectOriginal='[Activate: Main] [Once Per Turn] This Character gains +1000 power this turn.'
  input.effectRegistry={version:'1.3.0',dslVersion:'1.3.0',restrictions:[],replacements:[],definitions:[{
    id:abilityId,revision:'1',dslVersion:'1.3.0',source:{kind:'CARD_DEFINITION',definitionId:sourceDefinition.definitionId,zone:'characters'},timing:'ACTIVATE_MAIN',condition:{kind:'ALWAYS'},cost:{kind:'REST_SOURCE'},usage:{kind:'ONCE_PER_TURN'},
    program:[{kind:'OPERATION',operation:{primitive:'addPower',version:'1.0.0',player:'CONTROLLER',audience:'PUBLIC',amount:1000,duration:'THIS_TURN'}}],
  },...structuredClone(M0_GIVE_DON_PROGRAMS)]} // the ST01 Leader/Nami abilities must stay executable (M3 fix)
  let s=prepared(3,input),alice=s.players[0],character=alice.zones.deck.find(id=>s.instances[id].definitionId===sourceDefinition.definitionId)!
  alice.zones.deck.splice(alice.zones.deck.indexOf(character),1);alice.zones.characters.push(character);s.instances[character].zone='characters';s.instances[character].zoneGeneration++;s.instances[character].faceUp=true
  const action=getLegalActions(s,'alice').find(candidate=>candidate.type==='START_EFFECT'&&candidate.effectId.startsWith(`${abilityId}:`))
  assert.ok(isStartEffect(action))
  let result=applyCommand(s,{id:'activate-main-first',actorId:'alice',expectedVersion:s.version,type:'START_EFFECT',effectId:action!.effectId})
  assert.ok(result.ok,result.ok?'':result.error);if(!result.ok)return;s=result.state
  assert.equal(s.instances[character].rested,true);assert.equal(evaluateCharacteristics(s,character).power.current,4000)
  assert.equal(getLegalActions(s,'alice').some(candidate=>candidate.type==='START_EFFECT'&&candidate.effectId.startsWith(`${abilityId}:`)),false)
  const before=JSON.stringify(s)
  result=applyCommand(s,{id:'activate-main-out-of-window',actorId:'bob',expectedVersion:s.version,type:'START_EFFECT',effectId:action!.effectId})
  assert.equal(result.ok,false);assert.equal(JSON.stringify(s),before)
})

test('universal engine: future Event composes optional search, private selection, reveal, zone move and deterministic shuffle',()=>{
  const input=triggerBattleInput(),eventDefinition=input.definitions.find(definition=>definition.number==='OP06-018')!
  const aliceEntries=input.players[0].cards,removable=aliceEntries.find(entry=>entry.quantity>1)!
  removable.quantity--;aliceEntries.push({printingKey:'OP06-018::standard',quantity:1})
  const abilityId='TEST-FUTURE-SET.search-reveal-move-shuffle'
  const registry=structuredClone(OFFICIAL_ABILITY_REGISTRY)
  registry.definitions.push({
    id:abilityId,revision:'1',dslVersion:'1.3.0',source:{kind:'CARD_DEFINITION',definitionId:eventDefinition.definitionId,zone:'hand'},timing:'MAIN',condition:{kind:'ALWAYS'},cost:{kind:'NONE'},usage:{kind:'UNLIMITED'},
    program:[
      {kind:'SEARCH_TOP_DECK',amount:3,maxSelected:1,bind:'found',revealSelected:true,destination:'hand',remainder:'BOTTOM_ANY_ORDER'},
      {kind:'REVEAL_BINDING',bind:'found'},
      {kind:'SEARCH_TOP_DECK',amount:2,maxSelected:1,bind:'foundAgain',revealSelected:true,destination:'hand',remainder:'BOTTOM_ANY_ORDER'},
      {kind:'CHOICE',choiceType:'SELECT',selector:{kind:'OWN_ZONE',zone:'hand',cardKind:'CARD'},optional:true,min:0,max:1,bind:'move',visibility:'PRIVATE'},
      {kind:'OPERATION',operation:{primitive:'moveCard',version:'1.0.0',player:'CONTROLLER',audience:'PUBLIC',subjectBinding:'move',from:'hand',to:'trash'}},
      {kind:'SHUFFLE_DECK',player:'CONTROLLER'},
    ],
  })
  input.effectRegistry=registry
  let s=prepared(3,input),alice=s.players[0]
  const eventId=alice.zones.deck.find(id=>s.instances[id].definitionId===eventDefinition.definitionId)!
  alice.zones.deck.splice(alice.zones.deck.indexOf(eventId),1);alice.zones.hand.push(eventId);s.instances[eventId].zone='hand';s.instances[eventId].zoneGeneration++
  const emptyDeckState=structuredClone(s)
  const firstDeckCard=alice.zones.deck[0]!,secondDeckCard=alice.zones.deck[1]!
  const action=getLegalActions(s,'alice').find(candidate=>candidate.type==='START_EFFECT'&&candidate.effectId.startsWith(`${abilityId}:`))
  assert.ok(isStartEffect(action))
  let result=applyCommand(s,{id:'future-search-start',actorId:'alice',expectedVersion:s.version,type:'START_EFFECT',effectId:action.effectId})
  assert.ok(result.ok,result.ok?'':result.error);if(!result.ok)return;s=result.state
  const search=s.effects!.choice!
  assert.equal(search.visibility,'PRIVATE')
  const opponentProjection=projectState(s,'bob')
  assert.equal(JSON.stringify(opponentProjection).includes(firstDeckCard),false)
  assert.equal(JSON.stringify(opponentProjection).includes(secondDeckCard),false)
  const chosenOption=search.options[0]!,chosen=chosenOption.presence
  result=applyCommand(restoreGame(JSON.stringify(s)),{id:'future-search-choice',actorId:'alice',expectedVersion:s.version,type:'ANSWER_CHOICE',choiceId:search.id,tokens:[chosenOption.token]})
  assert.ok(result.ok,result.ok?'':result.error);if(!result.ok)return;s=result.state
  const order=s.effects!.choice!
  result=applyCommand(restoreGame(JSON.stringify(s)),{id:'future-search-order',actorId:'alice',expectedVersion:s.version,type:'ANSWER_CHOICE',choiceId:order.id,tokens:order.options.map(option=>option.token)})
  assert.ok(result.ok,result.ok?'':result.error);if(!result.ok)return;s=result.state
  const secondSearch=s.effects!.choice!
  const secondChosen=secondSearch.options[0]!
  result=applyCommand(restoreGame(JSON.stringify(s)),{id:'future-search-second',actorId:'alice',expectedVersion:s.version,type:'ANSWER_CHOICE',choiceId:secondSearch.id,tokens:[secondChosen.token]})
  assert.ok(result.ok,result.ok?'':result.error);if(!result.ok)return;s=result.state
  const secondOrder=s.effects!.choice!
  result=applyCommand(restoreGame(JSON.stringify(s)),{id:'future-search-second-order',actorId:'alice',expectedVersion:s.version,type:'ANSWER_CHOICE',choiceId:secondOrder.id,tokens:secondOrder.options.map(option=>option.token)})
  assert.ok(result.ok,result.ok?'':result.error);if(!result.ok)return;s=result.state
  const toMove=s.effects!.choice!
  const movedOption=toMove.options.find(option=>option.presence.instanceId===chosen.instanceId)!
  const drawsBeforeShuffle=s.random.draws,deckSizeBeforeShuffle=s.players[0].zones.deck.length
  result=applyCommand(restoreGame(JSON.stringify(s)),{id:'future-move-choice',actorId:'alice',expectedVersion:s.version,type:'ANSWER_CHOICE',choiceId:toMove.id,tokens:[movedOption.token]})
  assert.ok(result.ok,result.ok?'':result.error);if(!result.ok)return;s=result.state
  assert.equal(s.instances[chosen.instanceId].zone,'trash')
  assert.equal(s.events.some(event=>event.type==='CARD_REVEALED'&&event.revealedCard?.printingKey===s.instances[chosen.instanceId].printingKey),true)
  assert.equal(s.random.draws-drawsBeforeShuffle,Math.max(0,deckSizeBeforeShuffle-1), 'shuffle consumes the deterministic PRNG for the current deck size')
  assert.doesNotThrow(()=>assertGameInvariants(restoreGame(JSON.stringify(s))))
  let empty=emptyDeckState,emptyPlayer=empty.players[0]
  for(const id of [...emptyPlayer.zones.deck]){emptyPlayer.zones.deck.splice(emptyPlayer.zones.deck.indexOf(id),1);emptyPlayer.zones.trash.push(id);empty.instances[id].zone='trash';empty.instances[id].zoneGeneration++;empty.instances[id].faceUp=true}
  assert.doesNotThrow(()=>assertGameInvariants(empty))
  // An empty deck is a terminal game state at the next rule-processing point (§9-1-2).
  // Exercise zero-candidate search at the runtime boundary, not through a legal game command.
  const emptyAction=getLegalActions(empty,'alice').find(candidate=>candidate.type==='START_EFFECT'&&candidate.effectId.startsWith(`${abilityId}:`))
  assert.ok(isStartEffect(emptyAction))
  const emptyStart={id:'future-empty-start',actorId:'alice',expectedVersion:empty.version,type:'START_EFFECT' as const,effectId:emptyAction.effectId}
  applyEffectCommand(empty,emptyStart);empty.commands.push(structuredClone(emptyStart))
  empty.version++
  assert.equal(empty.effects!.choice?.options.length,0,'empty deck yields a valid zero-card optional search')
  for(const id of ['future-empty-select','future-empty-order','future-empty-select-again','future-empty-order-again','future-empty-move']){
    const choice=empty.effects!.choice!
    empty=restoreGame(JSON.stringify(empty))
    const answer={id,actorId:'alice',expectedVersion:empty.version,type:'ANSWER_CHOICE' as const,choiceId:choice.id,tokens:[]}
    applyEffectCommand(empty,answer);empty.commands.push(structuredClone(answer))
    empty.version++
  }
  assert.equal(empty.effects!.active?.status,'COMPLETED');assert.equal(empty.random.draws,emptyDeckState.random.draws)
  processDefeat(empty)
  assert.equal(empty.result?.reason,'EMPTY_DECK')
  assert.doesNotThrow(()=>assertGameInvariants(empty))
  writeUniversalEvidence('future-event-search-reveal-move-shuffle.json',{extension:'TEST-FUTURE-SET',dsl:'1.3.0',primitives:['searchTopDeck','revealCards','moveCard','shuffleDeck'],successiveSearches:true,emptyDeckResolved:true,selectedCard:chosen.instanceId,finalZone:'trash',randomState:s.random,restoredAtEachChoice:true})
})

test('universal engine: public definitions cannot leak hidden-zone selections or movement into hidden zones',()=>{
  const registry=structuredClone(OFFICIAL_ABILITY_REGISTRY)
  registry.definitions.push({id:'TEST-FUTURE-SET.invalid-public-deck-choice',revision:'1',dslVersion:'1.3.0',source:{kind:'CARD_DEFINITION',definitionId:'OP06-018@official-2026-10-11',zone:'hand'},timing:'MAIN',condition:{kind:'ALWAYS'},cost:{kind:'NONE'},usage:{kind:'UNLIMITED'},program:[
    {kind:'CHOICE',choiceType:'SELECT',selector:{kind:'OWN_ZONE',zone:'deck',cardKind:'CARD'},optional:true,min:0,max:1,bind:'hidden',visibility:'PUBLIC'},
  ]})
  assert.throws(()=>validateRegistry(registry),/INVALID_EFFECT_REGISTRY/)
  assert.equal(operationSpecSchema.safeParse({primitive:'moveCard',version:'1.0.0',player:'CONTROLLER',audience:'PUBLIC',subjectBinding:'card',from:'trash',to:'hand'}).success,false)
  assert.equal(operationSpecSchema.safeParse({primitive:'moveCard',version:'1.0.0',player:'CONTROLLER',audience:'CONTROLLER',subjectBinding:'card',from:'trash',to:'hand'}).success,true)
})

test('M2A: legacy state restores with an empty battle context and exposes no attack outside legal combat window', () => {
  const s = prepared(); assert.equal((s as GameState & { battle?: unknown }).battle, null)
  const legacy = structuredClone(s) as unknown as Record<string, unknown>; delete legacy.battle
  assert.equal(restoreGame(JSON.stringify(legacy)).battle, null)
  assert.equal(getLegalActions(s, 'bob').some(a => a.type === 'DECLARE_ATTACK'), false)
})

test('M2A: first turn restriction removes attacks for the active player', () => {
  const s = prepared(1)
  assert.equal(s.players.find(p => p.id === s.activePlayerId)!.turns, 1)
  assert.equal(getLegalActions(s, s.activePlayerId!).some(a => a.type === 'DECLARE_ATTACK'), false)
})

test('M2.5: Rush permits a newly played Character to attack; Rush Character restricts its target', () => {
  const s = prepared(), attacker = s.players[0].zones.deck[0], defender = s.players[1]
  const def = s.catalog.definitions.find(d => d.definitionId === s.instances[attacker].definitionId)!
  ;(def.review as typeof def.review & { combatKeywords?: string[] }).combatKeywords = ['RUSH_CHARACTER']
  s.players[0].zones.deck.splice(0, 1); s.players[0].zones.characters.push(attacker)
  s.instances[attacker].zone = 'characters'; s.instances[attacker].faceUp = true; s.instances[attacker].playedOnTurn = s.turn
  const leader = defender.zones.leader[0]
  assert.equal(getLegalActions(s, 'alice').some(a => a.type === 'DECLARE_ATTACK' && a.attackerIds.includes(attacker) && a.targetIds.includes(leader)), false)
  const resting = defender.zones.deck.find(id => s.instances[id].kind === 'CARD')!
  defender.zones.deck.splice(defender.zones.deck.indexOf(resting), 1); defender.zones.characters.push(resting)
  s.instances[resting].zone = 'characters'; s.instances[resting].faceUp = true; s.instances[resting].rested = true
  const action = getLegalActions(s, 'alice').find(a => a.type === 'DECLARE_ATTACK')
  const targetIdsByAttacker = action?.type === 'DECLARE_ATTACK' ? (action as typeof action & { targetIdsByAttacker?: Record<string, string[]> }).targetIdsByAttacker : undefined
  assert.ok(action?.type === 'DECLARE_ATTACK' && action.attackerIds.includes(attacker) && targetIdsByAttacker?.[attacker]?.includes(resting) && !targetIdsByAttacker[attacker]?.includes(leader))
  writeM25Evidence('rush-character.json', { seed: 77, keyword: 'RUSH_CHARACTER', attacker, allowedTargets: targetIdsByAttacker?.[attacker], prohibitedTarget: leader })
})

test('M2A: attack command is versioned, replay-safe and cannot be controlled by the defender', () => {
  const s = prepared(), attacker = s.players[0].zones.leader[0]
  const defender = s.players[1], target = defender.zones.deck.find(id => s.catalog.definitions.find(d => d.definitionId === s.instances[id].definitionId)?.power === 3000)!
  defender.zones.deck.splice(defender.zones.deck.indexOf(target), 1); defender.zones.characters.push(target); s.instances[target].zone = 'characters'; s.instances[target].faceUp = true; s.instances[target].rested = true; s.instances[target].zoneGeneration++
  const r = applyCommand(s, { id: 'attack-1', actorId: 'alice', expectedVersion: s.version, type: 'DECLARE_ATTACK', attackerId: attacker, targetId: target })
  assert.equal(r.ok, true)
  if (!r.ok) return
  assert.equal(r.state.instances[attacker].rested, true)
  assert.equal(r.state.battle?.attacker.instanceId, attacker)
  assert.equal(r.state.battle?.step, 'BLOCKER', 'when no Attack Step ability is pending, combat proceeds to Block Step')
  const replay = applyCommand(r.state, { id: 'attack-1', actorId: 'alice', expectedVersion: s.version, type: 'DECLARE_ATTACK', attackerId: attacker, targetId: target })
  assert.equal(replay.ok && replay.replayed, true)
  assert.equal(getLegalActions(r.state, 'bob').some(a => a.type === 'DECLARE_ATTACK'), false)
  assert.equal(restoreGame(JSON.stringify(r.state)).battle?.id, r.state.battle?.id)
})

test('M2A: confirmed battle compares current power, KOs a rested Character and conserves every instance', () => {
  const s = prepared(), attacker = s.players[0].zones.leader[0]
  const defender = s.players[1], target = defender.zones.deck.find(id => s.catalog.definitions.find(d => d.definitionId === s.instances[id].definitionId)?.power === 3000)!
  defender.zones.deck.splice(defender.zones.deck.indexOf(target), 1); defender.zones.characters.push(target); s.instances[target].zone = 'characters'; s.instances[target].faceUp = true; s.instances[target].rested = true; s.instances[target].zoneGeneration++
  let r = applyCommand(s, { id: 'attack-1', actorId: 'alice', expectedVersion: s.version, type: 'DECLARE_ATTACK', attackerId: attacker, targetId: target }); assert.ok(r.ok)
  if (!r.ok) return
  let next = applyCommand(r.state, { id: 'pass-block', actorId: 'bob', expectedVersion: r.state.version, type: 'PASS_BLOCKER', battleId: r.state.battle!.id }); assert.ok(next.ok)
  if (!next.ok) return
  r = applyCommand(next.state, { id: 'pass-counter', actorId: 'bob', expectedVersion: next.state.version, type: 'PASS_COUNTER', battleId: next.state.battle!.id }); assert.ok(r.ok)
  if (!r.ok) return
  r = applyCommand(r.state, { id: 'resolve-1', actorId: 'alice', expectedVersion: r.state.version, type: 'RESOLVE_BATTLE', battleId: r.state.battle!.id }); assert.ok(r.ok)
  if (!r.ok) return
  assert.equal(r.state.instances[target].zone, 'trash')
  assert.equal(r.state.battle, null)
  assert.ok(r.state.events.some(e => e.type === 'CHARACTER_KO' && e.publicInstanceId === target))
  assert.equal(Object.keys(r.state.instances).length, 122)
})

test('M2D: confirmed battle KO enters M1.5D ON_KO scheduler and resumes after a private serialized choice', () => {
  const options = fixtureWithBattleOnKo()
  let s = createGame(options)
  let result = applyCommand(s, { id: 'first', actorId: 'alice', expectedVersion: s.version, type: 'CHOOSE_FIRST', choice: 'FIRST' }); assert.ok(result.ok)
  if (!result.ok) return
  s = result.state
  for (let n = 0; n < 2; n++) { result = applyCommand(s, { id: `keep-${n}`, actorId: s.decisionPlayerId!, expectedVersion: s.version, type: 'MULLIGAN', redraw: false }); assert.ok(result.ok); if (!result.ok) return; s = result.state }
  while (s.phase !== 'MAIN') { result = applyCommand(s, { id: `phase-${s.version}`, actorId: s.activePlayerId!, expectedVersion: s.version, type: 'ADVANCE_PHASE' }); assert.ok(result.ok); if (!result.ok) return; s = result.state }
  while (s.turn < 3) {
    result = applyCommand(s, { id: `end-${s.version}`, actorId: s.activePlayerId!, expectedVersion: s.version, type: 'END_MAIN' }); assert.ok(result.ok); if (!result.ok) return; s = result.state
    for (let n = 0; n < 4; n++) { result = applyCommand(s, { id: `phase-${s.version}`, actorId: s.activePlayerId!, expectedVersion: s.version, type: 'ADVANCE_PHASE' }); assert.ok(result.ok); if (!result.ok) return; s = result.state }
  }
  const combatEventStart = s.events.length
  const defender = s.players[1], target = defender.zones.deck.find(id => s.instances[id].definitionId === options.definitions.find(d => d.number === 'ST01-003')!.definitionId)!
  defender.zones.deck.splice(defender.zones.deck.indexOf(target), 1); defender.zones.characters.push(target); s.instances[target].zone = 'characters'; s.instances[target].faceUp = true; s.instances[target].rested = true; s.instances[target].zoneGeneration++
  result = applyCommand(s, { id: 'attack', actorId: 'alice', expectedVersion: s.version, type: 'DECLARE_ATTACK', attackerId: s.players[0].zones.leader[0], targetId: target }); if (!result.ok) assert.fail(result.error); s = result.state
  result = applyCommand(s, { id: 'block-pass', actorId: 'bob', expectedVersion: s.version, type: 'PASS_BLOCKER', battleId: s.battle!.id }); assert.ok(result.ok); if (!result.ok) return; s = result.state
  result = applyCommand(s, { id: 'counter-pass', actorId: 'bob', expectedVersion: s.version, type: 'PASS_COUNTER', battleId: s.battle!.id }); assert.ok(result.ok); if (!result.ok) return; s = result.state
  result = applyCommand(s, { id: 'damage', actorId: 'alice', expectedVersion: s.version, type: 'RESOLVE_BATTLE', battleId: s.battle!.id }); assert.ok(result.ok); if (!result.ok) return; s = result.state
  assert.equal(s.instances[target].zone, 'trash'); assert.equal(s.effects!.scheduler!.history.some(t => t.definitionId === 'TEST-FUTURE-SET.battle-onko'), false)
  assert.equal(s.effects!.choice?.actorId, 'bob')
  writeEvidence('battle-onko-trace.json', { seed: options.seed, combatCommands: s.commands.slice(-4), events: s.events.slice(combatEventStart), ko: s.effects!.cardOperations!.at(-1), pendingChoice: { actorId: s.effects!.choice!.actorId, type: s.effects!.choice!.choiceType }, opponentCanSeeChoiceId: JSON.stringify(projectState(s, 'alice')).includes(s.effects!.choice!.id) })
  s = restoreGame(JSON.stringify(s))
  const choice = s.effects!.choice!
  result = applyCommand(s, { id: 'answer-onko', actorId: 'bob', expectedVersion: s.version, type: 'ANSWER_CHOICE', choiceId: choice.id, tokens: [] }); assert.ok(result.ok)
  if (!result.ok) return
  assert.equal(result.state.effects!.scheduler!.history.find(t => t.definitionId === 'TEST-FUTURE-SET.battle-onko')!.status, 'RESOLVED')
})

test('M2B: Blocker redirects once, Counter Character adds power, then battle resolves', () => {
  const s = prepared(), attacker = s.players[0].zones.leader[0], defender = s.players[1]
  const take = (number: string, zone: 'characters' | 'hand') => {
    const id = defender.zones.deck.find(id => s.instances[id].printingKey === `${number}::standard`)!
    defender.zones.deck.splice(defender.zones.deck.indexOf(id), 1); defender.zones[zone].push(id)
    s.instances[id].zone = zone; s.instances[id].faceUp = zone === 'characters'; s.instances[id].rested = zone === 'characters'; s.instances[id].zoneGeneration++
    return id
  }
  const target = take('ST01-003', 'characters'), blocker = take('ST01-006', 'characters'), counter = take('ST01-003', 'hand')
  s.instances[blocker].rested = false
  let r = applyCommand(s, { id: 'attack-blocker', actorId: 'alice', expectedVersion: s.version, type: 'DECLARE_ATTACK', attackerId: attacker, targetId: target }); assert.ok(r.ok)
  if (!r.ok) return
  assert.ok(getLegalActions(r.state, 'bob').some(a => a.type === 'ACTIVATE_BLOCKER' && a.blockerIds.includes(blocker)))
  r = applyCommand(r.state, { id: 'use-blocker', actorId: 'bob', expectedVersion: r.state.version, type: 'ACTIVATE_BLOCKER', blockerId: blocker, battleId: r.state.battle!.id }); assert.ok(r.ok)
  if (!r.ok) return
  assert.equal(r.state.battle!.target.instanceId, blocker); assert.equal(r.state.instances[blocker].rested, true)
  r = applyCommand(r.state, { id: 'use-counter', actorId: 'bob', expectedVersion: r.state.version, type: 'PLAY_COUNTER_CHARACTER', cardId: counter, targetId: blocker, battleId: r.state.battle!.id }); assert.ok(r.ok)
  if (!r.ok) return
  assert.equal(r.state.instances[counter].zone, 'trash'); assert.equal(r.state.battle!.counterModifiers[0].amount, 1000)
  r = applyCommand(r.state, { id: 'counter-done', actorId: 'bob', expectedVersion: r.state.version, type: 'PASS_COUNTER', battleId: r.state.battle!.id }); assert.ok(r.ok)
  if (!r.ok) return
  r = applyCommand(r.state, { id: 'damage', actorId: 'alice', expectedVersion: r.state.version, type: 'RESOLVE_BATTLE', battleId: r.state.battle!.id }); assert.ok(r.ok)
  if (!r.ok) return
  assert.equal(r.state.instances[blocker].zone, 'trash'); assert.equal(r.state.instances[target].zone, 'characters')
})

test('M2C: Leader damage moves only the top Life card to hidden hand and zero Life alone is not defeat', () => {
  const s = prepared(), attacker = s.players[0].zones.leader[0], defender = s.players[1], target = defender.zones.leader[0]
  const lifeId = defender.zones.life[0], handBefore = defender.zones.hand.length
  let r = applyCommand(s, { id: 'attack-leader', actorId: 'alice', expectedVersion: s.version, type: 'DECLARE_ATTACK', attackerId: attacker, targetId: target }); assert.ok(r.ok)
  if (!r.ok) return
  r = applyCommand(r.state, { id: 'pass-blocker', actorId: 'bob', expectedVersion: r.state.version, type: 'PASS_BLOCKER', battleId: r.state.battle!.id }); assert.ok(r.ok)
  if (!r.ok) return
  r = applyCommand(r.state, { id: 'pass-counter', actorId: 'bob', expectedVersion: r.state.version, type: 'PASS_COUNTER', battleId: r.state.battle!.id }); assert.ok(r.ok)
  if (!r.ok) return
  r = applyCommand(r.state, { id: 'damage-leader', actorId: 'alice', expectedVersion: r.state.version, type: 'RESOLVE_BATTLE', battleId: r.state.battle!.id }); if (!r.ok) assert.fail(r.error)
  if (!r.ok) return
  const damaged = r.state.players[1]
  assert.equal(damaged.zones.life.length, 4); assert.equal(damaged.zones.hand.length, handBefore + 1)
  assert.equal(r.state.instances[lifeId].zone, 'hand'); assert.equal(r.state.instances[lifeId].faceUp, false)
  assert.equal(r.state.result, null)
  const view = JSON.stringify(projectState(r.state, 'alice'))
  assert.equal(view.includes(lifeId), false)
  assert.ok(r.state.events.some(e => e.type === 'LIFE_DAMAGED' && e.actorId === 'bob' && e.publicInstanceId === undefined))
  writeEvidence('leader-life-damage-trace.json', { seed: 77, damageEvent: r.state.events.filter(e => e.type === 'LIFE_DAMAGED').at(-1), lifeCount: damaged.zones.life.length, result: r.state.result, secretCardAbsentFromOpponentProjection: !view.includes(lifeId) })
})

test('M2.5: Double Attack resolves two Life damage instances from its keyword metadata', () => {
  const s = prepared(), attacker = s.players[0].zones.leader[0]
  const def = s.catalog.definitions.find(d => d.definitionId === s.instances[attacker].definitionId)!
  ;(def.review as typeof def.review & { combatKeywords?: string[] }).combatKeywords = ['DOUBLE_ATTACK']
  const lifeBefore = s.players[1].zones.life.length
  const next = hitLeader(s, attacker, s.players[1].zones.leader[0])
  assert.equal(next.players[1].zones.life.length, lifeBefore - 2)
  assert.equal(next.players[1].zones.hand.length, s.players[1].zones.hand.length + 2)
  assert.equal(next.events.filter(e => e.type === 'LIFE_DAMAGED').length, 2)
  writeM25Evidence('double-attack.json', { seed: 77, keyword: 'DOUBLE_ATTACK', lifeBefore, lifeAfter: next.players[1].zones.life.length, damageEvents: next.events.filter(e => e.type === 'LIFE_DAMAGED').length })
})

test('M2.5: Banish sends damaged Life to public Trash without adding it to hand', () => {
  const s = prepared(), attacker = s.players[0].zones.leader[0], defender = s.players[1]
  const def = s.catalog.definitions.find(d => d.definitionId === s.instances[attacker].definitionId)!
  ;(def.review as typeof def.review & { combatKeywords?: string[] }).combatKeywords = ['BANISH']
  const lifeId = defender.zones.life[0], handBefore = defender.zones.hand.length
  const next = hitLeader(s, attacker, defender.zones.leader[0])
  assert.equal(next.instances[lifeId].zone, 'trash')
  assert.equal(next.instances[lifeId].faceUp, true)
  assert.equal(next.players[1].zones.hand.length, handBefore)
  assert.ok(next.events.some(e => e.type === 'CARD_TRASHED' && e.publicInstanceId === lifeId))
  writeM25Evidence('banish.json', { seed: 77, keyword: 'BANISH', lifeInstance: lifeId, finalZone: next.instances[lifeId].zone, publicTrashEvent: next.events.find(e => e.type === 'CARD_TRASHED' && e.publicInstanceId === lifeId) })
})

test('M2.5: Unblockable removes Blocker from the response window', () => {
  const s = prepared(), attacker = s.players[0].zones.leader[0], defender = s.players[1]
  const attackerDef = s.catalog.definitions.find(d => d.definitionId === s.instances[attacker].definitionId)!
  ;(attackerDef.review as typeof attackerDef.review & { combatKeywords?: string[] }).combatKeywords = ['UNBLOCKABLE']
  const blocker = defender.zones.deck.find(id => s.catalog.definitions.find(d => d.definitionId === s.instances[id].definitionId)?.review.effects.some(e => e.kind === 'blocker'))!
  defender.zones.deck.splice(defender.zones.deck.indexOf(blocker), 1); defender.zones.characters.push(blocker)
  s.instances[blocker].zone = 'characters'; s.instances[blocker].faceUp = true; s.instances[blocker].rested = false
  const declared = applyCommand(s, { id: 'unblockable-attack', actorId: 'alice', expectedVersion: s.version, type: 'DECLARE_ATTACK', attackerId: attacker, targetId: defender.zones.leader[0] })
  assert.ok(declared.ok); if (!declared.ok) return
  assert.equal(getLegalActions(declared.state, 'bob').some(a => a.type === 'ACTIVATE_BLOCKER'), false)
  const blocked = applyCommand(declared.state, { id: 'unblockable-block', actorId: 'bob', expectedVersion: declared.state.version, type: 'ACTIVATE_BLOCKER', blockerId: blocker, battleId: declared.state.battle!.id })
  assert.equal(blocked.ok, false)
  writeM25Evidence('unblockable.json', { seed: 77, keyword: 'UNBLOCKABLE', blockerActionExposed: false, forgedBlockAccepted: blocked.ok })
})

test('M2.5: reviewed Counter Event pays printed cost and DON!! minus through the operation pipeline', () => {
  const s = prepared(), defender = s.players[1], attacker = s.players[0].zones.leader[0]
  const owner = defender.id
  const officialBlast=consolidateDefinitions([OFFICIAL_ABILITY_CARDS.find(card=>card.number==='ST04-016')!])
  assert.deepEqual(officialBlast.errors,[])
  const blastDefinition=officialBlast.definitions[0]!
  s.catalog.definitions.push(blastDefinition);s.catalog.printings.push(...officialBlast.printings)
  const eventId = defender.zones.hand[0], paymentDon = defender.zones.donDeck[0], returnDon = defender.zones.donDeck[1]
  for (const id of [paymentDon, returnDon]) { defender.zones.donDeck.splice(defender.zones.donDeck.indexOf(id), 1); defender.zones.cost.push(id); s.instances[id].zone = 'cost'; s.instances[id].faceUp = true }
  s.instances[eventId].printingKey = 'ST04-016::standard'; s.instances[eventId].definitionId = blastDefinition.definitionId
  s.effects = createEffectRuntime({ version: '1.2.0', dslVersion: '1.2.0', restrictions: [], replacements: [], definitions: [] }); s.schemaVersion = 2
  assert.doesNotThrow(() => assertGameInvariants(s))
  let r = applyCommand(s, { id: 'counter-event-attack', actorId: 'alice', expectedVersion: s.version, type: 'DECLARE_ATTACK', attackerId: attacker, targetId: defender.zones.leader[0] }); assert.ok(r.ok, r.ok ? '' : r.error)
  if (!r.ok) return
  r = applyCommand(r.state, { id: 'counter-event-block-pass', actorId: 'bob', expectedVersion: r.state.version, type: 'PASS_BLOCKER', battleId: r.state.battle!.id }); assert.ok(r.ok)
  if (!r.ok) return
  const response = applyCommand(r.state, { id: 'counter-event-use', actorId: 'bob', expectedVersion: r.state.version, type: 'PLAY_COUNTER_EVENT', cardId: eventId, battleId: r.state.battle!.id, paymentDonIds: [paymentDon], donMinusIds: [returnDon], targetId: defender.zones.leader[0] })
  assert.ok(response.ok, response.ok ? '' : response.error)
  if (!response.ok) return
  assert.equal(response.state.instances[eventId].zone, 'trash')
  assert.equal(response.state.instances[paymentDon].rested, true)
  assert.equal(response.state.instances[returnDon].zone, 'donDeck')
  assert.equal(response.state.battle!.counterModifiers.at(-1)!.amount, 4000)
  assert.ok(response.state.effects!.operations!.some(operation => operation.type === 'REST' && operation.intent === 'COST'))
  assert.ok(response.state.effects!.operations!.some(operation => operation.type === 'MOVE_CARD' && operation.from === 'hand' && operation.to === 'trash'))
  assert.ok(response.state.effects!.operations!.some(operation => operation.type === 'MOVE_CARD' && operation.from === 'cost' && operation.to === 'donDeck'))
  const second = response.state, secondEventId = second.players[1].zones.hand[0], extraDon = second.players[1].zones.donDeck[0]
  second.instances[secondEventId].printingKey = 'ST04-016::standard'; second.instances[secondEventId].definitionId = blastDefinition.definitionId
  second.players[1].zones.donDeck.splice(0, 1); second.players[1].zones.cost.push(extraDon)
  second.instances[extraDon].zone = 'cost'; second.instances[extraDon].faceUp = true
  const available = getLegalActions(second, 'bob').find(a => a.type === 'PLAY_COUNTER_EVENT')
  assert.ok(available?.type === 'PLAY_COUNTER_EVENT' && available.eventIds.includes(secondEventId))
  const beforeUnpayable = JSON.stringify(second)
  const unpayable = applyCommand(second, { id: 'counter-event-unpayable', actorId: 'bob', expectedVersion: second.version, type: 'PLAY_COUNTER_EVENT', cardId: secondEventId, battleId: second.battle!.id, paymentDonIds: [], donMinusIds: [], targetId: null })
  assert.equal(unpayable.ok, false)
  if (!unpayable.ok) assert.equal(unpayable.error, 'COUNTER_EVENT_INITIAL_UNPAYABLE')
  assert.equal(JSON.stringify(second), beforeUnpayable)
  const optional = applyCommand(second, { id: 'counter-event-optional-minus', actorId: 'bob', expectedVersion: second.version, type: 'PLAY_COUNTER_EVENT', cardId: secondEventId, battleId: second.battle!.id, paymentDonIds: [extraDon], donMinusIds: [], targetId: null })
  assert.ok(optional.ok, optional.ok ? '' : optional.error)
  if (!optional.ok) return
  assert.equal(optional.state.instances[secondEventId].zone, 'trash')
  assert.equal(optional.state.battle!.counterModifiers.length, 1, 'without DON!! −1 the optional effect has no effect')
  const interrupted = optional.state, interruptedEvent = interrupted.players[1].zones.hand[0]
  interrupted.instances[interruptedEvent].printingKey = 'ST04-016::standard'; interrupted.instances[interruptedEvent].definitionId = blastDefinition.definitionId
  const interruptedDefinition = interrupted.catalog.definitions.find(d => d.definitionId === blastDefinition.definitionId)!
  interruptedDefinition.cost = 2; interruptedDefinition.review.counterEvent!.printedCost = 2
  const [firstPaidDon, preventedDon] = interrupted.players[1].zones.donDeck.slice(0, 2)
  for (const id of [firstPaidDon, preventedDon]) { interrupted.players[1].zones.donDeck.splice(interrupted.players[1].zones.donDeck.indexOf(id), 1); interrupted.players[1].zones.cost.push(id); interrupted.instances[id].zone = 'cost'; interrupted.instances[id].faceUp = true }
  const restedBeforeInterruptedPayment = interrupted.players[1].zones.cost.filter(id => interrupted.instances[id].rested).length
  interrupted.effects!.registry.restrictions.push({ id: 'interrupt-after-one-payment', playerId: 'bob', prohibited: 'REST', afterRestedDon: restedBeforeInterruptedPayment + 1 })
  const interruptedCommand = { id: 'counter-event-interrupted-payment', actorId: 'bob', expectedVersion: interrupted.version, type: 'PLAY_COUNTER_EVENT' as const, cardId: interruptedEvent, battleId: interrupted.battle!.id, paymentDonIds: [firstPaidDon, preventedDon], donMinusIds: [] as string[], targetId: null }
  const partialPayment = applyCommand(interrupted, interruptedCommand)
  assert.ok(partialPayment.ok, partialPayment.ok ? '' : partialPayment.error)
  if (!partialPayment.ok) return
  assert.equal(partialPayment.state.instances[firstPaidDon].rested, true, 'a confirmed payment remains paid after a regulatory interruption')
  assert.equal(partialPayment.state.instances[preventedDon].rested, false)
  assert.equal(partialPayment.state.instances[interruptedEvent].zone, 'hand', 'the Event is not activated after interrupted payment')
  assert.equal(partialPayment.state.battle!.counterModifiers.length, 1, 'the interrupted Event has no effect')
  const paymentTrace = partialPayment.state.effects!.operations!.slice(interrupted.effects!.operations!.length)
  assert.deepEqual(paymentTrace.map(operation => operation.outcome), ['CONFIRMED', 'PREVENTED'])
  assert.doesNotThrow(() => assertGameInvariants(partialPayment.state))
  const interruptedSnapshot = JSON.stringify(partialPayment.state)
  const interruptedReplay = applyCommand(partialPayment.state, interruptedCommand)
  assert.ok(interruptedReplay.ok && interruptedReplay.replayed)
  assert.equal(JSON.stringify(interruptedReplay.state), interruptedSnapshot)
  assert.deepEqual(restoreGame(interruptedSnapshot), partialPayment.state)
  writeM25Evidence('blast-breath-counter-event.json', { seed: 77, definition: blastDefinition.number, firstActivation: { eventZone: response.state.instances[eventId].zone, paidCost: response.state.effects!.operations!.filter(o => o.intent === 'COST').map(o => ({ type: o.type, from: o.from, to: o.to, outcome: o.outcome })), donMinusPower: response.state.battle!.counterModifiers.at(-1)?.amount }, optionalMinusOmitted: { eventZone: optional.state.instances[secondEventId].zone, counterModifiers: optional.state.battle!.counterModifiers.length }, initialUnpayableError: unpayable.ok ? null : unpayable.error, interruptedPayment: { eventZone: partialPayment.state.instances[interruptedEvent].zone, firstDonRested: partialPayment.state.instances[firstPaidDon].rested, secondDonRested: partialPayment.state.instances[preventedDon].rested, outcomes: paymentTrace.map(operation => operation.outcome), replayed: interruptedReplay.ok && interruptedReplay.replayed, restoreEqual: JSON.stringify(restoreGame(interruptedSnapshot)) === interruptedSnapshot } })
})

test('M2.5: unsupported Trigger during Life damage is refused without partial state mutation', () => {
  const s = prepared(), attacker = s.players[0].zones.leader[0], defender = s.players[1]
  const lifeId = defender.zones.life[0]
  s.catalog.definitions.find(d => d.definitionId === s.instances[lifeId].definitionId)!.review.triggerOriginal = '[Trigger] unsupported test fixture'
  let r = applyCommand(s, { id: 'trigger-attack', actorId: 'alice', expectedVersion: s.version, type: 'DECLARE_ATTACK', attackerId: attacker, targetId: defender.zones.leader[0] }); assert.ok(r.ok)
  if (!r.ok) return
  r = applyCommand(r.state, { id: 'trigger-block-pass', actorId: 'bob', expectedVersion: r.state.version, type: 'PASS_BLOCKER', battleId: r.state.battle!.id }); assert.ok(r.ok)
  if (!r.ok) return
  r = applyCommand(r.state, { id: 'trigger-counter-pass', actorId: 'bob', expectedVersion: r.state.version, type: 'PASS_COUNTER', battleId: r.state.battle!.id }); assert.ok(r.ok)
  if (!r.ok) return
  const pending = applyCommand(r.state, { id: 'trigger-resolve', actorId: 'alice', expectedVersion: r.state.version, type: 'RESOLVE_BATTLE', battleId: r.state.battle!.id })
  assert.ok(pending.ok); if (!pending.ok) return
  const prompt = getLegalActions(pending.state, 'bob').find(action => action.type === 'ANSWER_TRIGGER')
  assert.ok(prompt?.type === 'ANSWER_TRIGGER')
  const before = JSON.stringify(pending.state)
  const refused = applyCommand(pending.state, { id: 'unsupported-trigger-accept', actorId: 'bob', expectedVersion: pending.state.version, type: 'ANSWER_TRIGGER', choiceId: prompt!.choiceId, activate: true })
  assert.equal(refused.ok, false)
  if (!refused.ok) assert.equal(refused.error, 'UNSUPPORTED_TRIGGER_EFFECT')
  assert.equal(JSON.stringify(pending.state), before)
  assert.equal(pending.state.instances[lifeId].zone, 'life')
  writeM25Evidence('trigger-refusal.json', { seed: 77, error: refused.ok ? null : refused.error, stateUnchanged: JSON.stringify(pending.state) === before, lifeZone: pending.state.instances[lifeId].zone, resolutionSuspended: true })
})

test('universal engine: Double Attack checks zero Life at the second damage, and Banish suppresses Trigger', () => {
  const lethal = prepared(3), attacker = lethal.players[0].zones.leader[0], defender = lethal.players[1]
  lethal.catalog.definitions.find(d => d.definitionId === lethal.instances[attacker].definitionId)!.review.combatKeywords = ['DOUBLE_ATTACK']
  for (let n = 0; n < 4; n++) {
    const lifeId = defender.zones.life.pop()!
    defender.zones.hand.push(lifeId); lethal.instances[lifeId].zone = 'hand'; lethal.instances[lifeId].zoneGeneration++; lethal.instances[lifeId].faceUp = false
    lethal.events.push({ sequence: lethal.events.length, type: 'LIFE_PAID', actorId: defender.id })
  }
  let s = attackLeaderToDamage(lethal)
  assert.equal(s.result?.winnerId, 'alice'); assert.equal(s.players[1].zones.life.length, 0)
  assert.equal(s.events.filter(e => e.type === 'LIFE_DAMAGED' && e.actorId === 'bob').length, 2)
  assert.doesNotThrow(() => assertGameInvariants(restoreGame(JSON.stringify(s))))

  const banishState = prepared(3), banisher = banishState.players[0].zones.leader[0], targetLife = banishState.players[1].zones.life[0]
  banishState.catalog.definitions.find(d => d.definitionId === banishState.instances[banisher].definitionId)!.review.combatKeywords = ['BANISH']
  banishState.catalog.definitions.find(d => d.definitionId === banishState.instances[targetLife].definitionId)!.review.triggerOriginal = '[Trigger] unsupported fixture is deliberately skipped by Banish.'
  const after = attackLeaderToDamage(banishState)
  assert.equal(after.battle, null); assert.equal(after.instances[targetLife].zone, 'trash')
  assert.equal(after.events.some(e => e.type === 'TRIGGER_ACTIVATED' || e.type === 'CARD_REVEALED'), false)
  assert.equal(after.events.some(e => e.type === 'CARD_TRASHED' && e.publicInstanceId === targetLife), true)
  assert.doesNotThrow(() => assertGameInvariants(restoreGame(JSON.stringify(after))))
})

test('M2C: damage to a Leader with zero Life ends the game; removing the final Life alone does not', () => {
  const s = prepared(), attacker = s.players[0].zones.leader[0], defender = s.players[1], target = defender.zones.leader[0]
  const extraAttackers = s.players[0].zones.deck.filter(id => (s.catalog.definitions.find(d => d.definitionId === s.instances[id].definitionId)?.power ?? 0) > 5000).slice(0, 5)
  assert.equal(extraAttackers.length, 5)
  for (const id of extraAttackers) s.players[0].zones.deck.splice(s.players[0].zones.deck.indexOf(id), 1)
  for (const id of extraAttackers) { s.players[0].zones.characters.push(id); s.instances[id].zone = 'characters'; s.instances[id].faceUp = true; s.instances[id].rested = false; s.instances[id].playedOnTurn = null; s.instances[id].zoneGeneration++ }
  let current = s
  for (const source of [attacker, ...extraAttackers.slice(0, 4)]) current = hitLeader(current, source, target)
  assert.equal(current.players[1].zones.life.length, 0)
  assert.equal(current.result, null, 'reaching zero Life does not itself end the game')
  current = hitLeader(current, extraAttackers[4], target)
  assert.deepEqual(current.result, { reason: 'LEADER_DAMAGED_AT_ZERO_LIFE', loserIds: ['bob'], winnerId: 'alice' })
  assert.deepEqual(getLegalActions(current, 'alice'), [])
})

function hitLeader(state: GameState, attackerId: string, targetId: string): GameState {
  type Intent = { type: 'DECLARE_ATTACK'; attackerId: string; targetId: string } | { type: 'PASS_BLOCKER'; battleId: string } | { type: 'PASS_COUNTER'; battleId: string } | { type: 'RESOLVE_BATTLE'; battleId: string }
  const send = (current: GameState, actorId: string, intent: Intent) => {
    const result = applyCommand(current, { id: `combat-${current.version}`, actorId, expectedVersion: current.version, ...intent })
    if (!result.ok) assert.fail(result.error)
    return result.state
  }
  let next = send(state, state.activePlayerId!, { type: 'DECLARE_ATTACK', attackerId, targetId })
  next = send(next, 'bob', { type: 'PASS_BLOCKER', battleId: next.battle!.id })
  next = send(next, 'bob', { type: 'PASS_COUNTER', battleId: next.battle!.id })
  return send(next, 'alice', { type: 'RESOLVE_BATTLE', battleId: next.battle!.id })
}
