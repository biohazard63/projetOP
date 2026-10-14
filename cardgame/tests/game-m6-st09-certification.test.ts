import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateCharacteristics, hasCombatKeyword } from '../src/game/effects/characteristics'
import type { GameState } from '../src/game/core/types'
import { act, attachDon, attack, choose, deckFor, endTurn, finishBattle, inHand, leaderOf, legal, newGame, optionIds, pendingChoice, playCard, projectState, put, roundTrip, toMain, zoneOf } from './helpers/m6'

// M6 ST-09 (Yamato, yellow). Scenarios follow the official text, the ST-09 FAQ and the errata snapshot
// (docs/game/evidence/m6/sources/qa_st-09.txt, errata-all.json), through public commands only.
const ST09 = ['ST09-002', 'ST09-003', 'ST09-004', 'ST09-005', 'ST09-006', 'ST09-007', 'ST09-008', 'ST09-009', 'ST09-010', 'ST09-011', 'ST09-012', 'ST09-013', 'ST09-014', 'ST09-015']
const game = (turn = 3) => toMain(newGame(deckFor('ST09-001', ST09), deckFor('ST09-001', ST09)), turn)
const zones = (s: GameState, owner: string) => s.players.find(p => p.id === owner)!.zones
const life = (s: GameState, owner: string) => zones(s, owner).life
const power = (s: GameState, id: string) => evaluateCharacteristics(s, id).power.current
const pick = (s: GameState, owner: string, indexes: number[]) => { const c = pendingChoice(s, owner); assert.ok(c, 'pending choice'); return act(s, owner, { type: 'ANSWER_CHOICE', choiceId: c!.choiceId, tokens: indexes.map(i => c!.options[i].token) }) }
/** The turn player hits the opposing Leader `times` times with fresh 6000 Characters; Triggers are declined. */
const hit = (s: GameState, defender: string, times: number) => { for (let n = 0; n < times; n++) s = finishBattle(attack(s, put(s, s.activePlayerId!, 'ST09-003', 'characters'), leaderOf(s, defender))); return s }
const toTrigger = (s: GameState, defender: string) => {
  s = attack(s, put(s, s.activePlayerId!, 'ST09-003', 'characters'), leaderOf(s, defender))
  s = act(s, defender, { type: 'PASS_BLOCKER', battleId: s.battle!.id }); s = act(s, defender, { type: 'PASS_COUNTER', battleId: s.battle!.id })
  s = act(s, s.activePlayerId!, { type: 'RESOLVE_BATTLE', battleId: s.battle!.id })
  const t = legal(s, defender).find(a => a.type === 'ANSWER_TRIGGER') as { choiceId: string } | undefined
  assert.ok(t, 'Trigger offered')
  return act(s, defender, { type: 'ANSWER_TRIGGER', choiceId: t!.choiceId, activate: true })
}
const counterEvent = (s: GameState, owner: string, cardId: string): GameState => {
  const a = legal(s, owner).find(x => x.type === 'PLAY_COUNTER_EVENT') as { eventIds: string[]; paymentDonIds: string[]; battleId: string } | undefined
  assert.ok(a?.eventIds.includes(cardId), 'Counter Event offered')
  const c = s.catalog.definitions.find(d => d.definitionId === s.instances[cardId].definitionId)!.cost ?? 0
  return act(s, owner, { type: 'PLAY_COUNTER_EVENT', cardId, targetId: null, paymentDonIds: a!.paymentDonIds.slice(0, c), donMinusIds: [], battleId: a!.battleId })
}

test('M6 ST-09 FAQ ST09-001: Yamato with a DON gains +1000 on the opponent turn at 2 or less Life, between two Double Attack damages too', () => {
  let s = game(3)
  const leader = leaderOf(s, 'alice')
  attachDon(s, 'alice', leader, 1)
  assert.equal(power(s, leader), 6000, 'own turn: the DON!! only')
  s = endTurn(s)
  assert.equal(power(s, leader), 5000, 'opponent turn with 5 Life: no bonus')
  s = hit(s, 'alice', 2)
  assert.equal(life(s, 'alice').length, 3)
  const oden = put(s, 'bob', 'ST09-005', 'characters')
  attachDon(s, 'bob', oden, 1)
  assert.equal(hasCombatKeyword(s, oden, 'DOUBLE_ATTACK'), true)
  s = attack(s, oden, leader)
  s = act(s, 'alice', { type: 'PASS_BLOCKER', battleId: s.battle!.id }); s = act(s, 'alice', { type: 'PASS_COUNTER', battleId: s.battle!.id })
  s = finishBattle(act(s, 'bob', { type: 'RESOLVE_BATTLE', battleId: s.battle!.id }))
  assert.equal(life(s, 'alice').length, 1, 'the second damage is still processed')
  assert.equal(power(s, leader), 6000, '+1000 at 2 or less Life on the opponent turn')
})

