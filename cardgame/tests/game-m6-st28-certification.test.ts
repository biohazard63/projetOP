import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateCharacteristics, hasBlockerAbility, hasCombatKeyword } from '../src/game/effects/characteristics'
import type { GameState } from '../src/game/core/types'
import { act, attachDon, attack, attackerIds, choose, deckFor, definitionOf, endTurn, finishBattle, inHand, leaderOf, legal, newGame, offeredEffects, optionIds, pendingChoice, playCard, put, roundTrip, startEffect, toMain, zoneOf } from './helpers/m6'

// M6 ST-28 (GREEN/YELLOW Yamato), official English texts (series 569028). Scenarios follow the official text, the ST-23-28,
// ST-13 and OP-06 FAQ and the errata snapshot (docs/game/evidence/m6/sources/), through public commands only.
const ST28 = ['ST28-001', 'ST28-002', 'ST28-003', 'ST28-004', 'ST28-005', 'OP06-100', 'OP06-103', 'OP06-104', 'OP06-109', 'OP06-110', 'OP06-112', 'OP09-035', 'ST13-016', 'OP07-116']
const game = (turn = 5) => toMain(newGame(deckFor('OP06-022', ST28), deckFor('OP06-022', ST28)), turn)
const zones = (s: GameState, owner: string) => s.players.find(p => p.id === owner)!.zones
const power = (s: GameState, id: string) => evaluateCharacteristics(s, id).power.current
const field = (s: GameState, owner: string, number: string, rested = false) => put(s, owner, number, 'characters', { playedEarlier: true, rested })
const pick = (s: GameState, owner: string, indexes: number[]) => { const c = pendingChoice(s, owner)!; return act(s, owner, { type: 'ANSWER_CHOICE', choiceId: c.choiceId, tokens: indexes.map(i => c.options[i].token) }) }
/** START_EFFECT of `abilityId` from the given source instance (effect ids are scoped to the source instance). */
const startFrom = (s: GameState, owner: string, abilityId: string, sourceId: string) => {
  const a = offeredEffects(s, owner, abilityId).find(x => x.effectId.includes(sourceId))
  assert.ok(a, `${abilityId} from ${sourceId} not offered`)
  return act(s, owner, { type: 'START_EFFECT', effectId: a!.effectId })
}
const handIds = (s: GameState, owner: string, n: number, exclude: string[] = []) => zones(s, owner).hand.filter(id => !exclude.includes(id)).slice(0, n)
/** The active player attacks the opposing Leader `n` times with fresh 5000 Characters (no block, no counter, Triggers declined). */
const hit = (s: GameState, n: number) => {
  const me = s.activePlayerId!, foe = s.players.find(p => p.id !== me)!.id
  for (let i = 0; i < n; i++) s = finishBattle(attack(s, field(s, me, 'ST28-003'), leaderOf(s, foe)))
  return s
}
const lifeTrigger = (s: GameState, defender: string) => {
  s = attack(s, field(s, s.activePlayerId!, 'ST28-003'), leaderOf(s, defender))
  s = act(s, defender, { type: 'PASS_BLOCKER', battleId: s.battle!.id }); s = act(s, defender, { type: 'PASS_COUNTER', battleId: s.battle!.id })
  s = act(s, s.activePlayerId!, { type: 'RESOLVE_BATTLE', battleId: s.battle!.id })
  const t = legal(s, defender).find(a => a.type === 'ANSWER_TRIGGER') as { choiceId: string } | undefined
  assert.ok(t, 'Trigger offered')
  return act(s, defender, { type: 'ANSWER_TRIGGER', choiceId: t!.choiceId, activate: true })
}

test('M6 ST-28 Leader Yamato has [Double Attack] and, with 3 or less opposing Life, gives up to 2 rested DON!! to 1 Character once per turn', () => {
  let s = game(5)
  const leader = leaderOf(s, 'alice'), life = zones(s, 'bob').life.length
  s = finishBattle(attack(s, leader, leaderOf(s, 'bob')))
  assert.equal(zones(s, 'bob').life.length, life - 2, '[Double Attack] deals 2 damage')
  assert.equal(offeredEffects(s, 'alice', 'OP06-022.activate-main-don').length, 1, '3 opposing Life')
  const target = field(s, 'alice', 'ST28-003')
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST28-002'))
  s = choose(startEffect(s, 'alice', 'OP06-022.activate-main-don'), 'alice', [target])
  const rested = zones(s, 'alice').cost.filter(id => s.instances[id].rested).slice(0, 2)
  s = roundTrip(choose(s, 'alice', rested))
  assert.equal(zones(s, 'alice').attached.filter(id => s.instances[id].attachedTo === target).length, 2)
  assert.equal(offeredEffects(s, 'alice', 'OP06-022.activate-main-don').length, 0, 'once per turn')
  const t = game(5)
  assert.equal(offeredEffects(t, 'alice', 'OP06-022.activate-main-don').length, 0, '5 opposing Life: not activatable')
})

