import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateCharacteristics } from '../src/game/effects/characteristics'
import type { GameState } from '../src/game/core/types'
import { act, advanceToMain, attachDon, attack, attackerIds, choose, deckFor, definitionOf, finishBattle, inHand, leaderOf, legal, newGame, offeredEffects, optionIds, pendingChoice, playCard, put, roundTrip, startEffect, zoneOf } from './helpers/m6'

// M6 ST-15 (RED Edward.Newgate), official English texts (series 569015). Scenarios follow the official text, the ST-15-20 and
// OP-02 FAQ and the errata snapshot (docs/game/evidence/m6/sources/), through public commands only.
const ST15 = ['ST15-001', 'ST15-002', 'ST15-003', 'ST15-004', 'ST15-005', 'OP02-008', 'OP02-018', 'OP02-019', 'OP02-023', 'OP03-003', 'OP03-006', 'OP03-007', 'OP03-009', 'OP03-010']
const KAIDO = ['ST04-003', 'ST04-002']
const zones = (s: GameState, owner: string) => s.players.find(p => p.id === owner)!.zones
const power = (s: GameState, id: string) => evaluateCharacteristics(s, id).power.current
const field = (s: GameState, owner: string, number: string, rested = false) => put(s, owner, number, 'characters', { playedEarlier: true, rested })
const pick = (s: GameState, owner: string, indexes: number[]) => { const c = pendingChoice(s, owner)!; return act(s, owner, { type: 'ANSWER_CHOICE', choiceId: c.choiceId, tokens: indexes.map(i => c.options[i].token) }) }
/** Ends the active turn, answering the mandatory [End of Your Turn] Life choice of the Newgate Leader when it is asked. */
const endTurn = (s: GameState) => {
  const me = s.activePlayerId!
  s = act(s, me, { type: 'END_MAIN' })
  while (pendingChoice(s, me)) s = pick(s, me, [0])
  return advanceToMain(s)
}
/** As the shared toMain, through this endTurn (the Newgate Leader adds 1 Life card to hand at the end of each of its turns). */
const toMain = (s: GameState, turn = 3) => {
  s = act(s, 'alice', { type: 'CHOOSE_FIRST', choice: 'FIRST' })
  for (let i = 0; i < 2; i++) s = act(s, s.decisionPlayerId!, { type: 'MULLIGAN', redraw: false })
  s = advanceToMain(s)
  while (s.turn < turn) s = endTurn(s)
  return s
}
const game = (turn = 5, bob = deckFor('OP03-099', ['OP03-106', 'OP03-110'])) => toMain(newGame(deckFor('OP02-001', ST15), bob), turn)
/** Bob (Kaido) plays ST04-003 on his turn: DON!! -5, K.O. up to 1 opposing Character with 6000 power or less (an opponent effect). */
const kaidoKO = (s: GameState, target: string) => {
  s = playCard(s, 'bob', inHand(s, 'bob', 'ST04-003'))
  s = act(s, 'bob', { type: 'ANSWER_CHOICE', choiceId: pendingChoice(s, 'bob')!.choiceId, tokens: pendingChoice(s, 'bob')!.options.slice(0, 5).map(o => o.token) })
  return choose(s, 'bob', [target])
}
// Bob's turn 10 with 10 DON!!; Alice leads the red vanilla-text Leader ST01-001 so that her Life is not drained by OP02-001.
const kaidoGame = (turn = 10, leader = 'ST01-001') => toMain(newGame(deckFor(leader, ST15), deckFor('ST04-001', KAIDO)), turn)
const startFrom = (s: GameState, owner: string, abilityId: string, sourceId: string) => {
  const a = offeredEffects(s, owner, abilityId).find(x => x.effectId.includes(sourceId))
  assert.ok(a, `${abilityId} from ${sourceId} not offered`)
  return act(s, owner, { type: 'START_EFFECT', effectId: a!.effectId })
}

test('M6 FAQ OP02-001: Leader Newgate adds the top Life card to hand at the end of the turn; with no Life nothing happens and the game goes on', () => {
  let s = game(5)
  const top = zones(s, 'alice').life[0], life = zones(s, 'alice').life.length
  s = act(s, 'alice', { type: 'END_MAIN' })
  assert.equal(pendingChoice(s, 'alice')!.options.length, 1, 'the top Life card only, mandatory')
  s = roundTrip(pick(s, 'alice', [0]))
  assert.equal(zoneOf(s, top), 'hand'); assert.equal(zones(s, 'alice').life.length, life - 1)
  let t = game(13)
  assert.equal(zones(t, 'alice').life.length, 0, 'six [End of Your Turn] Life cards taken')
  t = act(t, 'alice', { type: 'END_MAIN' })
  assert.equal(pendingChoice(t, 'alice'), undefined)
  t = advanceToMain(t)
  assert.equal(t.result ?? null, null, 'no loss'); assert.equal(t.activePlayerId, 'bob')
})

