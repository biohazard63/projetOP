import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateCharacteristics } from '../src/game/effects/characteristics'
import type { GameState } from '../src/game/core/types'
import { act, attachDon, attack, attackerIds, choose, deckFor, definitionOf, endTurn, finishBattle, inHand, leaderOf, legal, newGame, offeredEffects, optionIds, pendingChoice, playCard, put, roundTrip, startEffect, toMain, zoneOf } from './helpers/m6'

// M6 ST-32 (GREEN Roronoa Zoro), official English texts (series 569032, <Slash> icons from the archived HTML). Scenarios follow
// the official text, the ST-32, OP-12, ST-23-28, EB02/OP11 ("cannot be rested") and OP-09 FAQ and CR 1.2.1 §8-3-1, through
// public commands only.
const ST32 = ['ST32-001', 'ST32-002', 'ST32-003', 'ST32-004', 'ST32-005', 'OP10-036', 'OP12-023', 'OP12-026', 'OP12-027', 'OP12-028', 'OP12-031', 'OP15-036', 'ST24-005', 'OP12-039']
const BOB = ['OP03-106', 'OP03-107', 'OP03-115', 'OP03-110']
const game = (turn = 5, leader = 'OP12-020') => toMain(newGame(deckFor(leader, ST32), deckFor('OP03-099', BOB)), turn)
const kaido = (turn = 10) => toMain(newGame(deckFor('OP12-020', ST32), deckFor('ST04-001', ['ST04-003', 'ST04-002'])), turn)
const zones = (s: GameState, owner: string) => s.players.find(p => p.id === owner)!.zones
const power = (s: GameState, id: string) => evaluateCharacteristics(s, id).power.current
const field = (s: GameState, owner: string, number: string, rested = false) => put(s, owner, number, 'characters', { playedEarlier: true, rested })
const activeDon = (s: GameState, owner = 'alice') => zones(s, owner).cost.filter(id => !s.instances[id].rested).length
const pick = (s: GameState, owner: string, indexes: number[]) => { const c = pendingChoice(s, owner)!; return act(s, owner, { type: 'ANSWER_CHOICE', choiceId: c.choiceId, tokens: indexes.map(i => c.options[i].token) }) }
const startFrom = (s: GameState, owner: string, abilityId: string, sourceId: string) => {
  const a = offeredEffects(s, owner, abilityId).find(x => x.effectId.includes(sourceId))
  assert.ok(a, `${abilityId} from ${sourceId} not offered`)
  return act(s, owner, { type: 'START_EFFECT', effectId: a!.effectId })
}
const blockers = (s: GameState, owner: string) => (legal(s, owner).find(x => x.type === 'ACTIVATE_BLOCKER') as { blockerIds: string[] } | undefined)?.blockerIds ?? []
const kaidoKO = (s: GameState, target: string) => {
  s = playCard(s, 'bob', inHand(s, 'bob', 'ST04-003'))
  s = act(s, 'bob', { type: 'ANSWER_CHOICE', choiceId: pendingChoice(s, 'bob')!.choiceId, tokens: pendingChoice(s, 'bob')!.options.slice(0, 5).map(o => o.token) })
  return choose(s, 'bob', [target])
}
const giveDonToLeader = (s: GameState) => { s = choose(s, 'alice', zones(s, 'alice').cost.filter(id => s.instances[id].rested).slice(0, 3)); return s }

