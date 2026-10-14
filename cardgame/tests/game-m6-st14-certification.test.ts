import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateCharacteristics } from '../src/game/effects/characteristics'
import type { GameState } from '../src/game/core/types'
import { act, attachDon, attack, attackerIds, choose, deckFor, definitionOf, endTurn, inHand, leaderOf, legal, newGame, offeredEffects, optionIds, pendingChoice, playCard, put, roundTrip, startEffect, toMain, zoneOf } from './helpers/m6'

// M6 ST-14 (3D2Y, black). Scenarios follow the official text, the ST-14 FAQ (qa_st-14.txt) and the errata snapshot, through
// public commands only. Costs are current costs (Leader and Thousand Sunny auras included).
const ST14 = Array.from({ length: 16 }, (_, i) => `ST14-${String(i + 2).padStart(3, '0')}`)
const game = (turn = 5) => toMain(newGame(deckFor('ST14-001', ST14), deckFor('ST14-001', ST14)), turn)
const zones = (s: GameState, owner: string) => s.players.find(p => p.id === owner)!.zones
const cost = (s: GameState, id: string) => evaluateCharacteristics(s, id).cost.current
const power = (s: GameState, id: string) => evaluateCharacteristics(s, id).power.current
const field = (s: GameState, owner: string, number: string) => put(s, owner, number, 'characters', { playedEarlier: true })
const counterEvent = (s: GameState, owner: string, cardId: string): GameState => {
  const a = legal(s, owner).find(x => x.type === 'PLAY_COUNTER_EVENT') as { eventIds: string[]; paymentDonIds: string[]; battleId: string } | undefined
  assert.ok(a?.eventIds.includes(cardId), 'Counter Event offered')
  return act(s, owner, { type: 'PLAY_COUNTER_EVENT', cardId, targetId: null, paymentDonIds: a!.paymentDonIds.slice(0, 1), donMinusIds: [], battleId: a!.battleId })
}
const lifeTrigger = (s: GameState, defender: string) => {
  s = attack(s, field(s, s.activePlayerId!, 'ST14-005'), leaderOf(s, defender))
  s = act(s, defender, { type: 'PASS_BLOCKER', battleId: s.battle!.id }); s = act(s, defender, { type: 'PASS_COUNTER', battleId: s.battle!.id })
  s = act(s, s.activePlayerId!, { type: 'RESOLVE_BATTLE', battleId: s.battle!.id })
  const t = legal(s, defender).find(a => a.type === 'ANSWER_TRIGGER') as { choiceId: string } | undefined
  assert.ok(t, 'Trigger offered')
  return act(s, defender, { type: 'ANSWER_TRIGGER', choiceId: t!.choiceId, activate: true })
}

test('M6 FAQ ST14-001: with a DON!! the Leader gives field Characters +1 cost and gains +1000 while a Character costs 8 or more', () => {
  let s = game(5)
  const leader = leaderOf(s, 'alice'), brook = field(s, 'alice', 'ST14-010'), held = inHand(s, 'alice', 'ST14-010')
  assert.equal(cost(s, brook), 5)
  attachDon(s, 'alice', leader, 1)
  assert.equal(cost(s, brook), 6, 'field Character +1')
  assert.equal(cost(s, held), 5, 'not in hand')
  assert.equal(power(s, leader), 6000, 'no Character of cost 8 or more: 5000 + 1 DON!!')
  const luffy = field(s, 'alice', 'ST14-012')
  assert.equal(cost(s, luffy), 9)
  assert.equal(power(s, leader), 7000)
  s = roundTrip(endTurn(s))
  assert.equal(power(s, leader), 6000, 'opponent turn: the given DON!! adds no power, the effect still gives +1000')
  zones(s, 'alice').characters.splice(zones(s, 'alice').characters.indexOf(luffy), 1); zones(s, 'alice').trash.push(luffy); s.instances[luffy].zone = 'trash'; s.instances[luffy].zoneGeneration++
  assert.equal(power(s, leader), 5000, 'FAQ ST14-001: re-evaluated when the cost 8 Character leaves')
})

test('M6 FAQ ST14-017: Thousand Sunny gives black {Straw Hat Crew} field Characters +1 cost and draws 1 on play with a {Straw Hat Crew} Leader', () => {
  let s = game(5)
  const brook = field(s, 'alice', 'ST14-010'), jinbe = field(s, 'alice', 'ST14-004'), held = inHand(s, 'alice', 'ST14-010')
  const sunny = inHand(s, 'alice', 'ST14-017'), hand = zones(s, 'alice').hand.length
  s = playCard(s, 'alice', sunny)
  assert.equal(zones(s, 'alice').hand.length, hand, 'played (-1) then drew 1 (+1)')
  assert.equal(cost(s, brook), 6); assert.equal(cost(s, jinbe), 3, 'Jinbe is not {Straw Hat Crew}'); assert.equal(cost(s, held), 5)
})

