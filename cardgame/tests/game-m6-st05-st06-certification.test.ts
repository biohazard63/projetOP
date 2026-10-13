import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateCharacteristics, hasCombatKeyword } from '../src/game/effects/characteristics'
import type { GameState } from '../src/game/core/types'
import { act, attachDon, attack, choose, deckFor, endTurn, finishBattle, inHand, leaderOf, legal, newGame, offeredEffects, optionIds, pendingChoice, playCard, put, roundTrip, startEffect, toMain, zoneOf } from './helpers/m6'

// M6 Lot C — ST-05 and ST-06. Scenarios follow the official text, the ST-05/ST-06 FAQ and the errata
// (docs/game/evidence/m6/sources/), through public commands only.
const ST05 = ['ST05-002', 'ST05-003', 'ST05-004', 'ST05-005', 'ST05-006', 'ST05-007', 'ST05-008', 'ST05-009', 'ST05-010', 'ST05-011', 'ST05-012', 'ST05-013', 'ST05-014', 'ST05-015', 'ST05-016', 'ST05-017']
const ST06 = ['ST06-002', 'ST06-003', 'ST06-004', 'ST06-005', 'ST06-006', 'ST06-007', 'ST06-008', 'ST06-009', 'ST06-010', 'ST06-011', 'ST06-012', 'ST06-013', 'ST06-014', 'ST06-015', 'ST06-016', 'ST06-017']
const film = (turn = 3) => toMain(newGame(deckFor('ST05-001', ST05), deckFor('ST06-001', ST06)), turn)
const navy = (turn = 3) => toMain(newGame(deckFor('ST06-001', ST06), deckFor('ST05-001', ST05)), turn)
const power = (s: GameState, id: string) => evaluateCharacteristics(s, id).power.current
const cost = (s: GameState, id: string) => evaluateCharacteristics(s, id).cost.current
const donMinusStart = (s: GameState, owner: string, abilityId: string): GameState => {
  const a = offeredEffects(s, owner, abilityId)[0] as { effectId: string; donMinus?: { amount: number; eligibleDonIds: string[] } } | undefined
  assert.ok(a?.donMinus, `${abilityId} offered with DON!! -X`)
  return act(s, owner, { type: 'START_EFFECT', effectId: a!.effectId, donMinusIds: a!.donMinus!.eligibleDonIds.slice(0, a!.donMinus!.amount) })
}
const payAll = (s: GameState, owner: string) => { const c = pendingChoice(s, owner)!; assert.equal(c.allOrNone, true); return act(s, owner, { type: 'ANSWER_CHOICE', choiceId: c.choiceId, tokens: c.options.slice(0, c.max).map(o => o.token) }) }
const lifeDamage = (s: GameState, defender: string, attackerNumber: string): GameState => {
  s = attack(s, put(s, s.activePlayerId!, attackerNumber, 'characters'), leaderOf(s, defender))
  s = act(s, defender, { type: 'PASS_BLOCKER', battleId: s.battle!.id }); s = act(s, defender, { type: 'PASS_COUNTER', battleId: s.battle!.id })
  return act(s, s.activePlayerId!, { type: 'RESOLVE_BATTLE', battleId: s.battle!.id })
}
const activateTrigger = (s: GameState, owner: string) => { const t = legal(s, owner).find(a => a.type === 'ANSWER_TRIGGER') as { choiceId: string } | undefined; assert.ok(t); return act(s, owner, { type: 'ANSWER_TRIGGER', choiceId: t!.choiceId, activate: true }) }
const counterEvent = (s: GameState, owner: string, cardId: string): GameState => {
  const a = legal(s, owner).find(x => x.type === 'PLAY_COUNTER_EVENT') as { eventIds: string[]; paymentDonIds: string[]; battleId: string } | undefined
  assert.ok(a?.eventIds.includes(cardId))
  const c = s.catalog.definitions.find(d => d.definitionId === s.instances[cardId].definitionId)!.cost ?? 0
  return act(s, owner, { type: 'PLAY_COUNTER_EVENT', cardId, targetId: null, paymentDonIds: a!.paymentDonIds.slice(0, c), donMinusIds: [], battleId: a!.battleId })
}