test('M6 ST-28 Ashura Doji with a Land of Wano Leader and 3 or more opposing Life K.O.s a base cost 5 or less Character, whatever its current cost', () => {
  let s = game(7)
  const big = field(s, 'bob', 'OP06-109'), costly = field(s, 'bob', 'ST28-004')
  ;(s.effects!.costModifiers ??= []).push({ id: `${s.gameId}:fx:fixture-cost`, subject: { instanceId: costly, generation: s.instances[costly].zoneGeneration }, amount: -2, turnId: s.turn })
  assert.equal(evaluateCharacteristics(s, costly).cost.current, 4, 'scenario: current cost 4, base cost 6')
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST28-001'))
  assert.ok(optionIds(s, 'alice').includes(big), 'base cost 5'); assert.ok(!optionIds(s, 'alice').includes(costly), 'base cost 6 even at current cost 4')
  s = choose(s, 'alice', [big])
  assert.equal(zoneOf(s, big), 'trash')
  let t = hit(game(5), 3)
  field(t, 'bob', 'OP06-109')
  t = playCard(t, 'alice', inHand(t, 'alice', 'ST28-001'))
  assert.equal(pendingChoice(t, 'alice'), undefined, '2 opposing Life: nothing')
})

test('M6 ST-28 Izo gains [Blocker] with 2 DON!! and on play gives its Land of Wano Leader [Banish] this turn', () => {
  let s = game(5)
  const izo = inHand(s, 'alice', 'ST28-002'), leader = leaderOf(s, 'alice')
  s = playCard(s, 'alice', izo)
  assert.equal(hasCombatKeyword(s, leader, 'BANISH'), true)
  assert.equal(hasBlockerAbility(s, izo), false, 'no DON!!: no [Blocker]')
  attachDon(s, 'alice', izo, 2)
  assert.equal(hasBlockerAbility(s, izo), true)
  s = endTurn(s)
  assert.equal(hasCombatKeyword(s, leader, 'BANISH'), false, 'this turn only')
})

test('M6 ST-28 the Akazaya Kinemon, Inuarashi and others are played from the Trigger only while the opponent has 3 or less Life', () => {
  let s = game(5)
  s = hit(s, 2)
  const kin = put(s, 'alice', 'ST28-003', 'life')
  s = endTurn(s)
  s = lifeTrigger(s, 'alice')
  assert.equal(zoneOf(s, kin), 'characters', 'bob has 3 Life')
  let t = game(5)
  const k2 = put(t, 'alice', 'OP06-104', 'life')
  t = endTurn(t)
  t = lifeTrigger(t, 'alice')
  assert.equal(zoneOf(t, k2), 'trash', 'bob has 5 Life: trashed, not played')
})

test('M6 FAQ ST28-004: Momonosuke returns 2 given DON!! (from different cards) rested to gain [Rush] and +1000; with 2 or less Life it gives the Leader +1000 on your turn', () => {
  let s = game(7)
  const momo = inHand(s, 'alice', 'ST28-004'), leader = leaderOf(s, 'alice'), other = field(s, 'alice', 'ST28-003')
  s = playCard(s, 'alice', momo)
  attachDon(s, 'alice', leader, 1); attachDon(s, 'alice', other, 1)
  assert.ok(!attackerIds(s, 'alice').includes(momo))
  s = startEffect(s, 'alice', 'ST28-004.activate-main-rush')
  s = roundTrip(choose(s, 'alice', [...zones(s, 'alice').attached]))
  assert.equal(zones(s, 'alice').attached.length, 0)
  assert.ok(attackerIds(s, 'alice').includes(momo), '[Rush] this turn')
  assert.equal(power(s, momo), 8000)
  assert.equal(offeredEffects(s, 'alice', 'ST28-004.activate-main-rush').length, 0, 'once per turn')
  let t = endTurn(game(5))
  t = hit(t, 2)
  t = endTurn(t)
  const l2 = leaderOf(t, 'alice')
  field(t, 'alice', 'ST28-004')
  assert.equal(zones(t, 'alice').life.length, 2)
  assert.equal(power(t, l2), 6000, 'your turn, 2 Life: +1000')
  t = endTurn(t)
  assert.equal(power(t, l2), 5000, 'opponent turn: no bonus')
})