test('M6 FAQ ST14-002: Usopp with a DON!! K.O.s a cost 4 or less when attacking if a Character costs 8 or more; otherwise nothing', () => {
  let s = game(5)
  const usopp = field(s, 'alice', 'ST14-002'), foe = field(s, 'bob', 'ST14-004')
  attachDon(s, 'alice', usopp, 1); field(s, 'alice', 'ST14-012')
  s = choose(attack(s, usopp, leaderOf(s, 'bob')), 'alice', [foe])
  assert.equal(zoneOf(s, foe), 'trash')
  let t = game(5)
  const u2 = field(t, 'alice', 'ST14-002'); field(t, 'bob', 'ST14-004')
  attachDon(t, 'alice', u2, 1)
  t = attack(t, u2, leaderOf(t, 'bob'))
  assert.equal(pendingChoice(t, 'alice'), undefined)
})

test('M6 FAQ ST14-003: with a DON!! on the Leader and no Character, Sanji (cost 6 on the field) K.O.s a cost 5 or less on play', () => {
  let s = game(7)
  attachDon(s, 'alice', leaderOf(s, 'alice'), 1)
  const foe = field(s, 'bob', 'ST14-010')
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST14-003'))
  s = choose(s, 'alice', [foe])
  assert.equal(zoneOf(s, foe), 'trash')
  let t = game(7)
  field(t, 'bob', 'ST14-010')
  t = playCard(t, 'alice', inHand(t, 'alice', 'ST14-003'))
  assert.equal(pendingChoice(t, 'alice'), undefined, 'cost 5: no K.O.')
})

test('M6 ST-14 Jinbe, Heracles and Haredas give a black {Straw Hat Crew} Character +2 cost until the end of the opponent next turn', () => {
  let s = game(5)
  const brook = field(s, 'alice', 'ST14-010'), jinbe = field(s, 'alice', 'ST14-004'), heracles = field(s, 'alice', 'ST14-011')
  s = startEffect(s, 'alice', 'ST14-004.activate-main-cost')
  assert.ok(!optionIds(s, 'alice').includes(jinbe), 'Jinbe is not {Straw Hat Crew}')
  s = choose(s, 'alice', [brook])
  assert.equal(cost(s, brook), 7)
  assert.equal(offeredEffects(s, 'alice', 'ST14-004.activate-main-cost').length, 0, 'once per turn')
  s = choose(startEffect(s, 'alice', 'ST14-011.activate-main-cost'), 'alice', [brook])
  assert.equal(s.instances[heracles].rested, true); assert.equal(cost(s, brook), 9)
  s = endTurn(s)
  assert.equal(cost(s, brook), 9, 'kept during the opponent next turn')
  s = endTurn(s)
  assert.equal(cost(s, brook), 5, 'gone at the start of the following own turn')
  let t = game(5)
  const b2 = field(t, 'alice', 'ST14-012'), haredas = field(t, 'alice', 'ST14-008'), hand = zones(t, 'alice').hand.length
  t = choose(startEffect(t, 'alice', 'ST14-008.activate-main-cost'), 'alice', [b2])
  assert.equal(t.instances[haredas].rested, true)
  assert.equal(zones(t, 'alice').hand.length, hand + 1, 'cost 10: drew 1')
  t = choose(t, 'alice', [zones(t, 'alice').hand[0]])
  assert.equal(zones(t, 'alice').hand.length, hand)
  let u = game(5)
  const small = field(u, 'alice', 'ST14-002'); field(u, 'alice', 'ST14-008'); const h2 = zones(u, 'alice').hand.length
  u = choose(startEffect(u, 'alice', 'ST14-008.activate-main-cost'), 'alice', [small])
  assert.equal(zones(u, 'alice').hand.length, h2, 'cost 5: no draw'); assert.equal(pendingChoice(u, 'alice'), undefined)
})

