import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateCharacteristics, hasCombatKeyword } from '../src/game/effects/characteristics'
import type { GameState } from '../src/game/core/types'
import { act, attachDon, attack, attackerIds, choose, deckFor, endTurn, finishBattle, inHand, leaderOf, legal, newGame, optionIds, pendingChoice, playCard, projectState, put, roundTrip, startEffect, toMain, zoneOf } from './helpers/m6'

// M6 ST-07 (Charlotte Linlin, yellow) — the Life family. Scenarios follow the official text, the ST-07 FAQ and the errata
// snapshot (docs/game/evidence/m6/sources/qa_st-07.txt, errata-all.json), through public commands only.
const ST07 = ['ST07-002', 'ST07-003', 'ST07-004', 'ST07-005', 'ST07-006', 'ST07-007', 'ST07-008', 'ST07-009', 'ST07-010', 'ST07-011', 'ST07-012', 'ST07-013', 'ST07-014', 'ST07-015', 'ST07-016', 'ST07-017']
const game = (turn = 3) => toMain(newGame(deckFor('ST07-001', ST07), deckFor('ST07-001', ST07)), turn)
const zones = (s: GameState, owner: string) => s.players.find(p => p.id === owner)!.zones
const life = (s: GameState, owner: string) => zones(s, owner).life
const pick = (s: GameState, owner: string, indexes: number[]) => { const c = pendingChoice(s, owner); assert.ok(c, 'pending choice'); return act(s, owner, { type: 'ANSWER_CHOICE', choiceId: c!.choiceId, tokens: indexes.map(i => c!.options[i].token) }) }
const slots = (s: GameState, owner: string) => pendingChoice(s, owner)!.options.map(o => ('slot' in o && o.slot ? `${o.slot.kind}${o.slot.ownerId ? `:${o.slot.ownerId}` : ''}` : 'card'))
/** Bob (turn player) hits Alice's Leader `times` times with fresh 6000 Characters; Triggers are declined. */
const hitAlice = (s: GameState, times: number) => { for (let n = 0; n < times; n++) s = finishBattle(attack(s, put(s, 'bob', 'ST07-012', 'characters'), leaderOf(s, 'alice'))); return s }
const activateTrigger = (s: GameState, owner: string) => { const t = legal(s, owner).find(a => a.type === 'ANSWER_TRIGGER') as { choiceId: string } | undefined; assert.ok(t, 'Trigger offered'); return act(s, owner, { type: 'ANSWER_TRIGGER', choiceId: t!.choiceId, activate: true }) }
const hitWithTrigger = (s: GameState, defender: string, attackerNumber = 'ST07-012') => {
  s = attack(s, put(s, s.activePlayerId!, attackerNumber, 'characters'), leaderOf(s, defender))
  s = act(s, defender, { type: 'PASS_BLOCKER', battleId: s.battle!.id }); s = act(s, defender, { type: 'PASS_COUNTER', battleId: s.battle!.id })
  return activateTrigger(act(s, s.activePlayerId!, { type: 'RESOLVE_BATTLE', battleId: s.battle!.id }), defender)
}

test('M6 ST-07 FAQ ST07-001: Leader Linlin with 2 DON pays a top or bottom Life, then with 2 or less Life adds a hand card to the top of its Life', () => {
  let s = hitAlice(endTurn(game(3)), 2)
  assert.equal(life(s, 'alice').length, 3)
  s = endTurn(s)
  const leader = leaderOf(s, 'alice'), bottom = life(s, 'alice').at(-1)!, kept = inHand(s, 'alice', 'ST07-002')
  attachDon(s, 'alice', leader, 2)
  s = attack(s, leader, leaderOf(s, 'bob'))
  assert.deepEqual(slots(s, 'alice'), ['LIFE_TOP:alice', 'LIFE_BOTTOM:alice'], 'top or bottom, identities hidden')
  s = pick(s, 'alice', [1])
  assert.equal(zoneOf(s, bottom), 'hand'); assert.equal(life(s, 'alice').length, 2)
  s = roundTrip(s)
  s = choose(s, 'alice', [kept])
  assert.equal(life(s, 'alice')[0], kept, 'added to the top of the Life'); assert.equal(life(s, 'alice').length, 3)
  assert.equal(projectState(s, 'bob').players[0].lifeFaceUp, undefined, 'face-down')
})

