import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateCharacteristics } from '../src/game/effects/characteristics'
import type { GameState } from '../src/game/core/types'
import { act, attachDon, attack, choose, deckFor, definitionOf, endTurn, finishBattle, inHand, leaderOf, legal, newGame, offeredEffects, optionIds, pendingChoice, playCard, put, roundTrip, startEffect, toMain, zoneOf } from './helpers/m6'

// M6 ST-23 (Red Shanks), official English texts (series 569023). Scenarios follow the official text, the OP-09 and ST-23-28 FAQ
// and the errata snapshot (docs/game/evidence/m6/sources/), through public commands only.
const ST23 = ['ST23-001', 'ST23-002', 'ST23-003', 'ST23-004', 'ST23-005', 'OP09-006', 'OP09-010', 'OP09-011', 'OP09-012', 'OP09-013', 'OP09-014', 'OP09-015', 'OP09-016', 'OP09-020']
const ST14 = ['ST14-003', 'ST14-013', 'ST14-010']
const game = (turn = 5) => toMain(newGame(deckFor('OP09-001', ST23), deckFor('OP09-001', ST23)), turn)
const versusBlack = (turn = 5) => toMain(newGame(deckFor('OP09-001', ST23), deckFor('ST14-001', ST14)), turn)
const zones = (s: GameState, owner: string) => s.players.find(p => p.id === owner)!.zones
const power = (s: GameState, id: string) => evaluateCharacteristics(s, id).power.current
const cost = (s: GameState, id: string) => evaluateCharacteristics(s, id).cost.current
const field = (s: GameState, owner: string, number: string, rested = false) => put(s, owner, number, 'characters', { playedEarlier: true, rested })
const playCost = (s: GameState, owner: string, id: string) => (legal(s, owner).find(a => a.type === 'PLAY_CARD' && a.instanceId === id) as { cost: number } | undefined)?.cost
const blockers = (s: GameState, owner: string) => (legal(s, owner).find(a => a.type === 'ACTIVATE_BLOCKER') as { blockerIds: string[] } | undefined)?.blockerIds ?? []
const lifeTrigger = (s: GameState, defender: string) => {
  s = attack(s, field(s, s.activePlayerId!, 'OP09-016'), leaderOf(s, defender))
  if (pendingChoice(s, defender)) s = choose(s, defender, [])
  s = act(s, defender, { type: 'PASS_BLOCKER', battleId: s.battle!.id }); s = act(s, defender, { type: 'PASS_COUNTER', battleId: s.battle!.id })
  s = act(s, s.activePlayerId!, { type: 'RESOLVE_BATTLE', battleId: s.battle!.id })
  const t = legal(s, defender).find(a => a.type === 'ANSWER_TRIGGER') as { choiceId: string } | undefined
  assert.ok(t, 'Trigger offered')
  return act(s, defender, { type: 'ANSWER_TRIGGER', choiceId: t!.choiceId, activate: true })
}

test('M6 FAQ OP09-001: when the opponent attacks, Leader Shanks may give -1000; declining keeps it for a later attack, once per turn', () => {
  let s = endTurn(game(5))
  const first = field(s, 'bob', 'OP09-016'), second = field(s, 'bob', 'OP09-006')
  s = attack(s, first, leaderOf(s, 'alice'))
  assert.ok(optionIds(s, 'alice').includes(first) && optionIds(s, 'alice').includes(leaderOf(s, 'bob')), 'Leader or Character')
  s = roundTrip(choose(s, 'alice', []))
  s = finishBattle(s)
  const before = power(s, second)!
  s = attack(s, second, leaderOf(s, 'alice'))
  s = choose(s, 'alice', [second])
  assert.equal(power(s, second), before - 1000)
  s = finishBattle(s)
  s = attack(s, leaderOf(s, 'bob'), leaderOf(s, 'alice'))
  assert.equal(pendingChoice(s, 'alice'), undefined, 'used: once per turn')
})

test('M6 FAQ ST23-001: Uta costs 4 less in hand while you have a Character of 10000 power or more (current power), and has [Blocker]', () => {
  let s = game(7)
  const uta = inHand(s, 'alice', 'ST23-001')
  assert.equal(playCost(s, 'alice', uta), 6)
  const big = field(s, 'alice', 'OP09-013')
  attachDon(s, 'alice', big, 4)
  assert.equal(power(s, big), 10000)
  assert.equal(playCost(s, 'alice', uta), 2, 'DON!! raised power counts')
  s = playCard(s, 'alice', uta)
  assert.equal(cost(s, uta), 6, 'on the field: printed cost')
  s = endTurn(s)
  s = attack(s, field(s, 'bob', 'OP09-016'), leaderOf(s, 'alice'))
  if (pendingChoice(s, 'alice')) s = choose(s, 'alice', [])
  assert.ok(blockers(s, 'alice').includes(uta))
})