test('M6 FAQ OP12-020: Leader Zoro with 3 DON!! sets itself active after battling an opposing Character (a blocking one too), then cannot attack Characters of base cost 7 or less this turn', () => {
  let s = endTurn(game(7))
  const foe = field(s, 'bob', 'OP03-106', true)
  s = endTurn(s)
  const leader = leaderOf(s, 'alice')
  let t = endTurn(game(7))
  const f2 = field(t, 'bob', 'OP03-106', true)
  t = endTurn(t)
  const l2 = leaderOf(t, 'alice')
  t = finishBattle(attack(t, l2, f2))
  attachDon(t, 'alice', l2, 3)
  t = roundTrip(startEffect(t, 'alice', 'OP12-020.activate-main-active'))
  assert.equal(t.instances[l2].rested, false, 'set active')
  const pair = (legal(t, 'alice').find(x => x.type === 'DECLARE_ATTACK') as { targetIdsByAttacker: Record<string, string[]> }).targetIdsByAttacker[l2]
  assert.ok(!pair.includes(foe) && !pair.includes(f2), 'no Character of base cost 7 or less'); assert.ok(pair.includes(leaderOf(t, 'bob')))
  let u = game(7)
  const l3 = leaderOf(u, 'alice')
  u = finishBattle(attack(u, l3, leaderOf(u, 'bob')))
  attachDon(u, 'alice', l3, 3)
  u = startEffect(u, 'alice', 'OP12-020.activate-main-active')
  assert.equal(u.instances[l3].rested, true, 'no battle with a Character: nothing')
  let w = endTurn(game(7))
  const galette = field(w, 'bob', 'OP03-107')
  w = endTurn(w)
  const l4 = leaderOf(w, 'alice')
  w = attack(w, l4, leaderOf(w, 'bob'))
  w = act(w, 'bob', { type: 'ACTIVATE_BLOCKER', blockerId: galette, battleId: w.battle!.id })
  w = act(w, 'bob', { type: 'PASS_COUNTER', battleId: w.battle!.id }); w = act(w, 'alice', { type: 'RESOLVE_BATTLE', battleId: w.battle!.id })
  attachDon(w, 'alice', l4, 3)
  w = startEffect(w, 'alice', 'OP12-020.activate-main-active')
  assert.equal(w.instances[l4].rested, false, 'FAQ OP12-020: a blocking Character counts')
  void leader; void foe
})

test('M6 ST-32 Kuina rests itself to rest an opposing base cost 4 or less and gives up to 3 rested DON!! to the Zoro Leader; Perona then sets a DON!! active once per turn', () => {
  let s = endTurn(game(7))
  const foe = field(s, 'bob', 'OP03-110')
  s = endTurn(s)
  const kuina = field(s, 'alice', 'OP12-026'), perona = field(s, 'alice', 'OP10-036'), leader = leaderOf(s, 'alice')
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST32-005'))
  while (pendingChoice(s, 'alice')) s = choose(s, 'alice', [])
  const a0 = activeDon(s), restedBefore = zones(s, 'alice').cost.filter(id => s.instances[id].rested).length
  s = startEffect(s, 'alice', 'OP12-026.activate-main-rest')
  s = choose(s, 'alice', [foe])
  assert.equal(optionIds(s, 'alice').length, restedBefore, 'every rested DON!! is offered for the Zoro Leader (up to 3)')
  s = choose(s, 'alice', [])
  assert.equal(s.instances[kuina].rested, true); assert.equal(s.instances[foe].rested, true)
  void leader
  const restedDon = optionIds(s, 'alice')
  assert.ok(restedDon.length && restedDon.every(id => s.instances[id].kind === 'DON'), 'Perona: a Character was rested by your effect (Kuina, CR 1.2.1 §8-3-1)')
  s = roundTrip(choose(s, 'alice', [restedDon[0]]))
  assert.equal(activeDon(s), a0 + 1)
  assert.equal(pendingChoice(s, 'alice'), undefined, 'once per turn')
  void perona
})

test('M6 FAQ OP12-027: Koushirou rests itself instead of a Slash Character of cost 5 or less being K.O.d by an opposing effect; it has [Blocker]', () => {
  let s = kaido(10)
  const kou = field(s, 'alice', 'OP12-027'), oden = field(s, 'alice', 'ST32-002')
  s = kaidoKO(s, oden)
  s = roundTrip(pick(s, 'alice', [0]))
  assert.equal(zoneOf(s, oden), 'characters'); assert.equal(s.instances[kou].rested, true)
  let t = kaido(10)
  const k2 = field(t, 'alice', 'OP12-027'), hiyori = field(t, 'alice', 'OP12-028')
  t = kaidoKO(t, hiyori)
  assert.equal(zoneOf(t, hiyori), 'trash', 'Hiyori is <Wisdom>: not protected'); void k2
  let u = game(9)
  const k3 = field(u, 'alice', 'OP12-027')
  u = endTurn(u)
  u = attack(u, field(u, 'bob', 'OP03-106'), leaderOf(u, 'alice'))
  assert.ok(blockers(u, 'alice').includes(k3))
})

