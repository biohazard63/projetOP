import { scopedInput } from './helpers/m6'
import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateCharacteristics } from '../src/game/effects/characteristics'
import type { GameState } from '../src/game/core/types'
import { act, attachDon, attack, attackerIds, choose, deckFor, endTurn, finishBattle, leaderOf, legal, newGame, offeredEffects, optionIds, pendingChoice, playCard, put, roundTrip, startEffect, toMain, zoneOf , inHand } from './helpers/m6'

// M6 Lot A — ST-02 Worst Generation. Each scenario follows the official card text, the ST-01..04 FAQ or the errata
// (docs/game/evidence/m6/sources/) and uses public commands only. Alice: green ST-02 deck; Bob: the same deck.
const ST02 = ['ST02-002', 'ST02-003', 'ST02-004', 'ST02-005', 'ST02-006', 'ST02-007', 'ST02-008', 'ST02-009', 'ST02-010', 'ST02-011', 'ST02-012', 'ST02-013', 'ST02-014', 'ST02-015', 'ST02-016', 'ST02-017']
const game = (turn = 3) => toMain(newGame(deckFor('ST02-001', ST02), deckFor('ST02-001', ST02)), turn)
const power = (s: GameState, id: string) => evaluateCharacteristics(s, id).power.current
const restDon = (s: GameState, owner: string, n: number) => { for (const id of s.players.find(p => p.id === owner)!.zones.cost.filter(id => !s.instances[id].rested).slice(0, n)) s.instances[id].rested = true }
const counterEvent = (s: GameState, owner: string, cardId: string): GameState => {
  const a = legal(s, owner).find(x => x.type === 'PLAY_COUNTER_EVENT') as { eventIds: string[]; paymentDonIds: string[]; battleId: string } | undefined
  assert.ok(a?.eventIds.includes(cardId), 'the [Counter] Event is offered')
  const cost = 1 + (s.catalog.definitions.find(d => d.definitionId === s.instances[cardId].definitionId)!.cost ?? 0) - 1
  return act(s, owner, { type: 'PLAY_COUNTER_EVENT', cardId, targetId: null, paymentDonIds: a!.paymentDonIds.slice(0, cost), donMinusIds: [], battleId: a!.battleId })
}

test('M6 ST-02 FAQ ST02-001: Leader Kid rests 3 DON!!, trashes 1 card and sets itself active to attack again', () => {
  let s = game(5)
  s = attack(s, leaderOf(s, 'alice'), leaderOf(s, 'bob')); s = finishBattle(s)
  assert.equal(s.instances[leaderOf(s, 'alice')].rested, true)
  const handBefore = s.players[0].zones.hand.length
  s = startEffect(s, 'alice', 'ST02-001.activate-main-set-active')
  assert.equal(s.players[0].zones.cost.filter(id => s.instances[id].rested).length, 3, 'cost: ③ rests 3 DON!!')
  const choice = pendingChoice(s, 'alice')!; assert.equal(choice.min, 1)
  s = roundTrip(s)
  s = choose(s, 'alice', [optionIds(s, 'alice')[0]])
  assert.equal(s.players[0].zones.hand.length, handBefore - 1); assert.equal(s.players[0].zones.trash.length, 1)
  assert.equal(s.instances[leaderOf(s, 'alice')].rested, false)
  assert.ok(attackerIds(s, 'alice').includes(leaderOf(s, 'alice')), 'the Leader can attack again')
  assert.equal(offeredEffects(s, 'alice', 'ST02-001.activate-main-set-active').length, 0, 'once per turn')
})

test('M6 ST-02 Leader Kid is not offered without a card in hand or without 3 active DON!!', () => {
  let s = game(5)
  restDon(s, 'alice', 3)
  assert.equal(offeredEffects(s, 'alice', 'ST02-001.activate-main-set-active').length, 0, 'only 2 active DON!!')
  s = game(5)
  const p = s.players[0]; while (p.zones.hand.length) { const id = p.zones.hand.pop()!; p.zones.deck.push(id); s.instances[id].zone = 'deck'; s.instances[id].zoneGeneration++ }
  assert.equal(offeredEffects(s, 'alice', 'ST02-001.activate-main-set-active').length, 0, 'empty hand')
})

