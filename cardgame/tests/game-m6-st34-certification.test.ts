import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateCharacteristics } from '../src/game/effects/characteristics'
import type { GameState } from '../src/game/core/types'
import { act, attachDon, attack, choose, deckFor, definitionOf, endTurn, finishBattle, inHand, leaderOf, legal, newGame, offeredEffects, optionIds, pendingChoice, playCard, put, roundTrip, startEffect, toMain, zoneOf } from './helpers/m6'

// M6 ST-34 (PURPLE Charlotte Katakuri), official English texts (series 569034). Scenarios follow the official text, the ST-34
// and OP-11 FAQ and the errata snapshot (docs/game/evidence/m6/sources/), through public commands only.
const ST34 = ['ST34-001', 'ST34-002', 'ST34-003', 'ST34-004', 'ST34-005', 'EB03-032', 'EB03-035', 'OP11-065', 'OP11-066', 'OP11-068', 'OP11-071', 'P-090', 'OP11-079', 'OP11-081']
const BOB = ['OP03-106', 'OP03-107', 'OP03-115', 'OP03-110']
const game = (turn = 5, leader = 'OP11-062') => toMain(newGame(deckFor(leader, ST34), deckFor('OP03-099', BOB)), turn)
const zones = (s: GameState, owner: string) => s.players.find(p => p.id === owner)!.zones
const power = (s: GameState, id: string) => evaluateCharacteristics(s, id).power.current
const field = (s: GameState, owner: string, number: string, rested = false) => put(s, owner, number, 'characters', { playedEarlier: true, rested })
const fieldDon = (s: GameState, owner: string) => zones(s, owner).cost.length + zones(s, owner).attached.length
const pick = (s: GameState, owner: string, indexes: number[]) => { const c = pendingChoice(s, owner)!; return act(s, owner, { type: 'ANSWER_CHOICE', choiceId: c.choiceId, tokens: indexes.map(i => c.options[i].token) }) }
const payDon = (s: GameState, owner: string, n: number) => choose(s, owner, optionIds(s, owner).slice(0, n))
const startFrom = (s: GameState, owner: string, abilityId: string, sourceId: string) => {
  const a = offeredEffects(s, owner, abilityId).find(x => x.effectId.includes(sourceId))
  assert.ok(a, `${abilityId} from ${sourceId} not offered`)
  return act(s, owner, { type: 'START_EFFECT', effectId: a!.effectId })
}
/** Answers "Choose a cost" with `cost` (the 11 options are the costs 0..10). */
const chooseCost = (s: GameState, owner: string, cost: number) => {
  const c = pendingChoice(s, owner)!
  assert.equal(c.options.length, 11); assert.deepEqual((c.options[cost] as { slot?: { kind: string; index: number; value?: string } }).slot, { kind: 'MODE', index: cost, value: 'COST' })
  return pick(s, owner, [cost])
}
/** Declines the Leader [On Your Opponent's Attack] DON!! -1 offered when Bob attacks. */
const declineLook = (s: GameState) => pendingChoice(s, 'alice') ? choose(s, 'alice', []) : s
const lifeTrigger = (s: GameState, defender: string) => {
  s = attack(s, field(s, s.activePlayerId!, defender === 'alice' ? 'OP03-106' : 'OP11-068'), leaderOf(s, defender))
  if (defender === 'alice') s = declineLook(s)
  s = act(s, defender, { type: 'PASS_BLOCKER', battleId: s.battle!.id }); s = act(s, defender, { type: 'PASS_COUNTER', battleId: s.battle!.id })
  s = act(s, s.activePlayerId!, { type: 'RESOLVE_BATTLE', battleId: s.battle!.id })
  return act(s, defender, { type: 'ANSWER_TRIGGER', choiceId: (legal(s, defender).find(a => a.type === 'ANSWER_TRIGGER') as { choiceId: string }).choiceId, activate: true })
}

test('M6 ST-34 Leader Katakuri pays DON!! -1 when attacking or when the opponent attacks to look at the top opposing deck card, then gains +1000 this battle, once per turn', () => {
  let s = game(5)
  const top = put(s, 'bob', 'OP03-115', 'deckTop'), leader = leaderOf(s, 'alice')
  s = attack(s, leader, leaderOf(s, 'bob'))
  s = payDon(s, 'alice', 1)
  assert.deepEqual(optionIds(s, 'alice'), [top], 'the top card is shown to the chooser')
  s = roundTrip(choose(s, 'alice', [top]))
  assert.equal(zones(s, 'bob').deck[0], top, 'it stays on top')
  assert.ok(s.battle!.counterModifiers.some(m => m.target.instanceId === leader && m.amount === 1000))
  s = endTurn(finishBattle(s))
  s = attack(s, field(s, 'bob', 'OP03-106'), leader)
  s = payDon(s, 'alice', 1)
  s = choose(s, 'alice', optionIds(s, 'alice'))
  assert.ok(s.battle!.counterModifiers.some(m => m.target.instanceId === leader && m.amount === 1000), 'on the opponent attack')
})