test('M6 ST-09 FAQ ST09-002 and ST09-009: Uzuki Tempura and Fugetsu Omusubi Triggers act and always go to the hand', () => {
  let s = game(3)
  const tempura = put(s, 'alice', 'ST09-002', 'life')
  s = endTurn(s)
  const small = put(s, 'bob', 'ST09-006', 'characters')
  s = toTrigger(s, 'alice')
  s = roundTrip(choose(s, 'alice', [small]))
  assert.equal(s.instances[small].rested, true); assert.equal(zoneOf(s, tempura), 'hand')
  let t = game(3)
  const fugetsu = put(t, 'alice', 'ST09-009', 'life')
  t = endTurn(t)
  t = toTrigger(t, 'alice')
  t = choose(t, 'alice', [])
  assert.equal(zoneOf(t, fugetsu), 'hand', 'even when choosing no target')
  assert.equal(projectState(t, 'bob').players[0].hand, null)
})

test('M6 ST-09 Kaido with a DON cannot be K.O.d in battle at 2 or less Life only', () => {
  let s = game(3)
  const kaido = put(s, 'alice', 'ST09-004', 'characters', { rested: true })
  attachDon(s, 'alice', kaido, 1)
  s = endTurn(s)
  s = hit(s, 'alice', 3)
  s = finishBattle(attack(s, put(s, 'bob', 'ST09-013', 'characters'), kaido))
  assert.equal(zoneOf(s, kaido), 'characters', '2 Life: protected')
  let t = game(3)
  const k2 = put(t, 'alice', 'ST09-004', 'characters', { rested: true })
  attachDon(t, 'alice', k2, 1)
  t = endTurn(t)
  t = finishBattle(attack(t, put(t, 'bob', 'ST09-013', 'characters'), k2))
  assert.equal(zoneOf(t, k2), 'trash', '5 Life: K.O.d')
})

test('M6 ST-09 Kouzuki Oden has Double Attack with a DON; On K.O. trashing 2 cards adds the unseen top deck card to Life', () => {
  let s = game(3)
  const oden = put(s, 'alice', 'ST09-005', 'characters', { rested: true })
  assert.equal(hasCombatKeyword(s, oden, 'DOUBLE_ATTACK'), false)
  s = endTurn(s)
  s = finishBattle(attack(s, put(s, 'bob', 'ST09-013', 'characters'), oden))
  assert.equal(zoneOf(s, oden), 'trash')
  const hand = zones(s, 'alice').hand
  s = choose(s, 'alice', hand.slice(0, 2))
  s = pick(s, 'alice', [0])
  assert.equal(life(s, 'alice').length, 6)
  let t = game(3)
  const o2 = put(t, 'alice', 'ST09-005', 'characters', { rested: true })
  t = endTurn(t)
  t = finishBattle(attack(t, put(t, 'bob', 'ST09-013', 'characters'), o2))
  t = choose(t, 'alice', [])
  assert.equal(life(t, 'alice').length, 5); assert.equal(pendingChoice(t, 'alice'), undefined)
})

test('M6 ST-09 Shinobu blocks and may pay a Life on block for +4000 during this battle', () => {
  let s = game(3)
  const shinobu = put(s, 'alice', 'ST09-007', 'characters')
  s = endTurn(s)
  s = attack(s, put(s, 'bob', 'ST09-011', 'characters'), leaderOf(s, 'alice'))
  s = act(s, 'alice', { type: 'ACTIVATE_BLOCKER', blockerId: shinobu, battleId: s.battle!.id })
  s = pick(s, 'alice', [0])
  assert.equal(life(s, 'alice').length, 4)
  s = finishBattle(s)
  assert.equal(zoneOf(s, shinobu), 'characters', '2000 + 4000 holds against 5000')
})

test('M6 ST-09 FAQ ST09-008: Ushimaru with a DON pays a Life and may play the yellow Land of Wano card just added', () => {
  let s = game(5)
  const ushimaru = put(s, 'alice', 'ST09-008', 'characters'), momo = put(s, 'alice', 'ST09-006', 'life')
  attachDon(s, 'alice', ushimaru, 1)
  s = pick(attack(s, ushimaru, leaderOf(s, 'bob')), 'alice', [0])
  assert.equal(zoneOf(s, momo), 'hand')
  assert.ok(optionIds(s, 'alice').includes(momo))
  s = choose(s, 'alice', [momo])
  assert.equal(zoneOf(s, momo), 'characters')
})