test('M6 ST-02 FAQ ST02-003: Urouge gains +2000 with 1 DON!! and 3 Characters including itself, on both turns', () => {
  let s = game()
  const urouge = put(s, 'alice', 'ST02-003', 'characters'), other = put(s, 'alice', 'ST02-002', 'characters')
  attachDon(s, 'alice', urouge, 1)
  assert.equal(power(s, urouge), 4000, '2 Characters: only the DON!! +1000')
  put(s, 'alice', 'ST02-011', 'characters')
  assert.equal(power(s, urouge), 6000, '3 Characters (Urouge counted): +2000')
  s = endTurn(s)
  assert.equal(power(s, urouge), 5000, 'opponent turn: +2000 still applies (no DON!! bonus)')
  void other
})

test('M6 ST-02 Killer On Play K.O.s up to 1 opposing rested Character with cost 3 or less, and may choose none', () => {
  let s = game()
  const restedCheap = put(s, 'bob', 'ST02-002', 'characters', { rested: true }), active = put(s, 'bob', 'ST02-011', 'characters'), restedBig = put(s, 'bob', 'ST02-006', 'characters', { rested: true })
  s = playCard(s, 'alice', put(s, 'alice', 'ST02-005', 'hand'))
  assert.deepEqual(optionIds(s, 'alice'), [restedCheap], 'active and cost-4 Characters are not eligible')
  s = roundTrip(s); s = choose(s, 'alice', [restedCheap])
  assert.equal(zoneOf(s, restedCheap), 'trash'); assert.equal(zoneOf(s, active), 'characters'); assert.equal(zoneOf(s, restedBig), 'characters')
  let t = game(); put(t, 'bob', 'ST02-002', 'characters', { rested: true })
  t = playCard(t, 'alice', put(t, 'alice', 'ST02-005', 'hand')); t = choose(t, 'alice', [])
  assert.equal(t.players[1].zones.characters.length, 1)
})

test('M6 ST-02 Killer Trigger plays the revealed Life card', () => {
  let s = game()
  const killer = put(s, 'bob', 'ST02-005', 'life')
  s = attack(s, put(s, 'alice', 'ST02-006', 'characters'), leaderOf(s, 'bob'))
  s = act(s, 'bob', { type: 'PASS_BLOCKER', battleId: s.battle!.id }); s = act(s, 'bob', { type: 'PASS_COUNTER', battleId: s.battle!.id })
  s = act(s, 'alice', { type: 'RESOLVE_BATTLE', battleId: s.battle!.id })
  const t = legal(s, 'bob').find(a => a.type === 'ANSWER_TRIGGER') as { choiceId: string }
  s = act(s, 'bob', { type: 'ANSWER_TRIGGER', choiceId: t.choiceId, activate: true })
  assert.equal(zoneOf(s, killer), 'characters')
})

