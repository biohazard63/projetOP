import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateCharacteristics } from '../src/game/effects/characteristics'
import type { GameState } from '../src/game/core/types'
import { act, attachDon, attack, attackerIds, choose, deckFor, definitionOf, endTurn, inHand, leaderOf, legal, newGame, optionIds, pendingChoice, playCard, put, roundTrip, startEffect, toMain, zoneOf } from './helpers/m6'

// M6 reprints of the audited ST-10 and ST-11 contents (OP01-025, OP02-028..045). Scenarios follow the official text, the
// OP-01/OP-02 FAQ, FAQ P-011 ("no base effect") and the errata snapshot (docs/game/evidence/m6/sources/), through public
// commands only.
const ST11 = ['OP02-028', 'OP02-033', 'OP02-034', 'OP02-035', 'OP02-037', 'OP02-039', 'OP02-040', 'OP02-041', 'OP02-043', 'OP02-045']
const uta = (turn = 5) => toMain(newGame(deckFor('ST11-001', ST11), deckFor('ST11-001', ST11)), turn)
const zones = (s: GameState, owner: string) => s.players.find(p => p.id === owner)!.zones
const power = (s: GameState, id: string) => evaluateCharacteristics(s, id).power.current
const counterEvent = (s: GameState, owner: string, cardId: string, cost: number): GameState => {
  const a = legal(s, owner).find(x => x.type === 'PLAY_COUNTER_EVENT') as { eventIds: string[]; paymentDonIds: string[]; battleId: string } | undefined
  assert.ok(a?.eventIds.includes(cardId), 'Counter Event offered')
  return act(s, owner, { type: 'PLAY_COUNTER_EVENT', cardId, targetId: null, paymentDonIds: a!.paymentDonIds.slice(0, cost), donMinusIds: [], battleId: a!.battleId })
}
const lifeTrigger = (s: GameState, defender: string) => {
  s = attack(s, put(s, s.activePlayerId!, 'OP02-028', 'characters', { playedEarlier: true }), leaderOf(s, defender))
  s = act(s, defender, { type: 'PASS_BLOCKER', battleId: s.battle!.id }); s = act(s, defender, { type: 'PASS_COUNTER', battleId: s.battle!.id })
  s = act(s, s.activePlayerId!, { type: 'RESOLVE_BATTLE', battleId: s.battle!.id })
  const t = legal(s, defender).find(a => a.type === 'ANSWER_TRIGGER') as { choiceId: string } | undefined
  assert.ok(t, 'Trigger offered')
  return act(s, defender, { type: 'ANSWER_TRIGGER', choiceId: t!.choiceId, activate: true })
}

test('M6 OP01-025: Roronoa Zoro has [Rush] and can attack on the turn it is played', () => {
  let s = toMain(newGame(deckFor('ST10-002', ['OP01-025']), deckFor('ST10-002', ['OP01-025'])), 5)
  const zoro = inHand(s, 'alice', 'OP01-025')
  s = playCard(s, 'alice', zoro)
  assert.ok(attackerIds(s, 'alice').includes(zoro))
  s = attack(s, zoro, leaderOf(s, 'bob'))
  assert.equal(s.battle?.attacker.instanceId, zoro)
})

test('M6 OP02-034: Chopper with a DON!! rests up to 1 opposing Character cost 2 or less when attacking; without DON!! nothing', () => {
  let s = uta(3)
  const chopper = put(s, 'alice', 'OP02-034', 'characters', { playedEarlier: true }), small = put(s, 'bob', 'OP02-033', 'characters'), big = put(s, 'bob', 'OP02-028', 'characters')
  attachDon(s, 'alice', chopper, 1)
  s = attack(s, chopper, leaderOf(s, 'bob'))
  assert.deepEqual(optionIds(s, 'alice'), [small], 'cost 2 or less only')
  s = roundTrip(choose(s, 'alice', [small]))
  assert.equal(s.instances[small].rested, true); assert.equal(s.instances[big].rested, false)
  let t = uta(3)
  const plain = put(t, 'alice', 'OP02-034', 'characters', { playedEarlier: true }); put(t, 'bob', 'OP02-033', 'characters')
  t = attack(t, plain, leaderOf(t, 'bob'))
  assert.equal(pendingChoice(t, 'alice'), undefined)
})

test('M6 FAQ OP02-035: Law rests 1 DON!! and returns itself to hand to play up to 1 Character with a cost of exactly 3', () => {
  let s = uta(5)
  const law = put(s, 'alice', 'OP02-035', 'characters', { playedEarlier: true }), three = inHand(s, 'alice', 'OP02-028'), two = inHand(s, 'alice', 'OP02-033')
  const active = zones(s, 'alice').cost.filter(id => !s.instances[id].rested).length
  s = roundTrip(startEffect(s, 'alice', 'OP02-035.activate-main-play'))
  assert.equal(zoneOf(s, law), 'hand', 'the Character returns to its owner hand as a cost')
  assert.equal(zones(s, 'alice').cost.filter(id => !s.instances[id].rested).length, active - 1, '1 DON!! rested')
  assert.ok(optionIds(s, 'alice').includes(three) && !optionIds(s, 'alice').includes(two), 'cost 3 only')
  s = choose(s, 'alice', [three])
  assert.equal(zoneOf(s, three), 'characters')
})