test('M6 ST-07 FAQ ST07-001: with 4 or more Life nothing follows the Life cost; declining pays nothing; 1 DON does not activate', () => {
  let s = game(3)
  const leader = leaderOf(s, 'alice')
  attachDon(s, 'alice', leader, 2)
  s = pick(attack(s, leader, leaderOf(s, 'bob')), 'alice', [0])
  assert.equal(life(s, 'alice').length, 4); assert.equal(pendingChoice(s, 'alice'), undefined, 'no hand-to-Life choice with 4 Life')
  let t = game(3)
  attachDon(t, 'alice', leaderOf(t, 'alice'), 2)
  t = pick(attack(t, leaderOf(t, 'alice'), leaderOf(t, 'bob')), 'alice', [])
  assert.equal(life(t, 'alice').length, 5); assert.equal(pendingChoice(t, 'alice'), undefined)
  let u = game(3)
  attachDon(u, 'alice', leaderOf(u, 'alice'), 1)
  u = attack(u, leaderOf(u, 'alice'), leaderOf(u, 'bob'))
  assert.equal(pendingChoice(u, 'alice'), undefined, '[DON!! x2] not met')
})

test('M6 ST-07 Katakuri privately looks at the opponent top Life and places it at the bottom; Rush only with fewer Life', () => {
  let s = game(5)
  const bobTop = life(s, 'bob')[0]
  s = playCard(s, 'alice', put(s, 'alice', 'ST07-003', 'hand'))
  assert.deepEqual(slots(s, 'alice'), ['LIFE_TOP:alice', 'LIFE_TOP:bob'])
  assert.ok(optionIds(s, 'alice').includes(bobTop), 'the chooser sees the cards it looks at')
  const bobView = projectState(s, 'bob').effects!.pendingChoice as { waiting?: boolean }
  assert.equal(bobView.waiting, true, 'the opponent never sees the peek')
  s = roundTrip(choose(s, 'alice', [bobTop]))
  assert.deepEqual(slots(s, 'alice'), ['MODE', 'MODE'])
  s = pick(s, 'alice', [1])
  assert.equal(life(s, 'bob').at(-1), bobTop); assert.equal(life(s, 'bob').length, 5)
  const katakuri = zones(s, 'alice').characters.at(-1)!
  assert.ok(!attackerIds(s, 'alice').includes(katakuri), 'equal Life: no Rush')
  let t = hitAlice(endTurn(game(5)), 1)
  t = endTurn(t)
  t = playCard(t, 'alice', put(t, 'alice', 'ST07-003', 'hand'))
  t = pick(t, 'alice', [])
  assert.ok(attackerIds(t, 'alice').includes(zones(t, 'alice').characters.at(-1)!), '4 Life against 5: Rush')
})

test('M6 ST-07 Pudding may keep the looked-at own top Life on top', () => {
  let s = game(3)
  const order = [...life(s, 'alice')]
  s = playCard(s, 'alice', put(s, 'alice', 'ST07-008', 'hand'))
  s = choose(s, 'alice', [order[0]])
  s = pick(s, 'alice', [0])
  assert.deepEqual(life(s, 'alice'), order)
})

