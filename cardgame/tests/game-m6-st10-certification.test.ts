import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateCharacteristics, hasCombatKeyword } from '../src/game/effects/characteristics'
import type { GameState } from '../src/game/core/types'
import { act, attachDon, attack, attackerIds, choose, deckFor, endTurn, finishBattle, inHand, leaderOf, legal, newGame, offeredEffects, optionIds, pendingChoice, playCard, put, roundTrip, startEffect, toMain, zoneOf } from './helpers/m6'

// M6 ST-10 (the Three Captains, red/purple): ST10-001..017. Scenarios follow the official text, the ST-10 FAQ and the errata
// snapshot (docs/game/evidence/m6/sources/qa_st-10.txt, errata-all.json), through public commands only.
const ST10 = ['ST10-004', 'ST10-005', 'ST10-006', 'ST10-007', 'ST10-008', 'ST10-009', 'ST10-010', 'ST10-011', 'ST10-012', 'ST10-013', 'ST10-014', 'ST10-015', 'ST10-016', 'ST10-017']
const game = (leader = 'ST10-001', turn = 3) => toMain(newGame(deckFor(leader, ST10), deckFor('ST10-001', ST10)), turn)
const zones = (s: GameState, owner: string) => s.players.find(p => p.id === owner)!.zones
const power = (s: GameState, id: string) => evaluateCharacteristics(s, id).power.current
const pick = (s: GameState, owner: string, indexes: number[]) => { const c = pendingChoice(s, owner); assert.ok(c, 'pending choice'); return act(s, owner, { type: 'ANSWER_CHOICE', choiceId: c!.choiceId, tokens: indexes.map(i => c!.options[i].token) }) }
const payAll = (s: GameState, owner: string) => { const c = pendingChoice(s, owner)!; assert.equal(c.allOrNone, true); return act(s, owner, { type: 'ANSWER_CHOICE', choiceId: c.choiceId, tokens: c.options.slice(0, c.max).map(o => o.token) }) }
/** Scenario setup: returns cost-area DON!! to the DON!! deck until `keep` remain (as an earlier DON!! −X would). */
const keepDon = (s: GameState, owner: string, keep: number) => {
  const p = s.players.find(x => x.id === owner)!
  while (p.zones.cost.length > keep) { const id = p.zones.cost.pop()!; p.zones.donDeck.push(id); const i = s.instances[id]; i.zone = 'donDeck'; i.zoneGeneration++; i.rested = false; i.faceUp = false }
}
const donMinusStart = (s: GameState, owner: string, abilityId: string): GameState => {
  const a = offeredEffects(s, owner, abilityId)[0] as { effectId: string; donMinus?: { amount: number; eligibleDonIds: string[] } } | undefined
  assert.ok(a?.donMinus, `${abilityId} offered with DON!! -X`)
  return act(s, owner, { type: 'START_EFFECT', effectId: a!.effectId, donMinusIds: a!.donMinus!.eligibleDonIds.slice(0, a!.donMinus!.amount) })
}
const toTrigger = (s: GameState, defender: string) => {
  s = attack(s, put(s, s.activePlayerId!, 'ST10-004', 'characters'), leaderOf(s, defender))
  s = act(s, defender, { type: 'PASS_BLOCKER', battleId: s.battle!.id }); s = act(s, defender, { type: 'PASS_COUNTER', battleId: s.battle!.id })
  s = act(s, s.activePlayerId!, { type: 'RESOLVE_BATTLE', battleId: s.battle!.id })
  const t = legal(s, defender).find(a => a.type === 'ANSWER_TRIGGER') as { choiceId: string } | undefined
  assert.ok(t, 'Trigger offered')
  return act(s, defender, { type: 'ANSWER_TRIGGER', choiceId: t!.choiceId, activate: true })
}

test('M6 ST-10 FAQ ST10-001: Leader Law pays DON -3 to bottom a 3000 power or less Character and play a cost 4 or less Character, each part optional, once per turn', () => {
  let s = game('ST10-001', 5)
  const small = put(s, 'bob', 'ST10-005', 'characters'), big = put(s, 'bob', 'ST10-004', 'characters'), hand = inHand(s, 'alice', 'ST10-009')
  s = donMinusStart(s, 'alice', 'ST10-001.activate-main')
  assert.equal(zones(s, 'alice').donDeck.length, 8, '3 DON!! returned')
  assert.deepEqual(optionIds(s, 'alice'), [small]); assert.ok(!optionIds(s, 'alice').includes(big))
  s = choose(s, 'alice', [small])
  assert.equal(zones(s, 'bob').deck.at(-1), small)
  s = roundTrip(choose(s, 'alice', [hand]))
  while (pendingChoice(s, 'alice')) s = pick(s, 'alice', [])
  assert.equal(zoneOf(s, hand), 'characters')
  assert.equal(offeredEffects(s, 'alice', 'ST10-001.activate-main').length, 0, 'once per turn')
  let t = game('ST10-001', 5)
  put(t, 'bob', 'ST10-005', 'characters')
  t = choose(donMinusStart(t, 'alice', 'ST10-001.activate-main'), 'alice', [])
  assert.ok(pendingChoice(t, 'alice'), 'the play part is still offered (FAQ ST10-001)')
})

