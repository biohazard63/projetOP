import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateCharacteristics } from '../src/game/effects/characteristics'
import type { GameState } from '../src/game/core/types'
import { act, attachDon, attack, choose, deckFor, definitionOf, endTurn, finishBattle, inHand, leaderOf, legal, newGame, offeredEffects, optionIds, pendingChoice, playCard, put, roundTrip, toMain, zoneOf } from './helpers/m6'

// M6 ST-26 (PURPLE/BLACK Monkey.D.Luffy), official English texts (series 569026). Scenarios follow the official text, the
// ST-23-28 and OP-09 FAQ and the errata snapshot (docs/game/evidence/m6/sources/), through public commands only.
const ST26 = ['ST26-001', 'ST26-002', 'ST26-003', 'ST26-004', 'ST26-005', 'OP05-065', 'OP05-066', 'OP05-070', 'OP09-063', 'OP09-070', 'OP09-076', 'ST14-010', 'OP09-077', 'OP09-078']
const BOB = ['OP03-106', 'OP03-107', 'OP03-115']
const game = (turn = 7, leader = 'OP09-061') => toMain(newGame(deckFor(leader, ST26), deckFor('OP03-099', BOB)), turn)
const zones = (s: GameState, owner: string) => s.players.find(p => p.id === owner)!.zones
const power = (s: GameState, id: string) => evaluateCharacteristics(s, id).power.current
const cost = (s: GameState, id: string) => evaluateCharacteristics(s, id).cost.current
const field = (s: GameState, owner: string, number: string, rested = false) => put(s, owner, number, 'characters', { playedEarlier: true, rested })
const fieldDon = (s: GameState, owner: string) => [...zones(s, owner).cost, ...zones(s, owner).attached]
const startFrom = (s: GameState, owner: string, abilityId: string, sourceId: string) => {
  const a = offeredEffects(s, owner, abilityId).find(x => x.effectId.includes(sourceId))
  assert.ok(a, `${abilityId} from ${sourceId} not offered`)
  return act(s, owner, { type: 'START_EFFECT', effectId: a!.effectId })
}
/** Pays a "DON!! −2" (or "return 1 or more") choice with the first `n` offered field DON!! cards. */
const payDon = (s: GameState, owner: string, n: number) => choose(s, owner, optionIds(s, owner).slice(0, n))

test('M6 FAQ OP09-061: Leader Luffy adds 1 active and 1 rested DON!! when 2 or more DON!! return at the same time on your turn, once per turn; 1 returned DON!! does nothing', () => {
  let s = game(7)
  const before = fieldDon(s, 'alice').length
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST26-003'))
  s = payDon(s, 'alice', 2)
  s = roundTrip(s)
  const after = fieldDon(s, 'alice')
  assert.equal(after.length, before - 2 + 1 + 2, 'Robin +1 active, Leader +1 active +1 rested')
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST26-003'))
  s = payDon(s, 'alice', 2)
  assert.equal(fieldDon(s, 'alice').length, after.length - 2 + 1, 'once per turn')
  let t = game(7)
  const b2 = fieldDon(t, 'alice').length
  t = playCard(t, 'alice', inHand(t, 'alice', 'OP09-076'))
  t = payDon(t, 'alice', 1)
  assert.equal(fieldDon(t, 'alice').length, b2 - 1 + 1, 'Zoro: 1 returned, +1 active, no Leader effect')
})

test('M6 ST-26 Leader Luffy with a DON!! gives all of your Characters +1 cost', () => {
  const s = game(7)
  const usopp = field(s, 'alice', 'OP09-063')
  assert.equal(cost(s, usopp), definitionOf('OP09-063').cost)
  attachDon(s, 'alice', leaderOf(s, 'alice'), 1)
  assert.equal(cost(s, usopp), definitionOf('OP09-063').cost! + 1)
})