test('M6 ST-02 FAQ ST02-007: Bonney can search on the turn played; without {Supernovas} all 5 go to the bottom', () => {
  let s = game()
  const bonney = put(s, 'alice', 'ST02-007', 'characters', { playedEarlier: false })
  const nova = put(s, 'alice', 'ST02-011', 'deckTop'), killer = put(s, 'alice', 'ST02-005', 'deckTop')
  s = startEffect(s, 'alice', 'ST02-007.activate-main-search')
  assert.equal(s.instances[bonney].rested, true, 'cost: rest this Character')
  const options = optionIds(s, 'alice')
  assert.ok(options.includes(killer), 'the {Supernovas} card (Killer) is selectable')
  assert.ok(!options.includes(nova), '{Kid Pirates} Heat is not')
  assert.equal(pendingChoice(s, 'alice')!.max, 1, 'up to 1')
  s = choose(s, 'alice', [killer])
  const order = pendingChoice(s, 'alice')!; s = act(s, 'alice', { type: 'ANSWER_CHOICE', choiceId: order.choiceId, tokens: order.options.map(o => o.token) })
  assert.equal(zoneOf(s, killer), 'hand')
  // No {Supernovas} card among the top 5: nothing is selectable and every card is placed at the bottom.
  let t = game()
  put(t, 'alice', 'ST02-007', 'characters')
  const p = t.players[0], plain = p.zones.deck.filter(id => !t.catalog.definitions.find(d => d.definitionId === t.instances[id].definitionId)!.traits.includes('Supernovas')).slice(0, 5)
  assert.equal(plain.length, 5)
  p.zones.deck = [...plain, ...p.zones.deck.filter(id => !plain.includes(id))]
  t = startEffect(t, 'alice', 'ST02-007.activate-main-search')
  assert.equal(optionIds(t, 'alice').length, 0); roundTrip(t)
})

test('M6 ST-02 FAQ ST02-008: Apoo rests only an active DON!! of the opponent cost area', () => {
  let s = game(5)
  const apoo = put(s, 'alice', 'ST02-008', 'characters'); attachDon(s, 'alice', apoo, 1)
  const bobCost = s.players[1].zones.cost
  s.instances[bobCost[0]].rested = true
  const target = put(s, 'bob', 'ST02-002', 'characters'); attachDon(s, 'bob', target, 1)
  s = attack(s, apoo, leaderOf(s, 'bob'))
  const options = optionIds(s, 'alice')
  assert.ok(!options.includes(bobCost[0]), 'an already rested DON!! is excluded')
  assert.ok(!options.includes(s.players[1].zones.attached[0]), 'a DON!! given to a Character is excluded')
  assert.ok(options.length > 0 && options.every(id => s.instances[id].zone === 'cost' && !s.instances[id].rested && s.instances[id].owner === 'bob'))
  s = choose(s, 'alice', [options[0]]); assert.equal(s.instances[options[0]].rested, true)
})

test('M6 ST-02 FAQ ST02-009: Law sets a rested {Supernovas}/{Heart Pirates} Character active (never the Leader), which may attack again', () => {
  let s = game(5)
  const bonney = put(s, 'alice', 'ST02-007', 'characters'), bepo = put(s, 'alice', 'ST02-012', 'characters'), heat = put(s, 'alice', 'ST02-011', 'characters')
  s = attack(s, bonney, leaderOf(s, 'bob')); s = finishBattle(s)
  s.instances[bepo].rested = true; s.instances[heat].rested = true; s.instances[leaderOf(s, 'alice')].rested = true
  s = playCard(s, 'alice', put(s, 'alice', 'ST02-009', 'hand'))
  const options = optionIds(s, 'alice')
  assert.ok(options.includes(bonney) && options.includes(bepo), '{Supernovas} Bonney and {Heart Pirates} Bepo')
  assert.ok(!options.includes(heat), '{Kid Pirates} only'); assert.ok(!options.includes(leaderOf(s, 'alice')), 'not the Leader')
  s = choose(s, 'alice', [bonney])
  assert.equal(s.instances[bonney].rested, false); assert.ok(attackerIds(s, 'alice').includes(bonney))
})