test('M6 ST-07 Snack with a DON pays a Life for Banish and +1000 during this battle only', () => {
  let s = game(5)
  const snack = put(s, 'alice', 'ST07-004', 'characters')
  attachDon(s, 'alice', snack, 1)
  const bobTrash = zones(s, 'bob').trash.length, bobHand = zones(s, 'bob').hand.length
  s = pick(attack(s, snack, leaderOf(s, 'bob')), 'alice', [0])
  assert.equal(hasCombatKeyword(s, snack, 'BANISH'), true)
  s = finishBattle(s)
  assert.equal(zones(s, 'bob').trash.length, bobTrash + 1, 'Banish trashes the Life card'); assert.equal(zones(s, 'bob').hand.length, bobHand)
  assert.equal(hasCombatKeyword(s, snack, 'BANISH'), false, 'during this battle')
  let t = game(5)
  const weak = put(t, 'alice', 'ST07-004', 'characters'), big = put(t, 'bob', 'ST07-010', 'characters', { rested: true })
  attachDon(t, 'alice', weak, 1)
  t = finishBattle(pick(attack(t, weak, big), 'alice', [0]))
  assert.equal(zoneOf(t, big), 'trash', '6000 + 1000 (DON!!) + 1000 (this battle) K.O.s the 8000 Character')
  assert.equal(evaluateCharacteristics(t, weak).power.current, 7000, 'the +1000 ended with the battle')
})

test('M6 ST-07 Daifuku with a DON pays a Life to add the unseen top deck card to the top of its Life', () => {
  let s = game(5)
  const daifuku = put(s, 'alice', 'ST07-005', 'characters')
  attachDon(s, 'alice', daifuku, 1)
  s = pick(attack(s, daifuku, leaderOf(s, 'bob')), 'alice', [0])
  const top = zones(s, 'alice').deck[0]
  assert.deepEqual(slots(s, 'alice'), ['DECK_TOP:alice'], 'chosen without being looked at')
  s = pick(s, 'alice', [0])
  assert.equal(life(s, 'alice')[0], top); assert.equal(life(s, 'alice').length, 5)
})

test('M6 ST-07 Brulee blocks and its Trigger plays it', () => {
  let s = game(3)
  const brulee = put(s, 'alice', 'ST07-007', 'life')
  s = hitWithTrigger(endTurn(s), 'alice')
  assert.equal(zoneOf(s, brulee), 'characters')
  s = endTurn(endTurn(finishBattle(s)))
  s = attack(s, put(s, 'bob', 'ST07-012', 'characters'), leaderOf(s, 'alice'))
  assert.ok((legal(s, 'alice').find(a => a.type === 'ACTIVATE_BLOCKER') as { blockerIds: string[] } | undefined)?.blockerIds.includes(brulee))
})

test('M6 ST-07 Mont-d or rests and pays a Life to K.O. cost 3 or less; its Trigger plays it only after trashing a card', () => {
  let s = game(3)
  const montdor = put(s, 'alice', 'ST07-009', 'characters'), target = put(s, 'bob', 'ST07-009', 'characters'), big = put(s, 'bob', 'ST07-004', 'characters')
  s = startEffect(s, 'alice', 'ST07-009.activate-main-ko')
  assert.equal(s.instances[montdor].rested, true)
  assert.equal(pendingChoice(s, 'alice')!.min, 1, 'the Life cost is part of the activation')
  s = pick(s, 'alice', [1])
  assert.equal(life(s, 'alice').length, 4)
  assert.deepEqual(optionIds(s, 'alice'), [target])
  s = choose(s, 'alice', [target])
  assert.equal(zoneOf(s, target), 'trash'); assert.equal(zoneOf(s, big), 'characters')
  let t = game(3)
  const lifeCard = put(t, 'alice', 'ST07-009', 'life'), discard = inHand(t, 'alice', 'ST07-002')
  t = hitWithTrigger(endTurn(t), 'alice')
  t = choose(t, 'alice', [discard])
  assert.equal(zoneOf(t, discard), 'trash'); assert.equal(zoneOf(t, lifeCard), 'characters')
  let u = game(3)
  const lifeCard2 = put(u, 'alice', 'ST07-009', 'life')
  u = hitWithTrigger(endTurn(u), 'alice')
  u = choose(u, 'alice', [])
  assert.equal(zoneOf(finishBattle(u), lifeCard2), 'trash', 'not played without the cost')
})