test('M6 ST-10 FAQ ST10-002: Leader Luffy adds an active DON with 0 or 8 or more DON on the field only', () => {
  let s = game('ST10-002', 9)
  attachDon(s, 'alice', leaderOf(s, 'alice'), 1)
  s = startEffect(s, 'alice', 'ST10-002.activate-main-don')
  assert.equal(zones(s, 'alice').cost.length + zones(s, 'alice').attached.length, 10)
  let t = game('ST10-002', 5)
  assert.equal(offeredEffects(t, 'alice', 'ST10-002.activate-main-don').length, 0, '5 DON!!: not offered')
  keepDon(t, 'alice', 0)
  t = startEffect(t, 'alice', 'ST10-002.activate-main-don')
  assert.equal(zones(t, 'alice').cost.length, 1); assert.equal(t.instances[zones(t, 'alice').cost[0]].rested, false)
})

test('M6 ST-10 Leader Kid is -1000 on its turn with 4 or more Life and pays DON -1 on attack for +2000', () => {
  let s = game('ST10-003', 3)
  const leader = leaderOf(s, 'alice')
  assert.equal(power(s, leader), 4000, 'your turn, 5 Life')
  s = endTurn(s)
  assert.equal(power(s, leader), 5000, 'opponent turn')
  s = endTurn(s)
  s = payAll(attack(s, leader, leaderOf(s, 'bob')), 'alice')
  assert.equal(power(s, leader), 6000, '5000 - 1000 + 2000')
})

test('M6 ST-10 FAQ ST10-004: Sanji gains Rush only if the opponent has a 5000 power Character; Jinbe with a DON gives -2000', () => {
  let s = game('ST10-001', 7)
  put(s, 'bob', 'ST10-007', 'characters')
  const sanji = inHand(s, 'alice', 'ST10-004')
  s = playCard(s, 'alice', sanji)
  assert.ok(attackerIds(s, 'alice').includes(sanji))
  let t = game('ST10-001', 7)
  const sanji2 = inHand(t, 'alice', 'ST10-004')
  t = playCard(t, 'alice', sanji2)
  assert.ok(!attackerIds(t, 'alice').includes(sanji2))
  let u = game('ST10-001', 3)
  const jinbe = put(u, 'alice', 'ST10-005', 'characters'), foe = put(u, 'bob', 'ST10-004', 'characters')
  attachDon(u, 'alice', jinbe, 1)
  u = choose(attack(u, jinbe, leaderOf(u, 'bob')), 'alice', [foe])
  assert.equal(power(u, foe), 4000)
})

test('M6 FAQ ST10-006: Luffy has Rush and once per turn K.O.s up to 1 Character of 8000 or less when a Blocker is activated; K.O.ing the blocker ends the battle', () => {
  let s = game('ST10-001', 11)
  const luffy = inHand(s, 'alice', 'ST10-006'), blocker = put(s, 'bob', 'ST10-014', 'characters'), bobLife = zones(s, 'bob').life.length
  s = playCard(s, 'alice', luffy)
  assert.equal(hasCombatKeyword(s, luffy, 'RUSH'), true)
  s = attack(s, luffy, leaderOf(s, 'bob'))
  s = act(s, 'bob', { type: 'ACTIVATE_BLOCKER', blockerId: blocker, battleId: s.battle!.id })
  assert.ok(optionIds(s, 'alice').includes(blocker))
  s = choose(s, 'alice', [blocker])
  assert.equal(zoneOf(s, blocker), 'trash'); assert.equal(s.battle, null, 'the battle ends without the Counter Step')
  assert.equal(zones(s, 'bob').life.length, bobLife, 'no damage')
})

