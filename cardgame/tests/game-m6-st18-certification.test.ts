import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateCharacteristics, hasCombatKeyword } from '../src/game/effects/characteristics'
import type { GameState } from '../src/game/core/types'
import { act, attachDon, attack, attackerIds, choose, deckFor, definitionOf, endTurn, inHand, leaderOf, legal, newGame, finishBattle, offeredEffects, optionIds, pendingChoice, playCard, put, roundTrip, startEffect, toMain, zoneOf } from './helpers/m6'

// M6 ST-18 (Purple Monkey.D.Luffy), official English texts (series 569018). Scenarios follow the official text, the OP-05 and
// ST-15-20 FAQ and the errata snapshot (docs/game/evidence/m6/sources/), through public commands only. Turn 11 gives the first
// player 10 field DON!!, turn 5 gives 5.
const ST18 = ['ST18-001', 'ST18-002', 'ST18-003', 'ST18-004', 'ST18-005', 'OP05-061', 'OP05-063', 'OP05-066', 'OP05-067', 'OP05-068', 'OP05-070', 'OP05-072', 'P-041', 'OP05-076']
const game = (turn = 11) => toMain(newGame(deckFor('OP05-060', ST18), deckFor('OP05-060', ST18)), turn)
const zones = (s: GameState, owner: string) => s.players.find(p => p.id === owner)!.zones
const fieldDon = (s: GameState, owner: string) => zones(s, owner).cost.length + zones(s, owner).attached.length
const field = (s: GameState, owner: string, number: string) => put(s, owner, number, 'characters', { playedEarlier: true })
const power = (s: GameState, id: string) => evaluateCharacteristics(s, id).power.current
const pick = (s: GameState, owner: string, indexes: number[]) => { const c = pendingChoice(s, owner)!; return act(s, owner, { type: 'ANSWER_CHOICE', choiceId: c.choiceId, tokens: indexes.map(i => c.options[i].token) }) }
/** From bob's turn: bob attacks alice's Leader `n` times (no block, no counter, Triggers declined), then alice's turn begins. */
const takeDamage = (s: GameState, n: number) => {
  for (let i = 0; i < n; i++) s = finishBattle(attack(s, put(s, 'bob', 'P-041', 'characters', { playedEarlier: true }), leaderOf(s, 'alice')))
  return endTurn(s)
}
const trimDeck = (s: GameState, owner: string, number: string) => { const z = zones(s, owner), id = put(s, owner, number, 'deckTop'); return id && z }

test('M6 ST-18 Leader Luffy adds its top Life card to hand to add an active DON!! with 0 or 3 or more field DON!!, once per turn', () => {
  let s = game(5)
  const life = zones(s, 'alice').life[0], don = fieldDon(s, 'alice')
  s = startEffect(s, 'alice', 'OP05-060.activate-main-don')
  assert.deepEqual(pendingChoice(s, 'alice')!.options.map(o => 'slot' in o ? o.slot?.kind : null), ['LIFE_TOP'], 'the top Life card only, face-down')
  s = roundTrip(pick(s, 'alice', [0]))
  assert.equal(zoneOf(s, life), 'hand'); assert.equal(fieldDon(s, 'alice'), don + 1)
  assert.equal(s.instances[zones(s, 'alice').cost.at(-1)!].rested, false, 'set as active')
  assert.equal(offeredEffects(s, 'alice', 'OP05-060.activate-main-don').length, 0, 'once per turn')
  let t = game(1)
  t = pick(startEffect(t, 'alice', 'OP05-060.activate-main-don'), 'alice', [0])
  assert.equal(fieldDon(t, 'alice'), 1, '1 field DON!!: no DON!! added')
})

