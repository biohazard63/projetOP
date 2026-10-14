import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateCharacteristics } from '../src/game/effects/characteristics'
import type { GameState } from '../src/game/core/types'
import { act, attachDon, attack, choose, deckFor, definitionOf, endTurn, finishBattle, inHand, leaderOf, legal, newGame, offeredEffects, optionIds, pendingChoice, playCard, put, roundTrip, startEffect, toMain, zoneOf } from './helpers/m6'

// M6 ST-20 (YELLOW Charlotte Katakuri), official English texts (series 569020). Scenarios follow the official text, the ST-15-20
// and OP-03 FAQ and the errata snapshot (docs/game/evidence/m6/sources/), through public commands only.
const ST20 = ['ST20-001', 'ST20-002', 'ST20-003', 'ST20-004', 'ST20-005', 'OP03-106', 'OP03-107', 'OP03-110', 'OP03-112', 'OP03-115', 'ST07-005', 'ST07-014', 'OP03-118', 'OP03-121']
const game = (turn = 5) => toMain(newGame(deckFor('OP03-099', ST20), deckFor('OP03-099', ST20)), turn)
const zones = (s: GameState, owner: string) => s.players.find(p => p.id === owner)!.zones
const power = (s: GameState, id: string) => evaluateCharacteristics(s, id).power.current
const field = (s: GameState, owner: string, number: string, rested = false) => put(s, owner, number, 'characters', { playedEarlier: true, rested })
const pick = (s: GameState, owner: string, indexes: number[]) => { const c = pendingChoice(s, owner)!; return act(s, owner, { type: 'ANSWER_CHOICE', choiceId: c.choiceId, tokens: indexes.map(i => c.options[i].token) }) }
const startFrom = (s: GameState, owner: string, abilityId: string, sourceId: string) => {
  const a = offeredEffects(s, owner, abilityId).find(x => x.effectId.includes(sourceId))
  assert.ok(a, `${abilityId} from ${sourceId} not offered`)
  return act(s, owner, { type: 'START_EFFECT', effectId: a!.effectId })
}
const handIds = (s: GameState, owner: string, n: number, exclude: string[] = []) => zones(s, owner).hand.filter(id => !exclude.includes(id)).slice(0, n)
const lifeTrigger = (s: GameState, defender: string) => {
  s = attack(s, field(s, s.activePlayerId!, 'OP03-106'), leaderOf(s, defender))
  s = act(s, defender, { type: 'PASS_BLOCKER', battleId: s.battle!.id }); s = act(s, defender, { type: 'PASS_COUNTER', battleId: s.battle!.id })
  s = act(s, s.activePlayerId!, { type: 'RESOLVE_BATTLE', battleId: s.battle!.id })
  const t = legal(s, defender).find(a => a.type === 'ANSWER_TRIGGER') as { choiceId: string } | undefined
  assert.ok(t, 'Trigger offered')
  return act(s, defender, { type: 'ANSWER_TRIGGER', choiceId: t!.choiceId, activate: true })
}

test('M6 FAQ OP03-099: Leader Katakuri with a DON!! looks at a top Life card of either player, places it top or bottom, and gains +1000 this battle', () => {
  let s = game(5)
  const leader = leaderOf(s, 'alice'), top = zones(s, 'bob').life[0]
  attachDon(s, 'alice', leader, 1)
  s = attack(s, leader, leaderOf(s, 'bob'))
  assert.ok(optionIds(s, 'alice').includes(top), 'the chooser sees the opposing top Life card')
  s = choose(s, 'alice', [top])
  s = roundTrip(pick(s, 'alice', [1]))
  assert.equal(zones(s, 'bob').life.at(-1), top, 'placed at the bottom')
  assert.ok(s.battle!.counterModifiers.some(m => m.target.instanceId === leader && m.amount === 1000))
})