test('M6 FAQ ST23-002: Shanks costs 3 less while the opponent has an 8000 base power Character; on play the Red-Haired Leader gains +2000 until the end of the opponent next turn', () => {
  let s = game(9)
  const shanks = inHand(s, 'alice', 'ST23-002'), leader = leaderOf(s, 'alice')
  assert.equal(playCost(s, 'alice', shanks), 9, 'printed cost')
  field(s, 'bob', 'ST23-002')
  assert.equal(playCost(s, 'alice', shanks), 6)
  const base = power(s, leader)!
  s = playCard(s, 'alice', shanks)
  assert.equal(power(s, leader), base + 2000)
  s = endTurn(s)
  assert.equal(power(s, leader), base + 2000, 'kept during the opponent next turn')
  s = endTurn(s)
  assert.equal(power(s, leader), base, 'ended')
})

test('M6 ST-23 Benn.Beckman trashes 1 card to K.O. a 4000 base power or less Character with a Red-Haired Leader', () => {
  let s = game(7)
  const weak = field(s, 'bob', 'OP09-014'), strong = field(s, 'bob', 'OP09-013'), discard = inHand(s, 'alice', 'OP09-016')
  attachDon(s, 'bob', weak, 2)
  s = choose(playCard(s, 'alice', inHand(s, 'alice', 'ST23-003')), 'alice', [discard])
  assert.ok(optionIds(s, 'alice').includes(weak) && !optionIds(s, 'alice').includes(strong), 'base power')
  s = choose(s, 'alice', [weak])
  assert.equal(zoneOf(s, weak), 'trash')
})

test('M6 ST-23 Luffy rests a DON!! and itself, Hongo rests itself, to give -1000 and -2000; Yasopp gives a rested DON!! once per turn', () => {
  let s = game(7)
  const luffy = field(s, 'alice', 'ST23-004'), hongo = field(s, 'alice', 'OP09-011'), yasopp = field(s, 'alice', 'ST23-005'), foe = field(s, 'bob', 'OP09-013')
  const before = power(s, foe)!
  s = choose(startEffect(s, 'alice', 'ST23-004.activate-main-power'), 'alice', [foe])
  assert.equal(s.instances[luffy].rested, true); assert.equal(power(s, foe), before - 1000)
  s = choose(startEffect(s, 'alice', 'OP09-011.activate-main-power'), 'alice', [foe])
  assert.equal(s.instances[hongo].rested, true); assert.equal(power(s, foe), before - 3000)
  const leader = leaderOf(s, 'alice')
  s = choose(startEffect(s, 'alice', 'ST23-005.activate-main-don'), 'alice', [leader])
  s = choose(s, 'alice', [zones(s, 'alice').cost.find(id => s.instances[id].rested)!])
  assert.equal(zones(s, 'alice').attached.filter(id => s.instances[id].attachedTo === leader).length, 1)
  assert.equal(offeredEffects(s, 'alice', 'ST23-005.activate-main-don').length, 0)
  void yasopp
})

test('M6 ST-23 Bonk Punch plays a [Monster] from hand and with a DON!! gains +2000 when attacking; Monster may be trashed instead of a Bonk Punch K.O.d by an effect', () => {
  let s = versusBlack(7)
  const monster = inHand(s, 'alice', 'OP09-012'), bonk = inHand(s, 'alice', 'OP09-010')
  s = playCard(s, 'alice', bonk)
  assert.ok(optionIds(s, 'alice').includes(monster))
  s = choose(s, 'alice', [monster])
  assert.equal(zoneOf(s, monster), 'characters')
  s = endTurn(s)
  field(s, 'bob', 'ST14-013')
  s = playCard(s, 'bob', inHand(s, 'bob', 'ST14-003'))
  s = choose(s, 'bob', [bonk])
  assert.deepEqual(optionIds(s, 'alice'), [monster], 'alice may trash Monster instead')
  s = roundTrip(choose(s, 'alice', [monster]))
  assert.equal(zoneOf(s, bonk), 'characters'); assert.equal(zoneOf(s, monster), 'trash')
  let t = game(7)
  const b2 = field(t, 'alice', 'OP09-010')
  attachDon(t, 'alice', b2, 1)
  t = attack(t, b2, leaderOf(t, 'bob'))
  assert.equal(power(t, b2), 5000 + 1000 + 2000)
})