test('M6 FAQ OP12-028: Hiyori rests a DON!! and itself with a Zoro Leader to look at 5 for a Slash card of any colour or a green Event', () => {
  let s = game(5)
  const ev = put(s, 'alice', 'OP12-039', 'deckTop'), slash = put(s, 'alice', 'ST32-005', 'deckTop'), hiyori2 = put(s, 'alice', 'OP12-028', 'deckTop')
  const hiyori = field(s, 'alice', 'OP12-028')
  s = startEffect(s, 'alice', 'OP12-028.activate-main-search')
  assert.ok(optionIds(s, 'alice').includes(ev)); assert.ok(optionIds(s, 'alice').includes(slash)); assert.ok(!optionIds(s, 'alice').includes(hiyori2), 'Hiyori is <Wisdom>, not an Event')
  s = choose(s, 'alice', [slash])
  while (pendingChoice(s, 'alice')) s = pick(s, 'alice', pendingChoice(s, 'alice')!.options.map((_, i) => i))
  s = roundTrip(s)
  assert.equal(zoneOf(s, slash), 'hand'); assert.equal(s.instances[hiyori].rested, true)
})

test('M6 ST-32 Tashigi rests an opposing base cost 6 or less and gives 3 rested DON!! to the Zoro Leader; the Event sets the Zoro Leader active and its Trigger gives +1000', () => {
  let s = endTurn(game(9))
  const foe = field(s, 'bob', 'OP03-106')
  s = endTurn(s)
  const leader = leaderOf(s, 'alice')
  s = playCard(s, 'alice', inHand(s, 'alice', 'OP12-031'))
  s = choose(s, 'alice', [foe])
  s = roundTrip(giveDonToLeader(s))
  assert.equal(s.instances[foe].rested, true); assert.equal(zones(s, 'alice').attached.filter(id => s.instances[id].attachedTo === leader).length, 3)
  s = finishBattle(attack(s, leader, leaderOf(s, 'bob')))
  s = startFrom(s, 'alice', 'OP12-039.main-active', inHand(s, 'alice', 'OP12-039'))
  assert.equal(s.instances[leader].rested, false)
  let t = endTurn(game(3))
  put(t, 'alice', 'OP12-039', 'life')
  t = attack(t, field(t, 'bob', 'OP03-106'), leaderOf(t, 'alice'))
  t = act(t, 'alice', { type: 'PASS_BLOCKER', battleId: t.battle!.id }); t = act(t, 'alice', { type: 'PASS_COUNTER', battleId: t.battle!.id })
  t = act(t, 'bob', { type: 'RESOLVE_BATTLE', battleId: t.battle!.id })
  t = act(t, 'alice', { type: 'ANSWER_TRIGGER', choiceId: (legal(t, 'alice').find(a => a.type === 'ANSWER_TRIGGER') as { choiceId: string }).choiceId, activate: true })
  t = choose(t, 'alice', [leaderOf(t, 'alice')])
  assert.equal(power(t, leaderOf(t, 'alice')), 6000)
})

