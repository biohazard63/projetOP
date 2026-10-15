import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateCharacteristics } from '../src/game/effects/characteristics'
import type { GameState } from '../src/game/core/types'
import { act, attack, choose, deckFor, definitionOf, endTurn, finishBattle, inHand, leaderOf, legal, newGame, offeredEffects, optionIds, pendingChoice, playCard, put, roundTrip, startEffect, toMain, zoneOf } from './helpers/m6'

// M6 ST-22 (BLUE Ace & Newgate), official English texts (series 569022). Scenarios follow the official text, the ST-22 FAQ and the
// errata snapshot (docs/game/evidence/m6/sources/), through public commands only. OP12-045 (Navy) is a non-Whitebeard deck card.
const ST22 = ['ST22-002', 'ST22-003', 'ST22-004', 'ST22-005', 'ST22-006', 'ST22-007', 'ST22-008', 'ST22-009', 'ST22-010', 'ST22-011', 'ST22-012', 'ST22-013', 'ST22-014', 'ST22-015', 'ST22-016', 'ST22-017']
const BOB = ['OP03-106', 'OP03-107', 'OP03-115', 'OP03-110']
const game = (turn = 5, leader = 'ST22-001') => toMain(newGame(deckFor(leader, [...ST22.filter(n => n !== 'ST22-014'), 'OP12-045']), deckFor('OP03-099', BOB)), turn)
/** Bob (Uta) plays ST16-004 Shanks on his turn 10: K.O. up to 1 opposing rested Character (an opponent effect without cost limit). */
const shanks = (turn = 10) => toMain(newGame(deckFor('ST22-001', ST22), deckFor('ST11-001', ['ST16-004'])), turn)
const shanksKO = (s: GameState, target: string) => choose(playCard(s, 'bob', inHand(s, 'bob', 'ST16-004')), 'bob', [target])
const kaido = (turn = 10) => toMain(newGame(deckFor('ST22-001', ST22), deckFor('ST04-001', ['ST04-003', 'ST04-002'])), turn)
const zones = (s: GameState, owner: string) => s.players.find(p => p.id === owner)!.zones
const power = (s: GameState, id: string) => evaluateCharacteristics(s, id).power.current
const field = (s: GameState, owner: string, number: string, rested = false) => put(s, owner, number, 'characters', { playedEarlier: true, rested })
const hand = (s: GameState, owner = 'alice') => zones(s, owner).hand.length
const pick = (s: GameState, owner: string, indexes: number[]) => { const c = pendingChoice(s, owner)!; return act(s, owner, { type: 'ANSWER_CHOICE', choiceId: c.choiceId, tokens: indexes.map(i => c.options[i].token) }) }
const startFrom = (s: GameState, owner: string, abilityId: string, sourceId: string) => {
  const a = offeredEffects(s, owner, abilityId).find(x => x.effectId.includes(sourceId))
  assert.ok(a, `${abilityId} from ${sourceId} not offered`)
  return act(s, owner, { type: 'START_EFFECT', effectId: a!.effectId })
}
const kaidoKO = (s: GameState, target: string) => {
  s = playCard(s, 'bob', inHand(s, 'bob', 'ST04-003'))
  s = act(s, 'bob', { type: 'ANSWER_CHOICE', choiceId: pendingChoice(s, 'bob')!.choiceId, tokens: pendingChoice(s, 'bob')!.options.slice(0, 5).map(o => o.token) })
  return choose(s, 'bob', [target])
}

test('M6 ST-22 Leader Ace & Newgate reveals a Whitebeard Pirates hand card to draw 1 and put it on top of the deck, once per turn', () => {
  let s = game(5)
  const wb = put(s, 'alice', 'ST22-010', 'hand'), h = hand(s)
  s = startEffect(s, 'alice', 'ST22-001.activate-main-draw')
  s = roundTrip(choose(s, 'alice', [wb]))
  assert.equal(zones(s, 'alice').deck[0], wb); assert.equal(hand(s), h); assert.ok(s.events.some(e => e.type === 'CARD_REVEALED'))
  assert.equal(offeredEffects(s, 'alice', 'ST22-001.activate-main-draw').length, 0)
})

