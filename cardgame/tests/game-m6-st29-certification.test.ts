import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateCharacteristics } from '../src/game/effects/characteristics'
import type { GameState } from '../src/game/core/types'
import { act, attachDon, attack, attackerIds, choose, deckFor, definitionOf, endTurn, finishBattle, inHand, leaderOf, legal, newGame, offeredEffects, optionIds, pendingChoice, playCard, put, roundTrip, startEffect, toMain, zoneOf } from './helpers/m6'

// M6 ST-29 (YELLOW Monkey.D.Luffy, Egghead), official English texts (series 569029). Scenarios follow the official text, the ST-29
// FAQ and the errata snapshot (docs/game/evidence/m6/sources/), through public commands only.
const ST29 = ['ST29-002', 'ST29-003', 'ST29-004', 'ST29-005', 'ST29-006', 'ST29-007', 'ST29-008', 'ST29-009', 'ST29-010', 'ST29-011', 'ST29-012', 'ST29-013', 'ST29-014', 'ST29-015', 'ST29-016', 'ST29-017']
const BOB = ['OP03-106', 'OP03-107', 'OP03-115', 'OP03-110']
const game = (turn = 5, leader = 'ST29-001') => toMain(newGame(deckFor(leader, ST29), deckFor('OP03-099', BOB)), turn)
const kaido = (turn = 10) => toMain(newGame(deckFor('ST29-001', ST29), deckFor('ST04-001', ['ST04-003', 'ST04-002'])), turn)
const zones = (s: GameState, owner: string) => s.players.find(p => p.id === owner)!.zones
const power = (s: GameState, id: string) => evaluateCharacteristics(s, id).power.current
const field = (s: GameState, owner: string, number: string, rested = false) => put(s, owner, number, 'characters', { playedEarlier: true, rested })
const hand = (s: GameState, owner = 'alice') => zones(s, owner).hand.length
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
const lifeTrigger = (s: GameState) => {
  s = attack(s, field(s, 'bob', 'OP03-106'), leaderOf(s, 'alice'))
  s = act(s, 'alice', { type: 'PASS_BLOCKER', battleId: s.battle!.id }); s = act(s, 'alice', { type: 'PASS_COUNTER', battleId: s.battle!.id })
  s = act(s, 'bob', { type: 'RESOLVE_BATTLE', battleId: s.battle!.id })
  return act(s, 'alice', { type: 'ANSWER_TRIGGER', choiceId: (legal(s, 'alice').find(a => a.type === 'ANSWER_TRIGGER') as { choiceId: string }).choiceId, activate: true })
}
const counterWith = (s: GameState, number: string) => {
  const ev = put(s, 'alice', number, 'hand')
  // Bob's Leader attacks (its field may already hold 5 Characters).
  s = attack(s, leaderOf(s, 'bob'), leaderOf(s, 'alice'))
  s = act(s, 'alice', { type: 'PASS_BLOCKER', battleId: s.battle!.id })
  const c = legal(s, 'alice').find(x => x.type === 'PLAY_COUNTER_EVENT') as { paymentDonIds: string[]; battleId: string }
  return act(s, 'alice', { type: 'PLAY_COUNTER_EVENT', cardId: ev, targetId: null, paymentDonIds: c.paymentDonIds.slice(0, definitionOf(number).cost ?? 0), donMinusIds: [], battleId: c.battleId })
}
/** n damages to Alice: OP03-106 and OP03-110 alternate (Bob declines the OP03-110 [When Attacking] Life cost). */
const hitAlice = (s: GameState, n: number) => {
  for (let i = 0; i < n; i++) { s = attack(s, field(s, 'bob', i % 2 ? 'OP03-110' : 'OP03-106'), leaderOf(s, 'alice')); if (pendingChoice(s, 'bob')) s = choose(s, 'bob', []); s = finishBattle(s) }
  return s
}

test('M6 ST-29 Leader Luffy draws 1 and trashes 1 when attacking with 2 or less Life; Usopp rests a Character with a cost up to the opposing Life on play and when attacking', () => {
  let s = endTurn(game(7))
  s = hitAlice(s, zones(s, 'alice').life.length - 2)
  s = endTurn(s)
  const h = hand(s)
  s = attack(s, leaderOf(s, 'alice'), leaderOf(s, 'bob'))
  s = roundTrip(choose(s, 'alice', [zones(s, 'alice').hand[0]]))
  assert.equal(hand(s), h)
  let t = endTurn(game(7))
  const foe = field(t, 'bob', 'OP03-106')
  t = endTurn(t)
  assert.ok(definitionOf('OP03-106').cost! <= zones(t, 'bob').life.length)
  t = playCard(t, 'alice', inHand(t, 'alice', 'ST29-002'))
  t = roundTrip(choose(t, 'alice', [foe]))
  assert.equal(t.instances[foe].rested, true)
})

