import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateCharacteristics } from '../src/game/effects/characteristics'
import type { GameState } from '../src/game/core/types'
import { act, attachDon, attack, choose, deckFor, definitionOf, endTurn, inHand, leaderOf, legal, newGame, offeredEffects, optionIds, pendingChoice, playCard, put, roundTrip, startEffect, toMain, zoneOf } from './helpers/m6'

// M6 ST-35 (RED/BLACK Sabo), official English texts (series 569035). Scenarios follow the official text, the ST-35 FAQ and the
// errata snapshot (docs/game/evidence/m6/sources/), through public commands only.
const ST35 = ['ST35-001', 'ST35-002', 'ST35-003', 'ST35-004', 'ST35-005', 'OP12-090', 'OP12-093', 'OP13-005', 'OP13-008', 'OP13-017', 'OP13-081', 'P-105', 'OP12-098', 'OP13-019']
const BOB = ['OP03-106', 'OP03-107', 'OP03-115', 'OP03-110']
const game = (turn = 5, leader = 'OP13-004') => toMain(newGame(deckFor(leader, ST35), deckFor('OP03-099', BOB)), turn)
const kaido = (turn = 10) => toMain(newGame(deckFor('OP13-004', ST35), deckFor('ST04-001', ['ST04-003', 'ST04-002'])), turn)
const zones = (s: GameState, owner: string) => s.players.find(p => p.id === owner)!.zones
const power = (s: GameState, id: string) => evaluateCharacteristics(s, id).power.current
const cost = (s: GameState, id: string) => evaluateCharacteristics(s, id).cost.current
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
const restedDonTo = (s: GameState) => { s = choose(s, 'alice', [zones(s, 'alice').cost.find(id => s.instances[id].rested)!]); return s }

test('M6 ST-35 Leader Sabo has -1000 with 4 or more Life and, with a DON!! and a Character of cost 8 or more, gives itself and every Character +1000', () => {
  const s = game(5)
  const leader = leaderOf(s, 'alice'), koala = field(s, 'alice', 'ST35-004'), hack = field(s, 'alice', 'ST35-001')
  assert.equal(power(s, leader), 4000, '5 Life: -1000')
  assert.equal(cost(s, koala), 8, 'Koala +1 cost')
  attachDon(s, 'alice', leader, 1)
  assert.equal(power(s, leader), 4000 + 1000 + 1000, 'DON!! x1 and +1000 aura')
  assert.equal(power(s, hack), definitionOf('ST35-001').power! + 1000); assert.equal(power(s, koala), definitionOf('ST35-004').power! + 1000)
})

test('M6 ST-35 Belo Betty trashes 2 deck cards when attacking for -2 cost; Karasu trashes 2 so that a 7 or more card opponent trashes 1 of its choice', () => {
  let s = endTurn(game(7))
  const foe = field(s, 'bob', 'OP03-106')
  s = endTurn(s)
  const trash = zones(s, 'alice').trash.length
  s = attack(s, field(s, 'alice', 'OP12-090'), leaderOf(s, 'bob'))
  s = pick(s, 'alice', [0, 1])
  s = roundTrip(choose(s, 'alice', [foe]))
  assert.equal(zones(s, 'alice').trash.length, trash + 2); assert.equal(cost(s, foe), definitionOf('OP03-106').cost! - 2)
  let t = game(7)
  for (const n of ['OP03-106', 'OP03-107', 'OP03-110']) put(t, 'bob', n, 'hand')
  const bh = zones(t, 'bob').hand.length
  t = attack(t, field(t, 'alice', 'ST35-003'), leaderOf(t, 'bob'))
  t = pick(t, 'alice', [0, 1])
  assert.equal(pendingChoice(t, 'bob')!.min, 1, 'FAQ ST35-003: the opponent chooses')
  t = roundTrip(choose(t, 'bob', [zones(t, 'bob').hand[0]]))
  assert.equal(zones(t, 'bob').hand.length, bh - 1)
})

