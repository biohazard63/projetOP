import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateCharacteristics } from '../src/game/effects/characteristics'
import type { GameState } from '../src/game/core/types'
import { act, attack, choose, deckFor, definitionOf, endTurn, finishBattle, inHand, leaderOf, legal, newGame, offeredEffects, optionIds, pendingChoice, playCard, put, roundTrip, startEffect, toMain, zoneOf } from './helpers/m6'

// M6 ST-16 (GREEN Uta), official English texts (series 569016). Scenarios follow the official text, the ST-15-20 and
// promotion-card FAQ and the errata snapshot (docs/game/evidence/m6/sources/), through public commands only.
const ST16 = ['ST16-001', 'ST16-002', 'ST16-003', 'ST16-004', 'ST16-005', 'P-029', 'P-061', 'ST11-003', 'ST11-004', 'ST11-005', 'P-057', 'P-058', 'P-059', 'P-060']
const BOB = ['OP03-106', 'OP03-107']
const game = (turn = 5, leader = 'ST11-001') => toMain(newGame(deckFor(leader, ST16), deckFor('OP03-099', BOB)), turn)
const zones = (s: GameState, owner: string) => s.players.find(p => p.id === owner)!.zones
const power = (s: GameState, id: string) => evaluateCharacteristics(s, id).power.current
const field = (s: GameState, owner: string, number: string, rested = false) => put(s, owner, number, 'characters', { playedEarlier: true, rested })
const startFrom = (s: GameState, owner: string, abilityId: string, sourceId: string) => {
  const a = offeredEffects(s, owner, abilityId).find(x => x.effectId.includes(sourceId))
  assert.ok(a, `${abilityId} from ${sourceId} not offered`)
  return act(s, owner, { type: 'START_EFFECT', effectId: a!.effectId })
}
const lifeTrigger = (s: GameState, defender: string) => {
  s = attack(s, field(s, s.activePlayerId!, 'OP03-106'), leaderOf(s, defender))
  s = act(s, defender, { type: 'PASS_BLOCKER', battleId: s.battle!.id }); s = act(s, defender, { type: 'PASS_COUNTER', battleId: s.battle!.id })
  s = act(s, s.activePlayerId!, { type: 'RESOLVE_BATTLE', battleId: s.battle!.id })
  const t = legal(s, defender).find(a => a.type === 'ANSWER_TRIGGER') as { choiceId: string } | undefined
  assert.ok(t, 'Trigger offered')
  return act(s, defender, { type: 'ANSWER_TRIGGER', choiceId: t!.choiceId, activate: true })
}

test('M6 ST-16 Bartolomeo at the end of the turn may rest itself to set another FILM Character active, never another Bartolomeo', () => {
  let s = game(5)
  const barto = field(s, 'alice', 'P-029'), luffy = field(s, 'alice', 'P-061', true)
  s = act(s, 'alice', { type: 'END_MAIN' })
  s = choose(s, 'alice', [barto])
  assert.deepEqual(optionIds(s, 'alice'), [luffy], 'the rested Bartolomeo is not offered: other than [Bartolomeo]')
  s = roundTrip(choose(s, 'alice', [luffy]))
  assert.equal(s.instances[barto].rested, true); assert.equal(s.instances[luffy].rested, false)
})

test('M6 FAQ P-057: with an Uta Leader up to 2 opposing rested Characters cost 4 or less stay rested in the next opposing Refresh Phase only', () => {
  let s = game(5)
  const galette = field(s, 'bob', 'OP03-107', true), opera = field(s, 'bob', 'OP03-106', true)
  assert.ok(definitionOf('OP03-107').cost! <= 4)
  s = startFrom(s, 'alice', 'P-057.main-lock', inHand(s, 'alice', 'P-057'))
  assert.ok(optionIds(s, 'alice').includes(galette))
  s = roundTrip(choose(s, 'alice', [galette]))
  s = endTurn(s)
  assert.equal(s.instances[galette].rested, true, 'kept rested'); assert.equal(s.instances[opera].rested, false)
  s = endTurn(endTurn(s))
  assert.equal(s.instances[galette].rested, false, 'only the next Refresh Phase')
  let t = game(5, 'ST02-001')
  const g2 = field(t, 'bob', 'OP03-107', true)
  t = startFrom(t, 'alice', 'P-057.main-lock', inHand(t, 'alice', 'P-057'))
  assert.equal(pendingChoice(t, 'alice'), undefined, 'Leader is not [Uta]')
  t = endTurn(t)
  assert.equal(t.instances[g2].rested, false)
})