test('M6 FAQ OP11-066: Oven rests itself, a matching chosen cost K.O.s a base cost 3 or less then adds a rested DON!!; without a match neither', () => {
  let s = endTurn(game(5))
  const foe = field(s, 'bob', 'OP03-107')
  s = endTurn(s)
  put(s, 'bob', 'OP03-115', 'deckTop')
  const oven = field(s, 'alice', 'OP11-066'), d0 = fieldDon(s, 'alice')
  s = startEffect(s, 'alice', 'OP11-066.activate-main-reveal')
  s = chooseCost(s, 'alice', 1)
  s = roundTrip(choose(s, 'alice', [foe]))
  assert.equal(zoneOf(s, foe), 'trash'); assert.equal(fieldDon(s, 'alice'), d0 + 1); assert.equal(s.instances[oven].rested, true)
  let t = endTurn(game(5))
  const f2 = field(t, 'bob', 'OP03-107')
  t = endTurn(t)
  put(t, 'bob', 'OP03-115', 'deckTop')
  field(t, 'alice', 'OP11-066')
  const d1 = fieldDon(t, 'alice')
  t = startEffect(t, 'alice', 'OP11-066.activate-main-reveal')
  t = chooseCost(t, 'alice', 5)
  assert.equal(pendingChoice(t, 'alice'), undefined); assert.equal(zoneOf(t, f2), 'characters'); assert.equal(fieldDon(t, 'alice'), d1, 'FAQ OP11-066: no DON!! either')
})

test('M6 ST-34 Perospero trashes 1 and on a match draws 1 and adds an active DON!!; the Counter Event gives +5000 on a match and draws 1 as Trigger; Cognac K.O.s a base cost 8 or less on a match', () => {
  let s = game(5)
  put(s, 'bob', 'OP03-106', 'deckTop')
  field(s, 'alice', 'OP11-071')
  const h = zones(s, 'alice').hand.length, d0 = fieldDon(s, 'alice')
  s = startEffect(s, 'alice', 'OP11-071.activate-main-reveal')
  s = choose(s, 'alice', [zones(s, 'alice').hand[0]])
  s = roundTrip(chooseCost(s, 'alice', 4))
  assert.equal(zones(s, 'alice').hand.length, h - 1 + 1); assert.equal(fieldDon(s, 'alice'), d0 + 1)
  assert.equal(offeredEffects(s, 'alice', 'OP11-071.activate-main-reveal').length, 0, 'once per turn')
  let t = endTurn(game(5))
  const ev = put(t, 'alice', 'OP11-079', 'hand'), l = leaderOf(t, 'alice')
  put(t, 'alice', 'OP11-068', 'deckTop')
  t = declineLook(attack(t, field(t, 'bob', 'OP03-106'), l))
  t = act(t, 'alice', { type: 'PASS_BLOCKER', battleId: t.battle!.id })
  put(t, 'bob', 'OP03-110', 'deckTop')
  const c = legal(t, 'alice').find(x => x.type === 'PLAY_COUNTER_EVENT') as { paymentDonIds: string[]; battleId: string }
  t = act(t, 'alice', { type: 'PLAY_COUNTER_EVENT', cardId: ev, targetId: null, paymentDonIds: c.paymentDonIds.slice(0, 1), donMinusIds: [], battleId: c.battleId })
  t = chooseCost(t, 'alice', 4)
  t = choose(t, 'alice', [l])
  assert.equal(t.battle!.counterModifiers.reduce((n, m) => n + m.amount, 0), 5000)
  let u = endTurn(game(3))
  put(u, 'alice', 'OP11-079', 'life')
  const h2 = zones(u, 'alice').hand.length
  u = lifeTrigger(u, 'alice')
  assert.equal(zones(u, 'alice').hand.length, h2 + 1, 'the Trigger card is not added to hand; Trigger draw 1')
  let w = endTurn(game(7))
  const big = field(w, 'bob', 'OP03-106')
  w = endTurn(w)
  put(w, 'bob', 'OP03-107', 'deckTop')
  w = startFrom(w, 'alice', 'OP11-081.main-reveal', inHand(w, 'alice', 'OP11-081'))
  w = chooseCost(w, 'alice', 2)
  w = roundTrip(choose(w, 'alice', [big]))
  assert.equal(zoneOf(w, big), 'trash')
})

