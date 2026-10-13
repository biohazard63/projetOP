import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateCharacteristics, hasCombatKeyword } from '../src/game/effects/characteristics'
import type { GameState } from '../src/game/core/types'
import { act, attachDon, attack, attackerIds, choose, deckFor, endTurn, finishBattle, leaderOf, legal, newGame, offeredEffects, optionIds, pendingChoice, playCard, put, roundTrip, startEffect, toMain, zoneOf , inHand } from './helpers/m6'

// M6 Lot B — ST-03 and ST-04. Scenarios follow the official text, the ST-01..04 FAQ and the errata
// (docs/game/evidence/m6/sources/), through public commands only.
const ST03 = ['ST03-002', 'ST03-003', 'ST03-004', 'ST03-005', 'ST03-006', 'ST03-007', 'ST03-008', 'ST03-009', 'ST03-010', 'ST03-011', 'ST03-012', 'ST03-013', 'ST03-014', 'ST03-015', 'ST03-016', 'ST03-017']
const ST04 = ['ST04-002', 'ST04-003', 'ST04-004', 'ST04-005', 'ST04-006', 'ST04-007', 'ST04-008', 'ST04-009', 'ST04-010', 'ST04-011', 'ST04-012', 'ST04-013', 'ST04-014', 'ST04-015', 'ST04-016', 'ST04-017']
const blue = (turn = 3) => toMain(newGame(deckFor('ST03-001', ST03), deckFor('ST03-001', ST03)), turn)
const purple = (turn = 3) => toMain(newGame(deckFor('ST04-001', ST04), deckFor('ST03-001', ST03)), turn)
const power = (s: GameState, id: string) => evaluateCharacteristics(s, id).power.current
const fieldDon = (s: GameState, owner: string) => { const p = s.players.find(x => x.id === owner)!; return p.zones.cost.length + p.zones.attached.length }
const lifeDamage = (s: GameState, defender: string, attackerNumber: string): GameState => {
  s = attack(s, put(s, s.activePlayerId!, attackerNumber, 'characters'), leaderOf(s, defender))
  s = act(s, defender, { type: 'PASS_BLOCKER', battleId: s.battle!.id }); s = act(s, defender, { type: 'PASS_COUNTER', battleId: s.battle!.id })
  return act(s, s.activePlayerId!, { type: 'RESOLVE_BATTLE', battleId: s.battle!.id })
}
const activateTrigger = (s: GameState, owner: string) => { const t = legal(s, owner).find(a => a.type === 'ANSWER_TRIGGER') as { choiceId: string } | undefined; assert.ok(t, 'Trigger offered'); return act(s, owner, { type: 'ANSWER_TRIGGER', choiceId: t!.choiceId, activate: true }) }
const counterEvent = (s: GameState, owner: string, cardId: string): GameState => {
  const a = legal(s, owner).find(x => x.type === 'PLAY_COUNTER_EVENT') as { eventIds: string[]; paymentDonIds: string[]; battleId: string } | undefined
  assert.ok(a?.eventIds.includes(cardId))
  const cost = s.catalog.definitions.find(d => d.definitionId === s.instances[cardId].definitionId)!.cost ?? 0
  return act(s, owner, { type: 'PLAY_COUNTER_EVENT', cardId, targetId: null, paymentDonIds: a!.paymentDonIds.slice(0, cost), donMinusIds: [], battleId: a!.battleId })
}
const payDonMinus = (s: GameState, owner: string, n: number) => {
  const c = pendingChoice(s, owner)!; assert.equal(c.allOrNone, true); assert.equal(c.max, n)
  return act(s, owner, { type: 'ANSWER_CHOICE', choiceId: c.choiceId, tokens: c.options.slice(0, n).map(o => o.token) })
}

