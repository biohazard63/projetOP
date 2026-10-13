import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateCharacteristics } from '../src/game/effects/characteristics'
import type { GameState } from '../src/game/core/types'
import { act, attachDon, attack, choose, deckFor, definitionOf, endTurn, finishBattle, inHand, leaderOf, legal, newGame, optionIds, pendingChoice, playCard, put, roundTrip, startEffect, toMain, zoneOf } from './helpers/m6'

// M6 ST-12 (Roronoa Zoro & Sanji, green/blue). Scenarios follow the official text, the ST-12 FAQ and the errata snapshot
// (docs/game/evidence/m6/sources/qa_st-12.txt, errata-all.json), through public commands only.
const ST12 = ['ST12-002', 'ST12-003', 'ST12-004', 'ST12-005', 'ST12-006', 'ST12-007', 'ST12-008', 'ST12-009', 'ST12-010', 'ST12-011', 'ST12-012', 'ST12-013', 'ST12-014', 'ST12-015', 'ST12-016', 'ST12-017']
const game = (turn = 3) => toMain(newGame(deckFor('ST12-001', ST12), deckFor('ST12-001', ST12)), turn)
const zones = (s: GameState, owner: string) => s.players.find(p => p.id === owner)!.zones
const power = (s: GameState, id: string) => evaluateCharacteristics(s, id).power.current
const pick = (s: GameState, owner: string, indexes: number[]) => { const c = pendingChoice(s, owner); assert.ok(c, 'pending choice'); return act(s, owner, { type: 'ANSWER_CHOICE', choiceId: c!.choiceId, tokens: indexes.map(i => c!.options[i].token) }) }
const lifeTrigger = (s: GameState, defender: string) => {
  s = attack(s, put(s, s.activePlayerId!, 'ST12-005', 'characters'), leaderOf(s, defender))
  s = act(s, defender, { type: 'PASS_BLOCKER', battleId: s.battle!.id }); s = act(s, defender, { type: 'PASS_COUNTER', battleId: s.battle!.id })
  s = act(s, s.activePlayerId!, { type: 'RESOLVE_BATTLE', battleId: s.battle!.id })
  const t = legal(s, defender).find(a => a.type === 'ANSWER_TRIGGER') as { choiceId: string } | undefined
  assert.ok(t, 'Trigger offered')
  return act(s, defender, { type: 'ANSWER_TRIGGER', choiceId: t!.choiceId, activate: true })
}
/** Scenario setup: moves hand cards to the trash until `keep` remain (as a different opening hand would). */
const trimHand = (s: GameState, owner: string, keep: number) => {
  const p = s.players.find(x => x.id === owner)!
  while (p.zones.hand.length > keep) { const id = p.zones.hand.pop()!; p.zones.trash.push(id); const i = s.instances[id]; i.zone = 'trash'; i.zoneGeneration++; i.faceUp = true }
}
const counterEvent = (s: GameState, owner: string, cardId: string): GameState => {
  const a = legal(s, owner).find(x => x.type === 'PLAY_COUNTER_EVENT') as { eventIds: string[]; paymentDonIds: string[]; battleId: string } | undefined
  assert.ok(a?.eventIds.includes(cardId), 'Counter Event offered')
  const c = definitionOf(s.catalog.definitions.find(d => d.definitionId === s.instances[cardId].definitionId)!.number).cost ?? 0
  return act(s, owner, { type: 'PLAY_COUNTER_EVENT', cardId, targetId: null, paymentDonIds: a!.paymentDonIds.slice(0, c), donMinusIds: [], battleId: a!.battleId })
}

