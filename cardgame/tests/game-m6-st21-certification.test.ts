import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateCharacteristics, hasCombatKeyword } from '../src/game/effects/characteristics'
import type { GameState } from '../src/game/core/types'
import { act, attachDon, attack, attackerIds, choose, deckFor, endTurn, finishBattle, inHand, leaderOf, legal, newGame, offeredEffects, optionIds, pendingChoice, playCard, put, roundTrip, startEffect, toMain, zoneOf } from './helpers/m6'

// M6 ST-21 (EX Gear 5), official English texts (series 569021). Scenarios follow the official text, the ST-21 FAQ and the
// errata snapshot (docs/game/evidence/m6/sources/), through public commands only.
const ST21 = Array.from({ length: 16 }, (_, i) => `ST21-${String(i + 2).padStart(3, '0')}`)
const game = (turn = 5) => toMain(newGame(deckFor('ST21-001', ST21), deckFor('ST21-001', ST21)), turn)
const zones = (s: GameState, owner: string) => s.players.find(p => p.id === owner)!.zones
const power = (s: GameState, id: string) => evaluateCharacteristics(s, id).power.current
const field = (s: GameState, owner: string, number: string, rested = false) => put(s, owner, number, 'characters', { playedEarlier: true, rested })
const given = (s: GameState, owner: string, id: string) => zones(s, owner).attached.filter(x => s.instances[x].attachedTo === id).length
const restedDon = (s: GameState, owner: string) => zones(s, owner).cost.filter(id => s.instances[id].rested)
const restSomeDon = (s: GameState, owner: string, n: number) => { for (const id of zones(s, owner).cost.filter(x => !s.instances[x].rested).slice(0, n)) s.instances[id].rested = true }
const blockers = (s: GameState, owner: string) => (legal(s, owner).find(a => a.type === 'ACTIVATE_BLOCKER') as { blockerIds: string[] } | undefined)?.blockerIds ?? []
const lifeTrigger = (s: GameState, defender: string) => {
  s = attack(s, field(s, s.activePlayerId!, 'ST21-008'), leaderOf(s, defender))
  s = act(s, defender, { type: 'PASS_BLOCKER', battleId: s.battle!.id }); s = act(s, defender, { type: 'PASS_COUNTER', battleId: s.battle!.id })
  s = act(s, s.activePlayerId!, { type: 'RESOLVE_BATTLE', battleId: s.battle!.id })
  const t = legal(s, defender).find(a => a.type === 'ANSWER_TRIGGER') as { choiceId: string } | undefined
  assert.ok(t, 'Trigger offered')
  return act(s, defender, { type: 'ANSWER_TRIGGER', choiceId: t!.choiceId, activate: true })
}

test('M6 ST-21 Leader Luffy with a DON!! and Nami give up to 2 rested DON!! to 1 Character (Nami: a {Straw Hat Crew} Leader or Character), once per turn', () => {
  let s = game(7)
  const leader = leaderOf(s, 'alice'), target = field(s, 'alice', 'ST21-013'), nami = field(s, 'alice', 'ST21-009')
  attachDon(s, 'alice', leader, 1); restSomeDon(s, 'alice', 4)
  s = startEffect(s, 'alice', 'ST21-001.activate-main-don')
  assert.ok(!optionIds(s, 'alice').includes(leader), 'Characters only')
  s = roundTrip(choose(choose(s, 'alice', [target]), 'alice', restedDon(s, 'alice').slice(0, 2)))
  assert.equal(given(s, 'alice', target), 2)
  assert.equal(offeredEffects(s, 'alice', 'ST21-001.activate-main-don').length, 0, 'once per turn')
  s = choose(startEffect(s, 'alice', 'ST21-009.activate-main-don'), 'alice', [leader])
  s = choose(s, 'alice', restedDon(s, 'alice').slice(0, 2))
  assert.equal(given(s, 'alice', leader), 3)
  void nami
})

