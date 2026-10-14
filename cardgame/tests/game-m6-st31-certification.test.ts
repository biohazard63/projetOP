import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateCharacteristics } from '../src/game/effects/characteristics'
import type { GameState } from '../src/game/core/types'
import { act, attachDon, attack, attackerIds, choose, deckFor, definitionOf, endTurn, finishBattle, inHand, leaderOf, legal, newGame, offeredEffects, optionIds, pendingChoice, playCard, put, roundTrip, startEffect, toMain, zoneOf } from './helpers/m6'

// M6 ST-31 (RED Monkey.D.Luffy), official English texts (series 569031). Scenarios follow the official text, the ST-31, OP-04
// and OP-11 FAQ, the errata snapshot and the official OP04-016 card image (docs/game/evidence/m6/sources/), through public
// commands only.
const ST31 = ['ST31-001', 'ST31-002', 'ST31-003', 'ST31-004', 'ST31-005', 'OP01-016', 'OP11-003', 'OP11-009', 'OP11-012', 'OP14-015', 'ST23-004', 'P-101', 'OP04-016', 'OP13-021']
const BOB = ['OP03-106', 'OP03-107', 'OP03-110']
const game = (turn = 5) => toMain(newGame(deckFor('ST21-001', ST31), deckFor('OP03-099', BOB)), turn)
/** Both players lead red Luffy decks with ST-31 cards (Bob can play OP04-016 on Alice's turn). */
const mirror = (turn = 5) => toMain(newGame(deckFor('ST21-001', ST31), deckFor('ST21-001', ST31)), turn)
const zones = (s: GameState, owner: string) => s.players.find(p => p.id === owner)!.zones
const power = (s: GameState, id: string) => evaluateCharacteristics(s, id).power.current
const field = (s: GameState, owner: string, number: string, rested = false) => put(s, owner, number, 'characters', { playedEarlier: true, rested })
const pick = (s: GameState, owner: string, indexes: number[]) => { const c = pendingChoice(s, owner)!; return act(s, owner, { type: 'ANSWER_CHOICE', choiceId: c.choiceId, tokens: indexes.map(i => c.options[i].token) }) }
const startFrom = (s: GameState, owner: string, abilityId: string, sourceId: string) => {
  const a = offeredEffects(s, owner, abilityId).find(x => x.effectId.includes(sourceId))
  assert.ok(a, `${abilityId} from ${sourceId} not offered`)
  return act(s, owner, { type: 'START_EFFECT', effectId: a!.effectId })
}
const playCounter = (s: GameState, owner: string, cardId: string) => {
  const c = legal(s, owner).find(x => x.type === 'PLAY_COUNTER_EVENT') as { paymentDonIds: string[]; battleId: string }
  assert.ok(c, 'counter window')
  return act(s, owner, { type: 'PLAY_COUNTER_EVENT', cardId, targetId: null, paymentDonIds: [], donMinusIds: [], battleId: c.battleId })
}