test('M6 FAQ OP02-023: with 3 or less Life the Event forbids adding Life to hand by own effects this turn; with 4 or more nothing happens; its Trigger gives the Leader +1000', () => {
  let s = endTurn(endTurn(game(5)))
  assert.equal(zones(s, 'alice').life.length, 3, 'Life 6, three [End of Your Turn] Life cards taken')
  s = roundTrip(startFrom(s, 'alice', 'OP02-023.main-lock', inHand(s, 'alice', 'OP02-023')))
  const life = zones(s, 'alice').life.length
  s = act(s, 'alice', { type: 'END_MAIN' })
  assert.equal(pendingChoice(s, 'alice'), undefined, 'the Leader effect cannot add Life this turn')
  s = advanceToMain(s)
  assert.equal(zones(s, 'alice').life.length, life)
  let t = game(5)
  assert.equal(zones(t, 'alice').life.length, 4)
  t = startFrom(t, 'alice', 'OP02-023.main-lock', inHand(t, 'alice', 'OP02-023'))
  assert.equal(t.effects!.lifeToHandLocks?.length ?? 0, 0, '4 or more Life: nothing')
  let u = endTurn(game(3))
  put(u, 'alice', 'OP02-023', 'life')
  u = attack(u, field(u, 'bob', 'OP03-106'), leaderOf(u, 'alice'))
  u = act(u, 'alice', { type: 'PASS_BLOCKER', battleId: u.battle!.id }); u = act(u, 'alice', { type: 'PASS_COUNTER', battleId: u.battle!.id })
  u = act(u, 'bob', { type: 'RESOLVE_BATTLE', battleId: u.battle!.id })
  u = act(u, 'alice', { type: 'ANSWER_TRIGGER', choiceId: (legal(u, 'alice').find(a => a.type === 'ANSWER_TRIGGER') as { choiceId: string }).choiceId, activate: true })
  u = choose(u, 'alice', [leaderOf(u, 'alice')])
  assert.equal(power(u, leaderOf(u, 'alice')), 7000, '6000 +1000')
})

test('M6 ST-15 Atmos with an Edward.Newgate Leader forbids adding Life to hand this turn when attacking; the optional Life cost cannot be paid', () => {
  let s = game(5)
  const atmos = field(s, 'alice', 'ST15-001')
  s = finishBattle(attack(s, atmos, leaderOf(s, 'bob')))
  assert.equal(s.effects!.lifeToHandLocks?.length, 1)
  const thatch = inHand(s, 'alice', 'ST15-004'), life = zones(s, 'alice').life.length
  s = playCard(s, 'alice', thatch)
  s = choose(s, 'alice', [])
  assert.equal(pendingChoice(s, 'alice'), undefined); assert.equal(zones(s, 'alice').life.length, life, 'Thatch adds nothing while locked')
  s = act(s, 'alice', { type: 'END_MAIN' })
  assert.equal(pendingChoice(s, 'alice'), undefined)
  s = advanceToMain(s)
  assert.equal(zones(s, 'alice').life.length, life)
  let t = toMain(newGame(deckFor('ST01-001', ['ST15-001', 'OP03-006']), deckFor('OP03-099', ['OP03-106'])), 5)
  t = finishBattle(attack(t, field(t, 'alice', 'ST15-001'), leaderOf(t, 'bob')))
  assert.equal(t.effects!.lifeToHandLocks?.length ?? 0, 0, 'Leader is not [Edward.Newgate]')
})

test('M6 FAQ ST15-004: Thatch with a Whitebeard Pirates Leader gives -2000 then always adds the top Life card; without one nothing happens', () => {
  let s = endTurn(game(5))
  const foe = field(s, 'bob', 'OP03-106')
  s = endTurn(s)
  const top = zones(s, 'alice').life[0]
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST15-004'))
  s = choose(s, 'alice', [foe])
  s = roundTrip(pick(s, 'alice', [0]))
  assert.equal(power(s, foe), definitionOf('OP03-106').power! - 2000); assert.equal(zoneOf(s, top), 'hand')
  let t = toMain(newGame(deckFor('ST01-001', ['ST15-004', 'OP03-006']), deckFor('OP03-099', ['OP03-106'])), 5)
  field(t, 'bob', 'OP03-106')
  const top2 = zones(t, 'alice').life[0], life = zones(t, 'alice').life.length
  t = playCard(t, 'alice', inHand(t, 'alice', 'ST15-004'))
  assert.equal(pendingChoice(t, 'alice'), undefined, 'FAQ EB03-017/OP14-112: no "Then," part without the Leader condition')
  assert.equal(zoneOf(t, top2), 'life'); assert.equal(zones(t, 'alice').life.length, life)
  let u = endTurn(game(5))
  u = endTurn(u)
  const top3 = zones(u, 'alice').life[0]
  u = playCard(u, 'alice', inHand(u, 'alice', 'ST15-004'))
  u = choose(u, 'alice', [])
  u = pick(u, 'alice', [0])
  assert.equal(zoneOf(u, top3), 'hand', 'no power given: the Life card is still added')
})