test('M6 FAQ ST10-007 ST10-011 ST10-014: Killer, Heat and Wire react once per turn to DON returned to the DON deck', () => {
  let s = game('ST10-001', 7)
  const killer = put(s, 'alice', 'ST10-007', 'characters'), heat = put(s, 'alice', 'ST10-011', 'characters'), wire = put(s, 'alice', 'ST10-014', 'characters'), foe = put(s, 'bob', 'ST10-011', 'characters', { rested: true })
  const hand = zones(s, 'alice').hand.length
  s = donMinusStart(s, 'alice', 'ST10-001.activate-main')
  while (pendingChoice(s, 'alice')) {
    const c = pendingChoice(s, 'alice')!
    if (c.options.some(o => 'triggerId' in o)) s = pick(s, 'alice', [0])
    else if (c.options.some(o => 'instanceId' in o && o.instanceId === foe)) s = choose(s, 'alice', [foe])
    else if (c.min > 0) s = pick(s, 'alice', [0])
    else s = pick(s, 'alice', [])
  }
  assert.equal(zoneOf(s, foe), 'trash', 'Killer K.O.s a rested cost 3 or less once')
  assert.equal(power(s, heat), 6000, 'Heat +2000')
  assert.equal(zones(s, 'alice').hand.length, hand, 'Wire draws 1 and trashes 1 (mandatory)')
  assert.equal(zoneOf(s, killer), 'characters'); assert.equal(zoneOf(s, wire), 'characters')
  s = endTurn(s)
  assert.equal(power(s, heat), 6000, 'until the start of the next turn')
})

test('M6 ST-10 Shachi and Penguin add 2 rested DON with 3 or less DON; Jean Bart rests 1 to add 1 active; Bepo adds 1 when behind on DON', () => {
  let s = game('ST10-001', 5)
  const sp = inHand(s, 'alice', 'ST10-008')
  s = choose(choose(donMinusStart(s, 'alice', 'ST10-001.activate-main'), 'alice', []), 'alice', [sp])
  while (pendingChoice(s, 'alice')) s = pick(s, 'alice', [])
  assert.equal(zoneOf(s, sp), 'characters')
  assert.equal(zones(s, 'alice').cost.length, 4, '2 DON!! left after DON!! -3, then 2 added rested')
  let r = game('ST10-001', 5)
  r = playCard(r, 'alice', inHand(r, 'alice', 'ST10-008'))
  assert.equal(zones(r, 'alice').cost.length, 5, 'paid from the hand with 5 DON!!: nothing')
  let t = game('ST10-001', 5)
  t = playCard(t, 'alice', inHand(t, 'alice', 'ST10-009'))
  t = pick(t, 'alice', [0])
  assert.equal(zones(t, 'alice').cost.length, 6); assert.equal(zones(t, 'alice').cost.filter(id => !t.instances[id].rested).length, 1)
  let u = game('ST10-001', 5)
  keepDon(u, 'alice', 4)
  const bob = u.players[1], extra = bob.zones.donDeck.pop()!
  bob.zones.cost.push(extra); Object.assign(u.instances[extra], { zone: 'cost', zoneGeneration: u.instances[extra].zoneGeneration + 1, faceUp: true })
  u = playCard(u, 'alice', inHand(u, 'alice', 'ST10-012'))
  assert.equal(zones(u, 'alice').cost.length, 5, '4 against 5: one rested DON!!')
})

test('M6 FAQ ST10-010: Law pays DON -1 and with 7 or more cards in the opponent hand trashes 2 of them chosen face-down; Kid gives the Leader +1000', () => {
  let s = game('ST10-001', 5)
  while (zones(s, 'bob').hand.length < 7) put(s, 'bob', 'ST10-009', 'hand')
  s = payAll(playCard(s, 'alice', inHand(s, 'alice', 'ST10-010')), 'alice')
  const c = pendingChoice(s, 'alice')!
  assert.equal(c.min, 2); assert.ok(c.options.every(o => !('instanceId' in o) || !o.instanceId), 'face-down')
  const bobHand = zones(s, 'bob').hand.length
  s = pick(s, 'alice', [0, 1])
  assert.equal(zones(s, 'bob').hand.length, bobHand - 2)
  let t = game('ST10-001', 7)
  t = payAll(playCard(t, 'alice', inHand(t, 'alice', 'ST10-013')), 'alice')
  t = choose(t, 'alice', [leaderOf(t, 'alice')])
  assert.equal(power(t, leaderOf(t, 'alice')), 6000)
  t = endTurn(t)
  assert.equal(power(t, leaderOf(t, 'alice')), 6000, 'kept on the opponent turn')
})