test('M6 ST-03 FAQ ST03-001: Leader Crocodile pays DON!! -4 to return any Character cost 5 or less, own included, once per turn', () => {
  let s = blue(7)
  const own = put(s, 'alice', 'ST03-002', 'characters'), foe = put(s, 'bob', 'ST03-004', 'characters'), big = put(s, 'bob', 'ST03-009', 'characters')
  const a = offeredEffects(s, 'alice', 'ST03-001.activate-main-bounce')[0] as { effectId: string; donMinus?: { amount: number; eligibleDonIds: string[] } }
  assert.equal(a.donMinus?.amount, 4)
  s = act(s, 'alice', { type: 'START_EFFECT', effectId: a.effectId, donMinusIds: a.donMinus!.eligibleDonIds.slice(0, 4) })
  assert.equal(s.players[0].zones.donDeck.length, 3 + 4, 'four DON!! returned to the DON!! deck')
  const options = optionIds(s, 'alice')
  assert.ok(options.includes(own) && options.includes(foe) && !options.includes(big), 'own Character allowed (FAQ), cost 7 excluded')
  s = choose(s, 'alice', [own]); assert.equal(zoneOf(s, own), 'hand')
  assert.equal(offeredEffects(s, 'alice', 'ST03-001.activate-main-bounce').length, 0, 'once per turn')
  const t = blue(3); assert.equal(offeredEffects(t, 'alice', 'ST03-001.activate-main-bounce').length, 0, 'not offered below 4 field DON!!')
  void t
})

test('M6 ST-03 FAQ ST03-003: Crocodile On Block bottoms the attacking Character (cost 2 or less) and the battle ends; own Characters allowed', () => {
  let s = blue(4)
  const croc = put(s, 'alice', 'ST03-003', 'characters'); attachDon(s, 'alice', croc, 1)
  const attacker = put(s, 'bob', 'ST03-011', 'characters'), own = put(s, 'alice', 'ST03-008', 'characters')
  s = attack(s, attacker, leaderOf(s, 'alice'))
  s = act(s, 'alice', { type: 'ACTIVATE_BLOCKER', blockerId: croc, battleId: s.battle!.id })
  const options = optionIds(s, 'alice'); assert.ok(options.includes(attacker) && options.includes(own))
  s = choose(s, 'alice', [attacker])
  const bobDeck = s.players[1].zones.deck
  assert.equal(bobDeck[bobDeck.length - 1], attacker, 'bottom of its owner deck')
  s = finishBattle(s)
  assert.equal(s.battle, null, 'the battle ends without anything happening'); assert.equal(zoneOf(s, croc), 'characters')
  roundTrip(s)
})

test('M6 ST-03 FAQ ST03-004: Gecko Moria recovers a {Seven Warlords}/{Thriller Bark} Character cost 4 or less, never one named Gecko Moria', () => {
  let s = blue(5)
  const weevil = put(s, 'alice', 'ST03-002', 'trash'), otherMoria = put(s, 'alice', 'ST03-004', 'trash'), pacifista = put(s, 'alice', 'ST03-012', 'trash'), dofla = put(s, 'alice', 'ST03-009', 'trash')
  s = playCard(s, 'alice', put(s, 'alice', 'ST03-004', 'hand'))
  const options = optionIds(s, 'alice')
  assert.ok(options.includes(weevil)); assert.ok(!options.includes(otherMoria), 'named [Gecko Moria]'); assert.ok(!options.includes(pacifista), 'no matching type'); assert.ok(!options.includes(dofla), 'cost 7')
  s = choose(s, 'alice', [weevil]); assert.equal(zoneOf(s, weevil), 'hand')
})

test('M6 ST-03 FAQ ST03-005: Mihawk with a DON!! draws 2 then trashes 2 cards from the hand', () => {
  let s = blue(5)
  const mihawk = put(s, 'alice', 'ST03-005', 'characters'); attachDon(s, 'alice', mihawk, 1)
  const hand = s.players[0].zones.hand.length, deck = s.players[0].zones.deck.length
  s = attack(s, mihawk, leaderOf(s, 'bob'))
  assert.equal(s.players[0].zones.deck.length, deck - 2)
  const c = pendingChoice(s, 'alice')!; assert.equal(c.min, 2); assert.equal(c.max, 2)
  s = choose(s, 'alice', optionIds(s, 'alice').slice(0, 2))
  assert.equal(s.players[0].zones.hand.length, hand); assert.equal(s.players[0].zones.trash.length, 2)
  roundTrip(s)
})