test('M6 ST-15 Ace has [Rush] with a Whitebeard Pirates Leader and, once per turn, takes -2000 this turn instead of being removed by an opponent effect', () => {
  let s = game(5)
  const ace = inHand(s, 'alice', 'ST15-005')
  s = playCard(s, 'alice', ace)
  assert.ok(attackerIds(s, 'alice').includes(ace), '[Rush]')
  let t = kaidoGame(10)
  const a2 = field(t, 'alice', 'ST15-005')
  t = kaidoKO(t, a2)
  t = roundTrip(pick(t, 'alice', [0]))
  assert.equal(zoneOf(t, a2), 'characters'); assert.equal(power(t, a2), definitionOf('ST15-005').power! - 2000)
  let u = toMain(newGame(deckFor('ST01-001', ['ST15-005']), deckFor('OP03-099', ['OP03-106'])), 5)
  const a3 = inHand(u, 'alice', 'ST15-005')
  u = playCard(u, 'alice', a3)
  assert.ok(!attackerIds(u, 'alice').includes(a3), 'no Whitebeard Pirates Leader: no [Rush]')
})

test('M6 ST-15 Kingdew K.O.d by an effect during the opponent turn gives the Leader +2000 this turn; not when K.O.d in battle', () => {
  let s = kaidoGame(10)
  const king = field(s, 'alice', 'ST15-003'), leader = leaderOf(s, 'alice')
  s = kaidoKO(s, king)
  s = roundTrip(choose(s, 'alice', [leader]))
  assert.equal(zoneOf(s, king), 'trash'); assert.equal(power(s, leader), definitionOf('ST01-001').power! + 2000)
  let t = endTurn(game(5))
  const k2 = field(t, 'alice', 'ST15-003', true)
  const big = field(t, 'bob', 'OP03-106'); attachDon(t, 'bob', big, 3)
  t = finishBattle(attack(t, big, k2))
  assert.equal(zoneOf(t, k2), 'trash'); assert.equal(pendingChoice(t, 'alice'), undefined, 'battle K.O.: no effect')
})

test('M6 FAQ OP02-018: Marco K.O.d trashes a Whitebeard Pirates card to come back rested from the trash with 2 or less Life, as a new card', () => {
  let s = kaidoGame(10, 'OP02-001')
  assert.equal(zones(s, 'alice').life.length, 1, 'Newgate Leader: five [End of Your Turn] Life cards taken')
  const marco = field(s, 'alice', 'OP02-018'), fodder = inHand(s, 'alice', 'OP03-006')
  s = kaidoKO(s, marco)
  s = choose(s, 'alice', [fodder])
  s = roundTrip(choose(s, 'alice', [marco]))
  assert.equal(zoneOf(s, marco), 'characters'); assert.equal(s.instances[marco].rested, true); assert.equal(zoneOf(s, fodder), 'trash')
  let t = kaidoGame(10)
  const m2 = field(t, 'alice', 'OP02-018'), f2 = inHand(t, 'alice', 'OP03-006')
  t = kaidoKO(t, m2)
  t = choose(t, 'alice', [f2])
  assert.equal(zoneOf(t, m2), 'trash', '5 Life: not played')
})

test('M6 ST-15 Jozu gains [Rush] with a DON!!, 2 or less Life and a Whitebeard Pirates Leader; Rakuyo with a DON!! gives Whitebeard Pirates Characters +1000 on your turn', () => {
  let s = game(5)
  const jozu = inHand(s, 'alice', 'OP02-008')
  s = playCard(s, 'alice', jozu); attachDon(s, 'alice', jozu, 1)
  assert.ok(!attackerIds(s, 'alice').includes(jozu), '4 Life: no [Rush]')
  let v = game(9)
  assert.equal(zones(v, 'alice').life.length, 2)
  const j2 = inHand(v, 'alice', 'OP02-008')
  v = playCard(v, 'alice', j2)
  assert.ok(!attackerIds(v, 'alice').includes(j2), 'no DON!!: no [Rush]')
  attachDon(v, 'alice', j2, 1)
  assert.ok(attackerIds(v, 'alice').includes(j2), 'DON!! x1, 2 Life: [Rush]')
  let t = game(5)
  const rak = field(t, 'alice', 'OP02-019'), jil = field(t, 'alice', 'OP03-006')
  assert.equal(power(t, jil), 6000)
  attachDon(t, 'alice', rak, 1)
  assert.equal(power(t, jil), 7000); assert.equal(power(t, rak), definitionOf('OP02-019').power! + 1000 + 1000)
  t = endTurn(t)
  assert.equal(power(t, jil), 6000, 'opponent turn')
})

