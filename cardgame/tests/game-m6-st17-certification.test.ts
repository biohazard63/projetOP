import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateCharacteristics } from '../src/game/effects/characteristics'
import type { GameState } from '../src/game/core/types'
import { act, attachDon, attack, choose, deckFor, definitionOf, endTurn, finishBattle, inHand, leaderOf, legal, newGame, offeredEffects, optionIds, pendingChoice, playCard, put, roundTrip, startEffect, toMain, zoneOf } from './helpers/m6'

// M6 ST-17 (Blue Donquixote Doflamingo), official English texts (series 569017). Scenarios follow the official text, the
// OP-01/OP-02/promotion/ST-15-20 FAQ and the errata snapshot (docs/game/evidence/m6/sources/), through public commands only.
const ST17 = ['ST17-001', 'ST17-002', 'ST17-003', 'ST17-004', 'ST17-005', 'OP01-073', 'OP02-054', 'OP02-057', 'P-030', 'OP01-086']
const game = (turn = 5, leader = 'OP01-060') => toMain(newGame(deckFor(leader, ST17), deckFor('OP01-060', ST17)), turn)
const zones = (s: GameState, owner: string) => s.players.find(p => p.id === owner)!.zones
const field = (s: GameState, owner: string, number: string, rested = false) => put(s, owner, number, 'characters', { playedEarlier: true, rested })
const activeDon = (s: GameState, owner: string) => zones(s, owner).cost.filter(id => !s.instances[id].rested)
const pick = (s: GameState, owner: string, indexes: number[]) => { const c = pendingChoice(s, owner)!; return act(s, owner, { type: 'ANSWER_CHOICE', choiceId: c.choiceId, tokens: indexes.map(i => c.options[i].token) }) }
/** Scenario setup: moves a deck card without the {The Seven Warlords of the Sea} type (a filler) to the top. */
const nonWarlordOnTop = (s: GameState, owner: string) => {
  const deck = zones(s, owner).deck
  const id = deck.find(x => !s.catalog.definitions.find(d => d.definitionId === s.instances[x].definitionId)!.traits.includes('The Seven Warlords of the Sea'))!
  deck.splice(deck.indexOf(id), 1); deck.unshift(id)
  return id
}
const lifeTrigger = (s: GameState, defender: string) => {
  s = attack(s, field(s, s.activePlayerId!, 'OP02-054'), leaderOf(s, defender))
  s = act(s, defender, { type: 'PASS_BLOCKER', battleId: s.battle!.id }); s = act(s, defender, { type: 'PASS_COUNTER', battleId: s.battle!.id })
  s = act(s, s.activePlayerId!, { type: 'RESOLVE_BATTLE', battleId: s.battle!.id })
  const t = legal(s, defender).find(a => a.type === 'ANSWER_TRIGGER') as { choiceId: string } | undefined
  assert.ok(t, 'Trigger offered')
  return act(s, defender, { type: 'ANSWER_TRIGGER', choiceId: t!.choiceId, activate: true })
}

test('M6 FAQ OP01-060: Leader Doflamingo with 2 DON!! pays 1 DON!! to reveal the top card and may play a Warlords Character cost 4 or less rested', () => {
  let s = game(5)
  const leader = leaderOf(s, 'alice'), top = put(s, 'alice', 'OP01-073', 'deckTop')
  attachDon(s, 'alice', leader, 2)
  s = attack(s, leader, leaderOf(s, 'bob'))
  const paid = activeDon(s, 'alice').slice(0, 1)
  s = choose(s, 'alice', paid)
  assert.ok(s.events.some(e => e.type === 'CARD_REVEALED' && e.revealedCard?.definitionId === definitionOf('OP01-073').definitionId))
  s = roundTrip(choose(s, 'alice', [top]))
  assert.equal(zoneOf(s, top), 'characters'); assert.equal(s.instances[top].rested, true)
  let u = game(5)
  const event = put(u, 'alice', 'OP01-086', 'deckTop'), l3 = leaderOf(u, 'alice')
  attachDon(u, 'alice', l3, 2)
  u = choose(attack(u, l3, leaderOf(u, 'bob')), 'alice', activeDon(u, 'alice').slice(0, 1))
  assert.equal(pendingChoice(u, 'alice'), undefined, 'an Event: nothing to play')
  assert.equal(zones(u, 'alice').deck[0], event, 'FAQ OP01-060: it returns to the top of the deck')
  let v = game(5)
  const l4 = leaderOf(v, 'alice'), unseen = put(v, 'alice', 'OP01-073', 'deckTop')
  attachDon(v, 'alice', l4, 2)
  v = choose(attack(v, l4, leaderOf(v, 'bob')), 'alice', [])
  assert.equal(zones(v, 'alice').deck[0], unseen); assert.equal(pendingChoice(v, 'alice'), undefined, 'not paid: nothing revealed')
})