test('M6 FAQ ST22-003: Newgate (Double Attack) and Jozu reveal the top card and draw it with another on a Whitebeard Pirates type, else it stays face-down on top', () => {
  let s = game(9)
  const top = put(s, 'alice', 'ST22-010', 'deckTop'), h = hand(s), ng = inHand(s, 'alice', 'ST22-003')
  s = roundTrip(playCard(s, 'alice', ng))
  assert.equal(zoneOf(s, top), 'hand'); assert.equal(hand(s), h - 1 + 2)
  let t = game(9)
  const navy = put(t, 'alice', 'OP12-045', 'deckTop'), h2 = hand(t), ng2 = inHand(t, 'alice', 'ST22-003')
  t = playCard(t, 'alice', ng2)
  assert.equal(zones(t, 'alice').deck[0], navy); assert.equal(t.instances[navy].faceUp, false); assert.equal(hand(t), h2 - 1)
  let u = game(9)
  put(u, 'alice', 'ST22-008', 'deckTop')
  const jozu = inHand(u, 'alice', 'ST22-006'), h3 = hand(u)
  u = playCard(u, 'alice', jozu)
  u = roundTrip(choose(u, 'alice', [zones(u, 'alice').hand[0]]))
  assert.equal(hand(u), h3 - 1 + 2 - 1, 'FAQ ST22-006: draw 2 then trash 1')
})

test('M6 FAQ ST22-005: Oden trashes 2 hand cards instead of being removed by an opposing effect, never with 1; it rests 3 DON!! and returns another Character to set itself active', () => {
  let s = shanks(10)
  const oden = field(s, 'alice', 'ST22-005', true), [a, b] = zones(s, 'alice').hand
  s = shanksKO(s, oden)
  assert.equal(pendingChoice(s, 'alice')!.max, 2)
  s = roundTrip(choose(s, 'alice', [a, b]))
  assert.equal(zoneOf(s, oden), 'characters'); assert.equal(zoneOf(s, a), 'trash'); assert.equal(zoneOf(s, b), 'trash')
  let t = shanks(10)
  const o2 = field(t, 'alice', 'ST22-005', true), p = zones(t, 'alice')
  for (const id of p.hand.slice(1)) { p.hand.splice(p.hand.indexOf(id), 1); p.deck.push(id); t.instances[id].zone = 'deck'; t.instances[id].zoneGeneration++ }
  t = shanksKO(t, o2)
  assert.equal(zoneOf(t, o2), 'trash', 'FAQ ST22-005: 1 hand card is not enough')
  let u = game(9)
  const o3 = field(u, 'alice', 'ST22-005', true), other = field(u, 'alice', 'ST22-004')
  u = startEffect(u, 'alice', 'ST22-005.activate-main-active')
  u = choose(u, 'alice', zones(u, 'alice').cost.filter(id => !u.instances[id].rested).slice(0, 3))
  u = roundTrip(choose(u, 'alice', [other]))
  assert.equal(u.instances[o3].rested, false); assert.equal(zoneOf(u, other), 'hand')
})

test('M6 FAQ ST22-007: Squard reveals the top card to give a rested DON!! on a Whitebeard Pirates type; Marco gains +1000 until the end of the next opposing turn when attacking on a match', () => {
  let s = game(5)
  put(s, 'alice', 'ST22-010', 'deckTop'); field(s, 'alice', 'ST22-007')
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST22-009'))
  const leader = leaderOf(s, 'alice')
  s = startEffect(s, 'alice', 'ST22-007.activate-main-reveal')
  s = choose(s, 'alice', [leader])
  s = roundTrip(choose(s, 'alice', [zones(s, 'alice').cost.find(id => s.instances[id].rested)!]))
  assert.equal(zones(s, 'alice').attached.filter(id => s.instances[id].attachedTo === leader).length, 1)
  let t = game(7)
  put(t, 'alice', 'ST22-010', 'deckTop')
  const marco = field(t, 'alice', 'ST22-012')
  t = finishBattle(attack(t, marco, leaderOf(t, 'bob')))
  t = endTurn(t)
  assert.equal(power(t, marco), 6000, 'during the opponent next turn')
})

