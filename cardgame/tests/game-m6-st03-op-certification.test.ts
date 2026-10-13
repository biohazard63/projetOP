import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateCharacteristics } from '../src/game/effects/characteristics'
import type { GameState } from '../src/game/core/types'
import { act, attack, choose, deckFor, definitionOf, endTurn, leaderOf, legal, newGame, optionIds, pendingChoice, put, roundTrip, startEffect, toMain, zoneOf } from './helpers/m6'

// M6 ST-03 composition cards OP01-088 Desert Spada and OP07-057 Perfume Femur (names from scripts/rebuildStarterDecks.ts,
// resolved by the script's own cross-set lookup). Scenarios follow the official text, the OP-01 FAQ and the errata snapshot
// (docs/game/evidence/m6/sources/qa_op01.txt, qa_op07.txt, errata-all.json), through public commands only.
const ST03 = ['ST03-002', 'ST03-003', 'ST03-004', 'ST03-005', 'ST03-008', 'ST03-010', 'ST03-012', 'ST03-013', 'ST03-016', 'OP01-088', 'OP07-057']
const game = (turn = 3) => toMain(newGame(deckFor('ST03-001', ST03), deckFor('ST03-001', ST03)), turn)
const zones = (s: GameState, owner: string) => s.players.find(p => p.id === owner)!.zones
const power = (s: GameState, id: string) => evaluateCharacteristics(s, id).power.current
const counterEvent = (s: GameState, owner: string, cardId: string): GameState => {
  const a = legal(s, owner).find(x => x.type === 'PLAY_COUNTER_EVENT') as { eventIds: string[]; paymentDonIds: string[]; battleId: string } | undefined
  assert.ok(a?.eventIds.includes(cardId), 'Counter Event offered')
  return act(s, owner, { type: 'PLAY_COUNTER_EVENT', cardId, targetId: null, paymentDonIds: a!.paymentDonIds.slice(0, definitionOf('OP01-088').cost ?? 0), donMinusIds: [], battleId: a!.battleId })
}
const lifeTrigger = (s: GameState, defender: string) => {
  s = attack(s, put(s, s.activePlayerId!, 'ST03-012', 'characters'), leaderOf(s, defender))
  s = act(s, defender, { type: 'PASS_BLOCKER', battleId: s.battle!.id }); s = act(s, defender, { type: 'PASS_COUNTER', battleId: s.battle!.id })
  s = act(s, s.activePlayerId!, { type: 'RESOLVE_BATTLE', battleId: s.battle!.id })
  const t = legal(s, defender).find(a => a.type === 'ANSWER_TRIGGER') as { choiceId: string } | undefined
  assert.ok(t, 'Trigger offered')
  return act(s, defender, { type: 'ANSWER_TRIGGER', choiceId: t!.choiceId, activate: true })
}
const blockers = (s: GameState, owner: string) => (legal(s, owner).find(a => a.type === 'ACTIVATE_BLOCKER') as { blockerIds: string[] } | undefined)?.blockerIds ?? []

test('M6 FAQ OP01-088: Desert Spada gives +2000 this battle, then places the 3 looked cards all at the top or all at the bottom', () => {
  let s = endTurn(game(3))
  const spada = put(s, 'alice', 'OP01-088', 'hand')
  const top3 = zones(s, 'alice').deck.slice(0, 3)
  s = attack(s, put(s, 'bob', 'ST03-012', 'characters'), leaderOf(s, 'alice'))
  s = act(s, 'alice', { type: 'PASS_BLOCKER', battleId: s.battle!.id })
  s = counterEvent(s, 'alice', spada)
  s = choose(s, 'alice', [leaderOf(s, 'alice')])
  assert.equal(s.battle!.counterModifiers.reduce((n, m) => n + m.amount, 0), 2000)
  const order = [top3[2], top3[0], top3[1]]
  s = roundTrip(choose(s, 'alice', order))
  assert.equal(pendingChoice(s, 'alice')?.max, 3)
  s = choose(s, 'alice', top3)
  assert.deepEqual(zones(s, 'alice').deck.slice(-3), order, 'all three at the bottom, in the chosen order')
  assert.equal(zoneOf(s, spada), 'trash')
  // Choosing only some of the cards for the bottom is refused (all or none).
  let t = endTurn(game(3))
  const again = put(t, 'alice', 'OP01-088', 'hand'), first = zones(t, 'alice').deck.slice(0, 3)
  t = attack(t, put(t, 'bob', 'ST03-012', 'characters'), leaderOf(t, 'alice'))
  t = act(t, 'alice', { type: 'PASS_BLOCKER', battleId: t.battle!.id })
  t = choose(counterEvent(t, 'alice', again), 'alice', [])
  t = choose(t, 'alice', first)
  const c = pendingChoice(t, 'alice')!
  const tokens = c.options.filter(o => 'instanceId' in o && o.instanceId === first[0]).map(o => o.token)
  assert.throws(() => act(t, 'alice', { type: 'ANSWER_CHOICE', choiceId: c.choiceId, tokens }))
  t = choose(t, 'alice', [])
  assert.deepEqual(zones(t, 'alice').deck.slice(0, 3), first, 'all three kept on top')
})