test('M6 ST-18 Uso-Hachi, O-Robi and Hone-Kichi need 8 or more field DON!! on play to rest, K.O. and give -2000', () => {
  let s = game(11)
  const a = field(s, 'bob', 'ST18-004'), b = field(s, 'bob', 'OP05-068'), c = field(s, 'bob', 'P-041')
  s = choose(playCard(s, 'alice', inHand(s, 'alice', 'ST18-001')), 'alice', [a])
  assert.equal(s.instances[a].rested, true)
  s = choose(playCard(s, 'alice', inHand(s, 'alice', 'OP05-063')), 'alice', [b])
  assert.equal(zoneOf(s, b), 'trash')
  let u = game(11)
  const d1 = field(u, 'bob', 'ST18-004'), d2 = field(u, 'bob', 'P-041')
  u = choose(playCard(u, 'alice', inHand(u, 'alice', 'OP05-072')), 'alice', [d1, d2])
  assert.equal(power(u, d1), definitionOf('ST18-004').power! - 2000); assert.equal(power(u, d2), definitionOf('P-041').power! - 2000)
  void c
  let t = game(5)
  field(t, 'bob', 'ST18-004')
  t = playCard(t, 'alice', inHand(t, 'alice', 'ST18-001'))
  assert.equal(pendingChoice(t, 'alice'), undefined, '5 field DON!!: nothing')
})

test('M6 FAQ ST18-002: O-Nami blocks; with 8 or more field DON!! it trashes 1 card then draws 2, even with an empty hand', () => {
  let s = game(11)
  const nami = inHand(s, 'alice', 'ST18-002')
  while (zones(s, 'alice').hand.length > 1) { const id = zones(s, 'alice').hand.find(x => x !== nami)!; zones(s, 'alice').hand.splice(zones(s, 'alice').hand.indexOf(id), 1); zones(s, 'alice').trash.push(id); s.instances[id].zone = 'trash'; s.instances[id].zoneGeneration++; s.instances[id].faceUp = true }
  s = playCard(s, 'alice', nami)
  assert.equal(zones(s, 'alice').hand.length, 2, 'FAQ ST18-002: 0 cards to trash, still 2 drawn')
  s = endTurn(s)
  s = attack(s, field(s, 'bob', 'P-041'), leaderOf(s, 'alice'))
  assert.ok((legal(s, 'alice').find(a => a.type === 'ACTIVATE_BLOCKER') as { blockerIds: string[] }).blockerIds.includes(nami))
  let t = game(11)
  const hand = zones(t, 'alice').hand.length
  t = playCard(t, 'alice', inHand(t, 'alice', 'ST18-002'))
  const discard = zones(t, 'alice').hand[0]
  t = choose(t, 'alice', [discard])
  assert.equal(zoneOf(t, discard), 'trash'); assert.equal(zones(t, 'alice').hand.length, hand - 1 - 1 + 2)
})

test('M6 ST-18 San-Gorou draws 1 when attacking with 8 or more field DON!!, once per turn; Uso-Hachi OP05-061 rests a cost 4 or less with a DON!!', () => {
  let s = game(11)
  const san = field(s, 'alice', 'ST18-003'), hand = zones(s, 'alice').hand.length
  s = attack(s, san, leaderOf(s, 'bob'))
  assert.equal(zones(s, 'alice').hand.length, hand + 1)
  let t = game(11)
  const uso = field(t, 'alice', 'OP05-061'), foe = field(t, 'bob', 'OP05-067')
  attachDon(t, 'alice', uso, 1)
  t = choose(attack(t, uso, leaderOf(t, 'bob')), 'alice', [foe])
  assert.equal(t.instances[foe].rested, true)
})

test('M6 ST-18 Zoro-Juurou and When You Are at Sea search the top 5 or 3 cards for the printed types, the rest at the bottom', () => {
  let s = game(5)
  const zoro = inHand(s, 'alice', 'ST18-004'), wanted = put(s, 'alice', 'ST18-001', 'deckTop')
  s = playCard(s, 'alice', zoro)
  assert.ok(optionIds(s, 'alice').includes(wanted))
  s = choose(s, 'alice', [wanted])
  assert.equal(zoneOf(s, wanted), 'hand')
  const rest = pendingChoice(s, 'alice')!.options.map(o => ('instanceId' in o ? o.instanceId! : ''))
  s = choose(s, 'alice', rest)
  assert.deepEqual(zones(s, 'alice').deck.slice(-4), rest)
  let t = game(5)
  const sea = put(t, 'alice', 'OP05-076', 'hand'), top = put(t, 'alice', 'OP05-066', 'deckTop')
  t = startEffect(t, 'alice', 'OP05-076.main-search')
  t = choose(t, 'alice', [top])
  assert.equal(zoneOf(t, top), 'hand')
  t = choose(t, 'alice', pendingChoice(t, 'alice')!.options.map(o => ('instanceId' in o ? o.instanceId! : '')))
  assert.ok(zones(t, 'alice').trash.some(id => t.instances[id].definitionId === definitionOf('OP05-076').definitionId), 'the Event goes to the trash')
  void sea
})