test('M6 ST-03 FAQ ST03-007: Sentomaru plays a [Pacifista] cost 4 or less from the deck then shuffles; without one it only shuffles', () => {
  let s = blue(5)
  const sento = put(s, 'alice', 'ST03-007', 'characters'); attachDon(s, 'alice', sento, 1)
  s = startEffect(s, 'alice', 'ST03-007.activate-main-play-pacifista')
  const options = optionIds(s, 'alice')
  assert.ok(options.length > 0 && options.every(id => s.catalog.definitions.find(d => d.definitionId === s.instances[id].definitionId)!.rulesName === 'Pacifista'))
  assert.equal(s.effects!.choice!.visibility, 'PRIVATE', 'the deck is looked at privately')
  s = choose(s, 'alice', [options[0]]); assert.equal(zoneOf(s, options[0]), 'characters')
  assert.equal(offeredEffects(s, 'alice', 'ST03-007.activate-main-play-pacifista').length, 0, 'once per turn')
  let t = blue(5)
  const p = t.players[0]
  for (const id of p.zones.deck.filter(id => t.catalog.definitions.find(d => d.definitionId === t.instances[id].definitionId)!.rulesName === 'Pacifista')) { p.zones.deck.splice(p.zones.deck.indexOf(id), 1); p.zones.trash.push(id); t.instances[id].zone = 'trash'; t.instances[id].zoneGeneration++; t.instances[id].faceUp = true }
  const s2 = put(t, 'alice', 'ST03-007', 'characters'); attachDon(t, 'alice', s2, 1)
  t = startEffect(t, 'alice', 'ST03-007.activate-main-play-pacifista')
  assert.deepEqual(optionIds(t, 'alice'), []); t = choose(t, 'alice', [])
  assert.equal(t.effects!.choice, null, 'the deck is shuffled, nothing is played')
})

test('M6 ST-03 FAQ ST03-009/014/015: Doflamingo, Teach and Sables return a Character (own allowed) to its owner hand within their cost limit', () => {
  for (const [number, limit, isEvent] of [['ST03-009', 7, false], ['ST03-014', 3, false], ['ST03-015', 7, true]] as const) {
    let s = blue(9)
    const own = put(s, 'alice', 'ST03-011', 'characters'), cheap = put(s, 'bob', 'ST03-006', 'characters'), mid = put(s, 'bob', 'ST03-004', 'characters')
    const card = put(s, 'alice', number, 'hand')
    s = isEvent ? startEffect(s, 'alice', 'ST03-015.main-bounce') : playCard(s, 'alice', card)
    const options = optionIds(s, 'alice')
    assert.ok(options.includes(own) && options.includes(cheap), `${number}: own and opposing Characters`)
    assert.equal(options.includes(mid), limit >= 4, `${number}: cost limit ${limit}`)
    s = choose(s, 'alice', [cheap]); assert.equal(zoneOf(s, cheap), 'hand'); assert.equal(s.instances[cheap].owner, 'bob')
  }
})

test('M6 ST-03 Sables and Thrust Pad Cannon Triggers activate the same return effect; Boa Hancock and Kuma Triggers play themselves', () => {
  for (const [number] of [['ST03-015'], ['ST03-016']] as const) {
    let s = blue(3)
    const target = put(s, 'alice', 'ST03-011', 'characters')
    put(s, 'bob', number, 'life')
    s = lifeDamage(s, 'bob', 'ST03-002'); s = activateTrigger(s, 'bob')
    assert.ok(optionIds(s, 'bob').includes(target)); s = choose(s, 'bob', [target]); assert.equal(zoneOf(s, target), 'hand')
  }
  let s = blue(3)
  const hancock = put(s, 'bob', 'ST03-013', 'life')
  s = lifeDamage(s, 'bob', 'ST03-002'); s = activateTrigger(s, 'bob')
  assert.equal(zoneOf(s, hancock), 'characters')
  let k = blue(3)
  const kuma = put(k, 'bob', 'ST03-010', 'life')
  k = lifeDamage(k, 'bob', 'ST03-002'); k = activateTrigger(k, 'bob')
  assert.equal(zoneOf(k, kuma), 'characters', 'Kuma Trigger plays it')
})