test('M6 ST-21 Usopp with 2 DON!! gains +2000 on the opponent turn; Franky with 2 DON!! gives +1000 to {Straw Hat Crew} Characters of 4000 base power or less', () => {
  let s = game(7)
  const usopp = field(s, 'alice', 'ST21-002'), franky = field(s, 'alice', 'ST21-011'), big = field(s, 'alice', 'ST21-014')
  attachDon(s, 'alice', usopp, 2); attachDon(s, 'alice', franky, 2)
  s = endTurn(s)
  assert.equal(power(s, usopp), 3000 + 2000 + 1000, 'own +2000 and Franky +1000 (base 3000)')
  assert.equal(power(s, franky), 4000 + 1000, 'Franky itself (base 4000)')
  assert.equal(power(s, big), 6000, 'base 6000: no bonus')
})

test('M6 FAQ ST21-003: Sanji selects a {Straw Hat Crew} Character with 6000 power or more; only its attacks this turn cannot be blocked', () => {
  let s = game(7)
  const luffy = field(s, 'alice', 'ST21-008'), small = field(s, 'alice', 'ST21-013'), blocker = field(s, 'bob', 'ST21-007')
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST21-003'))
  assert.ok(optionIds(s, 'alice').includes(luffy) && !optionIds(s, 'alice').includes(small), '6000 power or more')
  s = choose(s, 'alice', [luffy])
  s = attack(s, small, leaderOf(s, 'bob'))
  assert.ok(blockers(s, 'bob').includes(blocker), 'another attacker can be blocked')
  s = finishBattle(s)
  s = attack(s, luffy, leaderOf(s, 'bob'))
  assert.deepEqual(blockers(s, 'bob'), [], 'the selected Character: no [Blocker]')
})

test('M6 ST-21 Jewelry Bonney with 2 DON!! draws 1 when K.O.d; without them nothing', () => {
  let s = endTurn(game(5))
  const bonney = field(s, 'alice', 'ST21-004', true)
  attachDon(s, 'alice', bonney, 2)
  const hand = zones(s, 'alice').hand.length
  s = finishBattle(attack(s, field(s, 'bob', 'ST21-008'), bonney))
  assert.equal(zoneOf(s, bonney), 'trash'); assert.equal(zones(s, 'alice').hand.length, hand + 1)
  let t = endTurn(game(5))
  const b2 = field(t, 'alice', 'ST21-004', true), h2 = zones(t, 'alice').hand.length
  t = finishBattle(attack(t, field(t, 'bob', 'ST21-008'), b2))
  assert.equal(zones(t, 'alice').hand.length, h2)
})

test('M6 ST-21 Nico Robin with 2 DON!! K.O.s a 4000 power or less when attacking; Brook and Luffy give rested DON!! when attacking; Luffy has [Rush]', () => {
  let s = game(7)
  const robin = field(s, 'alice', 'ST21-010'), foe = field(s, 'bob', 'ST21-013'), strong = field(s, 'bob', 'ST21-014')
  attachDon(s, 'alice', robin, 2)
  s = attack(s, robin, leaderOf(s, 'bob'))
  assert.ok(optionIds(s, 'alice').includes(foe) && !optionIds(s, 'alice').includes(strong))
  s = choose(s, 'alice', [foe])
  assert.equal(zoneOf(s, foe), 'trash')
  let t = game(7)
  const brook = field(t, 'alice', 'ST21-012'), leader = leaderOf(t, 'alice')
  restSomeDon(t, 'alice', 3)
  t = choose(attack(t, brook, leaderOf(t, 'bob')), 'alice', [leader])
  t = choose(t, 'alice', restedDon(t, 'alice').slice(0, 2))
  assert.equal(given(t, 'alice', leader), 2)
  let u = game(7)
  const luffy = inHand(u, 'alice', 'ST21-014')
  u = playCard(u, 'alice', luffy)
  assert.ok(attackerIds(u, 'alice').includes(luffy), '[Rush]')
  u = choose(attack(u, luffy, leaderOf(u, 'bob')), 'alice', [luffy])
  u = choose(u, 'alice', restedDon(u, 'alice').slice(0, 1))
  assert.equal(given(u, 'alice', luffy), 1)
})