test('M6 FAQ ST20-001: Katakuri turns the face-down top Life card face-up to give a rested DON!!, once per turn; not when the top card is face-up', () => {
  let s = game(5)
  const kata = field(s, 'alice', 'ST20-001'), top = zones(s, 'alice').life[0], leader = leaderOf(s, 'alice')
  s = playCard(s, 'alice', inHand(s, 'alice', 'OP03-107'))
  s = startEffect(s, 'alice', 'ST20-001.activate-main-don')
  s = pick(s, 'alice', [0])
  assert.equal(s.instances[top].faceUp, true)
  s = choose(s, 'alice', [leader])
  s = roundTrip(choose(s, 'alice', [zones(s, 'alice').cost.find(id => s.instances[id].rested)!]))
  assert.equal(zones(s, 'alice').attached.filter(id => s.instances[id].attachedTo === leader).length, 1)
  assert.equal(offeredEffects(s, 'alice', 'ST20-001.activate-main-don').length, 0, 'once per turn')
  s = endTurn(endTurn(s))
  s = startEffect(s, 'alice', 'ST20-001.activate-main-don')
  assert.equal(pendingChoice(s, 'alice'), undefined, 'top Life already face-up: nothing')
  void kata
})

test('M6 FAQ ST20-002: Cracker K.O.d by an effect may trash the top Life card instead, once per turn; its Trigger trashes 1 card to play it', () => {
  let s = toMain(newGame(deckFor('OP03-099', ST20), deckFor('ST04-001', ['ST04-003'])), 10)
  const cracker = field(s, 'alice', 'ST20-002'), top = zones(s, 'alice').life[0]
  s = playCard(s, 'bob', inHand(s, 'bob', 'ST04-003'))
  s = act(s, 'bob', { type: 'ANSWER_CHOICE', choiceId: pendingChoice(s, 'bob')!.choiceId, tokens: pendingChoice(s, 'bob')!.options.slice(0, 5).map(o => o.token) })
  s = choose(s, 'bob', [cracker])
  s = roundTrip(pick(s, 'alice', [0]))
  assert.equal(zoneOf(s, cracker), 'characters'); assert.equal(zoneOf(s, top), 'trash')
  let t = game(3)
  const c2 = put(t, 'alice', 'ST20-002', 'life')
  t = endTurn(t)
  t = lifeTrigger(t, 'alice')
  t = choose(t, 'alice', handIds(t, 'alice', 1))
  assert.equal(zoneOf(t, c2), 'characters')
})

test('M6 ST-20 Brulee Trigger looks at a top Life card, places it, then goes to hand; Pudding returns a top Life card to hand to set a Big Mom cost 3 or less active', () => {
  let s = game(3)
  const brulee = put(s, 'alice', 'ST20-003', 'life')
  s = endTurn(s)
  s = lifeTrigger(s, 'alice')
  s = choose(s, 'alice', [])
  assert.equal(zoneOf(s, brulee), 'hand')
  let t = game(5)
  const galette = field(t, 'alice', 'OP03-107', true), top = zones(t, 'alice').life[0]
  t = playCard(t, 'alice', inHand(t, 'alice', 'ST20-004'))
  t = pick(t, 'alice', [0])
  assert.equal(zoneOf(t, top), 'hand')
  t = choose(t, 'alice', [galette])
  assert.equal(t.instances[galette].rested, false)
  let u = game(3)
  put(u, 'alice', 'ST20-004', 'life')
  u = endTurn(u)
  const foe = field(u, 'bob', 'OP03-107')
  u = choose(lifeTrigger(u, 'alice'), 'alice', [foe])
  assert.equal(u.instances[foe].rested, true)
})