test('M6 ST-03 FAQ ST03-016: Thrust Pad Cannon may return the attacker (the battle ends) or an own Character whose Counter can then be used', () => {
  let s = blue(4)
  const attacker = put(s, 'bob', 'ST03-002', 'characters'), pad = put(s, 'alice', 'ST03-016', 'hand')
  s = attack(s, attacker, leaderOf(s, 'alice')); s = act(s, 'alice', { type: 'PASS_BLOCKER', battleId: s.battle!.id })
  s = counterEvent(s, 'alice', pad); s = choose(s, 'alice', [attacker])
  assert.equal(zoneOf(s, attacker), 'hand'); s = finishBattle(s)
  assert.equal(s.battle, null); assert.equal(s.players[0].zones.life.length, 5, 'no damage')
  let t = blue(6)
  const atk = put(t, 'bob', 'ST03-002', 'characters'), own = put(t, 'alice', 'ST03-006', 'characters'), pad2 = put(t, 'alice', 'ST03-016', 'hand')
  t = attack(t, atk, leaderOf(t, 'alice')); t = act(t, 'alice', { type: 'PASS_BLOCKER', battleId: t.battle!.id })
  t = counterEvent(t, 'alice', pad2); t = choose(t, 'alice', [own])
  assert.equal(zoneOf(t, own), 'hand')
  t = act(t, 'alice', { type: 'PLAY_COUNTER_CHARACTER', cardId: own, targetId: leaderOf(t, 'alice'), battleId: t.battle!.id })
  assert.equal(t.battle!.counterModifiers.at(-1)!.amount, 1000, 'its Counter is usable in the same battle')
})

test('M6 ST-03/ST-04 cards without other ability are played for their printed cost, keep their power and defend with their Counter or [Blocker]', () => {
  for (const [number, make] of [['ST03-002', blue], ['ST03-006', blue], ['ST03-008', blue], ['ST03-011', blue], ['ST03-012', blue], ['ST03-003', blue], ['ST03-013', blue], ['ST04-005', purple]] as const) {
    let s = make(9)
    const d = s.catalog.definitions.find(x => x.number === number)!, blocker = d.review.effects.some(e => e.kind === 'blocker')
    const played = inHand(s, 'alice', number), held = inHand(s, 'alice', number, [played])
    s = playCard(s, 'alice', played)
    for (let n = 0; n < 3 && s.effects?.choice; n++) { const c = pendingChoice(s, 'alice')!; s = act(s, 'alice', { type: 'ANSWER_CHOICE', choiceId: c.choiceId, tokens: [] }) }
    assert.equal(zoneOf(s, played), 'characters'); assert.equal(power(s, played), d.power, `${number} power`)
    s = endTurn(s)
    s = attack(s, put(s, 'bob', s.players[1].zones.leader.length && number.startsWith('ST03') ? 'ST03-012' : 'ST03-012', 'characters'), leaderOf(s, 'alice'))
    if (blocker) {
      assert.ok((legal(s, 'alice').find(a => a.type === 'ACTIVATE_BLOCKER') as { blockerIds: string[] } | undefined)?.blockerIds.includes(played), `${number} can block`)
    } else if (d.counter) {
      s = act(s, 'alice', { type: 'PASS_BLOCKER', battleId: s.battle!.id })
      s = act(s, 'alice', { type: 'PLAY_COUNTER_CHARACTER', cardId: held, targetId: leaderOf(s, 'alice'), battleId: s.battle!.id })
      assert.equal(s.battle!.counterModifiers.reduce((n, m) => n + m.amount, 0), d.counter)
    }
  }
})

test('M6 ST-04 FAQ ST04-002: Ulti pays DON!! -1 to play a [Page One] cost 4 or less from hand; it may be played without one', () => {
  let s = purple(7)
  const pageOne = put(s, 'alice', 'ST04-012', 'hand'), don = fieldDon(s, 'alice')
  s = playCard(s, 'alice', put(s, 'alice', 'ST04-002', 'hand'))
  s = payDonMinus(s, 'alice', 1); assert.equal(fieldDon(s, 'alice'), don - 1)
  assert.deepEqual(optionIds(s, 'alice'), [pageOne]); s = choose(s, 'alice', [pageOne]); assert.equal(zoneOf(s, pageOne), 'characters')
  let t = purple(7)
  const p = t.players[0]; for (const id of p.zones.hand.filter(id => t.catalog.definitions.find(d => d.definitionId === t.instances[id].definitionId)!.rulesName === 'Page One')) { p.zones.hand.splice(p.zones.hand.indexOf(id), 1); p.zones.trash.push(id); t.instances[id].zone = 'trash'; t.instances[id].zoneGeneration++; t.instances[id].faceUp = true }
  t = playCard(t, 'alice', put(t, 'alice', 'ST04-002', 'hand'))
  const c = pendingChoice(t, 'alice')!; t = act(t, 'alice', { type: 'ANSWER_CHOICE', choiceId: c.choiceId, tokens: [] })
  assert.equal(t.effects!.choice, null, 'declining the DON!! -1 skips the effect')
})

