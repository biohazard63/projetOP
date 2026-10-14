import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateCharacteristics } from '../src/game/effects/characteristics'
import type { GameState } from '../src/game/core/types'
import { act, attachDon, attack, attackerIds, choose, deckFor, definitionOf, endTurn, finishBattle, inHand, leaderOf, legal, newGame, offeredEffects, optionIds, pendingChoice, playCard, put, roundTrip, startEffect, toMain, zoneOf } from './helpers/m6'

// M6 ST-19 (Black Smoker), official English texts (series 569019). Scenarios follow the official text, the OP-02/OP-03 and
// ST-15-20 FAQ and the errata snapshot (docs/game/evidence/m6/sources/), through public commands only.
const ST19 = ['ST19-001', 'ST19-002', 'ST19-003', 'ST19-004', 'ST19-005', 'OP02-098', 'OP02-106', 'OP02-108', 'OP02-109', 'OP02-113', 'OP02-116', 'OP03-079', 'OP03-089', 'OP02-117']
const game = (turn = 5) => toMain(newGame(deckFor('OP02-093', ST19), deckFor('OP02-093', ST19)), turn)
const zones = (s: GameState, owner: string) => s.players.find(p => p.id === owner)!.zones
const cost = (s: GameState, id: string) => evaluateCharacteristics(s, id).cost.current
const power = (s: GameState, id: string) => evaluateCharacteristics(s, id).power.current
const field = (s: GameState, owner: string, number: string, rested = false) => put(s, owner, number, 'characters', { playedEarlier: true, rested })
const lifeTrigger = (s: GameState, defender: string) => {
  s = attack(s, field(s, s.activePlayerId!, 'OP02-109'), leaderOf(s, defender))
  s = act(s, defender, { type: 'PASS_BLOCKER', battleId: s.battle!.id }); s = act(s, defender, { type: 'PASS_COUNTER', battleId: s.battle!.id })
  s = act(s, s.activePlayerId!, { type: 'RESOLVE_BATTLE', battleId: s.battle!.id })
  const t = legal(s, defender).find(a => a.type === 'ANSWER_TRIGGER') as { choiceId: string } | undefined
  assert.ok(t, 'Trigger offered')
  return act(s, defender, { type: 'ANSWER_TRIGGER', choiceId: t!.choiceId, activate: true })
}

test('M6 FAQ OP02-093: Leader Smoker with a DON!! gives -1 cost and gains +1000 this turn once while any Character has a cost of 0', () => {
  let s = game(5)
  const leader = leaderOf(s, 'alice'), tsuru = field(s, 'bob', 'OP02-106'), other = field(s, 'bob', 'OP02-098')
  attachDon(s, 'alice', leader, 1)
  const before = power(s, leader)!
  s = roundTrip(choose(startEffect(s, 'alice', 'OP02-093.activate-main-cost'), 'alice', [tsuru]))
  assert.equal(cost(s, tsuru), 0); assert.equal(power(s, leader), before + 1000)
  assert.equal(offeredEffects(s, 'alice', 'OP02-093.activate-main-cost').length, 0, 'once per turn')
  let t = game(5)
  const l2 = leaderOf(t, 'alice'), koby = field(t, 'bob', 'OP02-098')
  attachDon(t, 'alice', l2, 1)
  const b2 = power(t, l2)!
  t = choose(startEffect(t, 'alice', 'OP02-093.activate-main-cost'), 'alice', [koby])
  assert.equal(cost(t, koby), 2); assert.equal(power(t, l2), b2, 'no Character of cost 0')
  void other
})

test('M6 ST-19 Smoker trashes 1 black {Navy} card to stop up to 2 cost 4 or less Characters attacking until the end of the opponent next turn', () => {
  let s = game(7)
  const a = field(s, 'bob', 'OP02-098'), b = field(s, 'bob', 'OP02-113'), navy = inHand(s, 'alice', 'OP02-109')
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST19-001'))
  s = choose(s, 'alice', [navy])
  assert.equal(zoneOf(s, navy), 'trash')
  s = roundTrip(choose(s, 'alice', [a, b]))
  s = endTurn(s)
  assert.ok(!attackerIds(s, 'bob').includes(a) && !attackerIds(s, 'bob').includes(b), 'cannot attack during the opponent next turn')
  s = endTurn(endTurn(s))
  assert.ok(attackerIds(s, 'bob').includes(a), 'the restriction has ended')
  let t = game(7)
  field(t, 'bob', 'OP02-098')
  t = choose(playCard(t, 'alice', inHand(t, 'alice', 'ST19-001')), 'alice', [])
  assert.equal(pendingChoice(t, 'alice'), undefined, 'cost declined: nothing')
})