test('M6 ST-26 Nami returns 1 or more DON!! to give up to 2 rested DON!! cards; Zoro returns 1 or more DON!! to add 1 active DON!!', () => {
  let s = game(7)
  const leader = leaderOf(s, 'alice')
  s = playCard(s, 'alice', inHand(s, 'alice', 'OP09-070'))
  s = payDon(s, 'alice', 1)
  s = choose(s, 'alice', [leader])
  s = roundTrip(choose(s, 'alice', optionIds(s, 'alice').slice(0, 2)))
  assert.equal(zones(s, 'alice').attached.filter(id => s.instances[id].attachedTo === leader).length, 2)
  let t = game(7)
  const active = () => zones(t, 'alice').cost.filter(id => !t.instances[id].rested).length
  t = playCard(t, 'alice', inHand(t, 'alice', 'OP09-076'))
  const a0 = active()
  t = choose(t, 'alice', [zones(t, 'alice').cost.find(id => !t.instances[id].rested)!])
  assert.equal(active(), a0, '1 active DON!! returned, 1 active DON!! added')
})

test('M6 ST-26 Gum-Gum Lightning pays DON!! -2 to K.O. a Character with 6000 power or less; its Trigger adds 1 active DON!!', () => {
  let s = endTurn(game(7))
  const foe = field(s, 'bob', 'OP03-106')
  s = endTurn(s)
  s = startFrom(s, 'alice', 'OP09-077.main-ko', inHand(s, 'alice', 'OP09-077'))
  s = payDon(s, 'alice', 2)
  s = roundTrip(choose(s, 'alice', [foe]))
  assert.equal(zoneOf(s, foe), 'trash')
  let t = endTurn(game(5))
  put(t, 'alice', 'OP09-077', 'life')
  const d0 = fieldDon(t, 'alice').length
  t = attack(t, field(t, 'bob', 'OP03-106'), leaderOf(t, 'alice'))
  t = act(t, 'alice', { type: 'PASS_BLOCKER', battleId: t.battle!.id }); t = act(t, 'alice', { type: 'PASS_COUNTER', battleId: t.battle!.id })
  t = act(t, 'bob', { type: 'RESOLVE_BATTLE', battleId: t.battle!.id })
  t = act(t, 'alice', { type: 'ANSWER_TRIGGER', choiceId: (legal(t, 'alice').find(a => a.type === 'ANSWER_TRIGGER') as { choiceId: string }).choiceId, activate: true })
  assert.equal(fieldDon(t, 'alice').length, d0 + 1)
})

test('M6 ST-26 Gum-Gum Giant pays DON!! -2 and 1 hand card for +4000 this battle then draws 2 with a Straw Hat Crew Leader; without one nothing more happens', () => {
  const run = (leader: string) => {
    let s = endTurn(leader === 'OP09-061' ? game(7) : toMain(newGame(deckFor(leader, ['OP09-078', 'OP09-063']), deckFor('OP03-099', BOB)), 7))
    const giant = put(s, 'alice', 'OP09-078', 'hand'), l = leaderOf(s, 'alice')
    s = attack(s, field(s, 'bob', 'OP03-106'), l)
    s = act(s, 'alice', { type: 'PASS_BLOCKER', battleId: s.battle!.id })
    const c = legal(s, 'alice').find(x => x.type === 'PLAY_COUNTER_EVENT') as { paymentDonIds: string[]; battleId: string }
    s = act(s, 'alice', { type: 'PLAY_COUNTER_EVENT', cardId: giant, targetId: null, paymentDonIds: c.paymentDonIds.slice(0, 1), donMinusIds: [], battleId: c.battleId })
    const hand = zones(s, 'alice').hand.length, fodder = zones(s, 'alice').hand[0]
    s = choose(s, 'alice', [fodder])
    s = payDon(s, 'alice', 2)
    return { s, l, hand, fodder }
  }
  const r = run('OP09-061')
  const { l, hand, fodder } = r
  let s = r.s
  s = roundTrip(choose(s, 'alice', [l]))
  assert.equal(zoneOf(s, fodder), 'trash'); assert.equal(s.battle!.counterModifiers.reduce((n, m) => n + m.amount, 0), 4000)
  assert.equal(zones(s, 'alice').hand.length, hand - 1 + 2)
  const other = run('ST04-001')
  assert.equal(pendingChoice(other.s, 'alice'), undefined); assert.equal(zones(other.s, 'alice').hand.length, other.hand - 1, 'no Straw Hat Crew Leader: no power, no draw')
})

test('M6 FAQ ST26-001: Soba Mask costs 5 less with a San-Gorou or Sanji of 7000 base power or more and returns them all to hand on play', () => {
  let s = game(7)
  const mask = inHand(s, 'alice', 'ST26-001')
  assert.equal(cost(s, mask), 7)
  const san = field(s, 'alice', 'OP05-065')
  assert.ok(definitionOf('OP05-065').power! >= 7000)
  assert.equal(cost(s, mask), 2)
  s = roundTrip(playCard(s, 'alice', mask))
  assert.equal(zoneOf(s, san), 'hand')
})