test('M6 FAQ OP04-016: Bad Manners Kick Course costs 0 per its official card image; trashing 1 card gives +3000 this battle, without trashing nothing; its Trigger gives -3000', () => {
  assert.equal(definitionOf('OP04-016').cost, 0)
  let s = endTurn(game(5))
  const kick = put(s, 'alice', 'OP04-016', 'hand'), fodder = inHand(s, 'alice', 'OP11-003', [kick]), leader = leaderOf(s, 'alice')
  s = attack(s, field(s, 'bob', 'OP03-106'), leader)
  s = act(s, 'alice', { type: 'PASS_BLOCKER', battleId: s.battle!.id })
  s = playCounter(s, 'alice', kick)
  s = choose(s, 'alice', [fodder])
  s = roundTrip(choose(s, 'alice', [leader]))
  assert.equal(zoneOf(s, fodder), 'trash'); assert.equal(s.battle!.counterModifiers.reduce((n, m) => n + m.amount, 0), 3000)
  let t = endTurn(game(5))
  const k2 = put(t, 'alice', 'OP04-016', 'hand')
  t = attack(t, field(t, 'bob', 'OP03-106'), leaderOf(t, 'alice'))
  t = act(t, 'alice', { type: 'PASS_BLOCKER', battleId: t.battle!.id })
  t = playCounter(t, 'alice', k2)
  t = choose(t, 'alice', [])
  assert.equal(pendingChoice(t, 'alice'), undefined); assert.equal(t.battle!.counterModifiers.reduce((n, m) => n + m.amount, 0), 0)
  let u = endTurn(game(3))
  put(u, 'alice', 'OP04-016', 'life')
  u = attack(u, field(u, 'bob', 'OP03-106'), leaderOf(u, 'alice'))
  u = act(u, 'alice', { type: 'PASS_BLOCKER', battleId: u.battle!.id }); u = act(u, 'alice', { type: 'PASS_COUNTER', battleId: u.battle!.id })
  u = act(u, 'bob', { type: 'RESOLVE_BATTLE', battleId: u.battle!.id })
  u = act(u, 'alice', { type: 'ANSWER_TRIGGER', choiceId: (legal(u, 'alice').find(a => a.type === 'ANSWER_TRIGGER') as { choiceId: string }).choiceId, activate: true })
  const bobLeader = leaderOf(u, 'bob')
  u = choose(u, 'alice', [bobLeader])
  assert.equal(power(u, bobLeader), definitionOf('OP03-099').power! - 3000)
})

test('M6 ST-31 Robin with 2 DON!! gives -2000 until the end of the next opposing turn when attacking; Zoro has [Rush] and gives -1000 this turn when attacking', () => {
  let s = endTurn(game(5))
  const foe = field(s, 'bob', 'OP03-106')
  s = endTurn(s)
  const robin = field(s, 'alice', 'OP11-009'); attachDon(s, 'alice', robin, 2)
  s = attack(s, robin, leaderOf(s, 'bob'))
  s = roundTrip(choose(s, 'alice', [foe]))
  s = finishBattle(s)
  assert.equal(power(s, foe), 4000)
  s = endTurn(s)
  assert.equal(power(s, foe), 4000, 'during the opponent next turn')
  s = endTurn(s)
  assert.equal(power(s, foe), 6000, 'expired')
  let t = endTurn(game(9))
  const f2 = field(t, 'bob', 'OP03-106')
  t = endTurn(t)
  const zoro = inHand(t, 'alice', 'OP14-015')
  t = playCard(t, 'alice', zoro)
  assert.ok(attackerIds(t, 'alice').includes(zoro), '[Rush]')
  t = attack(t, zoro, leaderOf(t, 'bob'))
  t = choose(t, 'alice', [f2])
  assert.equal(power(t, f2), 5000)
})

test('M6 FAQ OP11-012: Franky gives all of your Characters +2000 this turn after the opponent activates an Event on your turn, once per turn; not for a Trigger', () => {
  let s = mirror(5)
  const franky = field(s, 'alice', 'OP11-012'), other = field(s, 'alice', 'OP11-003')
  const kick = put(s, 'bob', 'OP04-016', 'hand')
  s = attack(s, leaderOf(s, 'alice'), leaderOf(s, 'bob'))
  s = act(s, 'bob', { type: 'PASS_BLOCKER', battleId: s.battle!.id })
  s = playCounter(s, 'bob', kick)
  s = choose(s, 'bob', [])
  s = roundTrip(s)
  assert.equal(power(s, franky), definitionOf('OP11-012').power! + 2000); assert.equal(power(s, other), definitionOf('OP11-003').power! + 2000)
  let t = mirror(5)
  const f2 = field(t, 'alice', 'OP11-012')
  put(t, 'bob', 'OP04-016', 'life')
  t = attack(t, leaderOf(t, 'alice'), leaderOf(t, 'bob'))
  t = act(t, 'bob', { type: 'PASS_BLOCKER', battleId: t.battle!.id }); t = act(t, 'bob', { type: 'PASS_COUNTER', battleId: t.battle!.id })
  t = act(t, 'alice', { type: 'RESOLVE_BATTLE', battleId: t.battle!.id })
  t = act(t, 'bob', { type: 'ANSWER_TRIGGER', choiceId: (legal(t, 'bob').find(a => a.type === 'ANSWER_TRIGGER') as { choiceId: string }).choiceId, activate: true })
  t = choose(t, 'bob', [])
  assert.equal(power(t, f2), definitionOf('OP11-012').power, 'a [Trigger] is not an activation')
})