test('M6 ST-19 Sengoku trashes 2 black {Navy} cards to draw 3 with a {Navy} Leader', () => {
  let s = game(5)
  const x = inHand(s, 'alice', 'OP02-109'), y = inHand(s, 'alice', 'OP02-116', [x])
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST19-002'))
  const hand = zones(s, 'alice').hand.length
  s = choose(s, 'alice', [x, y])
  assert.equal(zones(s, 'alice').hand.length, hand - 2 + 3)
})

test('M6 FAQ ST19-003: Tashigi gives -4 cost with a Smoker Leader; the turn it is played it trashes a cost 0 Character without a K.O.', () => {
  let s = game(7)
  const foe = field(s, 'bob', 'OP02-098')
  const tashigi = inHand(s, 'alice', 'ST19-003')
  s = choose(playCard(s, 'alice', tashigi), 'alice', [foe])
  assert.equal(cost(s, foe), 0)
  s = choose(startEffect(s, 'alice', 'ST19-003.activate-main-trash'), 'alice', [foe])
  assert.equal(zoneOf(s, foe), 'trash')
  assert.ok(!s.effects!.cardEvents?.some(e => e.type === 'CARD_KO' && e.subjectId === foe), 'trashed, not K.O.d')
  assert.ok(!s.effects!.cardOperations?.some(o => o.type === 'KO' && o.subject.instanceId === foe), 'no K.O. operation')
  s = endTurn(endTurn(s))
  assert.equal(offeredEffects(s, 'alice', 'ST19-003.activate-main-trash').length, 0, 'not played this turn')
})

test('M6 FAQ ST19-004 and ST19-005: Hina and Garp place a trash card at the bottom of the deck (not with an empty trash) to give a rested DON!! or -1 cost', () => {
  let s = game(5)
  const hina = field(s, 'alice', 'ST19-004'), garp = field(s, 'alice', 'ST19-005'), leader = leaderOf(s, 'alice')
  assert.equal(offeredEffects(s, 'alice', 'ST19-004.activate-main-don').length, 0, 'empty trash')
  assert.equal(offeredEffects(s, 'alice', 'ST19-005.activate-main-cost').length, 0, 'empty trash')
  const t1 = put(s, 'alice', 'OP02-116', 'trash'), t2 = put(s, 'alice', 'OP02-109', 'trash')
  s = playCard(s, 'alice', inHand(s, 'alice', 'OP02-106')); s = choose(s, 'alice', [])
  s = choose(startEffect(s, 'alice', 'ST19-004.activate-main-don'), 'alice', [t1])
  assert.equal(zones(s, 'alice').deck.at(-1), t1)
  s = choose(s, 'alice', [leader])
  s = choose(s, 'alice', [zones(s, 'alice').cost.find(id => s.instances[id].rested)!])
  assert.equal(zones(s, 'alice').attached.filter(id => s.instances[id].attachedTo === leader).length, 1)
  const foe = field(s, 'bob', 'OP02-098')
  s = choose(startEffect(s, 'alice', 'ST19-005.activate-main-cost'), 'alice', [t2])
  s = choose(s, 'alice', [foe])
  assert.equal(cost(s, foe), 2)
  attachDon(s, 'alice', hina, 1)
  assert.equal(cost(s, hina), 4, 'own turn: printed cost')
  s = endTurn(s)
  assert.equal(cost(s, hina), 8, '[DON!! x1] [Opponent\'s Turn] +4 cost')
  s = attack(s, field(s, 'bob', 'OP02-109'), leaderOf(s, 'alice'))
  assert.ok((legal(s, 'alice').find(a => a.type === 'ACTIVATE_BLOCKER') as { blockerIds: string[] }).blockerIds.includes(garp))
})

test('M6 ST-19 Koby trashes 1 card to K.O. a cost 3 or less; Tsuru and Ice Age give -2 and -5 cost; Ice Age Trigger K.O.s a cost 3 or less', () => {
  let s = game(7)
  const foe = field(s, 'bob', 'OP02-113'), discard = inHand(s, 'alice', 'OP02-116')
  s = playCard(s, 'alice', inHand(s, 'alice', 'OP02-098'))
  s = choose(s, 'alice', [discard])
  s = choose(s, 'alice', [foe])
  assert.equal(zoneOf(s, foe), 'trash')
  const big = field(s, 'bob', 'ST19-004')
  s = choose(playCard(s, 'alice', inHand(s, 'alice', 'OP02-106')), 'alice', [big])
  assert.equal(cost(s, big), 2)
  put(s, 'alice', 'OP02-117', 'hand')
  s = choose(startEffect(s, 'alice', 'OP02-117.main-cost'), 'alice', [big])
  assert.equal(cost(s, big), 0)
  let t = game(3)
  put(t, 'alice', 'OP02-117', 'life')
  t = endTurn(t)
  const f2 = field(t, 'bob', 'OP02-113')
  t = choose(lifeTrigger(t, 'alice'), 'alice', [f2])
  assert.equal(zoneOf(t, f2), 'trash')
})