test('M6 ST-26 Chopper pays DON!! -2 to rest 1 opposing DON!! or a Character cost 1 or less; Franky gives up to 2 opposing Characters -2000', () => {
  let s = endTurn(game(9))
  const small = field(s, 'bob', 'OP03-115')
  assert.ok(definitionOf('OP03-115').cost! <= 1)
  s = endTurn(s)
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST26-002'))
  s = payDon(s, 'alice', 2)
  s = choose(s, 'alice', [])
  assert.ok(optionIds(s, 'alice').includes(small), 'no DON!! chosen: a Character is offered')
  s = roundTrip(choose(s, 'alice', [small]))
  assert.equal(s.instances[small].rested, true)
  let t = endTurn(game(9))
  field(t, 'bob', 'OP03-115')
  t = endTurn(t)
  const don = zones(t, 'bob').cost.find(id => !t.instances[id].rested)!
  t = playCard(t, 'alice', inHand(t, 'alice', 'ST26-002'))
  t = payDon(t, 'alice', 2)
  t = choose(t, 'alice', [don])
  assert.equal(t.instances[don].rested, true); assert.equal(pendingChoice(t, 'alice'), undefined, 'one card in all')
  let u = endTurn(game(9))
  const f1 = field(u, 'bob', 'OP03-106'), f2 = field(u, 'bob', 'OP03-107')
  u = endTurn(u)
  u = playCard(u, 'alice', inHand(u, 'alice', 'ST26-004'))
  u = payDon(u, 'alice', 2)
  u = roundTrip(choose(u, 'alice', [f1, f2]))
  assert.equal(power(u, f1), definitionOf('OP03-106').power! - 2000); assert.equal(power(u, f2), definitionOf('OP03-107').power! - 2000)
})

test('M6 FAQ ST26-005: Luffy pays DON!! -2 with a multicolored Leader and 5 or more opposing DON!! to set the Leader base power to 7000 until the end of the next opposing turn; twice stays 7000', () => {
  let s = game(7)
  const leader = leaderOf(s, 'alice')
  assert.ok(fieldDon(s, 'bob').length >= 5)
  const luffy = field(s, 'alice', 'ST26-005')
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST26-005'))
  s = payDon(s, 'alice', 2)
  s = roundTrip(choose(s, 'alice', [leader]))
  assert.equal(evaluateCharacteristics(s, leader).power.base, 7000)
  s = attack(s, luffy, leaderOf(s, 'bob'))
  s = payDon(s, 'alice', 2)
  s = finishBattle(choose(s, 'alice', [leader]))
  assert.equal(evaluateCharacteristics(s, leader).power.base, 7000)
  s = endTurn(s)
  assert.equal(power(s, leader), 7000, 'during the opponent turn')
  s = endTurn(s)
  assert.equal(power(s, leader), definitionOf('OP09-061').power, 'expired after the opponent End Phase')
  let t = game(5)
  assert.ok(fieldDon(t, 'bob').length < 5)
  t = attack(t, field(t, 'alice', 'ST26-005'), leaderOf(t, 'bob'))
  t = payDon(t, 'alice', 2)
  assert.equal(pendingChoice(t, 'alice'), undefined); assert.equal(evaluateCharacteristics(t, leaderOf(t, 'alice')).power.base, definitionOf('OP09-061').power)
})

test('M6 ST-26 certificates validate against the current registry; all ST-26 cards are PLAYABLE_VERIFIED', async () => {
  const { ST26_CERTIFICATIONS, certificationErrors, effectiveStatus } = await import('../src/game/cards/certification')
  const { engineCatalog, currentEngineRegistry } = await import('../src/lib/engine/catalog')
  const { definitions } = engineCatalog(), registry = currentEngineRegistry()
  for (const c of ST26_CERTIFICATIONS) assert.deepEqual(certificationErrors(c, definitions.find(x => x.definitionId === c.definitionId), registry), [], c.definitionId)
  for (const n of ['OP09-061', ...ST26]) assert.equal(effectiveStatus(definitions.find(x => x.number === n)!), 'PLAYABLE_VERIFIED', n)
})
