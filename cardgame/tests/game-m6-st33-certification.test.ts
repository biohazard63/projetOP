import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateCharacteristics } from '../src/game/effects/characteristics'
import type { GameState } from '../src/game/core/types'
import { act, attack, attackerIds, choose, deckFor, definitionOf, endTurn, finishBattle, inHand, leaderOf, legal, newGame, offeredEffects, optionIds, pendingChoice, playCard, put, roundTrip, startEffect, toMain, zoneOf } from './helpers/m6'

// M6 ST-33 (BLUE Kuzan), official English texts (series 569033). Scenarios follow the official text, the ST-33 and OP-12 FAQ and
// the errata snapshot (docs/game/evidence/m6/sources/), through public commands only.
const ST33 = ['ST33-001', 'ST33-002', 'ST33-003', 'ST33-004', 'ST33-005', 'EB04-026', 'OP12-043', 'OP12-045', 'OP12-046', 'OP12-047', 'OP12-050', 'OP12-052', 'EB04-028', 'OP12-057']
const BOB = ['OP03-106', 'OP03-107', 'OP03-115', 'ST20-005']
const game = (turn = 5, leader = 'OP12-040') => toMain(newGame(deckFor(leader, ST33), deckFor('OP03-099', BOB)), turn)
const zones = (s: GameState, owner: string) => s.players.find(p => p.id === owner)!.zones
const power = (s: GameState, id: string) => evaluateCharacteristics(s, id).power.current
const cost = (s: GameState, id: string) => evaluateCharacteristics(s, id).cost.current
const field = (s: GameState, owner: string, number: string, rested = false) => put(s, owner, number, 'characters', { playedEarlier: true, rested })
const hand = (s: GameState, owner = 'alice') => zones(s, owner).hand.length
const pick = (s: GameState, owner: string, indexes: number[]) => { const c = pendingChoice(s, owner)!; return act(s, owner, { type: 'ANSWER_CHOICE', choiceId: c.choiceId, tokens: indexes.map(i => c.options[i].token) }) }
const startFrom = (s: GameState, owner: string, abilityId: string, sourceId: string) => {
  const a = offeredEffects(s, owner, abilityId).find(x => x.effectId.includes(sourceId))
  assert.ok(a, `${abilityId} from ${sourceId} not offered`)
  return act(s, owner, { type: 'START_EFFECT', effectId: a!.effectId })
}
/** Discards `n` hand cards other than `keep` for a pending hand choice. */
const discard = (s: GameState, owner: string, n: number, keep: string[] = []) => choose(s, owner, optionIds(s, owner).filter(id => !keep.includes(id)).slice(0, n))
const lifeTrigger = (s: GameState, defender: string) => {
  s = attack(s, field(s, s.activePlayerId!, 'OP03-106'), leaderOf(s, defender))
  s = act(s, defender, { type: 'PASS_BLOCKER', battleId: s.battle!.id }); s = act(s, defender, { type: 'PASS_COUNTER', battleId: s.battle!.id })
  s = act(s, s.activePlayerId!, { type: 'RESOLVE_BATTLE', battleId: s.battle!.id })
  return act(s, defender, { type: 'ANSWER_TRIGGER', choiceId: (legal(s, defender).find(a => a.type === 'ANSWER_TRIGGER') as { choiceId: string }).choiceId, activate: true })
}

test('M6 FAQ OP12-040: Leader Kuzan draws as many cards as were trashed from hand by a Navy card effect; not for an opponent effect', () => {
  let s = game(5)
  const koby = inHand(s, 'alice', 'ST33-001'), h0 = hand(s)
  s = playCard(s, 'alice', koby)
  s = roundTrip(discard(s, 'alice', 1))
  assert.equal(hand(s), h0 - 1 - 1 + 1 + 1, 'Koby: -1 trashed, +1 Koby draw, +1 Leader draw')
  let t = game(7)
  const zephyr = inHand(t, 'alice', 'OP12-046'), h1 = hand(t)
  t = playCard(t, 'alice', zephyr)
  t = discard(t, 'alice', 2)
  assert.equal(hand(t), h1 - 1 - 2 + 2, 'Zephyr trashes 2: the Leader draws 2')
  let u = endTurn(game(7))
  const linlin = inHand(u, 'bob', 'ST20-005'), h2 = hand(u)
  u = playCard(u, 'bob', linlin)
  u = discard(u, 'bob', 1)
  u = pick(u, 'alice', [0])
  u = discard(u, 'alice', 2)
  assert.equal(hand(u), h2 - 2, 'trashed by the opponent effect: no draw')
})