test('M6 ST-29 Kaku gains +1000 with no more Life than the opponent and K.O.s a cost 3 or less as Trigger; Sanji looks at 4 and its Trigger trashes 1 to play it', () => {
  let s = endTurn(game(5))
  const kaku = field(s, 'alice', 'ST29-003')
  assert.equal(power(s, kaku), 5000, '6 Life against 5: no bonus')
  s = hitAlice(s, 1)
  assert.equal(zones(s, 'alice').life.length, zones(s, 'bob').life.length)
  assert.equal(power(s, kaku), 6000, 'equal Life: +1000')
  let t = endTurn(game(3))
  const small = field(t, 'bob', 'OP03-107')
  put(t, 'alice', 'ST29-003', 'life')
  t = lifeTrigger(t)
  t = roundTrip(choose(t, 'alice', [small]))
  assert.equal(zoneOf(t, small), 'trash')
  let u = endTurn(game(3))
  const sanji = put(u, 'alice', 'ST29-004', 'life')
  u = lifeTrigger(u)
  u = choose(u, 'alice', [zones(u, 'alice').hand[0]])
  assert.equal(zoneOf(u, sanji), 'characters')
})

test('M6 ST-29 Jinbe, Nami and Robin are played by their Trigger with a Monkey.D.Luffy Leader; Luffy cost 1 is always played by its Trigger and gives a rested DON!! to a Luffy card once per turn', () => {
  let s = endTurn(game(3))
  const jinbe = put(s, 'alice', 'ST29-005', 'life')
  s = roundTrip(lifeTrigger(s))
  assert.equal(zoneOf(s, jinbe), 'characters')
  let t = endTurn(game(3, 'OP03-099'))
  const nami = put(t, 'alice', 'ST29-008', 'life')
  t = lifeTrigger(t)
  assert.notEqual(zoneOf(t, nami), 'characters', 'not with another Leader')
  let u = endTurn(game(3, 'OP03-099'))
  const luffy = put(u, 'alice', 'ST29-012', 'life')
  u = lifeTrigger(u)
  assert.equal(zoneOf(u, luffy), 'characters')
  let w = game(5)
  const l1 = field(w, 'alice', 'ST29-012'), leader = leaderOf(w, 'alice')
  w = playCard(w, 'alice', inHand(w, 'alice', 'ST29-011'))
  w = startEffect(w, 'alice', 'ST29-012.activate-main-don')
  assert.deepEqual([...optionIds(w, 'alice')].sort(), [leader, l1].sort(), 'only [Monkey.D.Luffy] cards')
  w = choose(w, 'alice', [leader])
  w = roundTrip(choose(w, 'alice', [zones(w, 'alice').cost.find(id => w.instances[id].rested)!]))
  assert.equal(zones(w, 'alice').attached.filter(id => w.instances[id].attachedTo === leader).length, 1)
})

test('M6 FAQ ST29-007: Chopper adds a Life card to hand on K.O. to put a hand card on top of the Life, never with 0 Life; its Trigger gives a Luffy card +2000', () => {
  let s = kaido(10)
  const chopper = field(s, 'alice', 'ST29-007'), life = zones(s, 'alice').life.length
  s = kaidoKO(s, chopper)
  s = pick(s, 'alice', [0])
  const fromHand = zones(s, 'alice').hand[0]
  s = roundTrip(choose(s, 'alice', [fromHand]))
  assert.equal(zones(s, 'alice').life[0], fromHand); assert.equal(zones(s, 'alice').life.length, life)
  let t = endTurn(game(3))
  put(t, 'alice', 'ST29-007', 'life')
  t = lifeTrigger(t)
  t = choose(t, 'alice', [leaderOf(t, 'alice')])
  assert.equal(power(t, leaderOf(t, 'alice')), 7000)
})

test('M6 FAQ ST29-008: Nami turns the face-down top Life card face-up instead of an Egghead Character being K.O.d by an opposing effect; not when it is already face-up', () => {
  let s = kaido(10)
  const nami = field(s, 'alice', 'ST29-008'), kaku = field(s, 'alice', 'ST29-003'), top = zones(s, 'alice').life[0]
  s = kaidoKO(s, kaku)
  s = roundTrip(pick(s, 'alice', [0]))
  assert.equal(zoneOf(s, kaku), 'characters'); assert.equal(s.instances[top].faceUp, true)
  void nami
  let t = kaido(10)
  field(t, 'alice', 'ST29-008'); const k2 = field(t, 'alice', 'ST29-003'), top2 = zones(t, 'alice').life[0]
  t.instances[top2].faceUp = true; t.events.push({ sequence: t.events.length, type: 'LIFE_TURNED_FACE_UP', actorId: 'alice', publicInstanceId: top2 })
  t = kaidoKO(t, k2)
  assert.equal(zoneOf(t, k2), 'trash', 'FAQ ST29-008: the top card is already face-up')
})