test('M6 ST-31 Gum-Gum Gatling Gun gives a rested DON!! to a Monkey.D.Luffy card then -2000; Chopper P-101 gives a rested DON!! to the Leader on play', () => {
  let s = endTurn(game(5))
  const foe = field(s, 'bob', 'OP03-106')
  s = endTurn(s)
  const leader = leaderOf(s, 'alice')
  s = playCard(s, 'alice', inHand(s, 'alice', 'OP11-009'))
  s = startFrom(s, 'alice', 'OP13-021.main-don-power', inHand(s, 'alice', 'OP13-021'))
  assert.deepEqual(optionIds(s, 'alice'), [leader], 'only [Monkey.D.Luffy] cards')
  s = choose(s, 'alice', [leader])
  s = choose(s, 'alice', [zones(s, 'alice').cost.find(id => s.instances[id].rested)!])
  s = roundTrip(choose(s, 'alice', [foe]))
  assert.equal(zones(s, 'alice').attached.filter(id => s.instances[id].attachedTo === leader).length, 1); assert.equal(power(s, foe), 4000)
  let t = game(7)
  const l2 = leaderOf(t, 'alice')
  t = playCard(t, 'alice', inHand(t, 'alice', 'P-101'))
  t = choose(t, 'alice', [zones(t, 'alice').cost.find(id => t.instances[id].rested)!])
  assert.equal(zones(t, 'alice').attached.filter(id => t.instances[id].attachedTo === l2).length, 1)
})

test('M6 ST-31 Sanji with 2 DON!! has [Rush] and on play draws 1 then plays a Straw Hat Crew Character cost 5 or less other than Sanji; Jinbe plays a cost 1 card including Thousand Sunny', () => {
  let s = game(9)
  const usopp = put(s, 'alice', 'OP11-003', 'hand'), sanji2 = put(s, 'alice', 'ST31-001', 'hand'), sanji = inHand(s, 'alice', 'ST31-001', [sanji2])
  s = playCard(s, 'alice', sanji)
  assert.ok(!optionIds(s, 'alice').includes(sanji2), 'other than [Sanji]')
  s = roundTrip(choose(s, 'alice', [usopp]))
  assert.equal(zoneOf(s, usopp), 'characters')
  assert.ok(!attackerIds(s, 'alice').includes(sanji))
  attachDon(s, 'alice', sanji, 2)
  assert.ok(attackerIds(s, 'alice').includes(sanji), '[DON!! x2] [Rush]')
  let t = game(7)
  const sunny = put(t, 'alice', 'ST31-005', 'hand')
  t = playCard(t, 'alice', inHand(t, 'alice', 'ST31-002'))
  assert.ok(optionIds(t, 'alice').includes(sunny), 'FAQ ST31-002: the Stage can be played')
  t = choose(t, 'alice', [sunny])
  while (pendingChoice(t, 'alice')) t = pick(t, 'alice', pendingChoice(t, 'alice')!.min ? pendingChoice(t, 'alice')!.options.map((_, i) => i) : [])
  assert.equal(zoneOf(t, sunny), 'stage')
})