test('M6 FAQ ST17-001: Crocodile reveals the top card; a Warlords card means draw 2 then place 1 hand card on top, otherwise it stays on top', () => {
  let s = game(5)
  const top = put(s, 'alice', 'OP02-054', 'deckTop'), hand = zones(s, 'alice').hand.length
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST17-001'))
  assert.equal(zoneOf(s, top), 'hand', 'the revealed card is one of the 2 drawn')
  assert.equal(zones(s, 'alice').hand.length, hand + 1)
  const placed = zones(s, 'alice').hand[0]
  s = choose(s, 'alice', [placed])
  assert.equal(zones(s, 'alice').deck[0], placed)
  let t = game(5)
  const croc = inHand(t, 'alice', 'ST17-001'), other = nonWarlordOnTop(t, 'alice')
  t = playCard(t, 'alice', croc)
  assert.equal(zones(t, 'alice').deck[0], other); assert.equal(pendingChoice(t, 'alice'), undefined)
})

test('M6 FAQ ST17-002: Law may return 1 own Character to return a cost 4 or less Character; without a Warlords Leader only the cost is paid', () => {
  let s = game(7)
  const mine = field(s, 'alice', 'OP02-054'), foe = field(s, 'bob', 'ST17-001')
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST17-002'))
  s = choose(s, 'alice', [mine])
  assert.equal(zoneOf(s, mine), 'hand')
  s = choose(s, 'alice', [foe])
  assert.equal(zoneOf(s, foe), 'hand')
  let t = game(7, 'ST12-001')
  const own = field(t, 'alice', 'OP02-054'), other = field(t, 'bob', 'ST17-001')
  t = playCard(t, 'alice', inHand(t, 'alice', 'ST17-002'))
  t = choose(t, 'alice', [own])
  assert.equal(zoneOf(t, own), 'hand', 'the cost can be paid with another Leader')
  assert.equal(pendingChoice(t, 'alice'), undefined); assert.equal(zoneOf(t, other), 'characters')
  let u = game(7)
  field(u, 'bob', 'ST17-001')
  u = playCard(u, 'alice', inHand(u, 'alice', 'ST17-002'))
  u = choose(u, 'alice', [])
  assert.equal(pendingChoice(u, 'alice'), undefined, 'cost not paid: nothing returned')
})

test('M6 ST-17 Buggy looks at 3 and places them at the top in any order', () => {
  let s = game(5)
  const top3 = zones(s, 'alice').deck.slice(0, 3)
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST17-003'))
  s = roundTrip(choose(s, 'alice', [top3[2], top3[1], top3[0]]))
  assert.deepEqual(zones(s, 'alice').deck.slice(0, 3), [top3[2], top3[1], top3[0]])
  assert.equal(pendingChoice(s, 'alice'), undefined, 'no bottom option')
})