test('M6 ST-07 FAQ ST07-010: Charlotte Linlin lets the opponent choose to trash its own top Life or let the player add its top deck card to Life', () => {
  let s = game(9)
  const bobTop = life(s, 'bob')[0]
  s = playCard(s, 'alice', put(s, 'alice', 'ST07-010', 'hand'))
  assert.deepEqual(slots(s, 'bob'), ['MODE', 'MODE'], 'the opponent chooses')
  assert.equal(pendingChoice(s, 'alice'), undefined)
  s = roundTrip(pick(s, 'bob', [0]))
  assert.equal(zoneOf(s, bobTop), 'trash'); assert.equal(life(s, 'bob').length, 4); assert.equal(life(s, 'alice').length, 5)
  let t = game(9)
  const deckTop = zones(t, 'alice').deck[0]
  t = playCard(t, 'alice', put(t, 'alice', 'ST07-010', 'hand'))
  const deckTopAfterPlay = zones(t, 'alice').deck[0]
  t = pick(t, 'bob', [1])
  assert.equal(life(t, 'alice')[0], deckTopAfterPlay ?? deckTop, 'the activating player adds its own top deck card'); assert.equal(life(t, 'alice').length, 6); assert.equal(life(t, 'bob').length, 5)
})

test('M6 ST-07 FAQ ST07-010 and ST07-001: with 0 Life the opponent may still choose the trash mode (nothing happens) and its Leader pays nothing', () => {
  let s = game(9)
  for (const n of ['ST07-012', 'ST07-012', 'ST07-004', 'ST07-004']) s = finishBattle(attack(s, put(s, 'alice', n, 'characters'), leaderOf(s, 'bob')))
  s = finishBattle(attack(s, leaderOf(s, 'alice'), leaderOf(s, 'bob')))
  assert.equal(life(s, 'bob').length, 0)
  s = playCard(s, 'alice', put(s, 'alice', 'ST07-010', 'hand'))
  s = pick(s, 'bob', [0])
  assert.equal(life(s, 'bob').length, 0); assert.equal(s.result ?? null, null, 'nothing happens')
  s = endTurn(s)
  attachDon(s, 'bob', leaderOf(s, 'bob'), 2)
  s = attack(s, leaderOf(s, 'bob'), leaderOf(s, 'alice'))
  assert.equal(pendingChoice(s, 'bob')?.max ?? 0, 0, 'no Life to pay: the ability does nothing')
})

test('M6 ST-07 FAQ ST07-011 and ST07-013: Zeus and Prometheus target the Linlin Leader or Character only', () => {
  let s = game(5)
  const zeus = put(s, 'alice', 'ST07-011', 'characters'), linlin = put(s, 'alice', 'ST07-010', 'characters'), other = put(s, 'alice', 'ST07-012', 'characters')
  s = startEffect(s, 'alice', 'ST07-011.activate-main-banish')
  assert.equal(s.instances[zeus].rested, true)
  assert.deepEqual(optionIds(s, 'alice').sort(), [leaderOf(s, 'alice'), linlin].sort())
  assert.ok(!optionIds(s, 'alice').includes(other))
  s = choose(s, 'alice', [leaderOf(s, 'alice')])
  assert.equal(hasCombatKeyword(s, leaderOf(s, 'alice'), 'BANISH'), true)
  put(s, 'alice', 'ST07-013', 'characters')
  s = startEffect(s, 'alice', 'ST07-013.activate-main-double')
  s = choose(s, 'alice', [linlin])
  assert.equal(hasCombatKeyword(s, linlin, 'DOUBLE_ATTACK'), true)
  s = endTurn(s)
  assert.equal(hasCombatKeyword(s, linlin, 'DOUBLE_ATTACK'), false, 'during this turn')
  let t = game(3)
  const zeusLife = put(t, 'alice', 'ST07-011', 'life')
  t = hitWithTrigger(endTurn(t), 'alice')
  assert.equal(zoneOf(t, zeusLife), 'characters', 'Zeus Trigger plays it')
  let u = game(3)
  const promLife = put(u, 'alice', 'ST07-013', 'life')
  u = hitWithTrigger(endTurn(u), 'alice')
  assert.equal(zoneOf(u, promLife), 'characters', 'Prometheus Trigger plays it')
})

