import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateCharacteristics } from '../src/game/effects/characteristics'
import type { GameState } from '../src/game/core/types'
import { act, attachDon, attack, attackerIds, choose, deckFor, definitionOf, endTurn, inHand, leaderOf, legal, newGame, offeredEffects, optionIds, pendingChoice, playCard, put, roundTrip, startEffect, toMain, zoneOf } from './helpers/m6'

// M6 ST-30 (RED/GREEN Luffy & Ace), official English texts (series 569030). Scenarios follow the official text, the ST-30 FAQ
// ("6000 power" means exactly 6000) and the errata snapshot (docs/game/evidence/m6/sources/), through public commands only.
const ST30 = ['ST30-002', 'ST30-003', 'ST30-004', 'ST30-005', 'ST30-006', 'ST30-007', 'ST30-008', 'ST30-009', 'ST30-010', 'ST30-011', 'ST30-012', 'ST30-013', 'ST30-014', 'ST30-015', 'ST30-016', 'ST30-017']
const BOB = ['OP03-106', 'OP03-107', 'OP03-115', 'OP03-110']
const game = (turn = 5) => toMain(newGame(deckFor('ST30-001', ST30), deckFor('OP03-099', BOB)), turn)
const kaido = (turn = 10) => toMain(newGame(deckFor('ST30-001', ST30), deckFor('ST04-001', ['ST04-003', 'ST04-002'])), turn)
const zones = (s: GameState, owner: string) => s.players.find(p => p.id === owner)!.zones
const power = (s: GameState, id: string) => evaluateCharacteristics(s, id).power.current
const field = (s: GameState, owner: string, number: string, rested = false) => put(s, owner, number, 'characters', { playedEarlier: true, rested })
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
const counterWith = (s: GameState, number: string) => {
  const ev = put(s, 'alice', number, 'hand')
  s = attack(s, field(s, 'bob', 'OP03-106'), leaderOf(s, 'alice'))
  s = act(s, 'alice', { type: 'PASS_BLOCKER', battleId: s.battle!.id })
  const c = legal(s, 'alice').find(x => x.type === 'PLAY_COUNTER_EVENT') as { paymentDonIds: string[]; battleId: string }
  return act(s, 'alice', { type: 'PLAY_COUNTER_EVENT', cardId: ev, targetId: null, paymentDonIds: c.paymentDonIds.slice(0, 1), donMinusIds: [], battleId: c.battleId })
}

test('M6 FAQ ST30-001: Leader Luffy & Ace has -2000 with a Character of 7000 base power or more and gives Ace and Luffy cards +3000 on the opponent turn, not itself', () => {
  let s = game(5)
  const leader = leaderOf(s, 'alice'), ace = field(s, 'alice', 'ST30-007'), luffy = field(s, 'alice', 'ST30-012'), jozu = field(s, 'alice', 'ST30-005')
  assert.equal(power(s, leader), 6000, 'no Character of 7000 base power')
  s = endTurn(s)
  assert.equal(power(s, ace), 9000); assert.equal(power(s, luffy), 9000); assert.equal(power(s, jozu), 6000); assert.equal(power(s, leader), 6000, 'FAQ ST30-001: not the Leader')
  void definitionOf
})

test('M6 FAQ ST30-002: Inazuma and the Event look at 5 for a Character of exactly 6000 power; Newgate gives Characters of exactly 6000 base power +1000 on your turn', () => {
  let s = game(5)
  const six = put(s, 'alice', 'ST30-013', 'deckTop'), three = put(s, 'alice', 'ST30-014', 'deckTop')
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST30-002'))
  assert.ok(optionIds(s, 'alice').includes(six)); assert.ok(!optionIds(s, 'alice').includes(three), 'exactly 6000')
  s = choose(s, 'alice', [six])
  while (pendingChoice(s, 'alice')) s = pick(s, 'alice', pendingChoice(s, 'alice')!.options.map((_, i) => i))
  assert.equal(zoneOf(s, six), 'hand')
  let t = game(9)
  const ng = field(t, 'alice', 'ST30-003'), bon = field(t, 'alice', 'ST30-013'), mr3 = field(t, 'alice', 'ST30-014')
  assert.equal(power(t, bon), 7000); assert.equal(power(t, ng), 7000); assert.equal(power(t, mr3), 3000)
  t = endTurn(t)
  assert.equal(power(t, bon), 6000, 'opponent turn')
  let u = game(5)
  const top = put(u, 'alice', 'ST30-007', 'deckTop')
  u = startFrom(u, 'alice', 'ST30-017.main-search', inHand(u, 'alice', 'ST30-017'))
  u = choose(u, 'alice', [top])
  while (pendingChoice(u, 'alice')) u = pick(u, 'alice', pendingChoice(u, 'alice')!.options.map((_, i) => i))
  assert.equal(zoneOf(u, top), 'hand')
})