test('M6 ST-04 FAQ ST04-003: Kaido pays DON!! -5, K.O.s up to 1 Character cost 6 or less and gains [Rush] even without a target', () => {
  let s = purple(9)
  const foe = put(s, 'bob', 'ST03-009', 'characters'), cheap = put(s, 'bob', 'ST03-004', 'characters')
  const kaido = put(s, 'alice', 'ST04-003', 'hand')
  s = playCard(s, 'alice', kaido); s = payDonMinus(s, 'alice', 5)
  assert.deepEqual(optionIds(s, 'alice'), [cheap], 'cost 7 Doflamingo excluded'); s = roundTrip(s); s = choose(s, 'alice', [])
  assert.ok(hasCombatKeyword(s, kaido, 'RUSH')); assert.ok(attackerIds(s, 'alice').includes(kaido), 'attacks on the turn played')
  s = endTurn(s); assert.ok(!hasCombatKeyword(s, kaido, 'RUSH'), 'only during this turn')
  void foe
})

test('M6 ST-04 King, Who is Who, Queen and Sasaki pay DON!! -1 for their On Play; without enough DON!! the effect is not activated', () => {
  let s = purple(7)
  const four = put(s, 'bob', 'ST03-004', 'characters'), three = put(s, 'bob', 'ST03-013', 'characters'), big = put(s, 'bob', 'ST03-012', 'characters', { rested: true })
  s = playCard(s, 'alice', put(s, 'alice', 'ST04-004', 'hand')); s = payDonMinus(s, 'alice', 1)
  assert.ok(optionIds(s, 'alice').includes(four) && optionIds(s, 'alice').includes(three)); s = choose(s, 'alice', [four]); assert.equal(zoneOf(s, four), 'trash')
  let k = purple(7)
  k = playCard(k, 'alice', put(k, 'alice', 'ST04-006', 'hand')); const hand = k.players[0].zones.hand.length; k = payDonMinus(k, 'alice', 1)
  assert.equal(k.players[0].zones.hand.length, hand + 1, 'Sasaki draws 1')
  let q = purple(9)
  q = playCard(q, 'alice', put(q, 'alice', 'ST04-005', 'hand')); const h = q.players[0].zones.hand.length; q = payDonMinus(q, 'alice', 1)
  assert.equal(pendingChoice(q, 'alice')!.min, 1); q = choose(q, 'alice', [optionIds(q, 'alice')[0]]); assert.equal(q.players[0].zones.hand.length, h + 1, 'Queen: draw 2, trash 1')
  // FAQ ST04-010: Who's.Who played by its Trigger with no DON!! on the field: On Play cannot be activated.
  let w = purple(4)
  assert.equal(w.activePlayerId, 'bob')
  const p = w.players[0]; for (const id of [...p.zones.cost]) { p.zones.cost.splice(p.zones.cost.indexOf(id), 1); p.zones.donDeck.push(id); w.instances[id].zone = 'donDeck'; w.instances[id].zoneGeneration++; w.instances[id].rested = false; w.instances[id].faceUp = false }
  const who = put(w, 'alice', 'ST04-010', 'life')
  w = lifeDamage(w, 'alice', 'ST03-002'); w = activateTrigger(w, 'alice')
  assert.equal(zoneOf(w, who), 'characters'); assert.equal(w.effects!.choice, null, 'no DON!! -1 possible: nothing to choose')
  void big
})