test('M6 ST-12 FAQ ST12-001: the Leader returns a cost 2 or more Character to set active a Character of 7000 current power or less, once per turn', () => {
  let s = game(5)
  const leader = leaderOf(s, 'alice'), kuina = put(s, 'alice', 'ST12-002', 'characters'), perona = put(s, 'alice', 'ST12-005', 'characters', { rested: true })
  const zoro = put(s, 'alice', 'ST12-008', 'characters', { rested: true }), cheap = put(s, 'alice', 'ST12-009', 'characters')
  attachDon(s, 'alice', leader, 1); attachDon(s, 'alice', zoro, 2)
  s = attack(s, leader, leaderOf(s, 'bob'))
  assert.ok(!optionIds(s, 'alice').includes(cheap), 'cost 2 or more')
  s = roundTrip(choose(s, 'alice', [kuina]))
  assert.equal(zoneOf(s, kuina), 'hand')
  assert.ok(!optionIds(s, 'alice').includes(zoro), '6000 + 2000 (DON!!) is above 7000 (FAQ ST12-001)')
  s = choose(s, 'alice', [perona])
  assert.equal(s.instances[perona].rested, false)
  let t = game(5)
  const lead = leaderOf(t, 'alice'), keep = put(t, 'alice', 'ST12-002', 'characters')
  attachDon(t, 'alice', lead, 1)
  t = choose(attack(t, lead, leaderOf(t, 'bob')), 'alice', [])
  assert.equal(zoneOf(t, keep), 'characters'); assert.equal(pendingChoice(t, 'alice'), undefined, 'declining the cost ends the ability')
})

test('M6 ST-12 Kuina rests to rest a cost 4 or less opposing Character; its Trigger plays it', () => {
  let s = game(3)
  const kuina = put(s, 'alice', 'ST12-002', 'characters'), small = put(s, 'bob', 'ST12-005', 'characters'), big = put(s, 'bob', 'ST12-013', 'characters')
  s = startEffect(s, 'alice', 'ST12-002.activate-main-rest')
  assert.equal(s.instances[kuina].rested, true)
  assert.deepEqual(optionIds(s, 'alice'), [small]); assert.ok(!optionIds(s, 'alice').includes(big))
  s = choose(s, 'alice', [small])
  assert.equal(s.instances[small].rested, true)
  let t = game(3)
  const lifeKuina = put(t, 'alice', 'ST12-002', 'life')
  t = lifeTrigger(endTurn(t), 'alice')
  assert.equal(zoneOf(t, lifeKuina), 'characters')
})

test('M6 ST-12 FAQ ST12-003: Mihawk with 2 or less Characters plays a Muggy Kingdom or Slash cost 4 or less Character rested; not with 3', () => {
  let s = game(5)
  const perona = inHand(s, 'alice', 'ST12-005'), zoro = inHand(s, 'alice', 'ST12-008'), sanji = inHand(s, 'alice', 'ST12-011'), zeff = inHand(s, 'alice', 'ST12-013')
  put(s, 'alice', 'ST12-009', 'characters')
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST12-003'))
  const options = optionIds(s, 'alice')
  assert.ok(options.includes(perona) && options.includes(zoro), '{Muggy Kingdom} or <Slash>')
  assert.ok(!options.includes(sanji) && !options.includes(zeff), 'Strike, or cost above 4')
  assert.ok(options.every(id => s.instances[id].definitionId !== definitionOf('ST12-003').definitionId), 'other than [Dracule Mihawk]')
  s = choose(s, 'alice', [perona])
  assert.equal(zoneOf(s, perona), 'characters'); assert.equal(s.instances[perona].rested, true)
  let t = game(5)
  put(t, 'alice', 'ST12-009', 'characters'); put(t, 'alice', 'ST12-015', 'characters')
  t = playCard(t, 'alice', inHand(t, 'alice', 'ST12-003'))
  assert.equal(pendingChoice(t, 'alice'), undefined, '3 Characters including this one (FAQ ST12-003)')
})