test('M6 FAQ ST24-005: X.Drake with a Supernovas Leader rests a cost 5 or less and sets a DON!! active at the end of the turn, after the End of Your Turn effects; Ryuma K.O.s a rested cost 4 or less on play and when attacking', () => {
  let s = endTurn(game(7))
  const foe = field(s, 'bob', 'OP03-106')
  s = endTurn(s)
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST24-005'))
  s = roundTrip(choose(s, 'alice', [foe]))
  assert.equal(s.instances[foe].rested, true)
  const rested = zones(s, 'alice').cost.filter(id => s.instances[id].rested).length
  s = act(s, 'alice', { type: 'END_MAIN' })
  s = roundTrip(choose(s, 'alice', [zones(s, 'alice').cost.find(id => s.instances[id].rested)!]))
  assert.equal(zones(s, 'alice').cost.filter(id => s.instances[id].rested).length, rested - 1)
  let t = endTurn(game(7, 'OP06-022'))
  const f2 = field(t, 'bob', 'OP03-106')
  t = endTurn(t)
  t = playCard(t, 'alice', inHand(t, 'alice', 'ST24-005'))
  assert.equal(pendingChoice(t, 'alice'), undefined, 'non-Supernovas Leader: nothing'); assert.equal(t.instances[f2].rested, false)
  let u = endTurn(game(9))
  const r1 = field(u, 'bob', 'OP03-110', true), r2 = field(u, 'bob', 'OP03-106', true)
  u = endTurn(u)
  const ryuma = inHand(u, 'alice', 'OP15-036')
  u = playCard(u, 'alice', ryuma)
  u = choose(u, 'alice', [r1])
  assert.equal(zoneOf(u, r1), 'trash')
  let w = endTurn(game(9))
  const r3 = field(w, 'bob', 'OP03-110', true)
  w = endTurn(w)
  w = attack(w, field(w, 'alice', 'OP15-036'), leaderOf(w, 'bob'))
  w = roundTrip(choose(w, 'alice', [r3]))
  assert.equal(zoneOf(w, r3), 'trash'); void r2
})

test('M6 ST-32 Kin emon rests the Slash Leader or 1 DON!! to draw 2 and trash 1', () => {
  let s = game(5)
  const leader = leaderOf(s, 'alice'), h = zones(s, 'alice').hand.length
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST32-001'))
  s = choose(s, 'alice', [leader])
  s = roundTrip(choose(s, 'alice', [zones(s, 'alice').hand[0]]))
  assert.equal(s.instances[leader].rested, true); assert.equal(zones(s, 'alice').hand.length, h - 1 + 2 - 1)
  let t = game(5)
  t = playCard(t, 'alice', inHand(t, 'alice', 'ST32-001'))
  t = choose(t, 'alice', [])
  const don = optionIds(t, 'alice')[0]
  t = choose(t, 'alice', [don])
  t = choose(t, 'alice', [zones(t, 'alice').hand[0]])
  assert.equal(t.instances[don].rested, true)
  let u = game(5, 'ST02-001')
  u = playCard(u, 'alice', inHand(u, 'alice', 'ST32-001'))
  assert.ok(!optionIds(u, 'alice').includes(leaderOf(u, 'alice')), 'a non-<Slash> Leader is not offered')
})

test('M6 FAQ EB02-011: after Oden, the chosen opposing Character cannot be rested until the end of the next opposing End Phase, so it cannot attack nor block nor be rested by effects', () => {
  let s = endTurn(game(9))
  const foe = field(s, 'bob', 'OP03-106'), galette = field(s, 'bob', 'OP03-107')
  s = endTurn(s)
  const h = zones(s, 'alice').hand.length
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST32-002'))
  s = choose(s, 'alice', [foe])
  s = roundTrip(s)
  assert.equal(zones(s, 'alice').hand.length, h - 1 + 1)
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST32-004'))
  assert.ok(optionIds(s, 'alice').includes(galette))
  s = choose(s, 'alice', [galette])
  s = endTurn(s)
  assert.ok(!attackerIds(s, 'bob').includes(foe), 'cannot attack')
  s = endTurn(s)
  let t = endTurn(game(9))
  const f2 = field(t, 'bob', 'OP03-106'), b2 = field(t, 'bob', 'OP03-107')
  t = endTurn(t)
  t = playCard(t, 'alice', inHand(t, 'alice', 'ST32-002'))
  t = choose(t, 'alice', [b2])
  t = playCard(t, 'alice', inHand(t, 'alice', 'OP12-031'))
  t = choose(t, 'alice', [b2])
  assert.equal(t.instances[b2].rested, false, 'not rested by an effect')
  while (pendingChoice(t, 'alice')) t = choose(t, 'alice', [])
  t = attack(t, leaderOf(t, 'alice'), leaderOf(t, 'bob'))
  assert.ok(!blockers(t, 'bob').includes(b2), 'cannot activate [Blocker]')
  void f2
})