test('M6 ST-22 Marco trashes 1 hand card instead of a K.O. by an opposing effect once per turn; Izo trashes itself on the opponent attack to draw 1 and put 1 card at the bottom', () => {
  let s = kaido(10)
  const marco = field(s, 'alice', 'ST22-012'), card = zones(s, 'alice').hand[0]
  s = kaidoKO(s, marco)
  s = roundTrip(choose(s, 'alice', [card]))
  assert.equal(zoneOf(s, marco), 'characters'); assert.equal(zoneOf(s, card), 'trash')
  let t = endTurn(game(5))
  const izo = field(t, 'alice', 'ST22-002'), h = hand(t)
  t = attack(t, field(t, 'bob', 'OP03-106'), leaderOf(t, 'alice'))
  t = choose(t, 'alice', [izo])
  const bottom = zones(t, 'alice').hand[0]
  t = roundTrip(choose(t, 'alice', [bottom]))
  assert.equal(zoneOf(t, izo), 'trash'); assert.equal(zones(t, 'alice').deck.at(-1), bottom); assert.equal(hand(t), h)
})

test('M6 ST-22 Whitey Bay reveals 2 Whitebeard Pirates hand cards for +2000 to the Leader on your turn; Izo looks at 5 for a Whitebeard Pirates card other than Izo', () => {
  let s = game(5)
  const a = put(s, 'alice', 'ST22-010', 'hand'), b = put(s, 'alice', 'ST22-004', 'hand'), leader = leaderOf(s, 'alice')
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST22-011'))
  s = choose(s, 'alice', [a, b])
  s = roundTrip(choose(s, 'alice', [leader]))
  assert.equal(power(s, leader), 7000)
  let t = game(5)
  const ace = put(t, 'alice', 'ST22-010', 'deckTop'), izo2 = put(t, 'alice', 'ST22-002', 'deckTop')
  t = playCard(t, 'alice', inHand(t, 'alice', 'ST22-002', [izo2]))
  assert.ok(optionIds(t, 'alice').includes(ace)); assert.ok(!optionIds(t, 'alice').includes(izo2))
  t = choose(t, 'alice', [ace])
  while (pendingChoice(t, 'alice')) t = pick(t, 'alice', pendingChoice(t, 'alice')!.options.map((_, i) => i))
  assert.equal(zoneOf(t, ace), 'hand')
})

test('M6 ST-22 I Am Whitebeard!! plays an Edward.Newgate from hand then may add a Life card for +2000 to the Leader until the end of the next opposing turn', () => {
  let s = game(11)
  const ng = put(s, 'alice', 'ST22-003', 'hand'), leader = leaderOf(s, 'alice')
  s = startFrom(s, 'alice', 'ST22-015.main-play', inHand(s, 'alice', 'ST22-015'))
  s = choose(s, 'alice', [ng])
  while (pendingChoice(s, 'alice') && !pendingChoice(s, 'alice')!.options.some(o => 'slot' in o && (o as { slot?: { kind: string } }).slot?.kind === 'LIFE_TOP')) s = choose(s, 'alice', [])
  s = pick(s, 'alice', [0])
  s = roundTrip(choose(s, 'alice', [leader]))
  assert.equal(zoneOf(s, ng), 'characters'); assert.equal(power(s, leader), 7000)
  s = endTurn(s)
  assert.equal(power(s, leader), 7000)
})