test('M6 ST-05 FAQ ST05-001: Shanks DON!! -3 gives +2000 to every own {FILM} Character this turn, never to the Leader', () => {
  let s = film(5)
  const a = put(s, 'alice', 'ST05-007', 'characters'), b = put(s, 'alice', 'ST05-012', 'characters')
  s = donMinusStart(s, 'alice', 'ST05-001.activate-main-film-power')
  assert.equal(power(s, a), 5000); assert.equal(power(s, b), 7000); assert.equal(power(s, leaderOf(s, 'alice')), 5000, 'the Leader is not a Character')
  assert.equal(offeredEffects(s, 'alice', 'ST05-001.activate-main-film-power').length, 0, 'once per turn')
  s = endTurn(s); assert.equal(power(s, a), 3000, 'during this turn only')
})

test('M6 ST-05 Ain adds a rested DON!!; Gild Tesoro pays DON!! -2 on attack to draw 2', () => {
  let s = film(5)
  const deck = s.players[0].zones.donDeck.length
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST05-002'))
  assert.equal(s.players[0].zones.donDeck.length, deck - 1); assert.ok(s.instances[s.players[0].zones.cost.at(-1)!].rested)
  const tesoro = put(s, 'alice', 'ST05-006', 'characters'), hand = s.players[0].zones.hand.length
  s = attack(s, tesoro, leaderOf(s, 'bob')); s = payAll(s, 'alice')
  assert.equal(s.players[0].zones.hand.length, hand + 2)
})

test('M6 ST-05 Uta On Block pays DON!! -1 to rest up to 1 opposing Character with cost 5 or less', () => {
  let s = film(4)
  const uta = put(s, 'alice', 'ST05-004', 'characters'), foe = put(s, 'bob', 'ST06-011', 'characters'), attacker = put(s, 'bob', 'ST06-013', 'characters')
  s = attack(s, attacker, leaderOf(s, 'alice')); s = act(s, 'alice', { type: 'ACTIVATE_BLOCKER', blockerId: uta, battleId: s.battle!.id })
  s = payAll(s, 'alice'); assert.ok(optionIds(s, 'alice').includes(foe)); s = choose(s, 'alice', [foe])
  assert.equal(s.instances[foe].rested, true); roundTrip(s)
})

test('M6 ST-05 FAQ ST05-005: Carina rests and trashes a {FILM} card; with more opposing field DON!! it adds 2 rested DON!! (1 if only 1 is left)', () => {
  let s = film(4)
  assert.equal(s.activePlayerId, 'bob'); s = endTurn(s)
  const carina = put(s, 'alice', 'ST05-005', 'characters')
  const foe = s.players[1]; for (const id of foe.zones.donDeck.splice(0, 4)) { foe.zones.cost.push(id); s.instances[id].zone = 'cost'; s.instances[id].zoneGeneration++; s.instances[id].faceUp = true }
  const deck = s.players[0].zones.donDeck.length
  s = startEffect(s, 'alice', 'ST05-005.activate-main-add-don'); assert.equal(s.instances[carina].rested, true)
  assert.ok(optionIds(s, 'alice').every(id => s.catalog.definitions.find(d => d.definitionId === s.instances[id].definitionId)!.traits.includes('FILM')))
  s = choose(s, 'alice', [optionIds(s, 'alice')[0]])
  assert.equal(s.players[0].zones.donDeck.length, deck - 2, 'two DON!! added, rested')
  // FAQ ST05-005: with a single DON!! left in the DON!! deck, that one is added.
  let t = film(4); t = endTurn(t)
  put(t, 'alice', 'ST05-005', 'characters')
  const tf = t.players[1]; for (const id of tf.zones.donDeck.splice(0, 4)) { tf.zones.cost.push(id); t.instances[id].zone = 'cost'; t.instances[id].zoneGeneration++; t.instances[id].faceUp = true }
  const p = t.players[0]
  while (p.zones.donDeck.length > 1) { const id = p.zones.donDeck.pop()!; p.zones.cost.push(id); t.instances[id].zone = 'cost'; t.instances[id].zoneGeneration++; t.instances[id].rested = true; t.instances[id].faceUp = true }
  const opp = tf.zones.cost.length + tf.zones.attached.length, mine = p.zones.cost.length + p.zones.attached.length
  if (opp > mine) {
    t = startEffect(t, 'alice', 'ST05-005.activate-main-add-don'); t = choose(t, 'alice', [optionIds(t, 'alice')[0]])
    assert.equal(p.zones.donDeck.length, 0, 'the last DON!! is added')
  }
})