test('M6 FAQ ST32-003: Mihawk draws 1 and trashes 1 when it becomes rested on your turn and, with a Slash Leader, plays a Perona or a Slash Character of cost 5 or less', () => {
  let s = game(9)
  const perona = put(s, 'alice', 'OP10-036', 'hand'), kawa = put(s, 'alice', 'OP12-023', 'hand'), mihawk = inHand(s, 'alice', 'ST32-003')
  s = playCard(s, 'alice', mihawk)
  assert.ok(optionIds(s, 'alice').includes(perona)); assert.ok(optionIds(s, 'alice').includes(kawa))
  s = roundTrip(choose(s, 'alice', [perona]))
  assert.equal(zoneOf(s, perona), 'characters')
  let t = game(7)
  const m2 = field(t, 'alice', 'ST32-003'), h = zones(t, 'alice').hand.length
  t = attack(t, m2, leaderOf(t, 'bob'))
  t = roundTrip(choose(t, 'alice', [zones(t, 'alice').hand[0]]))
  assert.equal(zones(t, 'alice').hand.length, h + 1 - 1)
  let u = game(9, 'ST02-001')
  u = playCard(u, 'alice', inHand(u, 'alice', 'ST32-003'))
  assert.equal(pendingChoice(u, 'alice'), undefined, 'non-<Slash> Leader: nothing')
})

test('M6 FAQ ST32-005: Rayleigh with a Slash Leader and Zoro have [Rush: Character] and rest opposing cost 2 or less Characters on play; Kawamatsu has no ability', () => {
  let s = endTurn(game(7))
  const a = field(s, 'bob', 'OP03-107'), b = field(s, 'bob', 'OP03-115')
  s = endTurn(s)
  const ray = inHand(s, 'alice', 'ST32-004')
  s = playCard(s, 'alice', ray)
  s = roundTrip(choose(s, 'alice', [a, b]))
  assert.equal(s.instances[a].rested, true); assert.equal(s.instances[b].rested, true)
  const pair = (legal(s, 'alice').find(x => x.type === 'DECLARE_ATTACK') as { targetIdsByAttacker: Record<string, string[]> }).targetIdsByAttacker[ray]
  assert.ok(pair.includes(a) && !pair.includes(leaderOf(s, 'bob')), '[Rush: Character]')
  let t = game(7, 'ST02-001')
  const r2 = inHand(t, 'alice', 'ST32-004')
  t = playCard(t, 'alice', r2)
  t = choose(t, 'alice', [])
  assert.ok(!attackerIds(t, 'alice').includes(r2), 'non-<Slash> Leader: no [Rush: Character]')
  let u = endTurn(game(7))
  const c = field(u, 'bob', 'OP03-107', true)
  u = endTurn(u)
  const zoro = inHand(u, 'alice', 'ST32-005')
  u = playCard(u, 'alice', zoro)
  u = choose(u, 'alice', [])
  assert.ok(attackerIds(u, 'alice').includes(zoro))
  const w = game(9)
  const kawa = field(w, 'alice', 'OP12-023')
  assert.equal(power(w, kawa), definitionOf('OP12-023').power); void c
})

test('M6 ST-32 certificates validate against the current registry; all ST-32 cards are PLAYABLE_VERIFIED', async () => {
  const { ST32_CERTIFICATIONS, certificationErrors, effectiveStatus } = await import('../src/game/cards/certification')
  const { engineCatalog, currentEngineRegistry } = await import('../src/lib/engine/catalog')
  const { definitions } = engineCatalog(), registry = currentEngineRegistry()
  for (const c of ST32_CERTIFICATIONS) assert.deepEqual(certificationErrors(c, definitions.find(x => x.definitionId === c.definitionId), registry), [], c.definitionId)
  for (const n of ['OP12-020', ...ST32]) assert.equal(effectiveStatus(definitions.find(x => x.number === n)!), 'PLAYABLE_VERIFIED', n)
})