test('M6 ST-07 FAQ ST07-015: Soul Pocus Main and Trigger give the opponent the same choice; the Trigger resolves before the next damage', () => {
  let s = game(5)
  put(s, 'alice', 'ST07-015', 'hand')
  s = startEffect(s, 'alice', 'ST07-015.main-mode')
  s = pick(s, 'bob', [1])
  assert.equal(life(s, 'alice').length, 6)
  let t = game(3)
  put(t, 'bob', 'ST07-015', 'life')
  t = endTurn(endTurn(t))
  const pocus = life(t, 'bob')[0], bobLife = life(t, 'bob').length
  t = hitWithTrigger(t, 'bob')
  assert.equal(zoneOf(t, pocus), 'temporary')
  assert.deepEqual(slots(t, 'alice'), ['MODE', 'MODE'], 'the opponent of the Trigger owner chooses')
  t = pick(t, 'alice', [1])
  assert.equal(life(t, 'bob').length, bobLife, 'one Life taken by the damage, one added by the Trigger')
  assert.equal(zoneOf(finishBattle(t), pocus), 'trash')
})

test('M6 ST-07 Power Mochi Counter looks at a top Life then gives +2000 this battle; its Trigger draws then looks', () => {
  let s = endTurn(game(3))
  const mochi = put(s, 'alice', 'ST07-016', 'hand')
  s = attack(s, put(s, 'bob', 'ST07-012', 'characters'), leaderOf(s, 'alice'))
  s = act(s, 'alice', { type: 'PASS_BLOCKER', battleId: s.battle!.id })
  const a = legal(s, 'alice').find(x => x.type === 'PLAY_COUNTER_EVENT') as { eventIds: string[]; paymentDonIds: string[]; battleId: string } | undefined
  assert.ok(a?.eventIds.includes(mochi))
  s = act(s, 'alice', { type: 'PLAY_COUNTER_EVENT', cardId: mochi, targetId: null, paymentDonIds: a!.paymentDonIds.slice(0, 1), donMinusIds: [], battleId: a!.battleId })
  s = choose(s, 'alice', [life(s, 'bob')[0]]); s = pick(s, 'alice', [0])
  s = choose(s, 'alice', [leaderOf(s, 'alice')])
  assert.equal(s.battle!.counterModifiers.reduce((n, m) => n + m.amount, 0), 2000)
  s = act(s, 'alice', { type: 'PASS_COUNTER', battleId: s.battle!.id })
  s = act(s, 'bob', { type: 'RESOLVE_BATTLE', battleId: s.battle!.id })
  assert.equal(life(s, 'alice').length, 5, '6000 against 7000: no damage')
  let t = game(3)
  put(t, 'alice', 'ST07-016', 'life')
  t = endTurn(t)
  const hand = zones(t, 'alice').hand.length
  t = hitWithTrigger(t, 'alice')
  assert.equal(zones(t, 'alice').hand.length, hand + 1, 'draw 1')
  assert.deepEqual(slots(t, 'alice'), ['LIFE_TOP:alice', 'LIFE_TOP:bob'])
  t = pick(t, 'alice', [])
})