test('M6 ST-02 FAQ ST02-010: Hawkins becomes active after battling a Character (also through a Blocker), once per turn, not after a Leader battle', () => {
  let s = game(5)
  const hawkins = put(s, 'alice', 'ST02-010', 'characters'); attachDon(s, 'alice', hawkins, 1)
  const foe = put(s, 'bob', 'ST02-002', 'characters', { rested: true })
  s = attack(s, hawkins, foe); s = finishBattle(s)
  assert.equal(s.instances[hawkins].rested, false, 'active again at the end of the battle')
  s = roundTrip(s)
  const foe2 = put(s, 'bob', 'ST02-011', 'characters', { rested: true })
  s = attack(s, hawkins, foe2); s = finishBattle(s)
  assert.equal(s.instances[hawkins].rested, true, 'once per turn')
  let t = game(5)
  const h2 = put(t, 'alice', 'ST02-010', 'characters'); attachDon(t, 'alice', h2, 1)
  t = attack(t, h2, leaderOf(t, 'bob')); t = finishBattle(t)
  assert.equal(t.instances[h2].rested, true, 'battling the Leader does not count')
  let u = game(5)
  const h3 = put(u, 'alice', 'ST02-010', 'characters'); attachDon(u, 'alice', h3, 1)
  const blocker = put(u, 'bob', 'ST02-004', 'characters')
  u = attack(u, h3, leaderOf(u, 'bob')); u = finishBattle(u, { block: blocker })
  assert.equal(u.instances[h3].rested, false, 'the Blocker Character was battled (FAQ)')
})

test('M6 ST-02 FAQ ST02-013: Kid with a DON!! is set active at the end of the turn; without DON!! it stays rested', () => {
  let s = game(7)
  const kid = put(s, 'alice', 'ST02-013', 'characters'), other = put(s, 'alice', 'ST02-013', 'characters')
  attachDon(s, 'alice', kid, 1)
  s = attack(s, kid, leaderOf(s, 'bob')); s = finishBattle(s)
  s = attack(s, other, leaderOf(s, 'bob')); s = finishBattle(s)
  s = act(s, 'alice', { type: 'END_MAIN' })
  assert.equal(s.instances[kid].rested, false, 'End of Your Turn: set active')
  assert.equal(s.instances[other].rested, true, 'no DON!!: no effect')
  roundTrip(s)
})

test('M6 ST-02 FAQ ST02-014: rested X.Drake with 1 DON!! gives +1000 once to {Supernovas}/{Navy} cards on your turn only', () => {
  let s = game(5)
  const drake = put(s, 'alice', 'ST02-014', 'characters'), koby = put(s, 'alice', 'ST02-006', 'characters'), heat = put(s, 'alice', 'ST02-011', 'characters'), leader = leaderOf(s, 'alice')
  attachDon(s, 'alice', drake, 1)
  assert.equal(power(s, koby), 6000, 'Drake active: no aura')
  s = attack(s, drake, leaderOf(s, 'bob')); s = finishBattle(s)
  assert.equal(power(s, koby), 7000, '{Navy} Koby +1000'); assert.equal(power(s, heat), 4000, '{Kid Pirates} Heat unchanged')
  assert.equal(power(s, leader), 6000, '{Supernovas} Leader +1000')
  assert.equal(power(s, drake), 5000 + 1000 + 1000, 'Drake (Navy and Supernovas) +1000 once, plus its DON!!')
  s = endTurn(s)
  assert.equal(power(s, koby), 6000, 'opponent turn: no aura')
})