test('M6 OP02-037, OP02-040 and OP02-041: On Play plays a {FILM} or {Straw Hat Crew} Character card of cost 2, 3 or 4 or less from hand', () => {
  for (const [number, max] of [['OP02-037', 2], ['OP02-040', 3], ['OP02-041', 4]] as const) {
    let s = uta(9)
    const played = inHand(s, 'alice', number), cheap = inHand(s, 'alice', 'OP02-033'), mid = inHand(s, 'alice', 'OP02-028'), high = inHand(s, 'alice', 'OP02-043')
    s = playCard(s, 'alice', played)
    const options = optionIds(s, 'alice')
    assert.equal(options.includes(cheap), true, number)
    assert.equal(options.includes(mid), max >= 3, `${number} cost 3`)
    assert.equal(options.includes(high), max >= 4, `${number} cost 4`)
    s = choose(s, 'alice', [cheap])
    assert.equal(zoneOf(s, cheap), 'characters')
  }
  let t = uta(9)
  t = playCard(t, 'alice', inHand(t, 'alice', 'OP02-041')); t = choose(t, 'alice', [])
  t = endTurn(t)
  const luffy = zones(t, 'alice').characters.find(id => t.instances[id].definitionId === definitionOf('OP02-041').definitionId)!
  t = attack(t, put(t, 'bob', 'OP02-028', 'characters', { playedEarlier: true }), leaderOf(t, 'alice'))
  assert.ok((legal(t, 'alice').find(a => a.type === 'ACTIVATE_BLOCKER') as { blockerIds: string[] }).blockerIds.includes(luffy), 'Luffy has [Blocker]')
})

test('M6 FAQ P-011 / OP02-045: Oni Giri gives +6000 this battle then plays a cost 3 or less Character with no base effect; its Trigger rests a cost 5 or less', () => {
  let s = endTurn(uta(5))
  const oni = put(s, 'alice', 'OP02-045', 'hand'), vanilla = inHand(s, 'alice', 'OP02-028'), effect = inHand(s, 'alice', 'OP02-034')
  s = attack(s, put(s, 'bob', 'OP02-043', 'characters', { playedEarlier: true }), leaderOf(s, 'alice'))
  s = act(s, 'alice', { type: 'PASS_BLOCKER', battleId: s.battle!.id })
  s = counterEvent(s, 'alice', oni, 3)
  s = choose(s, 'alice', [leaderOf(s, 'alice')])
  assert.equal(s.battle!.counterModifiers.reduce((n, m) => n + m.amount, 0), 6000)
  assert.ok(optionIds(s, 'alice').includes(vanilla), 'no base effect')
  assert.ok(!optionIds(s, 'alice').includes(effect), 'a Character with an effect is excluded')
  s = choose(s, 'alice', [vanilla])
  assert.equal(zoneOf(s, vanilla), 'characters')
  let t = uta(3)
  put(t, 'alice', 'OP02-045', 'life')
  t = endTurn(t)
  const foe = put(t, 'bob', 'OP02-039', 'characters'), cheap = put(t, 'bob', 'OP02-033', 'characters')
  t = lifeTrigger(t, 'alice')
  assert.ok(!optionIds(t, 'alice').includes(leaderOf(t, 'bob')), 'a Leader has no cost')
  assert.ok(optionIds(t, 'alice').includes(foe), 'cost 5 is allowed (Franky)')
  t = choose(t, 'alice', [cheap])
  assert.equal(t.instances[cheap].rested, true)
})

test('M6 vanilla reprints are played for their printed cost, keep their printed power and counter with their printed value', () => {
  for (const number of ['OP02-028', 'OP02-033', 'OP02-039', 'OP02-043']) {
    let s = uta(9)
    const d = definitionOf(number), played = inHand(s, 'alice', number)
    const before = zones(s, 'alice').cost.filter(id => !s.instances[id].rested).length
    s = playCard(s, 'alice', played)
    assert.equal(zones(s, 'alice').cost.filter(id => !s.instances[id].rested).length, before - d.cost!, `${number} cost`)
    assert.equal(power(s, played), d.power, `${number} power`)
    s = endTurn(s)
    const held = inHand(s, 'alice', number)
    s = attack(s, put(s, 'bob', 'OP02-043', 'characters', { playedEarlier: true }), leaderOf(s, 'alice'))
    s = act(s, 'alice', { type: 'PASS_BLOCKER', battleId: s.battle!.id })
    s = act(s, 'alice', { type: 'PLAY_COUNTER_CHARACTER', cardId: held, targetId: leaderOf(s, 'alice'), battleId: s.battle!.id })
    assert.equal(s.battle!.counterModifiers.reduce((n, m) => n + m.amount, 0), d.counter, `${number} counter`)
  }
})

test('M6 ST-10 and ST-11 reprint certificates validate against the current registry and are PLAYABLE_VERIFIED', async () => {
  const { REPRINT_CERTIFICATIONS, certificationErrors, effectiveStatus } = await import('../src/game/cards/certification')
  const { engineCatalog, currentEngineRegistry } = await import('../src/lib/engine/catalog')
  const { definitions } = engineCatalog(), registry = currentEngineRegistry()
  for (const c of REPRINT_CERTIFICATIONS) assert.deepEqual(certificationErrors(c, definitions.find(x => x.definitionId === c.definitionId), registry), [], c.definitionId)
  for (const n of ['OP01-025', ...ST11]) assert.equal(effectiveStatus(definitions.find(x => x.number === n)!), 'PLAYABLE_VERIFIED', n)
})