test('M6 ST-07 FAQ ST07-017: Queen Mama Chanter puts only an own cost 3 Character face-up on top of its Life, or nothing', () => {
  let s = game(5)
  const chanter = put(s, 'alice', 'ST07-017', 'stage'), three = put(s, 'alice', 'ST07-009', 'characters'), two = put(s, 'alice', 'ST07-006', 'characters'), foe = put(s, 'bob', 'ST07-009', 'characters')
  attachDon(s, 'alice', three, 1)
  s = startEffect(s, 'alice', 'ST07-017.activate-main-life')
  assert.equal(s.instances[chanter].rested, true)
  s = pick(s, 'alice', [0])
  assert.deepEqual(optionIds(s, 'alice'), [three], 'cost exactly 3, own Character on the field only')
  assert.ok(!optionIds(s, 'alice').includes(two) && !optionIds(s, 'alice').includes(foe))
  s = roundTrip(choose(s, 'alice', [three]))
  assert.equal(life(s, 'alice')[0], three); assert.equal(s.instances[three].faceUp, true); assert.equal(life(s, 'alice').length, 5)
  assert.equal(zones(s, 'alice').attached.length, 0, 'its DON!! returned rested to the cost area')
  assert.deepEqual(projectState(s, 'bob').players[0].lifeFaceUp?.map(x => x.card.id), [three], 'a face-up Life card is public')
  s = endTurn(s)
  s = finishBattle(attack(s, put(s, 'bob', 'ST07-012', 'characters'), leaderOf(s, 'alice')))
  assert.equal(zoneOf(s, three), 'hand'); assert.equal(s.instances[three].faceUp, false)
  let t = game(5)
  put(t, 'alice', 'ST07-017', 'stage'); put(t, 'alice', 'ST07-009', 'characters')
  t = choose(pick(startEffect(t, 'alice', 'ST07-017.activate-main-life'), 'alice', [0]), 'alice', [])
  assert.equal(life(t, 'alice').length, 4, 'may choose not to add (FAQ ST07-017)')
})

test('M6 ST-07 cards without other ability are played for their printed cost, keep their power and defend with their Counter or [Blocker]', () => {
  for (const number of ['ST07-002', 'ST07-006', 'ST07-012', 'ST07-014', 'ST07-007']) {
    let s = game(9)
    const d = s.catalog.definitions.find(x => x.number === number)!, blocker = d.review.effects.some(e => e.kind === 'blocker')
    const played = inHand(s, 'alice', number), held = inHand(s, 'alice', number, [played])
    s = playCard(s, 'alice', played)
    assert.equal(zoneOf(s, played), 'characters'); assert.equal(evaluateCharacteristics(s, played).power.current, d.power, `${number} power`)
    s = endTurn(s)
    s = attack(s, put(s, 'bob', 'ST07-012', 'characters'), leaderOf(s, 'alice'))
    if (blocker) assert.ok((legal(s, 'alice').find(a => a.type === 'ACTIVATE_BLOCKER') as { blockerIds: string[] } | undefined)?.blockerIds.includes(played), `${number} can block`)
    else {
      s = act(s, 'alice', { type: 'PASS_BLOCKER', battleId: s.battle!.id })
      s = act(s, 'alice', { type: 'PLAY_COUNTER_CHARACTER', cardId: held, targetId: leaderOf(s, 'alice'), battleId: s.battle!.id })
      assert.equal(s.battle!.counterModifiers.reduce((n, m) => n + m.amount, 0), d.counter)
    }
  }
})

test('M6 ST-07 certificates validate against the current registry; all 17 numbers are PLAYABLE_VERIFIED', async () => {
  const { ST07_CERTIFICATIONS, certificationErrors, effectiveStatus } = await import('../src/game/cards/certification')
  const { engineCatalog, currentEngineRegistry } = await import('../src/lib/engine/catalog')
  const { definitions } = engineCatalog(), registry = currentEngineRegistry()
  for (const c of ST07_CERTIFICATIONS) assert.deepEqual(certificationErrors(c, definitions.find(x => x.definitionId === c.definitionId), registry), [], c.definitionId)
  for (let i = 1; i <= 17; i++) { const n = `ST07-${String(i).padStart(3, '0')}`; assert.equal(effectiveStatus(definitions.find(x => x.number === n)!), 'PLAYABLE_VERIFIED', n) }
})