test('M6 ST-10 Sumo Slap Counter +2000 and K.O. 2000 or less; Kong Gatling K.O.s 7000 or less, its Trigger lasts until the end of the next turn; Punk Vise rests and adds DON', () => {
  let s = endTurn(game('ST10-001', 3))
  const slap = put(s, 'alice', 'ST10-015', 'hand'), small = put(s, 'bob', 'ST10-005', 'characters')
  s = attack(s, put(s, 'bob', 'ST10-004', 'characters'), leaderOf(s, 'alice'))
  s = act(s, 'alice', { type: 'PASS_BLOCKER', battleId: s.battle!.id })
  const a = legal(s, 'alice').find(x => x.type === 'PLAY_COUNTER_EVENT') as { eventIds: string[]; paymentDonIds: string[]; battleId: string }
  s = act(s, 'alice', { type: 'PLAY_COUNTER_EVENT', cardId: slap, targetId: null, paymentDonIds: a.paymentDonIds.slice(0, 1), donMinusIds: [], battleId: a.battleId })
  s = choose(choose(s, 'alice', [leaderOf(s, 'alice')]), 'alice', [small])
  assert.equal(zoneOf(s, small), 'trash'); assert.equal(s.battle!.counterModifiers.reduce((n, m) => n + m.amount, 0), 2000)
  let t = game('ST10-001', 5)
  const foe = put(t, 'bob', 'ST10-011', 'characters')
  put(t, 'alice', 'ST10-016', 'hand')
  t = choose(startEffect(t, 'alice', 'ST10-016.main-ko'), 'alice', [foe])
  assert.equal(zoneOf(t, foe), 'trash')
  let u = game('ST10-001', 3)
  put(u, 'alice', 'ST10-016', 'life')
  u = toTrigger(endTurn(u), 'alice')
  u = choose(u, 'alice', [leaderOf(u, 'alice')])
  u = finishBattle(u)
  const leader = leaderOf(u, 'alice')
  assert.equal(power(u, leader), 6000)
  u = endTurn(u)
  assert.equal(power(u, leader), 6000, 'during the next own turn')
  u = endTurn(u)
  assert.equal(power(u, leader), 5000, 'ended with that turn (FAQ ST10-016)')
  let v = game('ST10-001', 5)
  const target = put(v, 'bob', 'ST10-005', 'characters')
  put(v, 'alice', 'ST10-017', 'hand')
  v = choose(startEffect(v, 'alice', 'ST10-017.main-rest-don'), 'alice', [target])
  assert.equal(v.instances[target].rested, true); assert.equal(zones(v, 'alice').cost.length, 6)
  let w = game('ST10-001', 3)
  put(w, 'alice', 'ST10-017', 'life')
  w = toTrigger(endTurn(w), 'alice')
  assert.equal(zones(w, 'alice').cost.length, 4)
})

test('M6 ST-10 Bepo and Kid also act when attacking; Law and Wire block; Law trashes nothing below 7 opposing cards', () => {
  let s = game('ST10-001', 5)
  keepDon(s, 'alice', 3)
  const bepo = put(s, 'alice', 'ST10-012', 'characters'), kid = put(s, 'alice', 'ST10-013', 'characters')
  s = finishBattle(attack(s, bepo, leaderOf(s, 'bob')))
  assert.equal(zones(s, 'alice').cost.length, 4, '3 against 4 DON!!: one added rested')
  s = choose(payAll(attack(s, kid, leaderOf(s, 'bob')), 'alice'), 'alice', [leaderOf(s, 'alice')])
  assert.equal(power(s, leaderOf(s, 'alice')), 6000)
  let t = game('ST10-001', 5)
  while (zones(t, 'bob').hand.length > 6) { const id = zones(t, 'bob').hand.pop()!; zones(t, 'bob').trash.push(id); Object.assign(t.instances[id], { zone: 'trash', zoneGeneration: t.instances[id].zoneGeneration + 1, faceUp: true }) }
  const law = inHand(t, 'alice', 'ST10-010')
  t = payAll(playCard(t, 'alice', law), 'alice')
  assert.equal(pendingChoice(t, 'alice'), undefined, '6 cards: nothing is trashed'); assert.equal(zones(t, 'bob').hand.length, 6)
  const wire = put(t, 'alice', 'ST10-014', 'characters')
  t = endTurn(t)
  t = attack(t, put(t, 'bob', 'ST10-004', 'characters'), leaderOf(t, 'alice'))
  const blockers = (legal(t, 'alice').find(a => a.type === 'ACTIVATE_BLOCKER') as { blockerIds: string[] } | undefined)?.blockerIds ?? []
  assert.ok(blockers.includes(law) && blockers.includes(wire))
})

test('M6 ST-10 certificates validate against the current registry; ST10-001..017 are PLAYABLE_VERIFIED', async () => {
  const { ST10_CERTIFICATIONS, certificationErrors, effectiveStatus } = await import('../src/game/cards/certification')
  const { engineCatalog, currentEngineRegistry } = await import('../src/lib/engine/catalog')
  const { definitions } = engineCatalog(), registry = currentEngineRegistry()
  for (const c of ST10_CERTIFICATIONS) assert.deepEqual(certificationErrors(c, definitions.find(x => x.definitionId === c.definitionId), registry), [], c.definitionId)
  for (let i = 1; i <= 17; i++) { const n = `ST10-${String(i).padStart(3, '0')}`; assert.equal(effectiveStatus(definitions.find(x => x.number === n)!), 'PLAYABLE_VERIFIED', n) }
})