test('M6 ST-34 Flampe gives a Charlotte Katakuri card +2000 on your turn; Pudding adds a rested DON!! when your field DON!! do not exceed the opponent; Anana has [Blocker] with another purple Big Mom Pirates Character', () => {
  let s = game(5)
  const leader = leaderOf(s, 'alice')
  s = playCard(s, 'alice', inHand(s, 'alice', 'EB03-032'))
  s = roundTrip(choose(s, 'alice', [leader]))
  assert.equal(power(s, leader), 7000)
  let t = game(5)
  assert.ok(fieldDon(t, 'alice') > fieldDon(t, 'bob'))
  const d0 = fieldDon(t, 'alice')
  t = playCard(t, 'alice', inHand(t, 'alice', 'EB03-035'))
  assert.equal(fieldDon(t, 'alice'), d0, 'more DON!! than the opponent: nothing')
  let u = game(5)
  const tamago = field(u, 'alice', 'ST34-005')
  u = attack(u, tamago, leaderOf(u, 'bob'))
  u = payDon(u, 'alice', 1)
  u = finishBattle(choose(u, 'alice', []))
  assert.equal(fieldDon(u, 'alice'), fieldDon(u, 'bob'))
  const d1 = fieldDon(u, 'alice')
  u = playCard(u, 'alice', inHand(u, 'alice', 'EB03-035'))
  assert.equal(fieldDon(u, 'alice'), d1 + 1, 'equal: +1 rested DON!!')
  let w = game(5)
  const anana = field(w, 'alice', 'OP11-065')
  w = endTurn(w)
  w = declineLook(attack(w, field(w, 'bob', 'OP03-106'), leaderOf(w, 'alice')))
  assert.ok(!((legal(w, 'alice').find(x => x.type === 'ACTIVATE_BLOCKER') as { blockerIds: string[] } | undefined)?.blockerIds ?? []).includes(anana))
  let x = game(5)
  const a2 = field(x, 'alice', 'OP11-065'); field(x, 'alice', 'OP11-068')
  x = endTurn(x)
  x = declineLook(attack(x, field(x, 'bob', 'OP03-106'), leaderOf(x, 'alice')))
  assert.ok((legal(x, 'alice').find(x2 => x2.type === 'ACTIVATE_BLOCKER') as { blockerIds: string[] }).blockerIds.includes(a2))
})

test('M6 FAQ ST34-001: Katakuri adds 2 rested DON!! when a DON!! returns on your turn with a Big Mom Pirates Leader, once per turn and each copy only at that return; on K.O. it plays a Character of 8000 power or less', () => {
  let s = game(7)
  field(s, 'alice', 'ST34-001'); field(s, 'alice', 'ST34-001')
  const tamago = field(s, 'alice', 'ST34-005'), d0 = fieldDon(s, 'alice')
  s = attack(s, tamago, leaderOf(s, 'bob'))
  s = payDon(s, 'alice', 1)
  s = choose(s, 'alice', [])
  while (pendingChoice(s, 'alice')) s = pick(s, 'alice', [0])
  assert.equal(fieldDon(s, 'alice'), Math.min(10, d0 - 1 + 4), 'both copies trigger at the first return')
  s = roundTrip(finishBattle(s))
  const d1 = fieldDon(s, 'alice')
  const t2 = field(s, 'alice', 'ST34-005')
  s = attack(s, t2, leaderOf(s, 'bob'))
  s = payDon(s, 'alice', 1)
  s = choose(s, 'alice', [])
  assert.equal(fieldDon(s, 'alice'), d1 - 1, 'FAQ ST34-001: no copy activates again this turn')
  let t = endTurn(game(7))
  const kata = field(t, 'alice', 'ST34-001', true), brulee = put(t, 'alice', 'ST34-003', 'hand')
  t = finishBattle(declineLook(attack(t, attachBig(t), kata)))
  t = roundTrip(choose(t, 'alice', [brulee]))
  assert.equal(zoneOf(t, brulee), 'characters')
})
function attachBig(s: GameState) { const big = field(s, 'bob', 'OP03-106'); attachDon(s, 'bob', big, 2); return big }