test('M6 ST-35 Morley, Koala and P-105 Sabo gain cost with a Revolutionary Army Leader; Koala puts a trash card at the bottom of the deck to give a DON!!; P-105 has [Blocker] and adds a Life card to give a DON!!', () => {
  let s = game(7)
  const morley = field(s, 'alice', 'OP12-093'), koala = field(s, 'alice', 'OP13-081'), sabo = field(s, 'alice', 'P-105'), leader = leaderOf(s, 'alice')
  assert.equal(cost(s, morley), 8); assert.equal(cost(s, koala), 8); assert.equal(cost(s, sabo), 8)
  const trashCard = put(s, 'alice', 'ST35-002', 'trash')
  s = playCard(s, 'alice', inHand(s, 'alice', 'OP13-005'))
  s = restedDonTo(s)
  s = startEffect(s, 'alice', 'OP13-081.activate-main-don')
  s = choose(s, 'alice', [trashCard])
  s = choose(s, 'alice', [leader])
  s = roundTrip(s)
  assert.equal(zones(s, 'alice').deck.at(-1), trashCard)
  const t = toMain(newGame(deckFor('ST14-001', ['OP12-093']), deckFor('OP03-099', BOB)), 7)
  const m2 = field(t, 'alice', 'OP12-093')
  assert.equal(cost(t, m2), 4, 'non-RA Leader')
  let u = game(9)
  const p105 = inHand(u, 'alice', 'P-105')
  u = playCard(u, 'alice', p105)
  u = pick(u, 'alice', [0])
  u = choose(u, 'alice', [leaderOf(u, 'alice')])
  u = roundTrip(restedDonTo(u))
  u = endTurn(u)
  u = attack(u, field(u, 'bob', 'OP03-106'), leaderOf(u, 'alice'))
  assert.ok((legal(u, 'alice').find(x => x.type === 'ACTIVATE_BLOCKER') as { blockerIds: string[] }).blockerIds.includes(p105))
})

test('M6 ST-35 Hair Removal Fist gives +2000 and +2000 more with a Revolutionary Army Character of cost 8 or more; its Trigger draws 1 and trashes the top deck card', () => {
  let s = endTurn(game(7))
  const ev = put(s, 'alice', 'OP12-098', 'hand'), koala = field(s, 'alice', 'ST35-004')
  assert.equal(cost(s, koala), 8)
  s = attack(s, field(s, 'bob', 'OP03-106'), leaderOf(s, 'alice'))
  s = act(s, 'alice', { type: 'PASS_BLOCKER', battleId: s.battle!.id })
  const c = legal(s, 'alice').find(x => x.type === 'PLAY_COUNTER_EVENT') as { paymentDonIds: string[]; battleId: string }
  s = act(s, 'alice', { type: 'PLAY_COUNTER_EVENT', cardId: ev, targetId: null, paymentDonIds: c.paymentDonIds.slice(0, 1), donMinusIds: [], battleId: c.battleId })
  s = roundTrip(choose(s, 'alice', [leaderOf(s, 'alice')]))
  assert.equal(s.battle!.counterModifiers.reduce((n, m) => n + m.amount, 0), 4000)
  let t = endTurn(game(3))
  put(t, 'alice', 'OP12-098', 'life')
  const h = zones(t, 'alice').hand.length, tr = zones(t, 'alice').trash.length
  t = attack(t, field(t, 'bob', 'OP03-106'), leaderOf(t, 'alice'))
  t = act(t, 'alice', { type: 'PASS_BLOCKER', battleId: t.battle!.id }); t = act(t, 'alice', { type: 'PASS_COUNTER', battleId: t.battle!.id })
  t = act(t, 'bob', { type: 'RESOLVE_BATTLE', battleId: t.battle!.id })
  t = roundTrip(act(t, 'alice', { type: 'ANSWER_TRIGGER', choiceId: (legal(t, 'alice').find(a => a.type === 'ANSWER_TRIGGER') as { choiceId: string }).choiceId, activate: true }))
  assert.equal(zones(t, 'alice').hand.length, h + 1); assert.equal(zones(t, 'alice').trash.length, tr + 2, 'the deck card and the Event')
})

test('M6 ST-35 Ivankov trashes itself instead of a Revolutionary Army Character being K.O.d by an opposing effect; Dragon takes -2000 instead of one being removed, once per turn', () => {
  let s = kaido(10)
  const ivan = field(s, 'alice', 'OP13-008'), lind = field(s, 'alice', 'ST35-002')
  s = kaidoKO(s, lind)
  s = roundTrip(pick(s, 'alice', [0]))
  assert.equal(zoneOf(s, lind), 'characters'); assert.equal(zoneOf(s, ivan), 'trash')
  let t = kaido(10)
  const dragon = field(t, 'alice', 'OP13-017'), l2 = field(t, 'alice', 'ST35-002')
  t = kaidoKO(t, l2)
  t = roundTrip(pick(t, 'alice', [0]))
  assert.equal(zoneOf(t, l2), 'characters'); assert.equal(power(t, dragon), definitionOf('OP13-017').power! - 2000)
})