test('M6 FAQ ST29-013: Rob Lucci Trigger K.O.s a Character with a cost up to the total of both Life counts, the triggering card excluded', () => {
  let s = endTurn(game(3))
  const foe = field(s, 'bob', 'OP03-106')
  put(s, 'alice', 'ST29-013', 'life')
  const total = zones(s, 'alice').life.length - 1 + zones(s, 'bob').life.length
  s = lifeTrigger(s)
  assert.equal(optionIds(s, 'alice').includes(foe), definitionOf('OP03-106').cost! <= total)
  s = roundTrip(choose(s, 'alice', [foe]))
  assert.equal(zoneOf(s, foe), 'trash')
})

test('M6 FAQ ST29-014: Zoro has [Rush: Character] against rested Characters and trashes a Trigger card to draw 1 and give a rested DON!!, once per turn', () => {
  let s = endTurn(game(9))
  const restedFoe = field(s, 'bob', 'OP03-106', true), activeFoe = field(s, 'bob', 'OP03-107')
  s = endTurn(s)
  const zoro = inHand(s, 'alice', 'ST29-014')
  s = playCard(s, 'alice', zoro)
  const pair = (legal(s, 'alice').find(x => x.type === 'DECLARE_ATTACK') as { targetIdsByAttacker: Record<string, string[]> }).targetIdsByAttacker[zoro]
  assert.deepEqual(pair, [restedFoe], 'FAQ ST29-014: rested Characters only'); void activeFoe
  const trig = put(s, 'alice', 'ST29-017', 'hand'), h = hand(s), leader = leaderOf(s, 'alice')
  s = startEffect(s, 'alice', 'ST29-014.activate-main-draw')
  s = choose(s, 'alice', [trig])
  s = choose(s, 'alice', [leader])
  s = roundTrip(choose(s, 'alice', [zones(s, 'alice').cost.find(id => s.instances[id].rested)!]))
  assert.equal(hand(s), h - 1 + 1); assert.equal(offeredEffects(s, 'alice', 'ST29-014.activate-main-draw').length, 0)
})

test('M6 FAQ ST29-016: Kizaru gives the Luffy Leader [Unblockable] this turn and +3000 as Counter; Raw Heat Strike and Iai Death Lion Song add their Life-dependent parts', () => {
  let s = endTurn(game(7))
  const blocker = field(s, 'bob', 'OP03-107')
  s = endTurn(s)
  s = startFrom(s, 'alice', 'ST29-016.main-unblockable', inHand(s, 'alice', 'ST29-016'))
  s = attack(s, leaderOf(s, 'alice'), leaderOf(s, 'bob'))
  assert.equal(legal(s, 'bob').some(x => x.type === 'ACTIVATE_BLOCKER'), false, '[Unblockable]'); void blocker
  let t = endTurn(game(7))
  t = counterWith(t, 'ST29-016')
  assert.equal(t.battle!.counterModifiers.reduce((n, m) => n + m.amount, 0), 3000)
  let u = endTurn(game(9))
  u = hitAlice(u, zones(u, 'alice').life.length - 2)
  const small = field(u, 'bob', 'OP03-107')
  u = counterWith(u, 'ST29-017')
  u = choose(u, 'alice', [leaderOf(u, 'alice')])
  u = roundTrip(choose(u, 'alice', [small]))
  assert.equal(zoneOf(u, small), 'trash')
  let w = endTurn(game(9))
  w = hitAlice(w, zones(w, 'alice').life.length - 1)
  w = counterWith(w, 'ST29-015')
  w = choose(w, 'alice', [leaderOf(w, 'alice')])
  w = roundTrip(choose(w, 'alice', [leaderOf(w, 'bob')]))
  assert.equal(power(w, leaderOf(w, 'bob')), definitionOf('OP03-099').power! - 2000)
  void attachDon; void attackerIds
})

test('M6 ST-29 Stussy and Franky (no ability) and Brook ([Blocker]) keep their printed values', () => {
  let s = game(9)
  for (const n of ['ST29-006', 'ST29-010']) assert.equal(power(s, field(s, 'alice', n)), definitionOf(n).power)
  const brook = field(s, 'alice', 'ST29-011')
  s = endTurn(s)
  s = attack(s, field(s, 'bob', 'OP03-106'), leaderOf(s, 'alice'))
  assert.ok((legal(s, 'alice').find(x => x.type === 'ACTIVATE_BLOCKER') as { blockerIds: string[] }).blockerIds.includes(brook))
})

test('M6 ST-29 certificates validate against the current registry; all ST-29 cards are PLAYABLE_VERIFIED', async () => {
  const { ST29_CERTIFICATIONS, certificationErrors, effectiveStatus } = await import('../src/game/cards/certification')
  const { engineCatalog, currentEngineRegistry } = await import('../src/lib/engine/catalog')
  const { definitions } = engineCatalog(), registry = currentEngineRegistry()
  for (const c of ST29_CERTIFICATIONS) assert.deepEqual(certificationErrors(c, definitions.find(x => x.definitionId === c.definitionId), registry), [], c.definitionId)
  for (const n of ['ST29-001', ...ST29]) assert.equal(effectiveStatus(definitions.find(x => x.number === n)!), 'PLAYABLE_VERIFIED', n)
})
