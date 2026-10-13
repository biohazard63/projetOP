import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateCharacteristics } from '../src/game/effects/characteristics'
import type { GameState } from '../src/game/core/types'
import { act, attachDon, attack, choose, deckFor, definitionOf, endTurn, finishBattle, inHand, leaderOf, legal, newGame, optionIds, pendingChoice, playCard, put, roundTrip, startEffect, toMain, zoneOf } from './helpers/m6'

// M6 ST-11 (Uta, green): ST11-001..005. Scenarios follow the official text, the ST-11 FAQ and the errata snapshot
// (docs/game/evidence/m6/sources/qa_st-11.txt, errata-all.json), through public commands only.
const ST11 = ['ST11-002', 'ST11-003', 'ST11-004', 'ST11-005']
const game = (turn = 3, leader = 'ST11-001') => toMain(newGame(deckFor(leader, ST11), deckFor('ST11-001', ST11)), turn)
const zones = (s: GameState, owner: string) => s.players.find(p => p.id === owner)!.zones
const pick = (s: GameState, owner: string, indexes: number[]) => { const c = pendingChoice(s, owner); assert.ok(c, 'pending choice'); return act(s, owner, { type: 'ANSWER_CHOICE', choiceId: c!.choiceId, tokens: indexes.map(i => c!.options[i].token) }) }
const nonFilm = (s: GameState, owner: string) => s.catalog.definitions.find(d => zones(s, owner).deck.some(id => s.instances[id].definitionId === d.definitionId) && !d.traits.includes('FILM'))!.number

test('M6 ST-11 FAQ ST11-001: Leader Uta with a DON reveals the top card, adds a FILM card to hand or else puts it at the bottom', () => {
  let s = game(3)
  const leader = leaderOf(s, 'alice'), film = put(s, 'alice', 'ST11-002', 'deckTop')
  attachDon(s, 'alice', leader, 1)
  s = attack(s, leader, leaderOf(s, 'bob'))
  assert.ok(s.events.some(e => e.type === 'CARD_REVEALED' && e.revealedCard?.definitionId === definitionOf('ST11-002').definitionId))
  s = roundTrip(choose(s, 'alice', [film]))
  assert.equal(zoneOf(s, film), 'hand'); assert.equal(pendingChoice(s, 'alice'), undefined, 'nothing left to place')
  let t = game(3)
  const other = put(t, 'alice', nonFilm(t, 'alice'), 'deckTop'), lead = leaderOf(t, 'alice')
  attachDon(t, 'alice', lead, 1)
  t = attack(t, lead, leaderOf(t, 'bob'))
  assert.equal(pendingChoice(t, 'alice'), undefined, 'no {FILM} card: nothing to choose')
  assert.equal(zones(t, 'alice').deck.at(-1), other, 'placed at the bottom')
})

test('M6 ST-11 Uta blocks; at the end of its turn trashing an Event sets a FILM Character active', () => {
  let s = game(3)
  const uta = put(s, 'alice', 'ST11-002', 'characters', { rested: true }), rested = uta, event = inHand(s, 'alice', 'ST11-003')
  s = act(s, 'alice', { type: 'END_MAIN' })
  assert.ok(optionIds(s, 'alice').includes(event))
  s = choose(s, 'alice', [event])
  s = choose(s, 'alice', [rested])
  assert.equal(zoneOf(s, event), 'trash'); assert.equal(s.instances[rested].rested, false)
  while (s.phase !== 'MAIN') s = act(s, s.activePlayerId!, { type: 'ADVANCE_PHASE' })
  s = attack(s, put(s, 'bob', 'ST11-002', 'characters'), leaderOf(s, 'alice'))
  assert.ok((legal(s, 'alice').find(a => a.type === 'ACTIVATE_BLOCKER') as { blockerIds: string[] } | undefined)?.blockerIds.includes(uta))
})