test('M6 ST-14 Nami blocks and draws 1 on play with 6 or less cards in hand and a Character of cost 8 or more', () => {
  let s = game(5)
  field(s, 'alice', 'ST14-012')
  while (zones(s, 'alice').hand.length > 4) { const id = zones(s, 'alice').hand.pop()!; zones(s, 'alice').trash.push(id); s.instances[id].zone = 'trash'; s.instances[id].zoneGeneration++; s.instances[id].faceUp = true }
  const nami = inHand(s, 'alice', 'ST14-006'), hand = zones(s, 'alice').hand.length
  s = playCard(s, 'alice', nami)
  assert.equal(zones(s, 'alice').hand.length, hand)
  s = endTurn(s)
  s = attack(s, field(s, 'bob', 'ST14-005'), leaderOf(s, 'alice'))
  assert.ok((legal(s, 'alice').find(a => a.type === 'ACTIVATE_BLOCKER') as { blockerIds: string[] }).blockerIds.includes(nami))
  let t = game(5)
  const n2 = inHand(t, 'alice', 'ST14-006'), h = zones(t, 'alice').hand.length
  t = playCard(t, 'alice', n2)
  assert.equal(zones(t, 'alice').hand.length, h - 1, 'no Character of cost 8: no draw')
})

test('M6 FAQ ST14-007: Nico Robin gives an opposing Character -5 cost this turn on play and when attacking if a Character costs 8 or more', () => {
  let s = game(7)
  field(s, 'alice', 'ST14-012')
  const foe = field(s, 'bob', 'ST14-013')
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST14-007'))
  s = choose(s, 'alice', [foe])
  assert.equal(cost(s, foe), 1)
  s = endTurn(s)
  assert.equal(cost(s, foe), 6, 'this turn only')
  let t = game(7)
  const robin = field(t, 'alice', 'ST14-007'), f2 = field(t, 'bob', 'ST14-013')
  t = attack(t, robin, leaderOf(t, 'bob'))
  assert.equal(pendingChoice(t, 'alice'), undefined, 'cost 7 only: nothing')
  void f2
})

test('M6 FAQ ST14-009: Franky with a DON!! and a cost 6 or more Character gains +2000 and cannot be K.O.d by opponent effects on the opponent turn', () => {
  let s = game(7)
  const franky = field(s, 'alice', 'ST14-009'); field(s, 'alice', 'ST14-013')
  attachDon(s, 'alice', franky, 1)
  assert.equal(power(s, franky), 7000, 'own turn: only the given DON!!')
  s = endTurn(s)
  assert.equal(power(s, franky), 8000, 'opponent turn: +2000')
  attachDon(s, 'bob', leaderOf(s, 'bob'), 1)
  s = playCard(s, 'bob', inHand(s, 'bob', 'ST14-003'))
  assert.ok(optionIds(s, 'bob').includes(franky))
  s = choose(s, 'bob', [franky])
  assert.equal(zoneOf(s, franky), 'characters', 'not K.O.d by an opponent effect')
  let t = game(7)
  const f2 = field(t, 'alice', 'ST14-009')
  attachDon(t, 'alice', f2, 1)
  t = endTurn(t)
  assert.equal(power(t, f2), 6000, 'no Character of cost 6 or more: printed 6000, no bonus')
})

test('M6 FAQ ST14-012: Monkey.D.Luffy gains [Rush] while a Character has a cost of 10 or more', () => {
  let s = game(11)
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST14-017'))
  const luffy = inHand(s, 'alice', 'ST14-012')
  s = playCard(s, 'alice', luffy)
  assert.ok(!attackerIds(s, 'alice').includes(luffy), 'cost 9: no Rush yet')
  attachDon(s, 'alice', leaderOf(s, 'alice'), 1)
  assert.equal(cost(s, luffy), 10)
  assert.ok(attackerIds(s, 'alice').includes(luffy))
  let t = game(11)
  const l2 = inHand(t, 'alice', 'ST14-012')
  t = playCard(t, 'alice', l2)
  assert.ok(!attackerIds(t, 'alice').includes(l2), 'cost 8: no Rush')
})

