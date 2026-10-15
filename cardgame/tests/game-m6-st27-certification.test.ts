import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateCharacteristics } from '../src/game/effects/characteristics'
import type { GameState } from '../src/game/core/types'
import { act, attachDon, attack, choose, deckFor, definitionOf, endTurn, finishBattle, inHand, leaderOf, legal, newGame, optionIds, pendingChoice, playCard, put, roundTrip, startEffect, toMain, zoneOf } from './helpers/m6'

// M6 ST-27 (BLACK Marshall.D.Teach), official English texts (series 569027). Scenarios follow the official text, the ST-23-28 and
// OP-09 FAQ and the errata snapshot (docs/game/evidence/m6/sources/), through public commands only.
const ST27 = ['ST27-001', 'ST27-002', 'ST27-003', 'ST27-004', 'ST27-005', 'OP09-083', 'OP09-086', 'OP09-088', 'OP09-089', 'OP09-090', 'OP09-091', 'OP09-095', 'OP09-099', 'OP10-084']
const BOB = ['OP03-106', 'OP03-107', 'OP03-115', 'ST20-004']
const game = (turn = 5, leader = 'OP09-081') => toMain(newGame(deckFor(leader, ST27), deckFor('OP03-099', BOB)), turn)
const kaido = (turn = 10) => toMain(newGame(deckFor('OP09-081', ST27), deckFor('ST04-001', ['ST04-003', 'ST04-002'])), turn)
const zones = (s: GameState, owner: string) => s.players.find(p => p.id === owner)!.zones
const power = (s: GameState, id: string) => evaluateCharacteristics(s, id).power.current
const cost = (s: GameState, id: string) => evaluateCharacteristics(s, id).cost.current
const field = (s: GameState, owner: string, number: string, rested = false) => put(s, owner, number, 'characters', { playedEarlier: true, rested })
const hand = (s: GameState, owner = 'alice') => zones(s, owner).hand.length
const toTrash = (s: GameState, n: number) => { const p = zones(s, 'alice'); for (const id of p.deck.splice(0, n)) { p.trash.push(id); s.instances[id].zone = 'trash'; s.instances[id].zoneGeneration++; s.instances[id].faceUp = true } }
const kaidoKO = (s: GameState, target: string) => {
  s = playCard(s, 'bob', inHand(s, 'bob', 'ST04-003'))
  s = act(s, 'bob', { type: 'ANSWER_CHOICE', choiceId: pendingChoice(s, 'bob')!.choiceId, tokens: pendingChoice(s, 'bob')!.options.slice(0, 5).map(o => o.token) })
  return choose(s, 'bob', [target])
}

test('M6 FAQ OP09-081: Leader Teach negates your own On Play effects and trashes 1 card to negate the opposing On Play effects until the end of the next opposing turn, not When Attacking', () => {
  let s = game(5)
  const wolf = inHand(s, 'alice', 'ST27-004'), h = hand(s)
  s = playCard(s, 'alice', wolf)
  assert.equal(pendingChoice(s, 'alice'), undefined, 'Sanjuan.Wolf [On Play] negated'); assert.equal(hand(s), h - 1)
  let t = toMain(newGame(deckFor('ST14-001', ['ST27-004']), deckFor('OP03-099', BOB)), 5)
  t = playCard(t, 'alice', inHand(t, 'alice', 'ST27-004'))
  assert.ok(pendingChoice(t, 'alice'), 'another Leader: the [On Play] trashes 1')
  let u = game(5)
  const card = zones(u, 'alice').hand[0]
  u = startEffect(u, 'alice', 'OP09-081.activate-main-negate')
  u = roundTrip(choose(u, 'alice', [card]))
  u = endTurn(u)
  u = playCard(u, 'bob', inHand(u, 'bob', 'ST20-004'))
  assert.equal(pendingChoice(u, 'bob'), undefined, 'opposing [On Play] negated')
  u = endTurn(endTurn(u))
  u = playCard(u, 'bob', inHand(u, 'bob', 'ST20-004'))
  assert.ok(pendingChoice(u, 'bob'), 'expired after the opponent next turn')
})