test('M6 ST-35 But Ace Here Said You Deserved It!! rests 4 DON!! for -3000 then K.O.s a 3000 power or less; as Counter the Leader gains +3000', () => {
  let s = endTurn(game(9))
  const big = field(s, 'bob', 'OP03-106'), small = field(s, 'bob', 'OP03-107')
  s = endTurn(s)
  s = startFrom(s, 'alice', 'OP13-019.main-power-ko', inHand(s, 'alice', 'OP13-019'))
  s = choose(s, 'alice', [big])
  s = roundTrip(choose(s, 'alice', [small]))
  assert.equal(power(s, big), 3000); assert.equal(zoneOf(s, small), 'trash')
  let t = endTurn(game(7))
  const ev = put(t, 'alice', 'OP13-019', 'hand'), l = leaderOf(t, 'alice')
  t = attack(t, field(t, 'bob', 'OP03-106'), l)
  t = act(t, 'alice', { type: 'PASS_BLOCKER', battleId: t.battle!.id })
  const c = legal(t, 'alice').find(x => x.type === 'PLAY_COUNTER_EVENT') as { paymentDonIds: string[]; battleId: string }
  t = act(t, 'alice', { type: 'PLAY_COUNTER_EVENT', cardId: ev, targetId: null, paymentDonIds: c.paymentDonIds.slice(0, 1), donMinusIds: [], battleId: c.battleId })
  assert.equal(t.battle!.counterModifiers.reduce((n, m) => n + m.amount, 0), 3000)
})

test('M6 ST-35 Hack has [Blocker] and K.O.s a base power 2000 or less on play; Lindbergh gives -3000; Koala and Kuma give a DON!! to the Leader then play a Revolutionary Army Character of 4000 power or less from hand or trash', () => {
  let s = endTurn(game(9))
  const weak = field(s, 'bob', 'OP03-107'), foe = field(s, 'bob', 'OP03-106')
  s = endTurn(s)
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST35-001'))
  s = choose(s, 'alice', [weak])
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST35-002'))
  s = roundTrip(choose(s, 'alice', [foe]))
  assert.equal(zoneOf(s, weak), 'trash'); assert.equal(power(s, foe), 3000)
  let t = game(9)
  const fromTrash = put(t, 'alice', 'ST35-003', 'trash'), leader = leaderOf(t, 'alice')
  t = playCard(t, 'alice', inHand(t, 'alice', 'ST35-005'))
  t = restedDonTo(t)
  assert.ok(optionIds(t, 'alice').includes(fromTrash))
  t = roundTrip(choose(t, 'alice', [fromTrash]))
  assert.equal(zoneOf(t, fromTrash), 'characters'); assert.equal(zones(t, 'alice').attached.filter(id => t.instances[id].attachedTo === leader).length, 1)
  let u = game(11)
  const inH = put(u, 'alice', 'OP12-090', 'hand')
  u = playCard(u, 'alice', inHand(u, 'alice', 'ST35-004'))
  u = restedDonTo(u)
  u = choose(u, 'alice', [inH])
  assert.equal(zoneOf(u, inH), 'characters')
})

test('M6 ST-35 certificates validate against the current registry; all ST-35 cards are PLAYABLE_VERIFIED', async () => {
  const { ST35_CERTIFICATIONS, certificationErrors, effectiveStatus } = await import('../src/game/cards/certification')
  const { engineCatalog, currentEngineRegistry } = await import('../src/lib/engine/catalog')
  const { definitions } = engineCatalog(), registry = currentEngineRegistry()
  for (const c of ST35_CERTIFICATIONS) assert.deepEqual(certificationErrors(c, definitions.find(x => x.definitionId === c.definitionId), registry), [], c.definitionId)
  for (const n of ['OP13-004', ...ST35]) assert.equal(effectiveStatus(definitions.find(x => x.number === n)!), 'PLAYABLE_VERIFIED', n)
})