test('M6 ST-28 Yamato searches 5 for a Land of Wano card with a cost of 2 or more and gains +3000 on your turn with 2 DON!!', () => {
  let s = game(5)
  const cheap = put(s, 'alice', 'OP09-035', 'deckTop'), wano = put(s, 'alice', 'ST28-001', 'deckTop')
  const yamato = inHand(s, 'alice', 'ST28-005')
  s = playCard(s, 'alice', yamato)
  assert.ok(optionIds(s, 'alice').includes(wano)); assert.ok(!optionIds(s, 'alice').includes(cheap), 'OP09-035 is not {Land of Wano}')
  s = choose(s, 'alice', [wano])
  assert.equal(zoneOf(s, wano), 'hand')
  s = choose(s, 'alice', pendingChoice(s, 'alice')!.options.map(o => ('instanceId' in o ? o.instanceId! : '')))
  attachDon(s, 'alice', yamato, 2)
  assert.equal(power(s, yamato), 0 + 2000 + 3000)
  s = endTurn(s)
  assert.equal(power(s, yamato), 0, 'opponent turn')
})

test('M6 ST-28 Inuarashi with 2 DON!! trashes 1 card to K.O. a Character whose cost is at most the opposing Life count', () => {
  let s = hit(game(5), 2)
  const inu = field(s, 'alice', 'OP06-100'), low = field(s, 'bob', 'ST28-002'), high = field(s, 'bob', 'ST28-004')
  attachDon(s, 'alice', inu, 2)
  s = attack(s, inu, leaderOf(s, 'bob'))
  const card = handIds(s, 'alice', 1)
  s = choose(s, 'alice', card)
  assert.equal(zoneOf(s, card[0]), 'trash')
  assert.equal(zones(s, 'bob').life.length, 2, 'Leader Life 4, 2 damage')
  assert.ok(!optionIds(s, 'alice').includes(high), 'cost 6 > 2 Life')
  s = choose(s, 'alice', [low])
  assert.equal(zoneOf(s, low), 'trash', 'cost 2 <= 2 Life')
})

test('M6 FAQ OP06-103: Kawamatsu trashes 2 cards to add a 0 power Character face-up to the top or bottom of its owner Life', () => {
  let s = game(7)
  const kawa = field(s, 'alice', 'OP06-103'), zero = field(s, 'alice', 'ST28-005'), strong = field(s, 'alice', 'ST28-003')
  s = attack(s, kawa, leaderOf(s, 'bob'))
  s = choose(s, 'alice', handIds(s, 'alice', 2))
  assert.ok(optionIds(s, 'alice').includes(zero)); assert.ok(!optionIds(s, 'alice').includes(strong), '5000 power')
  s = choose(s, 'alice', [zero])
  s = roundTrip(pick(s, 'alice', [1]))
  assert.equal(zones(s, 'alice').life.at(-1), zero, 'bottom'); assert.equal(s.instances[zero].faceUp, true, 'face-up')
  let t = game(7)
  const k2 = field(t, 'alice', 'OP06-103'); field(t, 'alice', 'ST28-005')
  t = choose(attack(t, k2, leaderOf(t, 'bob')), 'alice', [])
  assert.equal(pendingChoice(t, 'alice'), undefined, 'cost declined: nothing')
})

test('M6 ST-28 Kikunojo, when K.O.d with 3 or less opposing Life, adds the top deck card to the top of its Life', () => {
  let s = hit(game(5), 2)
  const kiku = field(s, 'alice', 'OP06-104', true), life = zones(s, 'alice').life.length
  s = endTurn(s)
  s = finishBattle(attack(s, field(s, 'bob', 'ST28-004'), kiku))
  assert.equal(zoneOf(s, kiku), 'trash')
  const top = zones(s, 'alice').deck[0]
  s = pick(s, 'alice', [0])
  assert.equal(zones(s, 'alice').life.length, life + 1); assert.equal(zones(s, 'alice').life[0], top)
})

test('M6 ST-28 Denjiro with 2 DON!! and 3 or less opposing Life cannot be K.O.d by effects', () => {
  let s = hit(game(5), 2)
  const den = field(s, 'alice', 'OP06-109')
  attachDon(s, 'alice', den, 2)
  s = endTurn(s)
  s = playCard(s, 'bob', inHand(s, 'bob', 'ST28-001'))
  s = choose(s, 'bob', [den])
  assert.equal(zoneOf(s, den), 'characters', 'not K.O.d by the effect')
})

test('M6 ST-28 Nekomamushi with 2 DON!! can also attack an active opposing Character', () => {
  let s = game(5)
  const neko = field(s, 'alice', 'OP06-110'), active = field(s, 'bob', 'ST28-003')
  const targets = (st: GameState) => (legal(st, 'alice').find(a => a.type === 'DECLARE_ATTACK') as { targetIdsByAttacker: Record<string, string[]> }).targetIdsByAttacker[neko]
  assert.ok(!targets(s).includes(active))
  attachDon(s, 'alice', neko, 2)
  assert.ok(targets(s).includes(active))
  s = attack(s, neko, active)
  assert.equal(s.battle?.target.instanceId, active)
})