test('M6 FAQ OP09-086: Jesus Burgess cannot be K.O.d by opposing effects and gains +1000 per 4 trash cards with a Blackbeard Pirates Leader', () => {
  let s = kaido(10)
  const burgess = field(s, 'alice', 'OP09-086')
  s = kaidoKO(s, burgess)
  assert.equal(zoneOf(s, burgess), 'characters')
  const t = game(5)
  const b2 = field(t, 'alice', 'OP09-086'), base = power(t, b2)
  toTrash(t, 8 - zones(t, 'alice').trash.length)
  assert.equal(power(t, b2), definitionOf('OP09-086').power! + 2000); void base
})

test('M6 FAQ ST27-004: Sanjuan.Wolf has [Blocker] and +1 cost per 4 trash cards with a Blackbeard Pirates Leader', () => {
  let s = game(5)
  const wolf = field(s, 'alice', 'ST27-004')
  toTrash(s, 28 - zones(s, 'alice').trash.length)
  assert.equal(cost(s, wolf), 11, 'FAQ ST27-004: 28 trash cards, cost 11')
  s = endTurn(s)
  s = attack(s, field(s, 'bob', 'OP03-106'), leaderOf(s, 'alice'))
  assert.ok((legal(s, 'alice').find(x => x.type === 'ACTIVATE_BLOCKER') as { blockerIds: string[] }).blockerIds.includes(wolf))
})

test('M6 ST-27 Van Augur and Doc Q rest themselves with a Blackbeard Pirates Leader for -3 cost or a cost 1 or less K.O., and draw 1 on K.O.; Catarina Devon trashes herself for -1 cost without drawing', () => {
  let s = endTurn(game(7))
  const foe = field(s, 'bob', 'OP03-106'), small = field(s, 'bob', 'OP03-115')
  s = endTurn(s)
  field(s, 'alice', 'OP09-083'); field(s, 'alice', 'OP09-090')
  s = startEffect(s, 'alice', 'OP09-083.activate-main-cost')
  s = choose(s, 'alice', [foe])
  s = startEffect(s, 'alice', 'OP09-090.activate-main-ko')
  s = roundTrip(choose(s, 'alice', [small]))
  assert.equal(cost(s, foe), 1); assert.equal(zoneOf(s, small), 'trash')
  const devon = field(s, 'alice', 'ST27-002'), h = hand(s)
  s = startEffect(s, 'alice', 'ST27-002.activate-main-cost')
  s = choose(s, 'alice', [devon])
  s = choose(s, 'alice', [foe])
  assert.equal(zoneOf(s, devon), 'trash'); assert.equal(hand(s), h, 'FAQ ST27-002: not a K.O., no draw')
  let t = kaido(10)
  const augur = field(t, 'alice', 'OP09-083'), h2 = hand(t)
  t = kaidoKO(t, augur)
  assert.equal(hand(t), h2 + 1, '[On K.O.] draw 1')
})

test('M6 FAQ OP09-089: Stronger trashes a hand card and itself with a Blackbeard Pirates Leader to draw 1 then give -2 cost; Shiryu trashes 2 to draw 2 when attacking with a DON!!', () => {
  let s = endTurn(game(7))
  const foe = field(s, 'bob', 'OP03-106')
  s = endTurn(s)
  const stronger = field(s, 'alice', 'OP09-089'), h = hand(s)
  s = startEffect(s, 'alice', 'OP09-089.activate-main-draw')
  s = choose(s, 'alice', [zones(s, 'alice').hand[0]])
  s = roundTrip(choose(s, 'alice', [foe]))
  assert.equal(zoneOf(s, stronger), 'trash'); assert.equal(hand(s), h - 1 + 1); assert.equal(cost(s, foe), 2)
  let t = game(7)
  const shiryu = field(t, 'alice', 'OP09-088')
  t.instances[zones(t, 'alice').cost[0]].rested = false
  const don = zones(t, 'alice').cost[0]; zones(t, 'alice').cost.splice(0, 1); zones(t, 'alice').attached.push(don); t.instances[don].zone = 'attached'; t.instances[don].zoneGeneration++; t.instances[don].attachedTo = shiryu
  const h2 = hand(t)
  t = attack(t, shiryu, leaderOf(t, 'bob'))
  t = roundTrip(choose(t, 'alice', zones(t, 'alice').hand.slice(0, 2)))
  assert.equal(hand(t), h2)
})