test('M6 FAQ OP02-113: Helmeppo gives -2 cost when attacking and gains +2000 this battle while any Character has a cost of 0; its Trigger plays it', () => {
  let s = game(5)
  const helmeppo = field(s, 'alice', 'OP02-113'), foe = field(s, 'bob', 'OP02-106')
  s = choose(attack(s, helmeppo, leaderOf(s, 'bob')), 'alice', [foe])
  assert.equal(cost(s, foe), 0)
  assert.ok(s.battle!.counterModifiers.some(m => m.target.instanceId === helmeppo && m.amount === 2000), '+2000 during this battle')
  let t = game(3)
  const card = put(t, 'alice', 'OP02-113', 'life')
  t = lifeTrigger(endTurn(t), 'alice')
  assert.equal(zoneOf(t, card), 'characters')
})

test('M6 ST-19 Vergo with a DON!! cannot be K.O.d in battle', () => {
  let s = endTurn(game(5))
  const vergo = field(s, 'alice', 'OP03-079', true)
  attachDon(s, 'alice', vergo, 1)
  s = finishBattle(attack(s, field(s, 'bob', 'ST19-004'), vergo))
  assert.equal(zoneOf(s, vergo), 'characters')
  let t = endTurn(game(5))
  const v2 = field(t, 'alice', 'OP03-079', true)
  t = finishBattle(attack(t, field(t, 'bob', 'ST19-004'), v2))
  assert.equal(zoneOf(t, v2), 'trash', 'without a DON!!')
})

test('M6 FAQ OP03-089: Brannew looks at 3, adds a {Navy} card other than [Brannew] and trashes the rest', () => {
  let s = game(5)
  const brannew = inHand(s, 'alice', 'OP03-089'), other = put(s, 'alice', 'OP03-089', 'deckTop'), navy = put(s, 'alice', 'OP02-109', 'deckTop')
  s = playCard(s, 'alice', brannew)
  assert.ok(optionIds(s, 'alice').includes(navy) && !optionIds(s, 'alice').includes(other), 'not [Brannew]')
  const looked = zones(s, 'alice').deck.slice(0, 3)
  s = roundTrip(choose(s, 'alice', [navy]))
  assert.equal(zoneOf(s, navy), 'hand')
  for (const id of looked.filter(id => id !== navy)) assert.equal(zoneOf(s, id), 'trash')
})

test('M6 ST-19 Rosinante blocks; Jaguar.D.Saul and Yamakaji (no ability) are played for their printed cost and power', () => {
  for (const number of ['OP02-109', 'OP02-116']) {
    let s = game(9)
    const d = definitionOf(number), id = inHand(s, 'alice', number), before = zones(s, 'alice').cost.filter(x => !s.instances[x].rested).length
    s = playCard(s, 'alice', id)
    assert.equal(zones(s, 'alice').cost.filter(x => !s.instances[x].rested).length, before - d.cost!, number)
    assert.equal(power(s, id), d.power, number)
  }
  let t = endTurn(game(5))
  const rosi = field(t, 'alice', 'OP02-108')
  t = attack(t, field(t, 'bob', 'OP02-109'), leaderOf(t, 'alice'))
  assert.ok((legal(t, 'alice').find(a => a.type === 'ACTIVATE_BLOCKER') as { blockerIds: string[] }).blockerIds.includes(rosi))
})

test('M6 ST-19 certificates validate against the current registry; all ST-19 cards are PLAYABLE_VERIFIED', async () => {
  const { ST19_CERTIFICATIONS, certificationErrors, effectiveStatus } = await import('../src/game/cards/certification')
  const { engineCatalog, currentEngineRegistry } = await import('../src/lib/engine/catalog')
  const { definitions } = engineCatalog(), registry = currentEngineRegistry()
  for (const c of ST19_CERTIFICATIONS) assert.deepEqual(certificationErrors(c, definitions.find(x => x.definitionId === c.definitionId), registry), [], c.definitionId)
  for (const n of ['OP02-093', ...ST19]) assert.equal(effectiveStatus(definitions.find(x => x.number === n)!), 'PLAYABLE_VERIFIED', n)
})