test('M6 ST-09 Yamato pays a Life on attack for +2000 until the start of the next turn', () => {
  let s = game(3)
  const yamato = put(s, 'alice', 'ST09-012', 'characters')
  s = finishBattle(pick(attack(s, yamato, leaderOf(s, 'bob')), 'alice', [1]))
  assert.equal(power(s, yamato), 5000)
  s = endTurn(s)
  assert.equal(power(s, yamato), 5000, 'kept during the opponent turn')
  s = endTurn(s)
  assert.equal(power(s, yamato), 3000)
})

test('M6 ST-09 Narikabura Arrow gives -3000 only at 2 or less Life; its Trigger trashes 2 to add the top deck card to Life', () => {
  let s = game(3)
  s = endTurn(s)
  s = hit(s, 'alice', 3)
  const arrow = put(s, 'alice', 'ST09-014', 'hand'), attacker = put(s, 'bob', 'ST09-013', 'characters')
  s = attack(s, attacker, leaderOf(s, 'alice'))
  s = act(s, 'alice', { type: 'PASS_BLOCKER', battleId: s.battle!.id })
  s = counterEvent(s, 'alice', arrow)
  s = choose(s, 'alice', [attacker])
  assert.equal(power(s, attacker), 4000)
  let t = endTurn(game(3))
  const arrow2 = put(t, 'alice', 'ST09-014', 'hand'), a2 = put(t, 'bob', 'ST09-013', 'characters')
  t = attack(t, a2, leaderOf(t, 'alice'))
  t = act(t, 'alice', { type: 'PASS_BLOCKER', battleId: t.battle!.id })
  t = counterEvent(t, 'alice', arrow2)
  assert.equal(pendingChoice(t, 'alice'), undefined, '5 Life: nothing'); assert.equal(power(t, a2), 7000)
  let u = game(3)
  put(u, 'alice', 'ST09-014', 'life')
  u = toTrigger(endTurn(u), 'alice')
  const before = life(u, 'alice').length
  u = pick(pick(u, 'alice', [0, 1]), 'alice', [0])
  assert.equal(life(u, 'alice').length, before + 1)
})

test('M6 ST-09 Thunder Bagua gives +4000 then at 2 or less Life puts a cost 3 or less opposing Character face-up into its owner Life; its Trigger draws', () => {
  let s = game(3)
  s = endTurn(s)
  s = hit(s, 'alice', 3)
  const bagua = put(s, 'alice', 'ST09-015', 'hand'), attacker = put(s, 'bob', 'ST09-013', 'characters'), small = put(s, 'bob', 'ST09-006', 'characters')
  s = attack(s, attacker, leaderOf(s, 'alice'))
  s = act(s, 'alice', { type: 'PASS_BLOCKER', battleId: s.battle!.id })
  s = counterEvent(s, 'alice', bagua)
  s = choose(s, 'alice', [leaderOf(s, 'alice')])
  assert.ok(!optionIds(s, 'alice').includes(attacker), 'cost 5 is above 3')
  const bobLife = life(s, 'bob').length
  s = roundTrip(choose(s, 'alice', [small]))
  s = pick(s, 'alice', [1])
  assert.equal(life(s, 'bob').at(-1), small, 'bottom of its owner Life'); assert.equal(life(s, 'bob').length, bobLife + 1)
  assert.equal(s.instances[small].faceUp, true)
  assert.deepEqual(projectState(s, 'alice').players[1].lifeFaceUp?.map(x => x.card.id), [small])
  let t = game(3)
  put(t, 'alice', 'ST09-015', 'life')
  t = endTurn(t)
  const hand = zones(t, 'alice').hand.length
  t = toTrigger(t, 'alice')
  assert.equal(zones(t, 'alice').hand.length, hand + 1, 'draw 1 (the activated Trigger card is trashed)')
})

test('M6 ST-09 cards without other ability are played for their printed cost, keep their power and defend with their Counter or [Blocker]', () => {
  for (const number of ['ST09-003', 'ST09-006', 'ST09-011', 'ST09-013']) {
    let s = game(9)
    const d = s.catalog.definitions.find(x => x.number === number)!
    const played = inHand(s, 'alice', number), held = inHand(s, 'alice', number, [played])
    s = playCard(s, 'alice', played)
    assert.equal(zoneOf(s, played), 'characters'); assert.equal(power(s, played), d.power, `${number} power`)
    s = endTurn(s)
    s = attack(s, put(s, 'bob', 'ST09-013', 'characters'), leaderOf(s, 'alice'))
    s = act(s, 'alice', { type: 'PASS_BLOCKER', battleId: s.battle!.id })
    s = act(s, 'alice', { type: 'PLAY_COUNTER_CHARACTER', cardId: held, targetId: leaderOf(s, 'alice'), battleId: s.battle!.id })
    assert.equal(s.battle!.counterModifiers.reduce((n, m) => n + m.amount, 0), d.counter)
  }
})