test('M6 FAQ P-058: with an Uta Leader all FILM Characters become active at the end of the turn, including one played and rested later; its Trigger sets them active', () => {
  // FAQ ST24-005: "at the end of this turn" resolves after every [End of Your Turn] effect (Bartolomeo rests itself first).
  let o = game(7)
  const barto = field(o, 'alice', 'P-029'), rested = field(o, 'alice', 'P-061', true)
  o = startFrom(o, 'alice', 'P-058.main-delay', inHand(o, 'alice', 'P-058'))
  o = act(o, 'alice', { type: 'END_MAIN' })
  o = choose(o, 'alice', [barto])
  o = roundTrip(choose(o, 'alice', [rested]))
  assert.equal(o.instances[barto].rested, false, 'the delayed part sets the rested Bartolomeo active afterwards')
  assert.equal(o.instances[rested].rested, false)
  let s = game(7)
  const luffy = field(s, 'alice', 'P-061', true), bob = field(s, 'bob', 'OP03-106')
  s = roundTrip(startFrom(s, 'alice', 'P-058.main-delay', inHand(s, 'alice', 'P-058')))
  assert.equal(s.instances[luffy].rested, true, 'not before the end of the turn')
  const late = inHand(s, 'alice', 'ST16-005')
  s = playCard(s, 'alice', late)
  s = endTurn(s)
  assert.equal(s.instances[luffy].rested, false); assert.equal(s.instances[late].rested, false)
  void bob
  let t = game(5)
  const l2 = field(t, 'alice', 'P-061', true)
  t = startFrom(t, 'alice', 'P-058.main-delay', inHand(t, 'alice', 'P-058'))
  t = endTurn(endTurn(t))
  t.instances[l2].rested = true
  t = endTurn(t)
  assert.equal(t.instances[l2].rested, true, 'a P-058 from an earlier turn does nothing')
  let u = game(5, 'ST02-001')
  const l3 = field(u, 'alice', 'P-061', true)
  u = startFrom(u, 'alice', 'P-058.main-delay', inHand(u, 'alice', 'P-058'))
  u = endTurn(u)
  assert.equal(u.instances[l3].rested, true, 'Leader is not [Uta]')
  let v = endTurn(game(3))
  const l4 = field(v, 'alice', 'P-061', true)
  put(v, 'alice', 'P-058', 'life')
  v = lifeTrigger(v, 'alice')
  assert.equal(v.instances[l4].rested, false)
})

test('M6 ST-16 The World Continuation returns any number of own Characters to hand for +2000 per Character this battle', () => {
  let s = endTurn(game(7))
  const wc = put(s, 'alice', 'P-059', 'hand'), a = field(s, 'alice', 'P-061'), b = field(s, 'alice', 'ST16-005'), leader = leaderOf(s, 'alice')
  s = attack(s, field(s, 'bob', 'OP03-106'), leader)
  s = act(s, 'alice', { type: 'PASS_BLOCKER', battleId: s.battle!.id })
  const c = legal(s, 'alice').find(x => x.type === 'PLAY_COUNTER_EVENT') as { paymentDonIds: string[]; battleId: string }
  s = act(s, 'alice', { type: 'PLAY_COUNTER_EVENT', cardId: wc, targetId: null, paymentDonIds: c.paymentDonIds.slice(0, 2), donMinusIds: [], battleId: c.battleId })
  s = choose(s, 'alice', [a, b])
  s = roundTrip(choose(s, 'alice', [leader]))
  assert.equal(zoneOf(s, a), 'hand'); assert.equal(zoneOf(s, b), 'hand')
  assert.equal(s.battle!.counterModifiers.reduce((n, m) => n + m.amount, 0), 4000)
})

test('M6 FAQ P-060: Tot Musica rests an Uta Leader or Character to rest up to 2 opposing DON!! cards', () => {
  let s = game(5)
  const leader = leaderOf(s, 'alice'), dons = zones(s, 'bob').cost.filter(id => !s.instances[id].rested).slice(0, 2)
  s = startFrom(s, 'alice', 'P-060.main-rest-don', inHand(s, 'alice', 'P-060'))
  s = choose(s, 'alice', [leader])
  s = roundTrip(choose(s, 'alice', dons))
  assert.equal(s.instances[leader].rested, true); for (const d of dons) assert.equal(s.instances[d].rested, true)
  let t = game(5)
  const uta = field(t, 'alice', 'ST16-001')
  t = startFrom(t, 'alice', 'P-060.main-rest-don', inHand(t, 'alice', 'P-060'))
  assert.ok(optionIds(t, 'alice').includes(uta), 'an [Uta] Character too')
})