test('M6 FAQ ST22-016: the Counter reveals the top card for +4000 on a Whitebeard Pirates type, its Trigger draws 1; Fire Fist reveals 2 to draw 1 then bottoms a cost 5 or less, its Trigger returns a cost 3 or less', () => {
  let s = endTurn(game(7))
  const ev = put(s, 'alice', 'ST22-016', 'hand'), l = leaderOf(s, 'alice')
  put(s, 'alice', 'ST22-010', 'deckTop')
  s = attack(s, field(s, 'bob', 'OP03-106'), l)
  s = act(s, 'alice', { type: 'PASS_BLOCKER', battleId: s.battle!.id })
  const c = legal(s, 'alice').find(x => x.type === 'PLAY_COUNTER_EVENT') as { paymentDonIds: string[]; battleId: string }
  s = act(s, 'alice', { type: 'PLAY_COUNTER_EVENT', cardId: ev, targetId: null, paymentDonIds: c.paymentDonIds.slice(0, 1), donMinusIds: [], battleId: c.battleId })
  s = roundTrip(choose(s, 'alice', [l]))
  assert.equal(s.battle!.counterModifiers.reduce((n, m) => n + m.amount, 0), 4000)
  let t = endTurn(game(7))
  const foe = field(t, 'bob', 'OP03-106')
  t = endTurn(t)
  const a = put(t, 'alice', 'ST22-010', 'hand'), b = put(t, 'alice', 'ST22-004', 'hand'), fire = inHand(t, 'alice', 'ST22-017'), h = hand(t)
  t = startFrom(t, 'alice', 'ST22-017.main-draw-bottom', fire)
  t = choose(t, 'alice', [a, b])
  t = roundTrip(choose(t, 'alice', [foe]))
  assert.equal(zones(t, 'bob').deck.at(-1), foe); assert.equal(hand(t), h + 1 - 1)
  let u = endTurn(game(3))
  const small = field(u, 'bob', 'OP03-107')
  put(u, 'alice', 'ST22-017', 'life')
  u = attack(u, field(u, 'bob', 'OP03-106'), leaderOf(u, 'alice'))
  u = act(u, 'alice', { type: 'PASS_BLOCKER', battleId: u.battle!.id }); u = act(u, 'alice', { type: 'PASS_COUNTER', battleId: u.battle!.id })
  u = act(u, 'bob', { type: 'RESOLVE_BATTLE', battleId: u.battle!.id })
  u = act(u, 'alice', { type: 'ANSWER_TRIGGER', choiceId: (legal(u, 'alice').find(x => x.type === 'ANSWER_TRIGGER') as { choiceId: string }).choiceId, activate: true })
  u = choose(u, 'alice', [small])
  assert.equal(zoneOf(u, small), 'hand')
})

test('M6 ST-22 Elmy, Decalvan Brothers, Ace, LittleOars Jr. and A.O. (no ability) and Vista ([Blocker]) keep their printed values', () => {
  let s = game(9)
  for (const n of ['ST22-004', 'ST22-008', 'ST22-010', 'ST22-013']) assert.equal(power(s, field(s, 'alice', n)), definitionOf(n).power)
  const vista = field(s, 'alice', 'ST22-009')
  s = endTurn(s)
  s = attack(s, field(s, 'bob', 'OP03-106'), leaderOf(s, 'alice'))
  assert.ok((legal(s, 'alice').find(x => x.type === 'ACTIVATE_BLOCKER') as { blockerIds: string[] }).blockerIds.includes(vista))
  const t = toMain(newGame(deckFor('ST22-001', ['ST22-014']), deckFor('OP03-099', BOB)), 9)
  assert.equal(power(t, field(t, 'alice', 'ST22-014')), definitionOf('ST22-014').power)
})

test('M6 ST-22 certificates validate against the current registry; all ST-22 cards are PLAYABLE_VERIFIED', async () => {
  const { ST22_CERTIFICATIONS, certificationErrors, effectiveStatus } = await import('../src/game/cards/certification')
  const { engineCatalog, currentEngineRegistry } = await import('../src/lib/engine/catalog')
  const { definitions } = engineCatalog(), registry = currentEngineRegistry()
  for (const c of ST22_CERTIFICATIONS) assert.deepEqual(certificationErrors(c, definitions.find(x => x.definitionId === c.definitionId), registry), [], c.definitionId)
  for (const n of ['ST22-001', ...ST22]) assert.equal(effectiveStatus(definitions.find(x => x.number === n)!), 'PLAYABLE_VERIFIED', n)
})