test('M6 FAQ ST09-010: Ace K.O.d in battle may trash the top or bottom Life card instead, once per turn; declining or with 0 Life it is K.O.d', () => {
  let s = endTurn(game(5))
  const ace = put(s, 'alice', 'ST09-010', 'characters', { playedEarlier: true, rested: true }), bottom = life(s, 'alice').at(-1)!, count = life(s, 'alice').length
  const attacker = put(s, 'bob', 'ST09-013', 'characters', { playedEarlier: true })
  s = finishBattle(attack(s, attacker, ace))
  const c = pendingChoice(s, 'alice')!
  assert.deepEqual(c.options.map(o => 'slot' in o ? o.slot?.kind : 'card'), ['LIFE_TOP', 'LIFE_BOTTOM'], 'Life cards are named by their position only')
  s = roundTrip(pick(s, 'alice', [1]))
  assert.equal(zoneOf(s, ace), 'characters'); assert.equal(zoneOf(s, bottom), 'trash'); assert.equal(life(s, 'alice').length, count - 1)
  assert.equal(s.battle, null, 'the battle ends')
  s.instances[ace].rested = true
  s = finishBattle(attack(s, put(s, 'bob', 'ST09-013', 'characters', { playedEarlier: true }), ace))
  assert.equal(pendingChoice(s, 'alice'), undefined, 'once per turn'); assert.equal(zoneOf(s, ace), 'trash')
  let t = endTurn(game(5))
  const a2 = put(t, 'alice', 'ST09-010', 'characters', { playedEarlier: true, rested: true })
  t = finishBattle(attack(t, put(t, 'bob', 'ST09-013', 'characters', { playedEarlier: true }), a2))
  t = pick(t, 'alice', [])
  assert.equal(zoneOf(t, a2), 'trash', 'declined')
  let u = endTurn(game(5))
  while (life(u, 'alice').length) { const id = life(u, 'alice').shift()!; zones(u, 'alice').trash.push(id); u.instances[id].zone = 'trash'; u.instances[id].zoneGeneration++; u.instances[id].faceUp = true; u.events.push({ sequence: u.events.length, type: 'LIFE_TRASHED', actorId: 'alice' }) }
  const a3 = put(u, 'alice', 'ST09-010', 'characters', { playedEarlier: true, rested: true })
  u = finishBattle(attack(u, put(u, 'bob', 'ST09-013', 'characters', { playedEarlier: true }), a3))
  assert.equal(zoneOf(u, a3), 'trash', 'FAQ ST09-010: 0 Life, no replacement')
})

test('M6 ST-09 Ace K.O.d by an opposing effect may trash a Life card instead', () => {
  let s = toMain(newGame(deckFor('ST09-001', ST09), deckFor('ST04-001', ['ST04-003'])), 10)
  const ace = put(s, 'alice', 'ST09-010', 'characters', { playedEarlier: true }), count = life(s, 'alice').length
  s = playCard(s, 'bob', inHand(s, 'bob', 'ST04-003'))
  s = act(s, 'bob', { type: 'ANSWER_CHOICE', choiceId: pendingChoice(s, 'bob')!.choiceId, tokens: pendingChoice(s, 'bob')!.options.slice(0, 5).map(o => o.token) })
  s = choose(s, 'bob', [ace])
  s = pick(s, 'alice', [0])
  assert.equal(zoneOf(s, ace), 'characters'); assert.equal(life(s, 'alice').length, count - 1)
})

test('M6 ST-09 certificates validate against the current registry; all ST-09 cards are PLAYABLE_VERIFIED', async () => {
  const { ST09_CERTIFICATIONS, certificationErrors, effectiveStatus } = await import('../src/game/cards/certification')
  const { engineCatalog, currentEngineRegistry } = await import('../src/lib/engine/catalog')
  const { definitions } = engineCatalog(), registry = currentEngineRegistry()
  for (const c of ST09_CERTIFICATIONS) assert.deepEqual(certificationErrors(c, definitions.find(x => x.definitionId === c.definitionId), registry), [], c.definitionId)
  for (let i = 1; i <= 15; i++) {
    const n = `ST09-${String(i).padStart(3, '0')}`, d = definitions.find(x => x.number === n)
    assert.equal(effectiveStatus(d!), 'PLAYABLE_VERIFIED', n)
  }
})