test('M6 FAQ OP01-073: Hancock and Doflamingo block; they look at 3 or 5 and place all at the top or all at the bottom; Hancock then gives a rested DON!! to a Warlords card', () => {
  let s = game(7)
  const top3 = zones(s, 'alice').deck.slice(0, 3), leader = leaderOf(s, 'alice')
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST17-004'))
  s = choose(s, 'alice', top3)
  s = choose(s, 'alice', top3)
  assert.deepEqual(zones(s, 'alice').deck.slice(-3), top3)
  const rested = zones(s, 'alice').cost.filter(id => s.instances[id].rested).length
  s = choose(s, 'alice', [leader])
  s = choose(s, 'alice', [zones(s, 'alice').cost.find(id => s.instances[id].rested)!])
  assert.equal(zones(s, 'alice').attached.filter(id => s.instances[id].attachedTo === leader).length, 1)
  assert.equal(zones(s, 'alice').cost.filter(id => s.instances[id].rested).length, rested - 1)
  let t = game(5)
  const top5 = zones(t, 'alice').deck.slice(0, 5)
  t = playCard(t, 'alice', inHand(t, 'alice', 'OP01-073'))
  t = choose(t, 'alice', top5)
  t = choose(t, 'alice', [])
  assert.deepEqual(zones(t, 'alice').deck.slice(0, 5), top5)
  const dofla = zones(t, 'alice').characters.find(id => t.instances[id].definitionId === definitionOf('OP01-073').definitionId)!
  t = endTurn(t)
  t = attack(t, field(t, 'bob', 'OP02-054'), leaderOf(t, 'alice'))
  assert.ok((legal(t, 'alice').find(a => a.type === 'ACTIVATE_BLOCKER') as { blockerIds: string[] }).blockerIds.includes(dofla))
  const hancock = zones(s, 'alice').characters.find(id => s.instances[id].definitionId === definitionOf('ST17-004').definitionId)!
  s = endTurn(s)
  s = attack(s, field(s, 'bob', 'OP02-054'), leaderOf(s, 'alice'))
  assert.ok((legal(s, 'alice').find(a => a.type === 'ACTIVATE_BLOCKER') as { blockerIds: string[] }).blockerIds.includes(hancock))
})

test('M6 ST-17 Marshall.D.Teach places 1 hand card on top of the deck to give up to 2 rested DON!! to the Leader or a Character, once per turn', () => {
  let s = game(5)
  const teach = field(s, 'alice', 'ST17-005'), leader = leaderOf(s, 'alice')
  s = playCard(s, 'alice', inHand(s, 'alice', 'OP02-054'))
  const card = zones(s, 'alice').hand[0]
  s = startEffect(s, 'alice', 'ST17-005.activate-main-don')
  s = choose(s, 'alice', [card])
  assert.equal(zones(s, 'alice').deck[0], card, 'placed at the top')
  s = choose(s, 'alice', [leader])
  const rested = zones(s, 'alice').cost.filter(id => s.instances[id].rested).slice(0, 2)
  s = roundTrip(choose(s, 'alice', rested))
  assert.equal(zones(s, 'alice').attached.filter(id => s.instances[id].attachedTo === leader).length, 2)
  assert.equal(offeredEffects(s, 'alice', 'ST17-005.activate-main-don').length, 0, 'once per turn')
  void teach
})

test('M6 ST-17 Bartholomew Kuma looks at 2, adds up to 1 Warlords card to hand and places the rest at the top or bottom', () => {
  let s = game(5)
  const kuma = inHand(s, 'alice', 'OP02-057'), plain = nonWarlordOnTop(s, 'alice'), warlord = put(s, 'alice', 'OP02-054', 'deckTop')
  s = playCard(s, 'alice', kuma)
  assert.deepEqual(optionIds(s, 'alice'), [warlord], 'only the {The Seven Warlords of the Sea} card')
  s = choose(s, 'alice', [warlord])
  assert.equal(zoneOf(s, warlord), 'hand')
  assert.ok(s.events.some(e => e.type === 'CARD_REVEALED' && e.revealedCard?.definitionId === definitionOf('OP02-054').definitionId))
  s = choose(s, 'alice', [plain])
  s = choose(s, 'alice', [plain])
  assert.equal(zones(s, 'alice').deck.at(-1), plain)
})