test('M6 FAQ ST33-004: Borsalino costs 3 less in hand during a turn in which a hand card was trashed by an effect, also an opponent effect; it has [Blocker]', () => {
  let s = game(5)
  const bors = put(s, 'alice', 'ST33-004', 'hand')
  assert.equal(cost(s, bors), 6)
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST33-001'))
  s = discard(s, 'alice', 1, [bors])
  assert.equal(cost(s, bors), 3)
  s = endTurn(s)
  assert.equal(cost(s, bors), 6, 'another turn')
  const linlin = inHand(s, 'bob', 'ST20-005')
  s = playCard(s, 'bob', linlin)
  s = discard(s, 'bob', 1)
  s = pick(s, 'alice', [0])
  s = discard(s, 'alice', 2, [bors])
  assert.equal(cost(s, bors), 3, 'FAQ ST33-004: by an opponent effect')
  let t = game(9)
  const b2 = field(t, 'alice', 'ST33-004')
  t = endTurn(t)
  t = attack(t, field(t, 'bob', 'OP03-106'), leaderOf(t, 'alice'))
  assert.ok((legal(t, 'alice').find(x => x.type === 'ACTIVATE_BLOCKER') as { blockerIds: string[] }).blockerIds.includes(b2))
})

test('M6 ST-33 Bluegrass bottoms an opposing cost 1 or less on play and draws then trashes when attacking; Smoker trashes 1 to bottom up to 2 cost 2 or less', () => {
  let s = endTurn(game(7))
  const small = field(s, 'bob', 'OP03-115')
  s = endTurn(s)
  const blue = inHand(s, 'alice', 'EB04-026')
  s = playCard(s, 'alice', blue)
  s = roundTrip(choose(s, 'alice', [small]))
  assert.equal(zones(s, 'bob').deck.at(-1), small)
  let t = game(7)
  const b2 = field(t, 'alice', 'EB04-026'), h = hand(t)
  t = attack(t, b2, leaderOf(t, 'bob'))
  t = discard(t, 'alice', 1)
  assert.equal(hand(t), h + 1 - 1 + 1, 'draw 1, trash 1, Leader draws 1')
  let u = endTurn(game(7))
  const f1 = field(u, 'bob', 'OP03-115'), f2 = field(u, 'bob', 'OP03-107')
  assert.ok(definitionOf('OP03-107').cost! <= 2)
  u = endTurn(u)
  u = playCard(u, 'alice', inHand(u, 'alice', 'ST33-003'))
  u = discard(u, 'alice', 1)
  u = roundTrip(choose(u, 'alice', [f1, f2]))
  assert.equal(zoneOf(u, f1), 'deck'); assert.equal(zoneOf(u, f2), 'deck')
})

test('M6 ST-33 Ice Time trashes 1 so that up to 2 opposing Characters of 10000 power or less cannot attack through the next opposing turn with a Navy Leader; its Trigger returns a cost 5 or less', () => {
  let s = endTurn(game(7))
  const f1 = field(s, 'bob', 'OP03-106'), f2 = field(s, 'bob', 'OP03-107')
  s = endTurn(s)
  s = startFrom(s, 'alice', 'EB04-028.main-prevent', inHand(s, 'alice', 'EB04-028'))
  s = discard(s, 'alice', 1)
  s = roundTrip(choose(s, 'alice', [f1, f2]))
  s = endTurn(s)
  assert.ok(!attackerIds(s, 'bob').includes(f1)); assert.ok(!attackerIds(s, 'bob').includes(f2))
  s = endTurn(endTurn(s))
  assert.ok(attackerIds(s, 'bob').includes(f1), 'expired')
  let t = endTurn(game(3))
  const foe = field(t, 'bob', 'OP03-107')
  put(t, 'alice', 'EB04-028', 'life')
  t = lifeTrigger(t, 'alice')
  t = choose(t, 'alice', [foe])
  assert.equal(zoneOf(t, foe), 'hand')
})