test('M6 FAQ ST20-005: Linlin trashes 1 card, then the opponent chooses to trash 2 of its hand cards or its top Life card', () => {
  let s = game(7)
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST20-005'))
  s = choose(s, 'alice', handIds(s, 'alice', 1))
  const bobHand = zones(s, 'bob').hand.length
  s = pick(s, 'bob', [0])
  const two = zones(s, 'bob').hand.slice(0, 2)
  s = roundTrip(choose(s, 'bob', two))
  assert.equal(zones(s, 'bob').hand.length, bobHand - 2); assert.ok(two.every(id => zoneOf(s, id) === 'trash'))
  let t = game(7)
  t = playCard(t, 'alice', inHand(t, 'alice', 'ST20-005'))
  t = choose(t, 'alice', handIds(t, 'alice', 1))
  const top = zones(t, 'bob').life[0]
  t = pick(t, 'bob', [1])
  assert.equal(zoneOf(t, top), 'trash')
  let u = game(7)
  u = choose(playCard(u, 'alice', inHand(u, 'alice', 'ST20-005')), 'alice', [])
  assert.equal(pendingChoice(u, 'bob'), undefined, 'cost declined: nothing')
})

test('M6 ST-20 Smoothie adds a Life card to hand when attacking for +2000 this battle; its Trigger trashes 1 card to play it', () => {
  let s = game(5)
  const smoothie = field(s, 'alice', 'OP03-110'), life = zones(s, 'alice').life.length
  s = attack(s, smoothie, leaderOf(s, 'bob'))
  s = pick(s, 'alice', [0])
  assert.equal(zones(s, 'alice').life.length, life - 1)
  assert.ok(s.battle!.counterModifiers.some(m => m.target.instanceId === smoothie && m.amount === 2000))
  let t = game(3)
  const s2 = put(t, 'alice', 'OP03-110', 'life')
  t = endTurn(t)
  t = choose(lifeTrigger(t, 'alice'), 'alice', handIds(t, 'alice', 1))
  assert.equal(zoneOf(t, s2), 'characters')
})

test('M6 FAQ OP03-112: Pudding looks at 4 for a [Sanji] (any type) or a Big Mom Pirates card other than Charlotte Pudding', () => {
  let s = game(5)
  const pudding = inHand(s, 'alice', 'OP03-112')
  // Scenario fixture: a deck card becomes a red [Sanji] (ST01-004), which only a multicoloured Leader could include.
  const sanji = zones(s, 'alice').deck.find(id => s.instances[id].definitionId === definitionOf('OP03-106').definitionId)!
  const sanjiDef = definitionOf('ST01-004')
  s.instances[sanji].definitionId = sanjiDef.definitionId; s.instances[sanji].printingKey = 'ST01-004::standard'
  const deck = zones(s, 'alice').deck
  deck.splice(deck.indexOf(sanji), 1); deck.unshift(sanji)
  const other = put(s, 'alice', 'OP03-112', 'deckTop'), bigMom = put(s, 'alice', 'OP03-107', 'deckTop')
  s = playCard(s, 'alice', pudding)
  const opts = optionIds(s, 'alice')
  assert.ok(opts.includes(sanji), '[Sanji] without the Big Mom type'); assert.ok(opts.includes(bigMom)); assert.ok(!opts.includes(other), 'not [Charlotte Pudding]')
})

test('M6 ST-20 Streusen trashes a card with a Trigger to K.O. a cost 1 or less; Thunder Bolt trashes the top Life to K.O. a cost 5 or less, and K.O.s one as Trigger', () => {
  let s = game(5)
  const withTrigger = inHand(s, 'alice', 'ST20-002'), without = inHand(s, 'alice', 'OP03-106'), small = field(s, 'bob', 'OP03-115')
  s = playCard(s, 'alice', inHand(s, 'alice', 'OP03-115'))
  assert.ok(optionIds(s, 'alice').includes(withTrigger)); assert.ok(!optionIds(s, 'alice').includes(without), 'no [Trigger]')
  s = choose(s, 'alice', [withTrigger])
  s = choose(s, 'alice', [small])
  assert.equal(zoneOf(s, small), 'trash')
  let t = game(5)
  const bolt = put(t, 'alice', 'OP03-121', 'hand'), foe = field(t, 'bob', 'OP03-110'), top = zones(t, 'alice').life[0]
  t = startFrom(t, 'alice', 'OP03-121.main-ko', bolt)
  t = pick(t, 'alice', [0])
  assert.equal(zoneOf(t, top), 'trash')
  t = choose(t, 'alice', [foe])
  assert.equal(zoneOf(t, foe), 'trash'); assert.equal(zoneOf(t, bolt), 'trash')
  let u = game(3)
  put(u, 'alice', 'OP03-121', 'life')
  u = endTurn(u)
  const f2 = field(u, 'bob', 'OP03-110')
  u = choose(lifeTrigger(u, 'alice'), 'alice', [f2])
  assert.equal(zoneOf(u, f2), 'trash')
})