test('M6 FAQ ST34-002: Cracker with a Big Mom Pirates Leader adds a rested DON!! then K.O.s a cost 2 or less, either part alone; without such a Leader nothing', () => {
  let s = endTurn(game(5))
  const small = field(s, 'bob', 'OP03-107')
  s = endTurn(s)
  const d0 = fieldDon(s, 'alice')
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST34-002'))
  s = roundTrip(choose(s, 'alice', [small]))
  assert.equal(zoneOf(s, small), 'trash'); assert.equal(fieldDon(s, 'alice'), d0 + 1)
  let t = game(5)
  const d1 = fieldDon(t, 'alice')
  t = playCard(t, 'alice', inHand(t, 'alice', 'ST34-002'))
  assert.equal(fieldDon(t, 'alice'), d1 + 1, 'no target: the DON!! is still added')
  let u = endTurn(game(5, 'ST04-001'))
  field(u, 'bob', 'OP03-107')
  u = endTurn(u)
  const d2 = fieldDon(u, 'alice')
  u = playCard(u, 'alice', inHand(u, 'alice', 'ST34-002'))
  assert.equal(pendingChoice(u, 'alice'), undefined); assert.equal(fieldDon(u, 'alice'), d2)
})

test('M6 FAQ ST34-004: Linlin pays DON!! -4 and 1 hand card to add the top deck card to Life and set an opposing base power to 0 this turn; without a hand card nothing', () => {
  let s = endTurn(game(11))
  const foe = field(s, 'bob', 'OP03-106')
  s = endTurn(s)
  const life = zones(s, 'alice').life.length
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST34-004'))
  s = choose(s, 'alice', [zones(s, 'alice').hand[0]])
  s = payDon(s, 'alice', 4)
  while (pendingChoice(s, 'alice') && !optionIds(s, 'alice').includes(foe)) s = pick(s, 'alice', [0])
  s = roundTrip(choose(s, 'alice', [foe]))
  assert.equal(zones(s, 'alice').life.length, life + 1); assert.equal(evaluateCharacteristics(s, foe).power.base, 0)
  s = endTurn(s)
  assert.equal(evaluateCharacteristics(s, foe).power.base, 6000, 'this turn only')
  let t = game(11)
  const p = zones(t, 'alice'), lin = inHand(t, 'alice', 'ST34-004')
  for (const id of p.hand.filter(id => id !== lin)) { p.hand.splice(p.hand.indexOf(id), 1); p.deck.push(id); t.instances[id].zone = 'deck'; t.instances[id].zoneGeneration++ }
  t = playCard(t, 'alice', lin)
  assert.equal(pendingChoice(t, 'alice'), undefined, 'the only card in hand: nothing')
})

test('M6 ST-34 Smoothie K.O.d on the opponent turn pays DON!! -1 to play a Big Mom Pirates Character with a cost up to the opposing field DON!!; Brulee looks at 3; Tamago and Pekoms K.O.s a base power 2000 or less', () => {
  let s = endTurn(game(7))
  const smoothie = field(s, 'alice', 'P-090', true), cracker = put(s, 'alice', 'ST34-002', 'hand')
  s = finishBattle(declineLook(attack(s, attachBig(s), smoothie)))
  s = payDon(s, 'alice', 1)
  assert.ok(optionIds(s, 'alice').includes(cracker))
  s = roundTrip(choose(s, 'alice', [cracker]))
  assert.equal(zoneOf(s, cracker), 'characters')
  let t = game(5)
  const top = put(t, 'alice', 'OP11-068', 'deckTop')
  t = playCard(t, 'alice', inHand(t, 'alice', 'ST34-003'))
  t = choose(t, 'alice', [top])
  while (pendingChoice(t, 'alice')) t = pick(t, 'alice', pendingChoice(t, 'alice')!.options.map((_, i) => i))
  assert.equal(zoneOf(t, top), 'hand')
  let u = endTurn(game(5))
  const weak = field(u, 'bob', 'OP03-107')
  u = endTurn(u)
  u = attack(u, field(u, 'alice', 'ST34-005'), leaderOf(u, 'bob'))
  u = payDon(u, 'alice', 1)
  u = roundTrip(choose(u, 'alice', [weak]))
  assert.equal(zoneOf(u, weak), 'trash')
  void definitionOf
})

test('M6 ST-34 certificates validate against the current registry; all ST-34 cards are PLAYABLE_VERIFIED', async () => {
  const { ST34_CERTIFICATIONS, certificationErrors, effectiveStatus } = await import('../src/game/cards/certification')
  const { engineCatalog, currentEngineRegistry } = await import('../src/lib/engine/catalog')
  const { definitions } = engineCatalog(), registry = currentEngineRegistry()
  for (const c of ST34_CERTIFICATIONS) assert.deepEqual(certificationErrors(c, definitions.find(x => x.definitionId === c.definitionId), registry), [], c.definitionId)
  for (const n of ['OP11-062', ...ST34]) assert.equal(effectiveStatus(definitions.find(x => x.number === n)!), 'PLAYABLE_VERIFIED', n)
})