test('M6 FAQ ST31-003: Brook gains [Blocker] and +3000 during the opponent turn with a total of 3 or more given DON!! cards', () => {
  let s = game(7)
  const brook = field(s, 'alice', 'ST31-003'), luffy = field(s, 'alice', 'OP11-003')
  attachDon(s, 'alice', leaderOf(s, 'alice'), 2); attachDon(s, 'alice', luffy, 1)
  assert.equal(power(s, brook), 3000, 'your turn: no bonus')
  s = act(s, 'alice', { type: 'END_MAIN' })
  s = act(s, 'alice', { type: 'ADVANCE_PHASE' })
  while (s.phase !== 'MAIN') s = act(s, s.activePlayerId!, { type: 'ADVANCE_PHASE' })
  assert.equal(zones(s, 'alice').attached.length, 3)
  assert.equal(power(s, brook), 6000)
  s = attack(s, field(s, 'bob', 'OP03-106'), leaderOf(s, 'alice'))
  assert.ok((legal(s, 'alice').find(x => x.type === 'ACTIVATE_BLOCKER') as { blockerIds: string[] }).blockerIds.includes(brook))
  let t = endTurn(game(7))
  const b2 = field(t, 'alice', 'ST31-003')
  t = attack(t, field(t, 'bob', 'OP03-106'), leaderOf(t, 'alice'))
  assert.ok(!((legal(t, 'alice').find(x => x.type === 'ACTIVATE_BLOCKER') as { blockerIds: string[] } | undefined)?.blockerIds ?? []).includes(b2))
})

test('M6 FAQ ST31-004: Luffy has [Rush] with a total of 3 or more given DON!! and on play gives -1000 per Straw Hat Crew card on your field to one opposing Character', () => {
  let s = endTurn(game(9))
  const foe = field(s, 'bob', 'OP03-110')
  s = endTurn(s)
  const usopp = field(s, 'alice', 'OP11-003')
  put(s, 'alice', 'ST31-005', 'stage')
  attachDon(s, 'alice', usopp, 2)
  const luffy = inHand(s, 'alice', 'ST31-004')
  s = playCard(s, 'alice', luffy)
  s = roundTrip(choose(s, 'alice', [foe]))
  assert.equal(power(s, foe), definitionOf('OP03-110').power! - 4000, 'Leader, Usopp, Luffy and the Stage')
  assert.ok(!attackerIds(s, 'alice').includes(luffy), '2 given DON!!: no [Rush]')
  attachDon(s, 'alice', usopp, 1)
  assert.ok(attackerIds(s, 'alice').includes(luffy), '3 given DON!!: [Rush]')
})

test('M6 ST-31 Thousand Sunny looks at 5 for a Straw Hat Crew card on play and rests itself to give a rested DON!! to a Monkey.D.Luffy card', () => {
  let s = game(5)
  const top = put(s, 'alice', 'OP11-003', 'deckTop')
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST31-005'))
  s = choose(s, 'alice', [top])
  while (pendingChoice(s, 'alice')) s = pick(s, 'alice', pendingChoice(s, 'alice')!.options.map((_, i) => i))
  assert.equal(zoneOf(s, top), 'hand')
  const leader = leaderOf(s, 'alice'), sunny = zones(s, 'alice').stage[0]
  s = startEffect(s, 'alice', 'ST31-005.activate-main-don')
  s = choose(s, 'alice', [leader])
  s = roundTrip(choose(s, 'alice', [zones(s, 'alice').cost.find(id => s.instances[id].rested)!]))
  assert.equal(s.instances[sunny].rested, true); assert.equal(zones(s, 'alice').attached.filter(id => s.instances[id].attachedTo === leader).length, 1)
})

test('M6 ST-31 certificates validate against the current registry; all ST-31 cards are PLAYABLE_VERIFIED', async () => {
  const { ST31_CERTIFICATIONS, certificationErrors, effectiveStatus } = await import('../src/game/cards/certification')
  const { engineCatalog, currentEngineRegistry } = await import('../src/lib/engine/catalog')
  const { definitions } = engineCatalog(), registry = currentEngineRegistry()
  for (const c of ST31_CERTIFICATIONS) assert.deepEqual(certificationErrors(c, definitions.find(x => x.definitionId === c.definitionId), registry), [], c.definitionId)
  for (const n of ['ST21-001', ...ST31]) assert.equal(effectiveStatus(definitions.find(x => x.number === n)!), 'PLAYABLE_VERIFIED', n)
})