test('M6 ST-11 Backlight with an Uta Leader rests a cost 5 or less or K.O.s a rested one; with another Leader nothing happens', () => {
  let s = game(5)
  const target = put(s, 'bob', 'ST11-002', 'characters')
  put(s, 'alice', 'ST11-003', 'hand')
  s = pick(startEffect(s, 'alice', 'ST11-003.main-mode'), 'alice', [0])
  s = choose(s, 'alice', [target])
  assert.equal(s.instances[target].rested, true)
  let t = game(5)
  const sleeping = put(t, 'bob', 'ST11-002', 'characters', { rested: true })
  put(t, 'alice', 'ST11-003', 'hand')
  t = pick(startEffect(t, 'alice', 'ST11-003.main-mode'), 'alice', [1])
  t = choose(t, 'alice', [sleeping])
  assert.equal(zoneOf(t, sleeping), 'trash')
  let u = game(5, 'ST02-001')
  const card = put(u, 'alice', 'ST11-003', 'hand')
  u = startEffect(u, 'alice', 'ST11-003.main-mode')
  assert.equal(zoneOf(u, card), 'trash'); assert.equal(pendingChoice(u, 'alice'), undefined)
})

test('M6 FAQ ST11-004: New Genesis with an Uta Leader searches 3 for a FILM card and sets a DON active even when taking none', () => {
  let s = game(5)
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST11-002'))
  const restedDon = zones(s, 'alice').cost.filter(id => s.instances[id].rested).length
  put(s, 'alice', 'ST11-004', 'hand')
  s = startEffect(s, 'alice', 'ST11-004.main-search')
  assert.ok(pendingChoice(s, 'alice'))
  s = choose(s, 'alice', [])
  const order = pendingChoice(s, 'alice')!.options.map(o => ('instanceId' in o ? o.instanceId! : ''))
  s = choose(s, 'alice', order)
  s = pick(s, 'alice', [0])
  assert.equal(zones(s, 'alice').cost.filter(id => s.instances[id].rested).length, restedDon, 'the Event cost rests 1, then 1 DON!! is set active')
  let u = game(5, 'ST02-001')
  const ng = put(u, 'alice', 'ST11-004', 'hand')
  u = startEffect(u, 'alice', 'ST11-004.main-search')
  assert.equal(zoneOf(u, ng), 'trash'); assert.equal(pendingChoice(u, 'alice'), undefined, 'another Leader: nothing')
})

test('M6 ST-11 I am invincible sets the rested Uta Leader active; its Trigger gives +1000 this turn', () => {
  let s = game(5)
  const leader = leaderOf(s, 'alice')
  s = finishBattle(attack(s, leader, leaderOf(s, 'bob')))
  assert.equal(s.instances[leader].rested, true)
  put(s, 'alice', 'ST11-005', 'hand')
  s = startEffect(s, 'alice', 'ST11-005.main-set-active')
  s = choose(s, 'alice', [leader])
  assert.equal(s.instances[leader].rested, false)
  let t = game(3)
  put(t, 'alice', 'ST11-005', 'life')
  t = endTurn(t)
  t = attack(t, leaderOf(t, 'bob'), leaderOf(t, 'alice'))
  t = act(t, 'alice', { type: 'PASS_BLOCKER', battleId: t.battle!.id }); t = act(t, 'alice', { type: 'PASS_COUNTER', battleId: t.battle!.id })
  t = act(t, 'bob', { type: 'RESOLVE_BATTLE', battleId: t.battle!.id })
  const trig = legal(t, 'alice').find(a => a.type === 'ANSWER_TRIGGER') as { choiceId: string }
  t = act(t, 'alice', { type: 'ANSWER_TRIGGER', choiceId: trig.choiceId, activate: true })
  t = choose(t, 'alice', [leaderOf(t, 'alice')])
  assert.equal(evaluateCharacteristics(t, leaderOf(t, 'alice')).power.current, 6000)
})

test('M6 ST-11 certificates validate against the current registry; ST11-001..005 are PLAYABLE_VERIFIED', async () => {
  const { ST11_CERTIFICATIONS, certificationErrors, effectiveStatus } = await import('../src/game/cards/certification')
  const { engineCatalog, currentEngineRegistry } = await import('../src/lib/engine/catalog')
  const { definitions } = engineCatalog(), registry = currentEngineRegistry()
  for (const c of ST11_CERTIFICATIONS) assert.deepEqual(certificationErrors(c, definitions.find(x => x.definitionId === c.definitionId), registry), [], c.definitionId)
  for (let i = 1; i <= 5; i++) { const n = `ST11-00${i}`; assert.equal(effectiveStatus(definitions.find(x => x.number === n)!), 'PLAYABLE_VERIFIED', n) }
})