test('M6 ST-14 Gum-Gum Giant Rifle gives +3000 this battle with a cost 8 or more Character; its Trigger returns a cost 2 or less Character from trash', () => {
  let s = game(5)
  field(s, 'alice', 'ST14-012')
  s = endTurn(s)
  const rifle = put(s, 'alice', 'ST14-014', 'hand')
  s = attack(s, field(s, 'bob', 'ST14-005'), leaderOf(s, 'alice'))
  s = act(s, 'alice', { type: 'PASS_BLOCKER', battleId: s.battle!.id })
  s = choose(counterEvent(s, 'alice', rifle), 'alice', [leaderOf(s, 'alice')])
  assert.equal(s.battle!.counterModifiers.reduce((n, m) => n + m.amount, 0) + (power(s, leaderOf(s, 'alice'))! - 5000), 3000)
  let t = endTurn(game(5))
  const r2 = put(t, 'alice', 'ST14-014', 'hand')
  t = attack(t, field(t, 'bob', 'ST14-005'), leaderOf(t, 'alice'))
  t = act(t, 'alice', { type: 'PASS_BLOCKER', battleId: t.battle!.id })
  t = counterEvent(t, 'alice', r2)
  assert.equal(pendingChoice(t, 'alice'), undefined, 'no cost 8 Character: nothing'); assert.equal(zoneOf(t, r2), 'trash')
  let u = game(3)
  const cheap = put(u, 'alice', 'ST14-011', 'trash'), dear = put(u, 'alice', 'ST14-010', 'trash')
  put(u, 'alice', 'ST14-014', 'life')
  u = lifeTrigger(endTurn(u), 'alice')
  assert.ok(!optionIds(u, 'alice').includes(dear))
  u = choose(u, 'alice', [cheap])
  assert.equal(zoneOf(u, cheap), 'hand')
})

test('M6 ST-14 Phoenix Cannon gives +3000 this turn then K.O.s a cost 2 or less with a cost 8 Character; its Trigger K.O.s a cost 5 or less', () => {
  let s = game(5)
  field(s, 'alice', 'ST14-012')
  const small = field(s, 'bob', 'ST14-011'), leader = leaderOf(s, 'alice')
  put(s, 'alice', 'ST14-015', 'hand')
  s = choose(startEffect(s, 'alice', 'ST14-015.main-power-ko'), 'alice', [leader])
  assert.equal(power(s, leader), 8000)
  s = choose(s, 'alice', [small])
  assert.equal(zoneOf(s, small), 'trash')
  let u = game(3)
  field(u, 'alice', 'ST14-012'); put(u, 'alice', 'ST14-015', 'life')
  u = endTurn(u)
  const foe = field(u, 'bob', 'ST14-010')
  u = choose(lifeTrigger(u, 'alice'), 'alice', [foe])
  assert.equal(zoneOf(u, foe), 'trash')
})

test('M6 ST-14 I Have My Crew!! draws 1 then gives +3 cost until the end of the opponent next turn; its Trigger K.O.s a cost 3 or less', () => {
  let s = game(5)
  const brook = field(s, 'alice', 'ST14-010'), hand = zones(s, 'alice').hand.length
  put(s, 'alice', 'ST14-016', 'hand')
  s = startEffect(s, 'alice', 'ST14-016.main-draw-cost')
  assert.equal(zones(s, 'alice').hand.length, hand + 1, 'played (-1) then drew 1')
  s = roundTrip(choose(s, 'alice', [brook]))
  assert.equal(cost(s, brook), 8)
  s = endTurn(s)
  assert.equal(cost(s, brook), 8)
  let u = game(3)
  put(u, 'alice', 'ST14-016', 'life')
  u = endTurn(u)
  const foe = field(u, 'bob', 'ST14-002')
  u = choose(lifeTrigger(u, 'alice'), 'alice', [foe])
  assert.equal(zoneOf(u, foe), 'trash')
})

test('M6 ST-14 cards without ability are played for their printed cost and keep their printed power', () => {
  for (const number of ['ST14-005', 'ST14-010', 'ST14-013']) {
    let s = game(9)
    const d = definitionOf(number), id = inHand(s, 'alice', number), before = zones(s, 'alice').cost.filter(x => !s.instances[x].rested).length
    s = playCard(s, 'alice', id)
    assert.equal(zones(s, 'alice').cost.filter(x => !s.instances[x].rested).length, before - d.cost!, number)
    assert.equal(power(s, id), d.power, number)
  }
})

test('M6 ST-14 certificates validate against the current registry; ST14-001..017 are PLAYABLE_VERIFIED', async () => {
  const { ST14_CERTIFICATIONS, certificationErrors, effectiveStatus } = await import('../src/game/cards/certification')
  const { engineCatalog, currentEngineRegistry } = await import('../src/lib/engine/catalog')
  const { definitions } = engineCatalog(), registry = currentEngineRegistry()
  for (const c of ST14_CERTIFICATIONS) assert.deepEqual(certificationErrors(c, definitions.find(x => x.definitionId === c.definitionId), registry), [], c.definitionId)
  for (const n of ['ST14-001', ...ST14]) assert.equal(effectiveStatus(definitions.find(x => x.number === n)!), 'PLAYABLE_VERIFIED', n)
})