test('M6 ST-28 Raizo trashes 1 card when attacking to rest up to 1 opposing DON!!; Portgas.D.Ace rests a cost 5 or less with 2 rested Characters', () => {
  let s = game(5)
  const raizo = field(s, 'alice', 'OP06-112')
  s = attack(s, raizo, leaderOf(s, 'bob'))
  s = choose(s, 'alice', handIds(s, 'alice', 1))
  const don = zones(s, 'bob').cost.find(id => !s.instances[id].rested)!
  s = choose(s, 'alice', [don])
  assert.equal(s.instances[don].rested, true)
  let t = game(7)
  field(t, 'alice', 'ST28-003', true); field(t, 'alice', 'ST28-003', true)
  const foe = field(t, 'bob', 'OP09-035')
  t = choose(playCard(t, 'alice', inHand(t, 'alice', 'OP09-035')), 'alice', [foe])
  assert.equal(t.instances[foe].rested, true)
  let u = game(7)
  field(u, 'alice', 'ST28-003', true); field(u, 'bob', 'OP09-035')
  u = playCard(u, 'alice', inHand(u, 'alice', 'OP09-035'))
  assert.equal(pendingChoice(u, 'alice'), undefined, '1 rested Character: nothing')
})

test('M6 FAQ ST13-016: Yamato has [Rush]; on play it places 1 Life card on top of the deck and puts the rest back in any order', () => {
  let s = game(7)
  const life = [...zones(s, 'alice').life], yamato = inHand(s, 'alice', 'ST13-016')
  s = playCard(s, 'alice', yamato)
  assert.deepEqual([...optionIds(s, 'alice')].sort(), [...life].sort(), 'all Life cards are looked at')
  s = choose(s, 'alice', [life[2]])
  assert.equal(zones(s, 'alice').deck[0], life[2]); assert.equal(s.instances[life[2]].faceUp, false)
  const rest = life.filter(id => id !== life[2]), order = [...rest].reverse()
  s = roundTrip(choose(s, 'alice', order))
  assert.deepEqual(zones(s, 'alice').life, order)
  assert.ok(attackerIds(s, 'alice').includes(yamato), '[Rush]')
})

test('M6 ST-28 Blaze Slice gives +1000 as Main or Counter, rests a cost 4 or less with 2 or less opposing Life; its Trigger rests one', () => {
  let s = hit(game(5), 3)
  const slice = put(s, 'alice', 'OP07-116', 'hand'), foe = field(s, 'bob', 'ST28-003'), leader = leaderOf(s, 'alice')
  s = choose(startFrom(s, 'alice', 'OP07-116.main-power-rest', slice), 'alice', [leader])
  assert.equal(power(s, leader), 6000)
  s = choose(s, 'alice', [foe])
  assert.equal(s.instances[foe].rested, true); assert.equal(zoneOf(s, slice), 'trash')
  let t = endTurn(game(5))
  const c2 = put(t, 'alice', 'OP07-116', 'hand')
  t = attack(t, field(t, 'bob', 'ST28-003'), leaderOf(t, 'alice'))
  t = act(t, 'alice', { type: 'PASS_BLOCKER', battleId: t.battle!.id })
  const a = legal(t, 'alice').find(x => x.type === 'PLAY_COUNTER_EVENT') as { paymentDonIds: string[]; battleId: string }
  t = act(t, 'alice', { type: 'PLAY_COUNTER_EVENT', cardId: c2, targetId: null, paymentDonIds: a.paymentDonIds.slice(0, 1), donMinusIds: [], battleId: a.battleId })
  t = choose(t, 'alice', [leaderOf(t, 'alice')])
  assert.equal(pendingChoice(t, 'alice'), undefined, '5 opposing Life: no rest')
  let u = game(3)
  put(u, 'alice', 'OP07-116', 'life')
  u = endTurn(u)
  const f3 = field(u, 'bob', 'ST28-003')
  u = choose(lifeTrigger(u, 'alice'), 'alice', [f3])
  assert.equal(u.instances[f3].rested, true)
  void definitionOf
})

test('M6 ST-28 certificates validate against the current registry; all ST-28 cards are PLAYABLE_VERIFIED', async () => {
  const { ST28_CERTIFICATIONS, certificationErrors, effectiveStatus } = await import('../src/game/cards/certification')
  const { engineCatalog, currentEngineRegistry } = await import('../src/lib/engine/catalog')
  const { definitions } = engineCatalog(), registry = currentEngineRegistry()
  for (const c of ST28_CERTIFICATIONS) assert.deepEqual(certificationErrors(c, definitions.find(x => x.definitionId === c.definitionId), registry), [], c.definitionId)
  for (const n of ['OP06-022', ...ST28]) assert.equal(effectiveStatus(definitions.find(x => x.number === n)!), 'PLAYABLE_VERIFIED', n)
})