test('M6 ST-12 Yosaku and Johnny with a DON choose to rest a cost 2 or less or K.O. a rested cost 2 or less', () => {
  let s = game(3)
  const yj = put(s, 'alice', 'ST12-006', 'characters'), active = put(s, 'bob', 'ST12-015', 'characters'), rested = put(s, 'bob', 'ST12-011', 'characters', { rested: true })
  attachDon(s, 'alice', yj, 1)
  s = attack(s, yj, leaderOf(s, 'bob'))
  s = pick(s, 'alice', [0])
  assert.ok(optionIds(s, 'alice').includes(active))
  s = choose(s, 'alice', [active])
  assert.equal(s.instances[active].rested, true)
  let t = game(3)
  const yj2 = put(t, 'alice', 'ST12-006', 'characters'), awake = put(t, 'bob', 'ST12-015', 'characters'), asleep = put(t, 'bob', 'ST12-011', 'characters', { rested: true })
  attachDon(t, 'alice', yj2, 1)
  t = pick(attack(t, yj2, leaderOf(t, 'bob')), 'alice', [1])
  assert.deepEqual(optionIds(t, 'alice'), [asleep], 'K.O. only a rested one')
  t = choose(t, 'alice', [asleep])
  assert.equal(zoneOf(t, asleep), 'trash'); assert.equal(zoneOf(t, awake), 'characters')
})

test('M6 ST-12 Rika pays 2 DON to set active a Slash cost 4 or less Character while the opponent has 3 or more Life; declining rests nothing', () => {
  let s = game(5)
  const zoro = put(s, 'alice', 'ST12-008', 'characters', { rested: true }), perona = put(s, 'alice', 'ST12-005', 'characters', { rested: true })
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST12-007'))
  const before = zones(s, 'alice').cost.filter(id => s.instances[id].rested).length
  s = pick(s, 'alice', [0, 1])
  assert.equal(zones(s, 'alice').cost.filter(id => s.instances[id].rested).length, before + 2)
  assert.deepEqual(optionIds(s, 'alice'), [zoro], '<Slash> only')
  s = choose(s, 'alice', [zoro])
  assert.equal(s.instances[zoro].rested, false); assert.equal(s.instances[perona].rested, true)
  let t = game(5)
  put(t, 'alice', 'ST12-008', 'characters', { rested: true })
  t = playCard(t, 'alice', inHand(t, 'alice', 'ST12-007'))
  const restedBefore = zones(t, 'alice').cost.filter(id => t.instances[id].rested).length
  t = pick(t, 'alice', [])
  assert.equal(zones(t, 'alice').cost.filter(id => t.instances[id].rested).length, restedBefore); assert.equal(pendingChoice(t, 'alice'), undefined)
})

test('M6 ST-12 Roronoa Zoro with a DON rests a cost 6 or less opposing Character when attacking', () => {
  let s = game(3)
  const zoro = put(s, 'alice', 'ST12-008', 'characters'), target = put(s, 'bob', 'ST12-013', 'characters')
  attachDon(s, 'alice', zoro, 1)
  s = choose(attack(s, zoro, leaderOf(s, 'bob')), 'alice', [target])
  assert.equal(s.instances[target].rested, true)
})

test('M6 ST-12 FAQ ST12-010: Ivankov reveals the top card and plays it only if it is a cost 2 Character, else puts it top or bottom; draws once per turn on attack', () => {
  let s = game(5)
  const top = put(s, 'alice', 'ST12-015', 'deckTop'), handTwo = inHand(s, 'alice', 'ST12-011')
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST12-010'))
  assert.ok(s.events.some(e => e.type === 'CARD_REVEALED' && e.revealedCard?.definitionId === definitionOf('ST12-015').definitionId), 'revealed publicly')
  assert.deepEqual(optionIds(s, 'alice'), [top], 'only the revealed card, never a hand card (FAQ ST12-010)')
  assert.ok(!optionIds(s, 'alice').includes(handTwo))
  s = roundTrip(choose(s, 'alice', [top]))
  assert.equal(zoneOf(s, top), 'characters'); assert.equal(pendingChoice(s, 'alice'), undefined, 'no rest to place')
  let t = game(5)
  const notTwo = put(t, 'alice', 'ST12-013', 'deckTop')
  t = playCard(t, 'alice', inHand(t, 'alice', 'ST12-010'))
  t = pick(t, 'alice', [0])
  assert.equal(zones(t, 'alice').deck.at(-1), notTwo, 'the revealed card to the bottom')
  let u = game(5)
  const ivankov = put(u, 'alice', 'ST12-010', 'characters')
  trimHand(u, 'alice', 6)
  const hand = zones(u, 'alice').hand.length
  u = finishBattle(attack(u, ivankov, leaderOf(u, 'bob')))
  assert.equal(zones(u, 'alice').hand.length, hand + 1)
})