test('M6 ST-33 Kuzan has +1 cost with 5 or more hand cards and trashes 1 on play so an opposing Character cannot attack through the next opposing turn', () => {
  let s = endTurn(game(7))
  const foe = field(s, 'bob', 'OP03-106')
  s = endTurn(s)
  const kuzan = field(s, 'alice', 'OP12-043')
  assert.ok(hand(s) >= 5); assert.equal(cost(s, kuzan), 7)
  const k2 = inHand(s, 'alice', 'OP12-043')
  s = playCard(s, 'alice', k2)
  s = discard(s, 'alice', 1)
  s = roundTrip(choose(s, 'alice', [foe]))
  s = endTurn(s)
  assert.ok(!attackerIds(s, 'bob').includes(foe))
})

test('M6 FAQ OP12-046: Zephyr trashes 2 cards on play, the only remaining card if just one; it trashes itself to return a Character cost 5 or less', () => {
  let s = game(7)
  const p = zones(s, 'alice'), zephyr = inHand(s, 'alice', 'OP12-046'), keep = p.hand.find(id => id !== zephyr)!
  for (const id of p.hand.filter(id => id !== zephyr && id !== keep)) { p.hand.splice(p.hand.indexOf(id), 1); p.deck.push(id); s.instances[id].zone = 'deck'; s.instances[id].zoneGeneration++ }
  s = playCard(s, 'alice', zephyr)
  assert.equal(pendingChoice(s, 'alice')!.min, 1, 'only 1 card left: it is trashed')
  s = choose(s, 'alice', [keep])
  assert.equal(zoneOf(s, keep), 'trash')
  let t = endTurn(game(7))
  const foe = field(t, 'bob', 'OP03-106')
  t = endTurn(t)
  const z2 = field(t, 'alice', 'OP12-046')
  t = startEffect(t, 'alice', 'OP12-046.activate-main-bounce')
  t = choose(t, 'alice', [z2])
  t = roundTrip(choose(t, 'alice', [foe]))
  assert.equal(zoneOf(t, z2), 'trash'); assert.equal(zoneOf(t, foe), 'hand')
})

test('M6 ST-33 Sengoku trashes 1 to look at 5 for up to 2 Navy cards other than Sengoku; Koby has [Blocker] and trashes 1 to draw 1', () => {
  let s = game(5)
  const a = put(s, 'alice', 'OP12-045', 'deckTop'), b = put(s, 'alice', 'ST33-001', 'deckTop'), seng = put(s, 'alice', 'OP12-047', 'deckTop')
  s = playCard(s, 'alice', inHand(s, 'alice', 'OP12-047', [seng]))
  s = discard(s, 'alice', 1)
  assert.ok(!optionIds(s, 'alice').includes(seng), 'other than [Sengoku]')
  s = choose(s, 'alice', [a, b])
  while (pendingChoice(s, 'alice')) s = pick(s, 'alice', pendingChoice(s, 'alice')!.options.map((_, i) => i))
  assert.equal(zoneOf(s, a), 'hand'); assert.equal(zoneOf(s, b), 'hand')
  let t = game(5, 'ST03-001')
  const h = hand(t)
  t = playCard(t, 'alice', inHand(t, 'alice', 'ST33-001'))
  t = discard(t, 'alice', 1)
  assert.equal(hand(t), h - 1 - 1 + 1, 'non-Navy Leader: Koby draw only')
  t = endTurn(t)
  t = attack(t, field(t, 'bob', 'OP03-106'), leaderOf(t, 'alice'))
  assert.ok((legal(t, 'alice').find(x => x.type === 'ACTIVATE_BLOCKER') as { blockerIds: string[] }).blockerIds.length >= 1)
})

test('M6 FAQ ST33-002: Sakazuki trashes 1 when attacking so a 6 or more card opponent trashes 1; with 5 or less nothing; on K.O. plays a Navy cost 4 or less', () => {
  let s = game(7)
  const saka = field(s, 'alice', 'ST33-002')
  for (const n of ['OP03-106', 'OP03-107', 'OP03-115']) put(s, 'bob', n, 'hand')
  const bh = hand(s, 'bob')
  assert.ok(bh >= 6)
  s = attack(s, saka, leaderOf(s, 'bob'))
  s = discard(s, 'alice', 1)
  s = roundTrip(discard(s, 'bob', 1))
  assert.equal(hand(s, 'bob'), bh - 1)
  let t = game(5)
  const s2 = field(t, 'alice', 'ST33-002')
  while (hand(t, 'bob') > 5) { const id = zones(t, 'bob').hand[0]; const p = zones(t, 'bob'); p.hand.splice(0, 1); p.deck.push(id); t.instances[id].zone = 'deck'; t.instances[id].zoneGeneration++ }
  t = attack(t, s2, leaderOf(t, 'bob'))
  t = discard(t, 'alice', 1)
  assert.equal(pendingChoice(t, 'bob'), undefined, '5 or less: no opponent trash')
  let u = endTurn(game(7, 'ST03-001'))
  const s3 = field(u, 'alice', 'ST33-002', true), smoker = put(u, 'alice', 'ST33-003', 'hand')
  const big = field(u, 'bob', 'OP03-106')
  u = finishBattle(attack(u, big, s3))
  u = roundTrip(choose(u, 'alice', [smoker]))
  assert.equal(zoneOf(u, smoker), 'characters')
})