test('M6 FAQ OP01-088: Desert Spada can be activated with 2 or less cards in the deck', () => {
  let s = endTurn(game(3))
  const spada = put(s, 'alice', 'OP01-088', 'hand')
  const deck = zones(s, 'alice').deck
  while (deck.length > 2) { const id = deck.pop()!; zones(s, 'alice').trash.push(id); const i = s.instances[id]; i.zone = 'trash'; i.zoneGeneration++; i.faceUp = true }
  const kept = [...deck]
  s = attack(s, put(s, 'bob', 'ST03-012', 'characters'), leaderOf(s, 'alice'))
  s = act(s, 'alice', { type: 'PASS_BLOCKER', battleId: s.battle!.id })
  s = choose(counterEvent(s, 'alice', spada), 'alice', [])
  assert.deepEqual([...optionIds(s, 'alice')].sort(), [...kept].sort(), 'the 2 remaining cards are looked at')
  s = choose(s, 'alice', [kept[1], kept[0]])
  s = choose(s, 'alice', [])
  assert.deepEqual(zones(s, 'alice').deck, [kept[1], kept[0]])
  assert.ok(!s.result)
})

test('M6 OP01-088 Trigger: Desert Spada draws 2 cards then trashes 1 card from hand', () => {
  let s = game(3)
  put(s, 'alice', 'OP01-088', 'life')
  s = endTurn(s)
  const hand = zones(s, 'alice').hand.length
  s = lifeTrigger(s, 'alice')
  assert.equal(zones(s, 'alice').hand.length, hand + 2)
  const discard = zones(s, 'alice').hand[0]
  s = choose(s, 'alice', [discard])
  assert.equal(zoneOf(s, discard), 'trash'); assert.equal(zones(s, 'alice').hand.length, hand + 1)
})

test('M6 OP07-057: Perfume Femur gives a Seven Warlords Leader or Character +2000 this turn; when it attacks, no [Blocker] can be activated', () => {
  let s = game(5)
  const leader = leaderOf(s, 'alice'), plain = put(s, 'alice', 'ST03-002', 'characters', { playedEarlier: true }), foreign = put(s, 'alice', 'ST03-012', 'characters', { playedEarlier: true })
  put(s, 'bob', 'ST03-013', 'characters'); put(s, 'bob', 'ST03-008', 'characters')
  put(s, 'alice', 'OP07-057', 'hand')
  s = startEffect(s, 'alice', 'OP07-057.main-power-prevent-blocker')
  assert.ok(optionIds(s, 'alice').includes(leader) && optionIds(s, 'alice').includes(plain))
  assert.ok(!optionIds(s, 'alice').includes(foreign), 'Pacifista is not a {The Seven Warlords of the Sea} card')
  const before = power(s, leader)
  s = roundTrip(choose(s, 'alice', [leader]))
  assert.equal(power(s, leader), (before ?? 0) + 2000)
  s = attack(s, leader, leaderOf(s, 'bob'))
  assert.deepEqual(blockers(s, 'bob'), [], 'the selected card attacks: [Blocker] cannot be activated')
  // Another attacker this turn may still be blocked.
  let t = game(5)
  const other = put(t, 'alice', 'ST03-012', 'characters', { playedEarlier: true })
  const law = put(t, 'bob', 'ST03-008', 'characters')
  put(t, 'alice', 'OP07-057', 'hand')
  t = choose(startEffect(t, 'alice', 'OP07-057.main-power-prevent-blocker'), 'alice', [leaderOf(t, 'alice')])
  t = attack(t, other, leaderOf(t, 'bob'))
  assert.ok(blockers(t, 'bob').includes(law))
  // Selecting nothing changes nothing.
  let u = game(5)
  const fan = put(u, 'bob', 'ST03-008', 'characters'), card = put(u, 'alice', 'OP07-057', 'hand')
  u = choose(startEffect(u, 'alice', 'OP07-057.main-power-prevent-blocker'), 'alice', [])
  assert.equal(zoneOf(u, card), 'trash')
  u = attack(u, leaderOf(u, 'alice'), leaderOf(u, 'bob'))
  assert.ok(blockers(u, 'bob').includes(fan))
})

test('M6 OP07-057: the Perfume Femur +2000 ends with the turn', () => {
  let s = game(5)
  const leader = leaderOf(s, 'alice'), before = power(s, leader)
  put(s, 'alice', 'OP07-057', 'hand')
  s = choose(startEffect(s, 'alice', 'OP07-057.main-power-prevent-blocker'), 'alice', [leader])
  s = endTurn(s)
  assert.equal(power(s, leader), before)
})

test('M6 OP07-057 Trigger: Perfume Femur draws 1 card', () => {
  let s = game(3)
  const femur = put(s, 'alice', 'OP07-057', 'life')
  s = endTurn(s)
  const hand = zones(s, 'alice').hand.length
  s = lifeTrigger(s, 'alice')
  assert.equal(zones(s, 'alice').hand.length, hand + 1)
  assert.equal(zoneOf(s, femur), 'trash')
})

test('M6 ST-03 composition certificates validate against the current registry; OP01-088 and OP07-057 are PLAYABLE_VERIFIED', async () => {
  const { ST03_OP_CERTIFICATIONS, certificationErrors, effectiveStatus } = await import('../src/game/cards/certification')
  const { engineCatalog, currentEngineRegistry } = await import('../src/lib/engine/catalog')
  const { definitions } = engineCatalog(), registry = currentEngineRegistry()
  for (const c of ST03_OP_CERTIFICATIONS) assert.deepEqual(certificationErrors(c, definitions.find(x => x.definitionId === c.definitionId), registry), [], c.definitionId)
  for (const n of ['OP01-088', 'OP07-057']) assert.equal(effectiveStatus(definitions.find(x => x.number === n)!), 'PLAYABLE_VERIFIED', n)
})