test('M6 ST-05 FAQ ST05-008: Shiki cannot be K.O.d in battle with 8 field DON!! (given DON!! included), but can with 7', () => {
  for (const [extra, survives] of [[0, true], [1, false]] as const) {
    let s = film(8)
    assert.equal(s.activePlayerId, 'bob')
    const shiki = put(s, 'alice', 'ST05-008', 'characters'), me = s.players[0]
    while (me.zones.cost.length + me.zones.attached.length < 8) { const id = me.zones.donDeck.shift()!; me.zones.cost.push(id); s.instances[id].zone = 'cost'; s.instances[id].zoneGeneration++; s.instances[id].faceUp = true }
    attachDon(s, 'alice', shiki, 2)
    for (let n = 0; n < extra; n++) { const id = me.zones.cost.pop()!; me.zones.donDeck.push(id); s.instances[id].zone = 'donDeck'; s.instances[id].zoneGeneration++; s.instances[id].faceUp = false; s.instances[id].rested = false }
    s.instances[shiki].rested = true
    const attacker = put(s, 'bob', 'ST06-004', 'characters'); attachDon(s, 'bob', attacker, 1)
    s = attack(s, attacker, shiki); s = finishBattle(s)
    assert.equal(zoneOf(s, shiki), survives ? 'characters' : 'trash', survives ? '8 field DON!!' : '7 field DON!!')
  }
})

test('M6 ST-05 FAQ ST05-010: Zephyr gains +3000 for each battle with a <Strike> Character (twice: +6000); DON!! -1 gives +2000 once per turn', () => {
  let s = film(6)
  const zephyr = put(s, 'alice', 'ST05-010', 'characters', { rested: true })
  const strikeA = put(s, 'bob', 'ST06-009', 'characters'), strikeB = put(s, 'bob', 'ST06-009', 'characters')
  s = attack(s, strikeA, zephyr); s = finishBattle(s)
  assert.equal(power(s, zephyr), 11000, 'first <Strike> battle: +3000')
  s = attack(s, strikeB, zephyr); s = finishBattle(s)
  assert.equal(power(s, zephyr), 14000, 'second <Strike> battle: +6000 total')
  let t = film(6)
  const z2 = put(t, 'alice', 'ST05-010', 'characters', { rested: true }), slash = put(t, 'bob', 'ST06-003', 'characters')
  t = attack(t, slash, z2); t = finishBattle(t); assert.equal(power(t, z2), 8000, 'a <Slash> attacker gives nothing')
  let u = film(7)
  const z3 = put(u, 'alice', 'ST05-010', 'characters')
  u = donMinusStart(u, 'alice', 'ST05-010.activate-main-power'); assert.equal(power(u, z3), 10000)
  assert.equal(offeredEffects(u, 'alice', 'ST05-010.activate-main-power').length, 0)
})

test('M6 ST-05 FAQ ST05-011: Douglas Bullet DON!! -4 rests up to 2 opposing Characters cost 6 or less and gains [Double Attack], even with no target', () => {
  let s = film(7)
  const bullet = put(s, 'alice', 'ST05-011', 'characters'), a = put(s, 'bob', 'ST06-011', 'characters'), b = put(s, 'bob', 'ST06-013', 'characters')
  s = donMinusStart(s, 'alice', 'ST05-011.activate-main-rest-double')
  assert.equal(pendingChoice(s, 'alice')!.max, 2); s = choose(s, 'alice', [a, b])
  assert.ok(s.instances[a].rested && s.instances[b].rested); assert.ok(hasCombatKeyword(s, bullet, 'DOUBLE_ATTACK'))
  let t = film(7)
  const b2 = put(t, 'alice', 'ST05-011', 'characters')
  t = donMinusStart(t, 'alice', 'ST05-011.activate-main-rest-double'); t = choose(t, 'alice', [])
  assert.ok(hasCombatKeyword(t, b2, 'DOUBLE_ATTACK'), 'no opposing Character: still [Double Attack]')
})