test('M6 FAQ OP12-057: Ice Block Pheasant Peck gives +4000 this battle then trashes 1 card, also as the only card in hand; its Trigger trashes 1 to draw 1', () => {
  let s = endTurn(game(7, 'ST03-001'))
  const peck = put(s, 'alice', 'OP12-057', 'hand'), l = leaderOf(s, 'alice'), h = hand(s)
  s = attack(s, field(s, 'bob', 'OP03-106'), l)
  s = act(s, 'alice', { type: 'PASS_BLOCKER', battleId: s.battle!.id })
  const c = legal(s, 'alice').find(x => x.type === 'PLAY_COUNTER_EVENT') as { paymentDonIds: string[]; battleId: string }
  s = act(s, 'alice', { type: 'PLAY_COUNTER_EVENT', cardId: peck, targetId: null, paymentDonIds: c.paymentDonIds.slice(0, 1), donMinusIds: [], battleId: c.battleId })
  s = choose(s, 'alice', [l])
  s = roundTrip(discard(s, 'alice', 1))
  assert.equal(s.battle!.counterModifiers.reduce((n, m) => n + m.amount, 0), 4000); assert.equal(hand(s), h - 2)
  let t = endTurn(game(3, 'ST03-001'))
  put(t, 'alice', 'OP12-057', 'life')
  t = lifeTrigger(t, 'alice')
  const h2 = hand(t)
  t = discard(t, 'alice', 1)
  assert.equal(hand(t), h2 - 1 + 1)
})

test('M6 ST-33 Garp with a Navy Leader plays a blue Navy Character of 8000 power or less other than Garp; Jango and Fullbody (no ability) and Jaguar.D.Saul ([Blocker]) keep their printed values', () => {
  let s = game(9)
  const kuzan = put(s, 'alice', 'OP12-043', 'hand'), garp2 = put(s, 'alice', 'ST33-005', 'hand')
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST33-005', [garp2]))
  assert.ok(!optionIds(s, 'alice').includes(garp2), 'other than [Monkey.D.Garp]')
  s = roundTrip(choose(s, 'alice', [kuzan]))
  assert.equal(zoneOf(s, kuzan), 'characters')
  let t = game(9, 'ST03-001')
  t = playCard(t, 'alice', inHand(t, 'alice', 'ST33-005'))
  assert.equal(pendingChoice(t, 'alice'), undefined, 'Leader without {Navy}')
  let u = game(9)
  const jango = field(u, 'alice', 'OP12-045'), full = field(u, 'alice', 'OP12-052'), saul = field(u, 'alice', 'OP12-050')
  assert.equal(power(u, jango), 8000); assert.equal(power(u, full), 6000)
  u = endTurn(u)
  u = attack(u, field(u, 'bob', 'OP03-106'), leaderOf(u, 'alice'))
  assert.ok((legal(u, 'alice').find(x => x.type === 'ACTIVATE_BLOCKER') as { blockerIds: string[] }).blockerIds.includes(saul))
})

test('M6 ST-33 certificates validate against the current registry; all ST-33 cards are PLAYABLE_VERIFIED', async () => {
  const { ST33_CERTIFICATIONS, certificationErrors, effectiveStatus } = await import('../src/game/cards/certification')
  const { engineCatalog, currentEngineRegistry } = await import('../src/lib/engine/catalog')
  const { definitions } = engineCatalog(), registry = currentEngineRegistry()
  for (const c of ST33_CERTIFICATIONS) assert.deepEqual(certificationErrors(c, definitions.find(x => x.definitionId === c.definitionId), registry), [], c.definitionId)
  for (const n of ['OP12-040', ...ST33]) assert.equal(effectiveStatus(definitions.find(x => x.number === n)!), 'PLAYABLE_VERIFIED', n)
})