test('M6 ST-12 FAQ ST12-011: Sanji keeps +2000 until the start of the next turn even if the hand grows, and twice gives +4000', () => {
  let s = game(5)
  const sanji = put(s, 'alice', 'ST12-011', 'characters'), leader = leaderOf(s, 'alice'), returned = put(s, 'alice', 'ST12-002', 'characters')
  trimHand(s, 'alice', 3)
  attachDon(s, 'alice', sanji, 1); attachDon(s, 'alice', leader, 1)
  s = finishBattle(attack(s, sanji, leaderOf(s, 'bob')))
  assert.equal(power(s, sanji), 6000, '3000 + 1000 (DON!!) + 2000')
  s = choose(attack(s, leader, leaderOf(s, 'bob')), 'alice', [returned])
  s = finishBattle(choose(s, 'alice', [sanji]))
  s = finishBattle(attack(s, sanji, leaderOf(s, 'bob')))
  assert.equal(power(s, sanji), 8000, 'twice: +4000')
  s = endTurn(s)
  assert.equal(power(s, sanji), 7000, 'opponent turn: no DON!! bonus, +4000 kept')
  s = endTurn(s)
  assert.equal(power(s, sanji), 3000 + 1000 * zones(s, 'alice').attached.filter(id => s.instances[id].attachedTo === sanji).length, 'expired at the start of the next turn')
})

test('M6 ST-12 Charlotte Pudding returns itself to its owner hand', () => {
  let s = game(3)
  const pudding = put(s, 'alice', 'ST12-012', 'characters')
  s = startEffect(s, 'alice', 'ST12-012.activate-main-return')
  assert.equal(zoneOf(s, pudding), 'hand')
})

test('M6 ST-12 Zeff looks at 3 on play and on attack plays a revealed cost 2 Character rested; Duval blocks and looks at 3', () => {
  let s = game(5)
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST12-013'))
  const three = [...zones(s, 'alice').deck.slice(0, 3)]
  assert.deepEqual(optionIds(s, 'alice').sort(), [...three].sort())
  s = choose(s, 'alice', three); s = pick(s, 'alice', [])
  assert.deepEqual(zones(s, 'alice').deck.slice(0, 3), three)
  let t = game(5)
  const zeff = put(t, 'alice', 'ST12-013', 'characters'), top = put(t, 'alice', 'ST12-006', 'deckTop')
  t = choose(attack(t, zeff, leaderOf(t, 'bob')), 'alice', [top])
  assert.equal(zoneOf(t, top), 'characters'); assert.equal(t.instances[top].rested, true, 'played rested')
  let u = game(3)
  const duval = inHand(u, 'alice', 'ST12-014')
  u = playCard(u, 'alice', duval)
  assert.equal(pendingChoice(u, 'alice')!.options.length, 3)
  u = endTurn(pick(choose(u, 'alice', zones(u, 'alice').deck.slice(0, 3)), 'alice', []))
  u = attack(u, put(u, 'bob', 'ST12-005', 'characters'), leaderOf(u, 'alice'))
  assert.ok((legal(u, 'alice').find(a => a.type === 'ACTIVATE_BLOCKER') as { blockerIds: string[] } | undefined)?.blockerIds.includes(duval))
})