test('M6 ST-05 Buena Festa searches a {FILM} card other than [Buena Festa]; Scarlet Trigger plays itself', () => {
  let s = film(3)
  const other = put(s, 'alice', 'ST05-014', 'deckTop'), filmCard = put(s, 'alice', 'ST05-007', 'deckTop')
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST05-014', [other]))
  const options = optionIds(s, 'alice'); assert.ok(options.includes(filmCard)); assert.ok(!options.includes(other), 'not [Buena Festa]')
  let u = film(4)
  const sc = put(u, 'alice', 'ST05-009', 'life')
  u = lifeDamage(u, 'alice', 'ST06-013'); u = activateTrigger(u, 'alice')
  assert.equal(zoneOf(u, sc), 'characters')
})

test('M6 ST-05 Lions Threat pays DON!! -2 to K.O. up to 1 cost 5 or less; its Trigger and Union Armada Trigger add an active DON!!', () => {
  let s = film(7)
  const foe = put(s, 'bob', 'ST06-008', 'characters'), big = put(s, 'bob', 'ST06-011', 'characters')
  put(s, 'alice', 'ST05-016', 'hand'); s = startEffect(s, 'alice', 'ST05-016.main-ko'); s = payAll(s, 'alice')
  assert.ok(optionIds(s, 'alice').includes(foe)); s = choose(s, 'alice', [foe]); assert.equal(zoneOf(s, foe), 'trash')
  void big
  for (const number of ['ST05-016', 'ST05-017']) {
    let t = film(4)
    put(t, 'alice', number, 'life'); const deck = t.players[0].zones.donDeck.length
    t = lifeDamage(t, 'alice', 'ST06-013'); t = activateTrigger(t, 'alice')
    assert.equal(t.players[0].zones.donDeck.length, deck - 1, `${number} Trigger`)
  }
})

test('M6 ST-05 FAQ ST05-017: Union Armada +4000 on a {FILM} card; the chosen Character cannot be K.O.d by effects or in battle this turn', () => {
  let s = film(4)
  const ally = put(s, 'alice', 'ST05-007', 'characters', { rested: true }), attacker = put(s, 'bob', 'ST06-011', 'characters'), armada = put(s, 'alice', 'ST05-017', 'hand')
  s = attack(s, attacker, ally); s = act(s, 'alice', { type: 'PASS_BLOCKER', battleId: s.battle!.id })
  s = counterEvent(s, 'alice', armada); s = choose(s, 'alice', [ally])
  s = act(s, 'alice', { type: 'PASS_COUNTER', battleId: s.battle!.id }); s = act(s, 'bob', { type: 'RESOLVE_BATTLE', battleId: s.battle!.id })
  assert.equal(zoneOf(s, ally), 'characters', '3000 + 4000 vs 6000: survives anyway')
  const second = put(s, 'bob', 'ST06-004', 'characters'); attachDon(s, 'bob', second, 3)
  s = attack(s, second, ally); s = finishBattle(s)
  assert.equal(zoneOf(s, ally), 'characters', 'not K.O.d in battle this turn')
  roundTrip(s)
})

test('M6 ST-04 FAQ ST04-017: Onigashima with a Leader without {Animal Kingdom Pirates} rests and nothing happens', () => {
  let s = toMain(newGame(deckFor('ST05-001', ['ST04-017', ...ST05.slice(0, 14)]), deckFor('ST06-001', ST06)), 5)
  const stage = put(s, 'alice', 'ST04-017', 'stage'), deck = s.players[0].zones.donDeck.length
  s = startEffect(s, 'alice', 'ST04-017.activate-main-add-don')
  assert.equal(s.instances[stage].rested, true, 'activated: the Stage is rested')
  assert.equal(s.players[0].zones.donDeck.length, deck, 'Shanks is not {Animal Kingdom Pirates}: no DON!! added')
})

