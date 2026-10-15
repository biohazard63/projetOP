import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateCharacteristics } from '../src/game/effects/characteristics'
import type { GameState } from '../src/game/core/types'
import { act, attack, choose, deckFor, definitionOf, endTurn, finishBattle, inHand, leaderOf, newGame, offeredEffects, optionIds, pendingChoice, playCard, put, roundTrip, toMain, zoneOf } from './helpers/m6'

// M6 ST-24 (GREEN Jewelry Bonney) cards, official English texts (series 569024). Scenarios follow the official text, the ST-23-28
// and OP-07 FAQ and the errata snapshot (docs/game/evidence/m6/sources/), through public commands only. The ST-24 composition is not
// verified: the deck is not offered, these tests certify the cards only.
const ST24 = ['ST24-001', 'ST24-002', 'ST24-003', 'ST24-004', 'EB01-015', 'OP07-021', 'OP07-023', 'OP07-025', 'OP07-031', 'OP07-033', 'OP07-034', 'OP07-036', 'OP07-037', 'ST24-005']
const BOB = ['OP03-106', 'OP03-107', 'OP03-115', 'OP03-110']
const game = (turn = 5) => toMain(newGame(deckFor('OP07-019', ST24), deckFor('OP03-099', BOB)), turn)
const kaido = (turn = 10) => toMain(newGame(deckFor('OP07-019', ST24), deckFor('ST04-001', ['ST04-003', 'ST04-002'])), turn)
const zones = (s: GameState, owner: string) => s.players.find(p => p.id === owner)!.zones
const power = (s: GameState, id: string) => evaluateCharacteristics(s, id).power.current
const field = (s: GameState, owner: string, number: string, rested = false) => put(s, owner, number, 'characters', { playedEarlier: true, rested })
const hand = (s: GameState, owner = 'alice') => zones(s, owner).hand.length
const activeDon = (s: GameState) => zones(s, 'alice').cost.filter(id => !s.instances[id].rested)
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

test('M6 FAQ OP07-019: Leader Bonney rests a DON!! when the opponent attacks to rest an opposing Leader or Character, once per turn, and may wait for a later attack', () => {
  let s = endTurn(game(5))
  const a1 = field(s, 'bob', 'OP03-106'), a2 = field(s, 'bob', 'OP03-110'), other = field(s, 'bob', 'OP03-107')
  s = attack(s, a1, leaderOf(s, 'alice'))
  s = choose(s, 'alice', [])
  s = finishBattle(s)
  s = attack(s, a2, leaderOf(s, 'alice'))
  if (pendingChoice(s, 'bob')) s = choose(s, 'bob', [])
  s = choose(s, 'alice', [activeDon(s)[0]])
  s = roundTrip(choose(s, 'alice', [other]))
  assert.equal(s.instances[other].rested, true)
})

test('M6 ST-24 Urouge and Hawkins set a DON!! active at the end of the turn; Caribou gains +1000 with 6 rested DON!!; Coribou plays a Caribou cost 4 or less rested', () => {
  let s = game(11)
  field(s, 'alice', 'OP07-021')
  const caribou = field(s, 'alice', 'OP07-023')
  assert.equal(power(s, caribou), 5000)
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST24-004'))
  s = choose(s, 'alice', [])
  assert.equal(power(s, caribou), 6000, '10 DON!! rested for Law & Bepo')
  s = act(s, 'alice', { type: 'END_MAIN' })
  const before = zones(s, 'alice').cost.filter(id => s.instances[id].rested).length
  s = roundTrip(choose(s, 'alice', [zones(s, 'alice').cost.find(id => s.instances[id].rested)!]))
  assert.equal(zones(s, 'alice').cost.filter(id => s.instances[id].rested).length, before - 1)
  let t = game(7)
  const c2 = put(t, 'alice', 'OP07-023', 'hand')
  t = playCard(t, 'alice', inHand(t, 'alice', 'OP07-025'))
  t = roundTrip(choose(t, 'alice', [c2]))
  assert.equal(zoneOf(t, c2), 'characters'); assert.equal(t.instances[c2].rested, true)
})

test('M6 FAQ OP07-031: Bartolomeo draws 1 and trashes 1 when a Character is rested by your effect on your turn, also by an activation cost; Apoo rests a cost 2 or less', () => {
  let s = endTurn(game(7))
  const foe = field(s, 'bob', 'OP03-107')
  s = endTurn(s)
  field(s, 'alice', 'OP07-031')
  const h = hand(s)
  s = playCard(s, 'alice', inHand(s, 'alice', 'EB01-015'))
  s = choose(s, 'alice', [foe])
  s = roundTrip(choose(s, 'alice', [zones(s, 'alice').hand[0]]))
  assert.equal(s.instances[foe].rested, true); assert.equal(hand(s), h - 1 + 1 - 1)
})

test('M6 ST-24 Luffy protects your other Characters of cost 3 or less from opposing effect K.O.s with 3 or more Characters; Zoro gains +2000 when attacking with 3 or more Characters', () => {
  let s = kaido(10)
  field(s, 'alice', 'OP07-033'); const apoo = field(s, 'alice', 'EB01-015'); field(s, 'alice', 'OP07-034')
  s = kaidoKO(s, apoo)
  assert.equal(zoneOf(s, apoo), 'characters')
  let t = kaido(10)
  field(t, 'alice', 'OP07-033'); const a2 = field(t, 'alice', 'EB01-015')
  t = kaidoKO(t, a2)
  assert.equal(zoneOf(t, a2), 'trash', '2 Characters only')
  let u = game(7)
  const zoro = field(u, 'alice', 'OP07-034'); field(u, 'alice', 'EB01-015'); field(u, 'alice', 'OP07-021')
  u = attack(u, zoro, leaderOf(u, 'bob'))
  assert.equal(power(u, zoro), 4000)
})