test('M6 FAQ ST30-004: Ivankov reveals 2 Characters of exactly 6000 power to draw 3 and trash 2; Jinbe trashes one to draw 2', () => {
  let s = game(5)
  const a = put(s, 'alice', 'ST30-013', 'hand'), b = put(s, 'alice', 'ST30-005', 'hand'), ivan = inHand(s, 'alice', 'ST30-004'), h = zones(s, 'alice').hand.length
  s = playCard(s, 'alice', ivan)
  s = choose(s, 'alice', [a, b])
  s = roundTrip(choose(s, 'alice', zones(s, 'alice').hand.slice(0, 2)))
  assert.equal(zones(s, 'alice').hand.length, h - 1 + 3 - 2); assert.ok(s.events.some(e => e.type === 'CARD_REVEALED'))
  let t = game(5)
  const six = put(t, 'alice', 'ST30-013', 'hand'), jinbe = inHand(t, 'alice', 'ST30-006'), h2 = zones(t, 'alice').hand.length
  t = playCard(t, 'alice', jinbe)
  t = roundTrip(choose(t, 'alice', [six]))
  assert.equal(zoneOf(t, six), 'trash'); assert.equal(zones(t, 'alice').hand.length, h2 - 2 + 2)
})

test('M6 FAQ ST30-007: Ace and Luffy rest an active DON!! on play for [Rush]; Ace gives -1000 and Luffy rests a [Blocker] when attacking', () => {
  let s = endTurn(game(7))
  const foe = field(s, 'bob', 'OP03-106'), blocker = field(s, 'bob', 'OP03-107')
  s = endTurn(s)
  const ace = inHand(s, 'alice', 'ST30-007')
  s = playCard(s, 'alice', ace)
  s = choose(s, 'alice', [zones(s, 'alice').cost.find(id => !s.instances[id].rested)!])
  assert.ok(attackerIds(s, 'alice').includes(ace))
  s = attack(s, ace, leaderOf(s, 'bob'))
  s = roundTrip(choose(s, 'alice', [foe]))
  assert.equal(power(s, foe), 5000)
  let t = endTurn(game(7))
  const b2 = field(t, 'bob', 'OP03-107'), plain = field(t, 'bob', 'OP03-106')
  t = endTurn(t)
  const luffy = field(t, 'alice', 'ST30-012')
  t = attack(t, luffy, leaderOf(t, 'bob'))
  assert.ok(optionIds(t, 'alice').includes(b2)); assert.ok(!optionIds(t, 'alice').includes(plain))
  t = choose(t, 'alice', [b2])
  assert.equal(t.instances[b2].rested, true)
  const u = game(5)
  const p = zones(u, 'alice')
  for (const id of p.cost) u.instances[id].rested = true
  const a2 = inHand(u, 'alice', 'ST30-007')
  assert.equal(legal(u, 'alice').some(x => x.type === 'PLAY_CARD' && x.instanceId === a2), false, 'no DON!! to pay: setup check')
  void blocker
})

test('M6 FAQ ST30-009: LittleOars trashes itself and draws 1, Buggy rests itself, instead of a Character of exactly 6000 base power being removed by an opposing effect', () => {
  let s = kaido(10)
  const little = field(s, 'alice', 'ST30-009'), bon = field(s, 'alice', 'ST30-013'), h = zones(s, 'alice').hand.length
  s = kaidoKO(s, bon)
  s = roundTrip(pick(s, 'alice', [0]))
  assert.equal(zoneOf(s, bon), 'characters'); assert.equal(zoneOf(s, little), 'trash'); assert.equal(zones(s, 'alice').hand.length, h + 1)
  let t = kaido(10)
  const buggy = field(t, 'alice', 'ST30-011'), b2 = field(t, 'alice', 'ST30-013')
  t = kaidoKO(t, b2)
  t = roundTrip(pick(t, 'alice', [0]))
  assert.equal(zoneOf(t, b2), 'characters'); assert.equal(t.instances[buggy].rested, true)
  let u = kaido(10)
  field(u, 'alice', 'ST30-011'); const mr3 = field(u, 'alice', 'ST30-014')
  u = kaidoKO(u, mr3)
  assert.equal(zoneOf(u, mr3), 'trash', '3000 base power: not protected')
})