test('M6 ST-23 Yasopp gives the Leader +1000 until the end of the opponent next turn and -1000 when attacking with a DON!!', () => {
  let s = game(7)
  const leader = leaderOf(s, 'alice'), base = power(s, leader)!
  const yasopp = inHand(s, 'alice', 'OP09-013')
  s = choose(playCard(s, 'alice', yasopp), 'alice', [leader])
  assert.equal(power(s, leader), base + 1000)
  attachDon(s, 'alice', yasopp, 1)
  s.instances[yasopp].playedOnTurn = s.turn - 2
  const foe = field(s, 'bob', 'OP09-016'), fp = power(s, foe)!
  s = choose(attack(s, yasopp, leaderOf(s, 'bob')), 'alice', [foe])
  assert.equal(power(s, foe), fp - 1000)
})

test('M6 FAQ OP09-014: Limejuice stops a [Blocker] Character of 4000 power or less from blocking this turn; Lucky.Roux blocks and K.O.s a 6000 base power or less when K.O.d', () => {
  let s = game(7)
  const sentry = field(s, 'bob', 'ST23-001'), roux = field(s, 'bob', 'OP09-015')
  s = playCard(s, 'alice', inHand(s, 'alice', 'OP09-014'))
  assert.ok(optionIds(s, 'alice').includes(sentry), 'Uta 4000 [Blocker]')
  assert.ok(!optionIds(s, 'alice').includes(roux), '5000 power')
  s = choose(s, 'alice', [sentry])
  s = attack(s, leaderOf(s, 'alice'), leaderOf(s, 'bob'))
  if (pendingChoice(s, 'bob')) s = choose(s, 'bob', [])
  assert.ok(!blockers(s, 'bob').includes(sentry) && blockers(s, 'bob').includes(roux))
  let t = endTurn(game(5))
  const r2 = field(t, 'alice', 'OP09-015', true), foe = field(t, 'bob', 'OP09-013')
  t = attack(t, field(t, 'bob', 'ST23-002'), r2)
  if (pendingChoice(t, 'alice')) t = choose(t, 'alice', [])
  t = finishBattle(t)
  assert.equal(zoneOf(t, r2), 'trash')
  t = choose(t, 'alice', [foe])
  assert.equal(zoneOf(t, foe), 'trash')
})

test('M6 ST-23 Come On We Will Fight You searches 5 for a Red-Haired card other than itself; its Trigger draws 1', () => {
  let s = game(5)
  const other = put(s, 'alice', 'OP09-020', 'deckTop'), wanted = put(s, 'alice', 'OP09-013', 'deckTop')
  put(s, 'alice', 'OP09-020', 'hand')
  s = startEffect(s, 'alice', 'OP09-020.main-search')
  assert.ok(optionIds(s, 'alice').includes(wanted) && !optionIds(s, 'alice').includes(other))
  s = choose(s, 'alice', [wanted])
  assert.equal(zoneOf(s, wanted), 'hand')
  let t = game(3)
  put(t, 'alice', 'OP09-020', 'life')
  t = endTurn(t)
  const hand = zones(t, 'alice').hand.length
  t = lifeTrigger(t, 'alice')
  assert.equal(zones(t, 'alice').hand.length, hand + 1)
})

test('M6 ST-23 certificates validate against the current registry; all ST-23 cards are PLAYABLE_VERIFIED', async () => {
  const { ST23_CERTIFICATIONS, certificationErrors, effectiveStatus } = await import('../src/game/cards/certification')
  const { engineCatalog, currentEngineRegistry } = await import('../src/lib/engine/catalog')
  const { definitions } = engineCatalog(), registry = currentEngineRegistry()
  for (const c of ST23_CERTIFICATIONS) assert.deepEqual(certificationErrors(c, definitions.find(x => x.definitionId === c.definitionId), registry), [], c.definitionId)
  for (const n of ['OP09-001', ...ST23]) assert.equal(effectiveStatus(definitions.find(x => x.number === n)!), 'PLAYABLE_VERIFIED', n)
  void definitionOf
})