test('M6 ST-15 Izo looks at 5 for a Whitebeard Pirates type card other than Izo; Haruta gives a rested DON!! once per turn', () => {
  let s = game(5)
  const fossa = put(s, 'alice', 'OP03-010', 'deckTop'), izo2 = put(s, 'alice', 'OP03-003', 'deckTop')
  s = playCard(s, 'alice', inHand(s, 'alice', 'OP03-003'))
  assert.ok(optionIds(s, 'alice').includes(fossa)); assert.ok(!optionIds(s, 'alice').includes(izo2), 'other than [Izo]')
  s = roundTrip(choose(s, 'alice', [fossa]))
  while (pendingChoice(s, 'alice')) s = pick(s, 'alice', pendingChoice(s, 'alice')!.options.map((_, i) => i))
  assert.equal(zoneOf(s, fossa), 'hand')
  let t = game(5)
  const haruta = field(t, 'alice', 'OP03-009'), leader = leaderOf(t, 'alice')
  t = playCard(t, 'alice', inHand(t, 'alice', 'OP03-007'))
  t = startEffect(t, 'alice', 'OP03-009.activate-main-don')
  t = choose(t, 'alice', [leader])
  t = choose(t, 'alice', [zones(t, 'alice').cost.find(id => t.instances[id].rested)!])
  assert.equal(zones(t, 'alice').attached.filter(id => t.instances[id].attachedTo === leader).length, 1)
  assert.equal(offeredEffects(t, 'alice', 'OP03-009.activate-main-don').length, 0, 'once per turn')
  void haruta
})

test('M6 ST-15 Edward Newgate gives a rested DON!! on play and rests itself to K.O. an opposing Character with 5000 power or less', () => {
  let s = endTurn(game(9))
  const small = field(s, 'bob', 'OP03-110')
  s = endTurn(s)
  const ng = inHand(s, 'alice', 'ST15-002'), leader = leaderOf(s, 'alice')
  s = playCard(playCard(s, 'alice', inHand(s, 'alice', 'OP03-007')), 'alice', ng)
  s = choose(s, 'alice', [leader])
  s = choose(s, 'alice', [zones(s, 'alice').cost.find(id => s.instances[id].rested)!])
  assert.equal(zones(s, 'alice').attached.filter(id => s.instances[id].attachedTo === leader).length, 1)
  assert.equal(definitionOf('OP03-110').power, 5000)
  s = startEffect(s, 'alice', 'ST15-002.activate-main-ko')
  s = roundTrip(choose(s, 'alice', [small]))
  assert.equal(zoneOf(s, small), 'trash'); assert.equal(s.instances[ng].rested, true)
})

test('M6 ST-15 Speed Jil and Namule (no ability) and Fossa ([Blocker]) are played for their printed cost and power', () => {
  let s = game(9)
  const jil = inHand(s, 'alice', 'OP03-006'), namule = inHand(s, 'alice', 'OP03-007'), fossa = inHand(s, 'alice', 'OP03-010')
  s = playCard(playCard(playCard(s, 'alice', jil), 'alice', namule), 'alice', fossa)
  for (const [id, n] of [[jil, 'OP03-006'], [namule, 'OP03-007'], [fossa, 'OP03-010']]) assert.equal(power(s, id), definitionOf(n).power)
  s = endTurn(s)
  s = attack(s, field(s, 'bob', 'OP03-106'), leaderOf(s, 'alice'))
  assert.ok((legal(s, 'alice').find(x => x.type === 'ACTIVATE_BLOCKER') as { blockerIds: string[] }).blockerIds.includes(fossa))
})

test('M6 ST-15 certificates validate against the current registry; all ST-15 cards are PLAYABLE_VERIFIED', async () => {
  const { ST15_CERTIFICATIONS, certificationErrors, effectiveStatus } = await import('../src/game/cards/certification')
  const { engineCatalog, currentEngineRegistry } = await import('../src/lib/engine/catalog')
  const { definitions } = engineCatalog(), registry = currentEngineRegistry()
  for (const c of ST15_CERTIFICATIONS) assert.deepEqual(certificationErrors(c, definitions.find(x => x.definitionId === c.definitionId), registry), [], c.definitionId)
  for (const n of ['OP02-001', ...ST15]) assert.equal(effectiveStatus(definitions.find(x => x.number === n)!), 'PLAYABLE_VERIFIED', n)
})