test('M6 ST-18 Luffy-Tarou pays DON!! -1 to play a purple {Straw Hat Crew} Character cost 5 or less from hand; declining plays nothing', () => {
  let s = game(11)
  const target = inHand(s, 'alice', 'ST18-003'), big = inHand(s, 'alice', 'OP05-066')
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST18-005'))
  const don = fieldDon(s, 'alice')
  s = choose(s, 'alice', [zones(s, 'alice').cost[0]])
  assert.equal(fieldDon(s, 'alice'), don - 1)
  assert.ok(optionIds(s, 'alice').includes(target) && optionIds(s, 'alice').includes(big))
  s = choose(s, 'alice', [target])
  assert.equal(zoneOf(s, target), 'characters')
  let t = game(11)
  t = choose(playCard(t, 'alice', inHand(t, 'alice', 'ST18-005')), 'alice', [])
  assert.equal(pendingChoice(t, 'alice'), undefined)
})

test('M6 ST-18 Zoro-Juurou OP05-067 adds an active DON!! when attacking with 3 or less Life; Chopa-Emon sets a purple {Straw Hat Crew} 6000 or less active', () => {
  let s = takeDamage(game(4), 2)
  assert.equal(zones(s, 'alice').life.length, 3)
  const zoro = field(s, 'alice', 'OP05-067'), don = fieldDon(s, 'alice')
  s = attack(s, zoro, leaderOf(s, 'bob'))
  assert.equal(fieldDon(s, 'alice'), don + 1)
  let u = game(5)
  const z2 = field(u, 'alice', 'OP05-067'), d2 = fieldDon(u, 'alice')
  u = attack(u, z2, leaderOf(u, 'bob'))
  assert.equal(fieldDon(u, 'alice'), d2, '5 Life: nothing')
  let t = game(11)
  const rested = put(t, 'alice', 'ST18-003', 'characters', { playedEarlier: true, rested: true })
  t = choose(playCard(t, 'alice', inHand(t, 'alice', 'OP05-068')), 'alice', [rested])
  assert.equal(t.instances[rested].rested, false)
})

test('M6 ST-18 Jinbe gains +1000 on the opponent turn with 10 field DON!!; Fra-Nosuke gains [Rush] with a DON!! and 8 or more field DON!!', () => {
  let s = game(11)
  const jinbe = field(s, 'alice', 'OP05-066')
  assert.equal(power(s, jinbe), 6000)
  s = endTurn(s)
  assert.equal(power(s, jinbe), fieldDon(s, 'alice') >= 10 ? 7000 : 6000)
  assert.equal(fieldDon(s, 'alice'), 10)
  let t = game(11)
  const fra = inHand(t, 'alice', 'OP05-070')
  t = playCard(t, 'alice', fra)
  assert.ok(!attackerIds(t, 'alice').includes(fra), 'no DON!! given: no Rush')
  attachDon(t, 'alice', fra, 1)
  assert.ok(hasCombatKeyword(t, fra, 'RUSH')); assert.ok(attackerIds(t, 'alice').includes(fra))
  void trimDeck
})

test('M6 ST-18 certificates validate against the current registry; all ST-18 cards are PLAYABLE_VERIFIED', async () => {
  const { ST18_CERTIFICATIONS, certificationErrors, effectiveStatus } = await import('../src/game/cards/certification')
  const { engineCatalog, currentEngineRegistry } = await import('../src/lib/engine/catalog')
  const { definitions } = engineCatalog(), registry = currentEngineRegistry()
  for (const c of ST18_CERTIFICATIONS) assert.deepEqual(certificationErrors(c, definitions.find(x => x.definitionId === c.definitionId), registry), [], c.definitionId)
  for (const n of ['OP05-060', ...ST18]) assert.equal(effectiveStatus(definitions.find(x => x.number === n)!), 'PLAYABLE_VERIFIED', n)
})