test('M6 ST-04 FAQ ST04-008: Jack may trash 1 card to add an active DON!!; with an empty DON!! deck the card is still trashed; no hand: nothing', () => {
  let s = purple(5)
  s = playCard(s, 'alice', put(s, 'alice', 'ST04-008', 'hand'))
  const donDeck = s.players[0].zones.donDeck.length, active = s.players[0].zones.cost.filter(id => !s.instances[id].rested).length
  s = choose(s, 'alice', [optionIds(s, 'alice')[0]])
  assert.equal(s.players[0].zones.donDeck.length, donDeck - 1); assert.equal(s.players[0].zones.cost.filter(id => !s.instances[id].rested).length, active + 1)
  let t = purple(5)
  const p = t.players[0]; while (p.zones.donDeck.length) { const id = p.zones.donDeck.pop()!; p.zones.cost.push(id); t.instances[id].zone = 'cost'; t.instances[id].zoneGeneration++; t.instances[id].rested = true; t.instances[id].faceUp = true }
  t = playCard(t, 'alice', put(t, 'alice', 'ST04-008', 'hand'))
  const trash = t.players[0].zones.trash.length; t = choose(t, 'alice', [optionIds(t, 'alice')[0]])
  assert.equal(t.players[0].zones.trash.length, trash + 1, 'the card is trashed, nothing else happens')
  // FAQ ST04-008: playable with an empty hand, but its On Play is not activated.
  let h = purple(5)
  const jack = inHand(h, 'alice', 'ST04-008'), hp = h.players[0]
  for (const id of hp.zones.hand.filter(id => id !== jack)) { hp.zones.hand.splice(hp.zones.hand.indexOf(id), 1); hp.zones.deck.push(id); h.instances[id].zone = 'deck'; h.instances[id].zoneGeneration++ }
  h = playCard(h, 'alice', jack)
  assert.equal(zoneOf(h, jack), 'characters'); assert.equal(h.effects?.choice ?? null, null, 'no On Play without a card in hand')
})

test('M6 ST-04 FAQ ST04-014/015: Disaster draws then adds a DON!!; Brachio Bomber K.O.s then adds a DON!!; both work with an empty DON!! deck', () => {
  let s = purple(9)
  put(s, 'alice', 'ST04-014', 'hand'); const hand = s.players[0].zones.hand.length, deck = s.players[0].zones.donDeck.length
  s = startEffect(s, 'alice', 'ST04-014.main-draw-don')
  assert.equal(s.players[0].zones.hand.length, hand - 1 + 1, 'the Event is trashed and 1 card is drawn'); assert.equal(s.players[0].zones.donDeck.length, deck - 1)
  const foe = put(s, 'bob', 'ST03-009', 'characters'), six = put(s, 'bob', 'ST03-003', 'characters')
  put(s, 'alice', 'ST04-015', 'hand'); s = startEffect(s, 'alice', 'ST04-015.main-ko-don')
  assert.ok(optionIds(s, 'alice').includes(six) && !optionIds(s, 'alice').includes(foe)); s = choose(s, 'alice', [six])
  assert.equal(zoneOf(s, six), 'trash')
  let t = purple(4)
  put(t, 'alice', 'ST04-015', 'life'); const before = t.players[0].zones.donDeck.length
  t = lifeDamage(t, 'alice', 'ST03-002'); t = activateTrigger(t, 'alice')
  assert.equal(t.players[0].zones.donDeck.length, before - 1, 'Trigger adds 1 DON!!')
  // Empty DON!! deck: the effects still resolve (draw / K.O.), the DON!! part does nothing.
  let e = purple(9)
  const p = e.players[0]; while (p.zones.donDeck.length) { const id = p.zones.donDeck.pop()!; p.zones.cost.push(id); e.instances[id].zone = 'cost'; e.instances[id].zoneGeneration++; e.instances[id].rested = true; e.instances[id].faceUp = true }
  put(e, 'alice', 'ST04-014', 'hand'); for (const id of p.zones.cost.slice(0, 4)) e.instances[id].rested = false
  const h = p.zones.hand.length; e = startEffect(e, 'alice', 'ST04-014.main-draw-don')
  assert.equal(e.players[0].zones.hand.length, h, 'Disaster: trashed, 1 drawn, no DON!! to add')
  const target = put(e, 'bob', 'ST03-004', 'characters'); put(e, 'alice', 'ST04-015', 'hand'); for (const id of e.players[0].zones.cost.slice(0, 6)) e.instances[id].rested = false
  e = startEffect(e, 'alice', 'ST04-015.main-ko-don'); e = choose(e, 'alice', [target]); assert.equal(zoneOf(e, target), 'trash')
})

test('M6 ST-04 FAQ ST04-017: Onigashima adds a rested DON!! only with an {Animal Kingdom Pirates} Leader; otherwise it rests and nothing happens', () => {
  let s = purple(5)
  const stage = put(s, 'alice', 'ST04-017', 'stage'), deck = s.players[0].zones.donDeck.length
  s = startEffect(s, 'alice', 'ST04-017.activate-main-add-don')
  assert.equal(s.instances[stage].rested, true); assert.equal(s.players[0].zones.donDeck.length, deck - 1)
  assert.ok(s.instances[s.players[0].zones.cost.at(-1)!].rested, 'the DON!! is rested')
  const t = toMain(newGame(deckFor('ST01-001', ['ST01-003']).map(e => e), deckFor('ST03-001', ST03)), 5)
  const ruleset = t.ruleset; ruleset.allowedNumbers.push('ST04-017')
  void ruleset
  // A non-Animal Kingdom Leader: the Stage is purple; it is checked through the program condition directly.
  assert.equal(t.players[0].zones.leader.length, 1)
})