test('M6 ST-24 Asura Demon Nine Flash gives +3000 then may rest your cost 3 or more Character to rest an opposing cost 5 or less; More Pizza looks for a Supernovas card; Kid & Killer trashes itself on the opponent attack to set a DON!! active', () => {
  let s = endTurn(game(9))
  const foe = field(s, 'bob', 'OP03-106')
  s = endTurn(s)
  const leader = leaderOf(s, 'alice'), own = field(s, 'alice', 'OP07-023')
  s = startFrom(s, 'alice', 'OP07-036.main-power-rest', inHand(s, 'alice', 'OP07-036'))
  s = choose(s, 'alice', [leader])
  s = choose(s, 'alice', [own])
  s = roundTrip(choose(s, 'alice', [foe]))
  assert.equal(power(s, leader), 8000); assert.equal(s.instances[own].rested, true); assert.equal(s.instances[foe].rested, true)
  let t = game(5)
  const top = put(t, 'alice', 'ST24-003', 'deckTop'), pizza2 = put(t, 'alice', 'OP07-037', 'deckTop')
  t = startFrom(t, 'alice', 'OP07-037.main-search', inHand(t, 'alice', 'OP07-037', [pizza2]))
  assert.ok(!optionIds(t, 'alice').includes(pizza2))
  t = choose(t, 'alice', [top])
  while (pendingChoice(t, 'alice')) t = pick(t, 'alice', pendingChoice(t, 'alice')!.options.map((_, i) => i))
  assert.equal(zoneOf(t, top), 'hand')
  // Kid & Killer alone (a non-Bonney green Leader), so that its [On Your Opponent's Attack] is the only one.
  let u = endTurn(toMain(newGame(deckFor('ST02-001', ['ST24-002']), deckFor('OP03-099', BOB)), 7))
  const kk = field(u, 'alice', 'ST24-002')
  for (const id of zones(u, 'alice').cost) u.instances[id].rested = true
  u = attack(u, field(u, 'bob', 'OP03-106'), leaderOf(u, 'alice'))
  u = choose(u, 'alice', [kk])
  u = roundTrip(choose(u, 'alice', [zones(u, 'alice').cost[0]]))
  assert.equal(zoneOf(u, kk), 'trash'); assert.equal(activeDon(u).length, 1)
})

test('M6 FAQ ST24-004: Law & Bepo rests an opposing Character that stays rested in the next Refresh Phase and, with 2 or more opposing rested Characters, gives the Leader +2000 until the end of the next opposing turn; Bege draws 1 and trashes 1 with 6 rested cards', () => {
  let s = endTurn(game(11))
  const a = field(s, 'bob', 'OP03-106', true), b = field(s, 'bob', 'OP03-107')
  s = endTurn(s)
  const leader = leaderOf(s, 'alice')
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST24-004'))
  s = roundTrip(choose(s, 'alice', [b]))
  assert.equal(power(s, leader), 7000)
  s = endTurn(s)
  assert.equal(s.instances[b].rested, true); assert.equal(power(s, leader), 7000); void a
  let t = game(9)
  for (const n of ['OP07-021', 'OP07-023', 'EB01-015']) field(t, 'alice', n, true)
  t = playCard(t, 'alice', inHand(t, 'alice', 'OP07-034'))
  const bege = inHand(t, 'alice', 'ST24-001'), h = hand(t)
  t = playCard(t, 'alice', bege)
  t = roundTrip(choose(t, 'alice', [zones(t, 'alice').hand[0]]))
  assert.equal(hand(t), h - 1 + 1 - 1, '3 rested Characters and at least 3 rested DON!!: draw 1, trash 1')
  let w = game(5)
  const b2 = inHand(w, 'alice', 'ST24-001'), h2 = hand(w)
  w = playCard(w, 'alice', b2)
  assert.equal(pendingChoice(w, 'alice'), undefined, 'fewer than 6 rested cards'); assert.equal(hand(w), h2 - 1)
  void definitionOf
})

test('M6 ST-24 cards are certified; the user-confirmed ST-24 deck is offered with exactly 51 cards', async () => {
  const { ST24_CERTIFICATIONS, certificationErrors, effectiveStatus } = await import('../src/game/cards/certification')
  const { engineCatalog, currentEngineRegistry } = await import('../src/lib/engine/catalog')
  const { STARTER_DECKS } = await import('../src/game/cards/starterDecks')
  const { definitions } = engineCatalog(), registry = currentEngineRegistry()
  for (const c of ST24_CERTIFICATIONS) assert.deepEqual(certificationErrors(c, definitions.find(x => x.definitionId === c.definitionId), registry), [], c.definitionId)
  for (const n of ['OP07-019', ...ST24]) assert.equal(effectiveStatus(definitions.find(x => x.number === n)!), 'PLAYABLE_VERIFIED', n)
  const st24 = STARTER_DECKS.filter(d => d.deckCode === 'ST-24')
  assert.equal(st24.length, 1); assert.equal(st24[0].entries.reduce((n, e) => n + e.quantity, 0), 51)
})