test('M6 ST-06 Sakazuki and Garp pay their costs in full (FAQ ST06-012) to K.O. a cost-0 / cost-4-or-less Character; Koby needs a card in hand (FAQ ST06-002)', () => {
  let s = navy(7)
  const foe = put(s, 'bob', 'ST05-012', 'characters')
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST06-008')); s = choose(s, 'alice', [foe])
  assert.equal(cost(s, foe), 0, 'Hina: 3 - 4 is 0, never below')
  s = startEffect(s, 'alice', 'ST06-001.activate-main-ko'); s = choose(s, 'alice', [optionIds(s, 'alice')[0]])
  assert.ok(optionIds(s, 'alice').includes(foe)); s = choose(s, 'alice', [foe]); assert.equal(zoneOf(s, foe), 'trash')
  let t = navy(5)
  const garp = put(t, 'alice', 'ST06-012', 'characters'), p = t.players[0]
  while (p.zones.hand.length) { const id = p.zones.hand.pop()!; p.zones.deck.push(id); t.instances[id].zone = 'deck'; t.instances[id].zoneGeneration++ }
  assert.equal(offeredEffects(t, 'alice', 'ST06-012.activate-main-ko').length, 0, 'no card to trash: cannot be activated')
  put(t, 'alice', 'ST06-003', 'hand'); const target = put(t, 'bob', 'ST05-013', 'characters')
  t = startEffect(t, 'alice', 'ST06-012.activate-main-ko'); assert.equal(t.instances[garp].rested, true)
  t = choose(t, 'alice', [optionIds(t, 'alice')[0]]); t = choose(t, 'alice', [target]); assert.equal(zoneOf(t, target), 'trash')
  let k = navy(3)
  const kp = k.players[0], keep = kp.zones.hand.splice(0)
  for (const id of keep) { kp.zones.deck.push(id); k.instances[id].zone = 'deck'; k.instances[id].zoneGeneration++ }
  const koby = put(k, 'alice', 'ST06-002', 'hand'); k = playCard(k, 'alice', koby)
  assert.equal(k.effects?.choice ?? null, null, 'no card in hand: the On Play does not activate')
})

test('M6 ST-06 cost reductions: Sengoku -4 on attack, Tashigi -2, Helmeppo -3, Great Eruption draw then -2 (FAQ order), Navy HQ -1 twice (FAQ)', () => {
  let s = navy(7)
  const a = put(s, 'bob', 'ST05-011', 'characters'), b = put(s, 'bob', 'ST05-010', 'characters')
  const sengoku = put(s, 'alice', 'ST06-005', 'characters')
  s = attack(s, sengoku, leaderOf(s, 'bob')); s = choose(s, 'alice', [a]); s = finishBattle(s)
  assert.equal(cost(s, a), 4, '8 - 4')
  const tashigi = put(s, 'alice', 'ST06-006', 'characters'); void tashigi
  s = startEffect(s, 'alice', 'ST06-006.activate-main-cost'); s = choose(s, 'alice', [a]); assert.equal(cost(s, a), 2)
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST06-010')); s = choose(s, 'alice', [b]); assert.equal(cost(s, b), 4, '7 - 3')
  const hand = s.players[0].zones.hand.length; put(s, 'alice', 'ST06-015', 'hand')
  s = startEffect(s, 'alice', 'ST06-015.main-draw-cost'); assert.equal(s.players[0].zones.hand.length, hand + 1, 'drawn first')
  s = choose(s, 'alice', [b]); assert.equal(cost(s, b), 2)
  s = endTurn(s); assert.equal(cost(s, a), 8, 'during this turn only')
  let t = navy(5)
  const x = put(t, 'bob', 'ST05-012', 'characters'), y = put(t, 'bob', 'ST05-013', 'characters')
  t = playCard(t, 'alice', inHand(t, 'alice', 'ST06-017')); t = choose(t, 'alice', [x])
  t = startEffect(t, 'alice', 'ST06-017.activate-main-cost'); t = choose(t, 'alice', [y])
  assert.equal(cost(t, x), 2); assert.equal(cost(t, y), 3, 'two different Characters (FAQ)')
})