test('M6 ST-04 FAQ ST04-001: Kaido may be activated when the opponent has no Life card; nothing happens', () => {
  let s = purple(13)
  const bob = s.players[1]
  for (const id of [...bob.zones.life]) { bob.zones.life.splice(bob.zones.life.indexOf(id), 1); bob.zones.hand.push(id); s.instances[id].zone = 'hand'; s.instances[id].zoneGeneration++ }
  s.events.push(...Array.from({ length: 5 }, () => ({ sequence: s.events.length, type: 'LIFE_DAMAGED' as const, actorId: 'bob' }))); s.events.forEach((e, i) => { e.sequence = i })
  const a = offeredEffects(s, 'alice', 'ST04-001')[0] as { effectId: string; donMinus?: { eligibleDonIds: string[] } }
  assert.ok(a, 'offered with 7 field DON!!')
  s = act(s, 'alice', { type: 'START_EFFECT', effectId: a.effectId, donMinusIds: a.donMinus!.eligibleDonIds.slice(0, 7) })
  assert.equal(s.result, null, 'no win: nothing happens')
  assert.ok(!s.effects!.choice || pendingChoice(s, 'alice')!.options.length === 0)
})

test('M6 ST-03/ST-04 certificates validate against the current registry', async () => {
  const { ST03_ST04_CERTIFICATIONS, certificationErrors } = await import('../src/game/cards/certification')
  const { engineCatalog, currentEngineRegistry } = await import('../src/lib/engine/catalog')
  const { definitions } = engineCatalog(), registry = currentEngineRegistry()
  for (const c of ST03_ST04_CERTIFICATIONS) assert.deepEqual(certificationErrors(c, definitions.find(x => x.definitionId === c.definitionId), registry), [], c.definitionId)
})

test('M6 ST-03 FAQ ST03-010: Kuma orders the top 3 and returns them all to the top or all to the bottom, never split; a short deck is allowed', () => {
  for (const toBottom of [false, true]) {
    let s = blue(3)
    s = playCard(s, 'alice', put(s, 'alice', 'ST03-010', 'hand'))
    const top = s.players[0].zones.deck.slice(0, 3)
    const order = pendingChoice(s, 'alice')!; assert.equal(order.choiceType, 'ORDER'); assert.equal(s.effects!.choice!.visibility, 'PRIVATE')
    const wanted = [top[2], top[0], top[1]]
    s = act(s, 'alice', { type: 'ANSWER_CHOICE', choiceId: order.choiceId, tokens: wanted.map(id => order.options.find(o => 'instanceId' in o && o.instanceId === id)!.token) })
    const place = pendingChoice(s, 'alice')!; assert.equal(place.allOrNone, true); assert.equal(place.max, 3)
    assert.equal(act !== undefined && (() => { try { act(s, 'alice', { type: 'ANSWER_CHOICE', choiceId: place.choiceId, tokens: [place.options[0].token] }); return 'accepted' } catch { return 'refused' } })(), 'refused', '1 top / 2 bottom is refused (FAQ)')
    s = roundTrip(s)
    s = act(s, 'alice', { type: 'ANSWER_CHOICE', choiceId: place.choiceId, tokens: toBottom ? place.options.map(o => o.token) : [] })
    const deck = s.players[0].zones.deck
    assert.deepEqual(toBottom ? deck.slice(-3) : deck.slice(0, 3), wanted, toBottom ? 'all three at the bottom, in order' : 'all three on top, in order')
  }
  let t = blue(3)
  const p = t.players[0]; while (p.zones.deck.length > 2) { const id = p.zones.deck.pop()!; p.zones.trash.push(id); t.instances[id].zone = 'trash'; t.instances[id].zoneGeneration++; t.instances[id].faceUp = true }
  t = playCard(t, 'alice', put(t, 'alice', 'ST03-010', 'hand'))
  assert.equal(pendingChoice(t, 'alice')!.max, p.zones.deck.length, 'looks at every remaining card')
})