test('M6 ST-27 Laffitte rests a DON!! and itself, Fullalead trashes a card and rests itself, to look for a Blackbeard Pirates card; Avalo Pizarro rests Fullalead for +4000', () => {
  let s = game(5)
  const top = put(s, 'alice', 'OP10-084', 'deckTop')
  field(s, 'alice', 'OP09-095')
  s = startEffect(s, 'alice', 'OP09-095.activate-main-search')
  s = choose(s, 'alice', [top])
  while (pendingChoice(s, 'alice')) s = choose(s, 'alice', optionIds(s, 'alice'))
  assert.equal(zoneOf(s, top), 'hand')
  let t = game(5)
  const t2 = put(t, 'alice', 'ST27-003', 'deckTop')
  const stage = put(t, 'alice', 'OP09-099', 'stage')
  t = startEffect(t, 'alice', 'OP09-099.activate-main-search')
  t = choose(t, 'alice', [stage])
  t = choose(t, 'alice', [zones(t, 'alice').hand.find(id => id !== t2)!])
  t = roundTrip(choose(t, 'alice', [t2]))
  while (pendingChoice(t, 'alice')) t = choose(t, 'alice', optionIds(t, 'alice'))
  assert.equal(zoneOf(t, t2), 'hand'); assert.equal(t.instances[stage].rested, true)
  let u = game(5)
  const st = put(u, 'alice', 'OP09-099', 'stage'), pizarro = field(u, 'alice', 'ST27-001')
  u = startEffect(u, 'alice', 'ST27-001.activate-main-power')
  u = roundTrip(choose(u, 'alice', [st]))
  assert.equal(power(u, pizarro), 5000)
})

test('M6 FAQ ST27-005: Teach rests itself to K.O. any Character of cost 3 or less, yours too; on K.O. it returns a black card, itself included, from the trash; Kuzan plays a Blackbeard Pirates cost 5 or less rested from the trash on K.O.', () => {
  let s = game(9)
  const teach = field(s, 'alice', 'ST27-005'), own = field(s, 'alice', 'OP09-091')
  s = startEffect(s, 'alice', 'ST27-005.activate-main-ko')
  assert.ok(optionIds(s, 'alice').includes(own))
  s = roundTrip(choose(s, 'alice', [own]))
  assert.equal(zoneOf(s, own), 'trash'); void teach
  let t = kaido(10)
  const k = field(t, 'alice', 'ST27-003'), inTrash = put(t, 'alice', 'OP10-084', 'trash')
  t = kaidoKO(t, k)
  t = roundTrip(choose(t, 'alice', [inTrash]))
  assert.equal(zoneOf(t, inTrash), 'characters'); assert.equal(t.instances[inTrash].rested, true)
  let u = endTurn(game(9))
  const teach2 = field(u, 'alice', 'ST27-005', true)
  const big = field(u, 'bob', 'OP03-106')
  attachDon(u, 'bob', big, 3)
  u = finishBattle(attack(u, big, teach2))
  assert.equal(zoneOf(u, teach2), 'trash')
  assert.ok(optionIds(u, 'alice').includes(teach2), 'FAQ ST27-005: this card itself')
  u = roundTrip(choose(u, 'alice', [teach2]))
  assert.equal(zoneOf(u, teach2), 'hand')
  void definitionOf
})

test('M6 ST-27 Vasco Shot ([Blocker]) and Sanjuan.Wolf OP10-084 (no ability) keep their printed values', () => {
  let s = game(9)
  const wolf = field(s, 'alice', 'OP10-084'), vasco = field(s, 'alice', 'OP09-091')
  assert.equal(power(s, wolf), 7000)
  s = endTurn(s)
  s = attack(s, field(s, 'bob', 'OP03-106'), leaderOf(s, 'alice'))
  assert.ok((legal(s, 'alice').find(x => x.type === 'ACTIVATE_BLOCKER') as { blockerIds: string[] }).blockerIds.includes(vasco))
})

test('M6 ST-27 certificates validate against the current registry; all ST-27 cards are PLAYABLE_VERIFIED', async () => {
  const { ST27_CERTIFICATIONS, certificationErrors, effectiveStatus } = await import('../src/game/cards/certification')
  const { engineCatalog, currentEngineRegistry } = await import('../src/lib/engine/catalog')
  const { definitions } = engineCatalog(), registry = currentEngineRegistry()
  for (const c of ST27_CERTIFICATIONS) assert.deepEqual(certificationErrors(c, definitions.find(x => x.definitionId === c.definitionId), registry), [], c.definitionId)
  for (const n of ['OP09-081', ...ST27]) assert.equal(effectiveStatus(definitions.find(x => x.number === n)!), 'PLAYABLE_VERIFIED', n)
})