test('M6 ST-02 FAQ ST02-015/016: Scalpel and Repel give power then may set 0 or 1 DON!! active; Scalpel Trigger sets up to 2', () => {
  for (const [number, bonus] of [['ST02-015', 2000], ['ST02-016', 4000]] as const) {
    let s = game(4)
    assert.equal(s.activePlayerId, 'bob')
    const attacker = put(s, 'bob', 'ST02-006', 'characters'), event = put(s, 'alice', number, 'hand'), leader = leaderOf(s, 'alice')
    restDon(s, 'alice', 1)
    s = attack(s, attacker, leader); s = act(s, 'alice', { type: 'PASS_BLOCKER', battleId: s.battle!.id })
    s = counterEvent(s, 'alice', event)
    s = choose(s, 'alice', [leader])
    assert.equal(s.battle!.counterModifiers.filter(m => m.target.instanceId === leader).reduce((n, m) => n + m.amount, 0), bonus, `+${bonus} during this battle`)
    const dons = optionIds(s, 'alice'); assert.ok(dons.length >= 1 && dons.every(id => s.instances[id].rested && s.instances[id].zone === 'cost'))
    s = choose(s, 'alice', [])
    assert.equal(s.effects!.choice, null, 'choosing 0 DON!! is allowed (FAQ)')
  }
  let s = game(4)
  const attacker = put(s, 'bob', 'ST02-006', 'characters'); put(s, 'alice', 'ST02-015', 'life'); restDon(s, 'alice', 3)
  s = attack(s, attacker, leaderOf(s, 'alice'))
  s = act(s, 'alice', { type: 'PASS_BLOCKER', battleId: s.battle!.id }); s = act(s, 'alice', { type: 'PASS_COUNTER', battleId: s.battle!.id })
  s = act(s, 'bob', { type: 'RESOLVE_BATTLE', battleId: s.battle!.id })
  const t = legal(s, 'alice').find(a => a.type === 'ANSWER_TRIGGER') as { choiceId: string }
  s = act(s, 'alice', { type: 'ANSWER_TRIGGER', choiceId: t.choiceId, activate: true })
  const c = pendingChoice(s, 'alice')!; assert.equal(c.max, 2)
  const pick = optionIds(s, 'alice').slice(0, 2); s = choose(s, 'alice', pick)
  assert.ok(pick.every(id => !s.instances[id].rested))
})

test('M6 ST-02 FAQ ST02-017: Straw Sword rests up to 1 opposing Character (a rested one: nothing); its Trigger plays only a {Supernovas} Character/Stage of cost 2 or less', () => {
  let s = game()
  const restedFoe = put(s, 'bob', 'ST02-002', 'characters', { rested: true }), activeFoe = put(s, 'bob', 'ST02-011', 'characters')
  put(s, 'alice', 'ST02-017', 'hand'); s = startEffect(s, 'alice', 'ST02-017.main-rest')
  assert.ok(optionIds(s, 'alice').includes(restedFoe), 'a rested Character may be chosen')
  s = choose(s, 'alice', [activeFoe]); assert.equal(s.instances[activeFoe].rested, true)
  let t = game(4)
  const attacker = put(t, 'bob', 'ST02-006', 'characters'); put(t, 'alice', 'ST02-017', 'life')
  const urouge = put(t, 'alice', 'ST02-003', 'hand'), scalpel = put(t, 'alice', 'ST02-015', 'hand'), kid = put(t, 'alice', 'ST02-013', 'hand')
  t = attack(t, attacker, leaderOf(t, 'alice'))
  t = act(t, 'alice', { type: 'PASS_BLOCKER', battleId: t.battle!.id }); t = act(t, 'alice', { type: 'PASS_COUNTER', battleId: t.battle!.id })
  t = act(t, 'bob', { type: 'RESOLVE_BATTLE', battleId: t.battle!.id })
  const trig = legal(t, 'alice').find(a => a.type === 'ANSWER_TRIGGER') as { choiceId: string }
  t = act(t, 'alice', { type: 'ANSWER_TRIGGER', choiceId: trig.choiceId, activate: true })
  const options = optionIds(t, 'alice')
  assert.ok(options.includes(urouge)); assert.ok(!options.includes(scalpel), 'an Event cannot be played'); assert.ok(!options.includes(kid), 'cost 7')
  t = choose(t, 'alice', [urouge]); assert.equal(zoneOf(t, urouge), 'characters')
  roundTrip(t)
})