test('M6 FAQ P-030: Jinbe, when K.O.d, places up to 1 Character with a cost of 3 or less (own included) at the bottom of its owner deck', () => {
  let s = endTurn(game(5))
  const jinbe = field(s, 'alice', 'P-030', true), mine = field(s, 'alice', 'ST17-003'), foe = field(s, 'bob', 'ST17-005')
  s = finishBattle(attack(s, field(s, 'bob', 'OP02-054'), jinbe))
  assert.equal(zoneOf(s, jinbe), 'trash')
  assert.ok(optionIds(s, 'alice').includes(mine) && optionIds(s, 'alice').includes(foe))
  s = choose(s, 'alice', [foe])
  assert.equal(zones(s, 'bob').deck.at(-1), foe)
})

test('M6 FAQ OP01-086: Overheat gives +4000 this battle and returns an active cost 3 or less Character (own included); its Trigger returns a cost 4 or less', () => {
  let s = endTurn(game(5))
  const heat = put(s, 'alice', 'OP01-086', 'hand'), mine = field(s, 'alice', 'ST17-003'), sleeping = field(s, 'bob', 'ST17-005', true)
  s = attack(s, field(s, 'bob', 'OP02-054'), leaderOf(s, 'alice'))
  s = act(s, 'alice', { type: 'PASS_BLOCKER', battleId: s.battle!.id })
  const a = legal(s, 'alice').find(x => x.type === 'PLAY_COUNTER_EVENT') as { paymentDonIds: string[]; battleId: string }
  s = act(s, 'alice', { type: 'PLAY_COUNTER_EVENT', cardId: heat, targetId: null, paymentDonIds: a.paymentDonIds.slice(0, 2), donMinusIds: [], battleId: a.battleId })
  s = choose(s, 'alice', [leaderOf(s, 'alice')])
  assert.equal(s.battle!.counterModifiers.reduce((n, m) => n + m.amount, 0), 4000)
  assert.ok(optionIds(s, 'alice').includes(mine), 'own Character allowed'); assert.ok(!optionIds(s, 'alice').includes(sleeping), 'active only')
  s = choose(s, 'alice', [mine])
  assert.equal(zoneOf(s, mine), 'hand')
  let t = game(3)
  put(t, 'alice', 'OP01-086', 'life')
  t = endTurn(t)
  const foe = field(t, 'bob', 'ST17-001')
  t = choose(lifeTrigger(t, 'alice'), 'alice', [foe])
  assert.equal(zoneOf(t, foe), 'hand')
})

test('M6 ST-17 Gecko Moria (no ability) is played for its printed cost and keeps its printed power', () => {
  let s = game(9)
  const d = definitionOf('OP02-054'), id = inHand(s, 'alice', 'OP02-054'), before = zones(s, 'alice').cost.filter(x => !s.instances[x].rested).length
  s = playCard(s, 'alice', id)
  assert.equal(zones(s, 'alice').cost.filter(x => !s.instances[x].rested).length, before - d.cost!)
  assert.equal(evaluateCharacteristics(s, id).power.current, d.power)
})

test('M6 ST-17 certificates validate against the current registry; all ST-17 cards are PLAYABLE_VERIFIED', async () => {
  const { ST17_CERTIFICATIONS, certificationErrors, effectiveStatus } = await import('../src/game/cards/certification')
  const { engineCatalog, currentEngineRegistry } = await import('../src/lib/engine/catalog')
  const { definitions } = engineCatalog(), registry = currentEngineRegistry()
  for (const c of ST17_CERTIFICATIONS) assert.deepEqual(certificationErrors(c, definitions.find(x => x.definitionId === c.definitionId), registry), [], c.definitionId)
  for (const n of ['OP01-060', ...ST17]) assert.equal(effectiveStatus(definitions.find(x => x.number === n)!), 'PLAYABLE_VERIFIED', n)
  void pick
})