test('M6 FAQ ST21-015: Roronoa Zoro has [Rush] with 2 DON!!; when K.O.d it plays a red Character of 6000 power or less other than [Roronoa Zoro]', () => {
  let s = game(7)
  const zoro = inHand(s, 'alice', 'ST21-015')
  s = playCard(s, 'alice', zoro)
  assert.ok(!hasCombatKeyword(s, zoro, 'RUSH'))
  attachDon(s, 'alice', zoro, 2)
  assert.ok(attackerIds(s, 'alice').includes(zoro))
  let t = endTurn(game(5))
  const z2 = field(t, 'alice', 'ST21-015', true), other = inHand(t, 'alice', 'ST21-015'), red = inHand(t, 'alice', 'ST21-013')
  t = finishBattle(attack(t, field(t, 'bob', 'ST21-008'), z2))
  assert.ok(optionIds(t, 'alice').includes(red) && !optionIds(t, 'alice').includes(other), 'no other [Roronoa Zoro]')
  t = choose(t, 'alice', [red])
  assert.equal(zoneOf(t, red), 'characters')
})

test('M6 ST-21 Gum-Gum Dawn Whip gives +1000 then stops a 4000 power or less Character from blocking this turn; its Trigger K.O.s a 4000 power or less', () => {
  let s = game(5)
  const leader = leaderOf(s, 'alice'), blocker = field(s, 'bob', 'ST21-007'), other = field(s, 'bob', 'ST21-007')
  put(s, 'alice', 'ST21-016', 'hand')
  s = choose(startEffect(s, 'alice', 'ST21-016.main-power-blocker'), 'alice', [leader])
  s = roundTrip(choose(s, 'alice', [blocker]))
  s = attack(s, leader, leaderOf(s, 'bob'))
  assert.ok(!blockers(s, 'bob').includes(blocker), 'cannot activate [Blocker] this turn')
  assert.ok(blockers(s, 'bob').includes(other), 'the other [Blocker] can')
  let t = game(3)
  put(t, 'alice', 'ST21-016', 'life')
  t = endTurn(t)
  const foe = field(t, 'bob', 'ST21-013')
  t = choose(lifeTrigger(t, 'alice'), 'alice', [foe])
  assert.equal(zoneOf(t, foe), 'trash')
})

test('M6 FAQ ST21-017: Gum-Gum Mole Pistol gives -5000 then, with a Character of 6000 power or more, K.O.s a 2000 power or less (another Character allowed)', () => {
  let s = game(7)
  field(s, 'alice', 'ST21-014')
  const big = field(s, 'bob', 'ST21-014'), small = field(s, 'bob', 'ST21-013')
  put(s, 'alice', 'ST21-017', 'hand')
  s = choose(startEffect(s, 'alice', 'ST21-017.main-power-ko'), 'alice', [big])
  assert.equal(power(s, big), 1000)
  assert.ok(optionIds(s, 'alice').includes(big))
  s = choose(s, 'alice', [big])
  assert.equal(zoneOf(s, big), 'trash')
  let t = game(7)
  const b2 = field(t, 'bob', 'ST21-014')
  put(t, 'alice', 'ST21-017', 'hand')
  t = choose(startEffect(t, 'alice', 'ST21-017.main-power-ko'), 'alice', [b2])
  assert.equal(pendingChoice(t, 'alice'), undefined, 'no Character of 6000 power: no K.O.')
  void small
})

test('M6 ST-21 certificates validate against the current registry; all ST-21 cards are PLAYABLE_VERIFIED', async () => {
  const { ST21_CERTIFICATIONS, certificationErrors, effectiveStatus } = await import('../src/game/cards/certification')
  const { engineCatalog, currentEngineRegistry } = await import('../src/lib/engine/catalog')
  const { definitions } = engineCatalog(), registry = currentEngineRegistry()
  for (const c of ST21_CERTIFICATIONS) assert.deepEqual(certificationErrors(c, definitions.find(x => x.definitionId === c.definitionId), registry), [], c.definitionId)
  for (const n of ['ST21-001', ...ST21]) assert.equal(effectiveStatus(definitions.find(x => x.number === n)!), 'PLAYABLE_VERIFIED', n)
})