test('M6 ST-12 Lion Strike rests a cost 4 or less opposing Character as Main, Counter and Trigger, never a Leader', () => {
  let s = game(3)
  const target = put(s, 'bob', 'ST12-005', 'characters')
  put(s, 'alice', 'ST12-016', 'hand')
  s = startEffect(s, 'alice', 'ST12-016.main-rest')
  assert.ok(!optionIds(s, 'alice').includes(leaderOf(s, 'bob')), 'a Leader has no cost')
  s = choose(s, 'alice', [target])
  assert.equal(s.instances[target].rested, true)
  let t = endTurn(game(3))
  const attacker = put(t, 'bob', 'ST12-005', 'characters'), lion = put(t, 'alice', 'ST12-016', 'hand'), other = put(t, 'bob', 'ST12-002', 'characters')
  t = attack(t, attacker, leaderOf(t, 'alice'))
  t = act(t, 'alice', { type: 'PASS_BLOCKER', battleId: t.battle!.id })
  t = counterEvent(t, 'alice', lion)
  t = choose(t, 'alice', [other])
  assert.equal(t.instances[other].rested, true)
  let u = game(3)
  put(u, 'alice', 'ST12-016', 'life')
  u = endTurn(u)
  const foe = put(u, 'bob', 'ST12-002', 'characters')
  u = lifeTrigger(u, 'alice')
  u = choose(u, 'alice', [foe])
  assert.equal(u.instances[foe].rested, true)
})

test('M6 ST-12 Plastic Surgery Shot gives +2000 this battle then plays a revealed cost 2 Character', () => {
  let s = endTurn(game(3))
  const shot = put(s, 'alice', 'ST12-017', 'hand'), top = put(s, 'alice', 'ST12-015', 'deckTop')
  s = attack(s, put(s, 'bob', 'ST12-005', 'characters'), leaderOf(s, 'alice'))
  s = act(s, 'alice', { type: 'PASS_BLOCKER', battleId: s.battle!.id })
  s = counterEvent(s, 'alice', shot)
  s = choose(s, 'alice', [leaderOf(s, 'alice')])
  assert.equal(s.battle!.counterModifiers.reduce((n, m) => n + m.amount, 0), 2000)
  s = choose(s, 'alice', [top])
  assert.equal(zoneOf(s, top), 'characters')
})

test('M6 ST-12 cards without other ability are played for their printed cost, keep their power and defend with their Counter or [Blocker]', () => {
  for (const number of ['ST12-004', 'ST12-005', 'ST12-009', 'ST12-015']) {
    let s = game(9)
    const d = s.catalog.definitions.find(x => x.number === number)!
    const played = inHand(s, 'alice', number), held = inHand(s, 'alice', number, [played])
    s = playCard(s, 'alice', played)
    assert.equal(zoneOf(s, played), 'characters'); assert.equal(power(s, played), d.power, `${number} power`)
    s = endTurn(s)
    s = attack(s, put(s, 'bob', 'ST12-005', 'characters'), leaderOf(s, 'alice'))
    s = act(s, 'alice', { type: 'PASS_BLOCKER', battleId: s.battle!.id })
    s = act(s, 'alice', { type: 'PLAY_COUNTER_CHARACTER', cardId: held, targetId: leaderOf(s, 'alice'), battleId: s.battle!.id })
    assert.equal(s.battle!.counterModifiers.reduce((n, m) => n + m.amount, 0), d.counter)
  }
})

test('M6 ST-12 certificates validate against the current registry; all 17 numbers are PLAYABLE_VERIFIED', async () => {
  const { ST12_CERTIFICATIONS, certificationErrors, effectiveStatus } = await import('../src/game/cards/certification')
  const { engineCatalog, currentEngineRegistry } = await import('../src/lib/engine/catalog')
  const { definitions } = engineCatalog(), registry = currentEngineRegistry()
  for (const c of ST12_CERTIFICATIONS) assert.deepEqual(certificationErrors(c, definitions.find(x => x.definitionId === c.definitionId), registry), [], c.definitionId)
  for (let i = 1; i <= 17; i++) { const n = `ST12-${String(i).padStart(3, '0')}`; assert.equal(effectiveStatus(definitions.find(x => x.number === n)!), 'PLAYABLE_VERIFIED', n) }
})