test('M6 ST-06 FAQ ST06-004: Smoker cannot be K.O.d by effects; with a DON!! it has [Double Attack] only while a cost-0 Character exists', () => {
  let s = film(7)
  const smoker = put(s, 'bob', 'ST06-004', 'characters')
  put(s, 'alice', 'ST05-016', 'hand'); s = startEffect(s, 'alice', 'ST05-016.main-ko'); s = payAll(s, 'alice')
  assert.ok(optionIds(s, 'alice').includes(smoker)); s = choose(s, 'alice', [smoker])
  assert.equal(zoneOf(s, smoker), 'characters', 'not K.O.d by an effect')
  let t = navy(5)
  const sm = put(t, 'alice', 'ST06-004', 'characters'); attachDon(t, 'alice', sm, 1)
  assert.ok(!hasCombatKeyword(t, sm, 'DOUBLE_ATTACK'), 'no cost-0 Character')
  const foe = put(t, 'bob', 'ST05-012', 'characters')
  t = playCard(t, 'alice', inHand(t, 'alice', 'ST06-008')); t = choose(t, 'alice', [foe])
  assert.ok(hasCombatKeyword(t, sm, 'DOUBLE_ATTACK'), 'a cost-0 Character exists')
  t.instances[foe].rested = true
  const p = t.players[1]; p.zones.characters.splice(p.zones.characters.indexOf(foe), 1); p.zones.trash.push(foe); t.instances[foe].zone = 'trash'; t.instances[foe].zoneGeneration++; t.instances[foe].rested = false
  assert.ok(!hasCombatKeyword(t, sm, 'DOUBLE_ATTACK'), 'the cost-0 Character left: no [Double Attack] (FAQ)')
})

test('M6 ST-06 Shockwave +4000 then K.O.s an opposing active Character cost 3 or less; its Trigger K.O.s cost 4 or less', () => {
  let s = navy(4)
  const attacker = put(s, 'bob', 'ST05-013', 'characters'), active = put(s, 'bob', 'ST05-012', 'characters'), rested = put(s, 'bob', 'ST05-015', 'characters', { rested: true })
  const wave = put(s, 'alice', 'ST06-014', 'hand')
  s = attack(s, attacker, leaderOf(s, 'alice')); s = act(s, 'alice', { type: 'PASS_BLOCKER', battleId: s.battle!.id })
  s = counterEvent(s, 'alice', wave); s = choose(s, 'alice', [leaderOf(s, 'alice')])
  const options = optionIds(s, 'alice'); assert.ok(options.includes(active)); assert.ok(!options.includes(rested), 'rested excluded'); assert.ok(!options.includes(attacker), 'the attacker is rested')
  s = choose(s, 'alice', [active]); assert.equal(zoneOf(s, active), 'trash')
  let t = navy(4)
  put(t, 'alice', 'ST06-014', 'life'); const four = put(t, 'bob', 'ST05-011', 'characters', { rested: true }), victim = put(t, 'bob', 'ST05-013', 'characters')
  t = lifeDamage(t, 'alice', 'ST05-012'); t = activateTrigger(t, 'alice')
  assert.ok(optionIds(t, 'alice').includes(victim)); assert.ok(!optionIds(t, 'alice').includes(four), 'cost 8')
})

test('M6 ST-06 FAQ ST06-015: Great Eruption Trigger lets the opponent choose and trash 1 card of their hand; nothing with an empty hand', () => {
  let s = navy(4)
  put(s, 'alice', 'ST06-015', 'life')
  s = lifeDamage(s, 'alice', 'ST05-012'); s = activateTrigger(s, 'alice')
  const c = pendingChoice(s, 'bob'); assert.ok(c, 'the opponent (Bob) makes the choice'); assert.equal(pendingChoice(s, 'alice'), undefined)
  const hand = s.players[1].zones.hand.length; s = choose(s, 'bob', [optionIds(s, 'bob')[0]])
  assert.equal(s.players[1].zones.hand.length, hand - 1)
  let t = navy(4)
  put(t, 'alice', 'ST06-015', 'life')
  t = attack(t, put(t, 'bob', 'ST05-012', 'characters'), leaderOf(t, 'alice'))
  const bp = t.players[1]
  while (bp.zones.hand.length) { const id = bp.zones.hand.pop()!; bp.zones.deck.push(id); t.instances[id].zone = 'deck'; t.instances[id].zoneGeneration++ }
  t = act(t, 'alice', { type: 'PASS_BLOCKER', battleId: t.battle!.id }); t = act(t, 'alice', { type: 'PASS_COUNTER', battleId: t.battle!.id })
  t = act(t, 'bob', { type: 'RESOLVE_BATTLE', battleId: t.battle!.id }); t = activateTrigger(t, 'alice')
  assert.equal(t.effects!.choice, null, 'nothing happens')
})