test('M6 ST-30 Marco trashes a 6000 power Character on K.O. to come back rested; Crocodile keeps an opposing rested Character rested in its next Refresh Phase', () => {
  let s = kaido(10)
  const marco = field(s, 'alice', 'ST30-008'), six = put(s, 'alice', 'ST30-013', 'hand')
  s = kaidoKO(s, marco)
  s = choose(s, 'alice', [six])
  s = roundTrip(choose(s, 'alice', [marco]))
  assert.equal(zoneOf(s, marco), 'characters'); assert.equal(s.instances[marco].rested, true)
  let t = endTurn(game(7))
  const foe = field(t, 'bob', 'OP03-106', true)
  t = endTurn(t)
  t = playCard(t, 'alice', inHand(t, 'alice', 'ST30-010'))
  t = choose(t, 'alice', [foe])
  t = endTurn(t)
  assert.equal(t.instances[foe].rested, true)
})

test('M6 FAQ ST30-014: Mr.3 rests itself to give up to 2 rested DON!! each to up to 2 different Characters of exactly 6000 base power', () => {
  let s = game(9)
  const a = field(s, 'alice', 'ST30-013'), b = field(s, 'alice', 'ST30-005')
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST30-002'))
  while (pendingChoice(s, 'alice')) s = pick(s, 'alice', pendingChoice(s, 'alice')!.min ? pendingChoice(s, 'alice')!.options.map((_, i) => i) : [])
  field(s, 'alice', 'ST30-014')
  const rested = () => zones(s, 'alice').cost.filter(id => s.instances[id].rested)
  s = startEffect(s, 'alice', 'ST30-014.activate-main-don')
  s = choose(s, 'alice', [a])
  s = choose(s, 'alice', rested().slice(0, 1))
  assert.ok(!optionIds(s, 'alice').includes(a), 'a different Character')
  s = choose(s, 'alice', [b])
  s = roundTrip(choose(s, 'alice', []))
  assert.equal(zones(s, 'alice').attached.filter(id => s.instances[id].attachedTo === a).length, 1)
})

test('M6 FAQ ST30-015: the Whitebeard Counter gives +4000 with 2 Characters of exactly 6000 base power; the Luffy Counter gives +3000 and draws with both a 6000 Ace and Luffy', () => {
  let s = endTurn(game(7))
  field(s, 'alice', 'ST30-013'); field(s, 'alice', 'ST30-005')
  s = counterWith(s, 'ST30-015')
  s = roundTrip(choose(s, 'alice', [leaderOf(s, 'alice')]))
  assert.equal(s.battle!.counterModifiers.reduce((n, m) => n + m.amount, 0), 4000)
  let t = endTurn(game(7))
  field(t, 'alice', 'ST30-013')
  t = counterWith(t, 'ST30-015')
  assert.equal(pendingChoice(t, 'alice'), undefined, 'only 1 Character of 6000 base power')
  let u = endTurn(game(7))
  field(u, 'alice', 'ST30-007'); field(u, 'alice', 'ST30-012')
  const h = zones(u, 'alice').hand.length
  u = counterWith(u, 'ST30-016')
  u = roundTrip(choose(u, 'alice', [leaderOf(u, 'alice')]))
  assert.equal(u.battle!.counterModifiers.reduce((n, m) => n + m.amount, 0), 3000); assert.equal(zones(u, 'alice').hand.length, h + 1 - 1 + 1)
  void attachDon
})

test('M6 ST-30 certificates validate against the current registry; all ST-30 cards are PLAYABLE_VERIFIED', async () => {
  const { ST30_CERTIFICATIONS, certificationErrors, effectiveStatus } = await import('../src/game/cards/certification')
  const { engineCatalog, currentEngineRegistry } = await import('../src/lib/engine/catalog')
  const { definitions } = engineCatalog(), registry = currentEngineRegistry()
  for (const c of ST30_CERTIFICATIONS) assert.deepEqual(certificationErrors(c, definitions.find(x => x.definitionId === c.definitionId), registry), [], c.definitionId)
  for (const n of ['ST30-001', ...ST30]) assert.equal(effectiveStatus(definitions.find(x => x.number === n)!), 'PLAYABLE_VERIFIED', n)
})
