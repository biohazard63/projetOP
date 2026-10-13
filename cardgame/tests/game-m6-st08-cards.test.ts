import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateCharacteristics } from '../src/game/effects/characteristics'
import { act, attachDon, attack, choose, deckFor, endTurn, leaderOf, legal, newGame, optionIds, playCard, put, startEffect, toMain, zoneOf } from './helpers/m6'

const ST08 = ['ST08-003', 'ST08-004', 'ST08-006', 'ST08-008', 'ST08-009', 'ST08-015', 'ST06-005']
const game = (turn = 3) => toMain(newGame(deckFor('ST06-001', ST08), deckFor('ST06-001', ST08)), turn)

test('ST08-004 Koby rests as the activation cost and K.O.s only an opposing Character with cost 2 or less', () => {
  let s = game(3)
  const koby = put(s, 'alice', 'ST08-004', 'characters')
  const legalTarget = put(s, 'bob', 'ST08-003', 'characters')
  const excluded = put(s, 'bob', 'ST06-005', 'characters')
  s = startEffect(s, 'alice', 'ST08-004.activate-main-ko')
  assert.deepEqual(optionIds(s, 'alice'), [legalTarget])
  s = choose(s, 'alice', [legalTarget])
  assert.equal(zoneOf(s, legalTarget), 'trash')
  assert.equal(zoneOf(s, excluded), 'characters')
  assert.equal(s.instances[koby].rested, true)
})

test('ST08-006 Shirahoshi has Blocker and applies its On Play cost reduction to one opposing Character', () => {
  let s = game(5)
  const target = put(s, 'bob', 'ST06-005', 'characters')
  const shirahoshi = put(s, 'alice', 'ST08-006', 'hand')
  s = playCard(s, 'alice', shirahoshi)
  assert.deepEqual(optionIds(s, 'alice'), [target])
  s = choose(s, 'alice', [target])
  assert.equal(evaluateCharacteristics(s, target).cost.current, 1)
  s = endTurn(s)
  s = attack(s, put(s, 'bob', 'ST08-003', 'characters'), leaderOf(s, 'alice'))
  const blockers = legal(s, 'alice').find(action => action.type === 'ACTIVATE_BLOCKER')
  assert.ok(blockers && blockers.type === 'ACTIVATE_BLOCKER' && blockers.blockerIds.includes(shirahoshi))
  s = act(s, 'alice', { type: 'ACTIVATE_BLOCKER', blockerId: shirahoshi, battleId: s.battle!.id })
  assert.equal(s.battle!.target.instanceId, shirahoshi)
})

test('ST08-008 Higuma reduces only the chosen opposing Character cost until the turn expires', () => {
  let s = game(3)
  const target = put(s, 'bob', 'ST08-003', 'characters')
  s = playCard(s, 'alice', put(s, 'alice', 'ST08-008', 'hand'))
  s = choose(s, 'alice', [target])
  assert.equal(evaluateCharacteristics(s, target).cost.current, 0)
})

test('ST08-009 Makino draws only when a Character on either field currently has cost 0', () => {
  let s = game(5)
  const zeroCost = put(s, 'bob', 'ST08-003', 'characters')
  s = playCard(s, 'alice', put(s, 'alice', 'ST08-008', 'hand'))
  s = choose(s, 'alice', [zeroCost])
  assert.equal(evaluateCharacteristics(s, zeroCost).cost.current, 0)
  const makino = put(s, 'alice', 'ST08-009', 'hand')
  const before = s.players[0].zones.hand.length
  s = playCard(s, 'alice', makino)
  assert.equal(s.players[0].zones.hand.length, before)

  let t = game(5)
  const nonzero = put(t, 'bob', 'ST06-005', 'characters')
  t = playCard(t, 'alice', put(t, 'alice', 'ST08-008', 'hand'))
  t = choose(t, 'alice', [nonzero])
  assert.ok(evaluateCharacteristics(t, nonzero).cost.current! > 0)
  const noDrawMakino = put(t, 'alice', 'ST08-009', 'hand')
  const noDrawBefore = t.players[0].zones.hand.length
  t = playCard(t, 'alice', noDrawMakino)
  assert.equal(t.players[0].zones.hand.length, noDrawBefore - 1)
})

test('ST08-015 Gum-Gum Pistol resolves its Main K.O. and its Trigger draw as separate abilities', () => {
  let s = game(3)
  const target = put(s, 'bob', 'ST08-003', 'characters')
  put(s, 'alice', 'ST08-015', 'hand')
  const hand = s.players[0].zones.hand.length
  s = startEffect(s, 'alice', 'ST08-015.main-ko')
  assert.deepEqual(optionIds(s, 'alice'), [target])
  s = choose(s, 'alice', [target])
  assert.equal(zoneOf(s, target), 'trash')
  assert.equal(s.players[0].zones.hand.length, hand - 1)

  let t = game(5)
  const lifeEvent = put(t, 'bob', 'ST08-015', 'life')
  const before = t.players[1].zones.hand.length
  const attacker = put(t, 'alice', 'ST08-003', 'characters')
  attachDon(t, 'alice', attacker, 4)
  t = attack(t, attacker, leaderOf(t, 'bob'))
  t = act(t, 'bob', { type: 'PASS_BLOCKER', battleId: t.battle!.id })
  t = act(t, 'bob', { type: 'PASS_COUNTER', battleId: t.battle!.id })
  t = act(t, 'alice', { type: 'RESOLVE_BATTLE', battleId: t.battle!.id })
  const trigger = legal(t, 'bob').find(action => action.type === 'ANSWER_TRIGGER')
  assert.ok(trigger && trigger.type === 'ANSWER_TRIGGER')
  t = act(t, 'bob', { type: 'ANSWER_TRIGGER', choiceId: trigger.choiceId, activate: true })
  assert.equal(t.players[1].zones.hand.length, before + 1)
  assert.equal(zoneOf(t, lifeEvent), 'trash')
})