test('M6 ST-06 FAQ ST06-016: White Out +2000; its Trigger draws 1 and protects only the Characters already on the field this turn', () => {
  let s = navy(4)
  const ally = put(s, 'alice', 'ST06-011', 'characters')
  put(s, 'alice', 'ST06-016', 'life')
  s = lifeDamage(s, 'alice', 'ST05-012'); const hand = s.players[0].zones.hand.length; s = activateTrigger(s, 'alice')
  assert.equal(s.players[0].zones.hand.length, hand + 1)
  assert.ok(s.effects!.koImmunities!.some(k => k.subject.instanceId === ally && k.turnId === s.turn), 'the Character on the field is protected')
  let t = navy(4)
  const attacker = put(t, 'bob', 'ST05-013', 'characters'), out = put(t, 'alice', 'ST06-016', 'hand')
  t = attack(t, attacker, leaderOf(t, 'alice')); t = act(t, 'alice', { type: 'PASS_BLOCKER', battleId: t.battle!.id })
  t = counterEvent(t, 'alice', out); t = choose(t, 'alice', [leaderOf(t, 'alice')])
  assert.equal(t.battle!.counterModifiers.reduce((n, m) => n + m.amount, 0), 2000)
})

test('M6 ST-05/ST-06 cards without other ability are played for their printed cost, keep their power and defend with their Counter or [Blocker]', () => {
  for (const [number, make] of [['ST06-003', navy], ['ST06-007', navy], ['ST06-009', navy], ['ST06-011', navy], ['ST06-013', navy], ['ST05-004', film]] as const) {
    let s = make(9)
    const d = s.catalog.definitions.find(x => x.number === number)!, blocker = d.review.effects.some(e => e.kind === 'blocker')
    const played = inHand(s, 'alice', number), held = inHand(s, 'alice', number, [played])
    s = playCard(s, 'alice', played)
    assert.equal(zoneOf(s, played), 'characters'); assert.equal(power(s, played), d.power, `${number} power`)
    s = endTurn(s)
    s = attack(s, put(s, 'bob', number.startsWith('ST06') ? 'ST05-013' : 'ST06-011', 'characters'), leaderOf(s, 'alice'))
    if (blocker) assert.ok((legal(s, 'alice').find(a => a.type === 'ACTIVATE_BLOCKER') as { blockerIds: string[] } | undefined)?.blockerIds.includes(played), `${number} can block`)
    else {
      s = act(s, 'alice', { type: 'PASS_BLOCKER', battleId: s.battle!.id })
      s = act(s, 'alice', { type: 'PLAY_COUNTER_CHARACTER', cardId: held, targetId: leaderOf(s, 'alice'), battleId: s.battle!.id })
      assert.equal(s.battle!.counterModifiers.reduce((n, m) => n + m.amount, 0), d.counter)
    }
  }
})

test('M6 ST-05/ST-06 certificates validate against the current registry; all 34 numbers and ST04-017 are PLAYABLE_VERIFIED', async () => {
  const { ST05_ST06_CERTIFICATIONS, certificationErrors, effectiveStatus } = await import('../src/game/cards/certification')
  const { engineCatalog, currentEngineRegistry } = await import('../src/lib/engine/catalog')
  const { definitions } = engineCatalog(), registry = currentEngineRegistry()
  for (const c of ST05_ST06_CERTIFICATIONS) assert.deepEqual(certificationErrors(c, definitions.find(x => x.definitionId === c.definitionId), registry), [], c.definitionId)
  for (const set of ['ST05', 'ST06']) for (let i = 1; i <= 17; i++) { const n = `${set}-${String(i).padStart(3, '0')}`; assert.equal(effectiveStatus(definitions.find(x => x.number === n)!), 'PLAYABLE_VERIFIED', n) }
  assert.equal(effectiveStatus(definitions.find(x => x.number === 'ST04-017')!), 'PLAYABLE_VERIFIED')
})