test('M6 ST-16 Uta trashes a FILM card to give a rested DON!! once per turn; Gordon trashes Music cards for +1000 each this battle on one card', () => {
  let s = game(5)
  const uta = field(s, 'alice', 'ST16-001'), leader = leaderOf(s, 'alice')
  s = playCard(s, 'alice', inHand(s, 'alice', 'P-029'))
  const filmCard = inHand(s, 'alice', 'ST16-005')
  s = startEffect(s, 'alice', 'ST16-001.activate-main-don')
  s = choose(s, 'alice', [filmCard])
  s = choose(s, 'alice', [leader])
  s = choose(s, 'alice', [zones(s, 'alice').cost.find(id => s.instances[id].rested)!])
  assert.equal(zones(s, 'alice').attached.filter(id => s.instances[id].attachedTo === leader).length, 1)
  assert.equal(offeredEffects(s, 'alice', 'ST16-001.activate-main-don').length, 0, 'once per turn')
  void uta
  let t = endTurn(game(5))
  const gordon = field(t, 'alice', 'ST16-002'), m1 = put(t, 'alice', 'P-057', 'hand'), m2 = put(t, 'alice', 'P-060', 'hand'), l = leaderOf(t, 'alice')
  t = attack(t, field(t, 'bob', 'OP03-106'), l)
  t = choose(t, 'alice', [m1, m2])
  t = roundTrip(choose(t, 'alice', [l]))
  assert.equal(zoneOf(t, m1), 'trash'); assert.equal(t.battle!.counterModifiers.reduce((n, m) => n + m.amount, 0), 2000)
  void gordon
})

test('M6 FAQ ST16-003: Katakuri with a FILM Leader gains +2000 with 6 or more rested cards, itself included; Luffy gains +1000 with a rested Uta', () => {
  let s = game(5)
  const kata = field(s, 'alice', 'ST16-003', true)
  for (const n of ['P-061', 'P-061', 'ST16-005']) field(s, 'alice', n, true)
  const rested = () => [...zones(s, 'alice').leader, ...zones(s, 'alice').characters, ...zones(s, 'alice').cost].filter(id => s.instances[id].rested).length
  assert.equal(rested(), 4); assert.equal(power(s, kata), 4000)
  assert.equal(definitionOf('P-029').cost, 2)
  s = playCard(s, 'alice', inHand(s, 'alice', 'P-029'))
  assert.equal(rested(), 6); assert.equal(power(s, kata), 6000)
  let t = game(5, 'ST02-001')
  const k2 = field(t, 'alice', 'ST16-003', true)
  for (const n of ['P-061', 'P-061', 'ST16-005', 'P-029']) field(t, 'alice', n, true)
  t = startFrom(t, 'alice', 'P-060.main-rest-don', inHand(t, 'alice', 'P-060'))
  assert.equal(power(t, k2), 4000, 'Leader without {FILM}')
  let u = game(5)
  const luffy = field(u, 'alice', 'ST16-005')
  assert.equal(power(u, luffy), 3000)
  u = finishBattle(attack(u, leaderOf(u, 'alice'), leaderOf(u, 'bob')))
  assert.equal(power(u, luffy), 4000, 'rested [Uta] Leader')
})

test('M6 ST-16 Shanks K.O.s up to 1 opposing rested Character on play; Monkey.D.Luffy P-061 is played for its printed cost and power', () => {
  let s = endTurn(game(9))
  const active = field(s, 'bob', 'OP03-106'), restedFoe = field(s, 'bob', 'OP03-107', true)
  s = endTurn(s)
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST16-004'))
  assert.ok(!optionIds(s, 'alice').includes(active))
  s = roundTrip(choose(s, 'alice', [restedFoe]))
  assert.equal(zoneOf(s, restedFoe), 'trash')
  let t = game(9)
  const luffy = inHand(t, 'alice', 'P-061')
  t = playCard(t, 'alice', luffy)
  assert.equal(power(t, luffy), definitionOf('P-061').power)
})

test('M6 ST-16 certificates validate against the current registry; all ST-16 cards are PLAYABLE_VERIFIED', async () => {
  const { ST16_CERTIFICATIONS, certificationErrors, effectiveStatus } = await import('../src/game/cards/certification')
  const { engineCatalog, currentEngineRegistry } = await import('../src/lib/engine/catalog')
  const { definitions } = engineCatalog(), registry = currentEngineRegistry()
  for (const c of ST16_CERTIFICATIONS) assert.deepEqual(certificationErrors(c, definitions.find(x => x.definitionId === c.definitionId), registry), [], c.definitionId)
  for (const n of ['ST11-001', ...ST16]) assert.equal(effectiveStatus(definitions.find(x => x.number === n)!), 'PLAYABLE_VERIFIED', n)
})