test('M6 ST-02 cards without other ability are played for their printed cost, keep their power and defend with their Counter or [Blocker]', () => {
  for (const number of ['ST02-002', 'ST02-004', 'ST02-006', 'ST02-011', 'ST02-012', 'ST02-013']) {
    let s = game(7)
    const d = s.catalog.definitions.find(x => x.number === number)!, blocker = d.review.effects.some(e => e.kind === 'blocker')
    const played = inHand(s, 'alice', number), held = inHand(s, 'alice', number, [played])
    const action = legal(s, 'alice').find(a => a.type === 'PLAY_CARD' && a.instanceId === played) as { cost: number } | undefined
    assert.equal(action?.cost, d.cost, `${number} costs ${d.cost}`)
    s = playCard(s, 'alice', played)
    assert.equal(zoneOf(s, played), 'characters'); assert.equal(power(s, played), d.power, `${number} power`)
    s = endTurn(s)
    s = attack(s, put(s, 'bob', 'ST02-006', 'characters'), leaderOf(s, 'alice'))
    if (blocker) {
      assert.ok((legal(s, 'alice').find(a => a.type === 'ACTIVATE_BLOCKER') as { blockerIds: string[] } | undefined)?.blockerIds.includes(played), `${number} can block`)
      s = act(s, 'alice', { type: 'ACTIVATE_BLOCKER', blockerId: played, battleId: s.battle!.id })
      assert.equal(s.battle!.target.instanceId, played); assert.equal(s.instances[played].rested, true)
    } else {
      s = act(s, 'alice', { type: 'PASS_BLOCKER', battleId: s.battle!.id })
      s = act(s, 'alice', { type: 'PLAY_COUNTER_CHARACTER', cardId: held, targetId: leaderOf(s, 'alice'), battleId: s.battle!.id })
      assert.equal(s.battle!.counterModifiers.reduce((n, m) => n + m.amount, 0), d.counter, `${number} Counter +${d.counter}`)
    }
  }
})

test('M6 ST-02 deck: the exact Starter Deck is legal, offered in /play and full bot games end with a winner, legal commands only', async () => {
  const { REFERENCE_DECKS, deckEligibility } = await import('../src/lib/engine/decks')
  const { playMatch } = await import('../src/lib/engine/strategy')
  const { engineCatalog, currentEngineRegistry, engineRuleset } = await import('../src/lib/engine/catalog')
  const deck = REFERENCE_DECKS.find(d => d.id === 'starter-st02')
  assert.ok(deck, 'the certified ST-02 Starter Deck is listed in /play')
  assert.equal(deck!.entries.reduce((n, e) => n + e.quantity, 0), 51)
  assert.deepEqual(deckEligibility(deck!.entries), { ok: true, errors: [] })
  const purple = REFERENCE_DECKS.find(d => d.id === 'reference-purple')!, { definitions, printings } = engineCatalog()
  for (const [seed, level] of [[5, 'easy'], [13, 'normal'], [21, 'hard'], [29, 'hard']] as const) {
    const r = playMatch(scopedInput({ definitions, printings, gameId: 'st02-bots', seed, scope: 'BASIC_TURNS', chooserId: 'p1', ruleset: engineRuleset(), effectRegistry: currentEngineRegistry(),
      players: [{ id: 'p1', cards: structuredClone(deck!.entries), donCount: 10 }, { id: 'p2', cards: structuredClone(purple.entries), donCount: 10 }] }), { p1: level, p2: level })
    assert.ok(r.winner, `seed ${seed}: a winner`); assert.equal(r.fallbacks, 0, `seed ${seed}: no fallback`); assert.equal(r.refused, 0)
  }
})

test('M6 ST-02 certificates: all 17 numbers are PLAYABLE_VERIFIED and each certificate validates against the current registry', async () => {
  const { ST02_CERTIFICATIONS, certificationErrors, effectiveStatus } = await import('../src/game/cards/certification')
  const { engineCatalog, currentEngineRegistry } = await import('../src/lib/engine/catalog')
  const { definitions } = engineCatalog(), registry = currentEngineRegistry()
  for (const c of ST02_CERTIFICATIONS) assert.deepEqual(certificationErrors(c, definitions.find(d => d.definitionId === c.definitionId), registry), [], c.definitionId)
  for (let i = 1; i <= 17; i++) { const n = `ST02-${String(i).padStart(3, '0')}`; assert.equal(effectiveStatus(definitions.find(d => d.number === n)!), 'PLAYABLE_VERIFIED', n) }
})