test('M6 FAQ OP03-118: Ikoku Sovereignty gives +5000 this battle; its Trigger trashes 2 cards to add the top deck card to the top of the Life', () => {
  let s = endTurn(game(5))
  const ikoku = put(s, 'alice', 'OP03-118', 'hand')
  s = attack(s, field(s, 'bob', 'OP03-106'), leaderOf(s, 'alice'))
  s = act(s, 'alice', { type: 'PASS_BLOCKER', battleId: s.battle!.id })
  const a = legal(s, 'alice').find(x => x.type === 'PLAY_COUNTER_EVENT') as { paymentDonIds: string[]; battleId: string }
  s = act(s, 'alice', { type: 'PLAY_COUNTER_EVENT', cardId: ikoku, targetId: null, paymentDonIds: a.paymentDonIds.slice(0, 2), donMinusIds: [], battleId: a.battleId })
  s = choose(s, 'alice', [leaderOf(s, 'alice')])
  assert.equal(s.battle!.counterModifiers.reduce((n, m) => n + m.amount, 0), 5000)
  let t = game(3)
  put(t, 'alice', 'OP03-118', 'life')
  t = endTurn(t)
  t = lifeTrigger(t, 'alice')
  const life = zones(t, 'alice').life.length
  t = choose(t, 'alice', handIds(t, 'alice', 2))
  t = pick(t, 'alice', [0])
  assert.equal(zones(t, 'alice').life.length, life + 1)
})

test('M6 ST-20 Charlotte Opera (no ability) and Galette ([Blocker]) are played for their printed cost and power', () => {
  let s = game(9)
  const opera = inHand(s, 'alice', 'OP03-106'), galette = inHand(s, 'alice', 'OP03-107')
  s = playCard(playCard(s, 'alice', opera), 'alice', galette)
  assert.equal(power(s, opera), definitionOf('OP03-106').power); assert.equal(power(s, galette), definitionOf('OP03-107').power)
  s = endTurn(s)
  s = attack(s, field(s, 'bob', 'OP03-106'), leaderOf(s, 'alice'))
  assert.ok((legal(s, 'alice').find(x => x.type === 'ACTIVATE_BLOCKER') as { blockerIds: string[] }).blockerIds.includes(galette))
  void finishBattle
})

test('M6 ST-20 certificates validate against the current registry; all ST-20 cards are PLAYABLE_VERIFIED', async () => {
  const { ST20_CERTIFICATIONS, certificationErrors, effectiveStatus } = await import('../src/game/cards/certification')
  const { engineCatalog, currentEngineRegistry } = await import('../src/lib/engine/catalog')
  const { definitions } = engineCatalog(), registry = currentEngineRegistry()
  for (const c of ST20_CERTIFICATIONS) assert.deepEqual(certificationErrors(c, definitions.find(x => x.definitionId === c.definitionId), registry), [], c.definitionId)
  for (const n of ['OP03-099', ...ST20]) assert.equal(effectiveStatus(definitions.find(x => x.number === n)!), 'PLAYABLE_VERIFIED', n)
})
