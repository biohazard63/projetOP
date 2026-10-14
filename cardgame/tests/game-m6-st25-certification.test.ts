import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateCharacteristics, hasBlockerAbility } from '../src/game/effects/characteristics'
import type { GameState } from '../src/game/core/types'
import { act, attachDon, attack, attackerIds, choose, deckFor, definitionOf, endTurn, finishBattle, inHand, leaderOf, legal, newGame, offeredEffects, optionIds, pendingChoice, playCard, put, roundTrip, startEffect, toMain, zoneOf } from './helpers/m6'

// M6 ST-25 (BLUE Buggy), official English texts (series 569025). Scenarios follow the official text, the ST-23-28 FAQ (ST25-003),
// the OP-09 and promotion FAQ and the errata snapshot (docs/game/evidence/m6/sources/), through public commands only.
const ST25 = ['ST25-001', 'ST25-002', 'ST25-003', 'ST25-004', 'ST25-005', 'OP09-043', 'OP09-045', 'OP09-051', 'OP09-053', 'OP09-054', 'OP09-055', 'OP09-056', 'P-084', 'OP09-057']
const game = (turn = 5, extra: string[] = []) => toMain(newGame(deckFor('OP09-042', [...ST25, ...extra]), deckFor('OP09-042', ST25)), turn)
const zones = (s: GameState, owner: string) => s.players.find(p => p.id === owner)!.zones
const cost = (s: GameState, id: string) => evaluateCharacteristics(s, id).cost.current
const power = (s: GameState, id: string) => evaluateCharacteristics(s, id).power.current
const field = (s: GameState, owner: string, number: string, rested = false) => put(s, owner, number, 'characters', { playedEarlier: true, rested })
const handIds = (s: GameState, owner: string, n: number, exclude: string[] = []) => zones(s, owner).hand.filter(id => !exclude.includes(id)).slice(0, n)
const lifeTrigger = (s: GameState, defender: string) => {
  s = attack(s, field(s, s.activePlayerId!, 'OP09-055'), leaderOf(s, defender))
  s = act(s, defender, { type: 'PASS_BLOCKER', battleId: s.battle!.id }); s = act(s, defender, { type: 'PASS_COUNTER', battleId: s.battle!.id })
  s = act(s, s.activePlayerId!, { type: 'RESOLVE_BATTLE', battleId: s.battle!.id })
  const t = legal(s, defender).find(a => a.type === 'ANSWER_TRIGGER') as { choiceId: string } | undefined
  assert.ok(t, 'Trigger offered')
  return act(s, defender, { type: 'ANSWER_TRIGGER', choiceId: t!.choiceId, activate: true })
}

test('M6 ST-25 Leader Buggy rests 5 DON!! and trashes 1 card to play any {Cross Guild} Character card from hand', () => {
  let s = game(5)
  const big = inHand(s, 'alice', 'OP09-051'), discard = handIds(s, 'alice', 1, [big])[0]
  s = startEffect(s, 'alice', 'OP09-042.activate-main-play')
  s = choose(s, 'alice', zones(s, 'alice').cost.slice(0, 5))
  assert.equal(zones(s, 'alice').cost.filter(id => s.instances[id].rested).length, 5)
  s = choose(s, 'alice', [discard])
  assert.equal(zoneOf(s, discard), 'trash')
  s = roundTrip(choose(s, 'alice', [big]))
  assert.equal(zoneOf(s, big), 'characters', 'a cost 10 Character played for the 5 rested DON!!')
  let t = game(5)
  t = choose(startEffect(t, 'alice', 'OP09-042.activate-main-play'), 'alice', [])
  assert.equal(pendingChoice(t, 'alice'), undefined); assert.equal(zones(t, 'alice').cost.filter(id => t.instances[id].rested).length, 0, 'declined: nothing rested')
})

test('M6 ST-25 Alvida, Cabaji and Mohji gain +1 cost with 2 Characters of base cost 5 or more; Cabaji and Mohji also gain [Blocker]; Cabaji has +5000 on the opponent turn', () => {
  let s = game(7)
  const cabaji = field(s, 'alice', 'ST25-002'), mohji = field(s, 'alice', 'ST25-005'), alvida = field(s, 'alice', 'ST25-001')
  assert.equal(cost(s, cabaji), 4); assert.equal(hasBlockerAbility(s, cabaji), false); assert.equal(hasBlockerAbility(s, mohji), false)
  field(s, 'alice', 'OP09-043'); field(s, 'alice', 'OP09-045')
  assert.equal(cost(s, cabaji), 5); assert.equal(cost(s, mohji), 5); assert.equal(cost(s, alvida), 5)
  assert.equal(hasBlockerAbility(s, cabaji), true); assert.equal(hasBlockerAbility(s, mohji), true)
  assert.equal(power(s, cabaji), 1000)
  s = endTurn(s)
  assert.equal(power(s, cabaji), 6000, 'opponent turn: +5000')
})

test('M6 ST-25 Alvida with a Buggy Leader draws 3 then trashes 2 on play', () => {
  let s = game(5)
  const alvida = inHand(s, 'alice', 'ST25-001'), hand = zones(s, 'alice').hand.length
  s = playCard(s, 'alice', alvida)
  assert.equal(zones(s, 'alice').hand.length, hand - 1 + 3)
  s = choose(s, 'alice', handIds(s, 'alice', 2))
  assert.equal(zones(s, 'alice').hand.length, hand - 1 + 1)
})

test('M6 ST-25 Crocodile & Mihawk draws 2, trashes 1, then plays a {Cross Guild} Character cost 4 or less', () => {
  let s = game(9)
  const croc = inHand(s, 'alice', 'ST25-003'), cabaji = inHand(s, 'alice', 'ST25-002')
  s = playCard(s, 'alice', croc)
  s = choose(s, 'alice', handIds(s, 'alice', 1, [cabaji]))
  assert.ok(!optionIds(s, 'alice').includes(inHand(s, 'alice', 'OP09-051')), 'cost 10')
  s = choose(s, 'alice', [cabaji])
  assert.equal(zoneOf(s, cabaji), 'characters')
})

test('M6 ST-25 Crocodile & Mihawk: a {Cross Guild} Character removed by an opponent effect may stay by trashing 1 hand card, once per turn', () => {
  let s = endTurn(game(9))
  field(s, 'alice', 'ST25-003')
  const target = field(s, 'alice', 'OP09-055'), card = zones(s, 'alice').hand[0]
  s = playCard(s, 'bob', inHand(s, 'bob', 'OP09-051'))
  s = choose(s, 'bob', [target])
  assert.ok(pendingChoice(s, 'alice'), 'the owner chooses the replacement')
  s = roundTrip(choose(s, 'alice', [card]))
  assert.equal(zoneOf(s, target), 'characters'); assert.equal(zoneOf(s, card), 'trash')
  assert.ok(Object.keys(s.effects!.usage).some(k => k.includes('ST25-003.guard-cross-guild')), 'once per turn used')
  let t = endTurn(game(9))
  field(t, 'alice', 'ST25-003')
  const t2 = field(t, 'alice', 'OP09-055')
  t = playCard(t, 'bob', inHand(t, 'bob', 'OP09-051'))
  t = choose(choose(t, 'bob', [t2]), 'alice', [])
  assert.equal(zones(t, 'alice').deck.at(-1), t2, 'declined: placed at the bottom of the deck')
})

test('M6 FAQ ST25-003: when several {Cross Guild} Characters are K.O.d at the same time, trashing 1 card protects all of them', () => {
  let s = toMain(newGame(deckFor('OP09-042', ST25), deckFor('ST08-001', ['ST08-005'])), 10)
  field(s, 'alice', 'ST25-003')
  const a = field(s, 'alice', 'OP09-056'), b = field(s, 'alice', 'OP09-056'), card = zones(s, 'alice').hand[0]
  s = playCard(s, 'bob', inHand(s, 'bob', 'ST08-005'))
  s = choose(s, 'bob', zones(s, 'bob').hand.slice(0, 1))
  s = choose(s, 'alice', [card])
  assert.equal(pendingChoice(s, 'alice'), undefined, 'no second payment')
  assert.equal(zoneOf(s, a), 'characters'); assert.equal(zoneOf(s, b), 'characters'); assert.equal(zoneOf(s, card), 'trash')
})

test('M6 ST-25 Buggy trashes 1 card and itself to play a {Cross Guild} Character cost 6 or less with a Buggy Leader', () => {
  let s = game(7)
  const buggy = field(s, 'alice', 'ST25-004'), seven = inHand(s, 'alice', 'P-084'), p084 = inHand(s, 'alice', 'OP09-043'), card = handIds(s, 'alice', 1, [p084, seven])[0]
  s = startEffect(s, 'alice', 'ST25-004.activate-main-play')
  s = choose(s, 'alice', [card])
  assert.equal(zoneOf(s, buggy), 'trash')
  assert.ok(!optionIds(s, 'alice').includes(seven), 'cost 7')
  s = roundTrip(choose(s, 'alice', [p084]))
  assert.equal(zoneOf(s, p084), 'characters')
})

test('M6 ST-25 Mohji draws 1 when K.O.d with a Buggy Leader and 3 or less cards in hand; Alvida OP09-043 plays a cost 5 or less other than Alvida', () => {
  let s = endTurn(game(5))
  const mohji = field(s, 'alice', 'ST25-005', true)
  while (zones(s, 'alice').hand.length > 3) { const id = zones(s, 'alice').hand.pop()!; zones(s, 'alice').trash.push(id); s.instances[id].zone = 'trash'; s.instances[id].zoneGeneration++; s.instances[id].faceUp = true }
  s = finishBattle(attack(s, field(s, 'bob', 'OP09-055'), mohji))
  assert.equal(zoneOf(s, mohji), 'trash'); assert.equal(zones(s, 'alice').hand.length, 4)
  let t = endTurn(game(5))
  const alvida = field(t, 'alice', 'OP09-043', true), next = inHand(t, 'alice', 'ST25-002'), other = inHand(t, 'alice', 'OP09-043', [])
  t = finishBattle(attack(t, field(t, 'bob', 'OP09-055'), alvida))
  void attackerIds
  assert.ok(optionIds(t, 'alice').includes(next)); assert.ok(!optionIds(t, 'alice').includes(other), 'not another [Alvida]')
  t = choose(t, 'alice', [next])
  assert.equal(zoneOf(t, next), 'characters')
})

test('M6 ST-25 Cabaji cannot be K.O.d in battle while you have a [Buggy] or [Mohji] Character', () => {
  let s = endTurn(game(5))
  const cabaji = field(s, 'alice', 'OP09-045', true); field(s, 'alice', 'ST25-005')
  s = finishBattle(attack(s, field(s, 'bob', 'OP09-055'), cabaji))
  assert.equal(zoneOf(s, cabaji), 'characters')
  let t = endTurn(game(5))
  const c2 = field(t, 'alice', 'OP09-045', true)
  t = finishBattle(attack(t, field(t, 'bob', 'OP09-055'), c2))
  assert.equal(zoneOf(t, c2), 'trash')
})

test('M6 ST-25 Buggy OP09-051 places an opposing Character at the bottom, then itself unless you have 5 Characters of cost 5 or more', () => {
  let s = game(11)
  const foe = field(s, 'bob', 'OP09-055'), buggy = inHand(s, 'alice', 'OP09-051')
  s = choose(playCard(s, 'alice', buggy), 'alice', [foe])
  assert.equal(zones(s, 'bob').deck.at(-1), foe); assert.equal(zones(s, 'alice').deck.at(-1), buggy, 'only 1 cost 5+ Character: placed at the bottom')
  let t = game(11)
  for (let i = 0; i < 4; i++) field(t, 'alice', i < 2 ? 'OP09-043' : 'OP09-045')
  const b2 = inHand(t, 'alice', 'OP09-051')
  t = choose(playCard(t, 'alice', b2), 'alice', [])
  assert.equal(zoneOf(t, b2), 'characters', '5 Characters of cost 5 or more')
})

test('M6 ST-25 Mohji searches 5 for a [Richie] then plays a [Richie] from hand; Mr.3 searches 4 for a Cross Guild or Baroque Works card', () => {
  let s = game(7)
  const richie = put(s, 'alice', 'OP09-054', 'deckTop')
  s = playCard(s, 'alice', inHand(s, 'alice', 'OP09-053'))
  assert.deepEqual(optionIds(s, 'alice'), [richie])
  s = choose(s, 'alice', [richie])
  s = choose(s, 'alice', pendingChoice(s, 'alice')!.options.map(o => ('instanceId' in o ? o.instanceId! : '')))
  s = choose(s, 'alice', [richie])
  assert.equal(zoneOf(s, richie), 'characters')
  let t = game(5, ['ST03-003'])
  const baroque = put(t, 'alice', 'ST03-003', 'deckTop'), mr3 = put(t, 'alice', 'OP09-056', 'deckTop'), guild = put(t, 'alice', 'OP09-057', 'deckTop')
  t = playCard(t, 'alice', inHand(t, 'alice', 'OP09-056'))
  const opts = optionIds(t, 'alice')
  assert.ok(opts.includes(baroque), 'type including "Baroque Works"'); assert.ok(opts.includes(guild)); assert.ok(!opts.includes(mr3), 'not [Mr.3(Galdino)]')
  void definitionOf
})

test('M6 ST-25 P-084 Buggy cannot attack, and with a Buggy Leader no Character of cost 3 or 4 can attack; on play it plays a Cross Guild cost 6 or less', () => {
  let s = game(9)
  const buggy = inHand(s, 'alice', 'P-084'), four = inHand(s, 'alice', 'ST25-004')
  s = playCard(s, 'alice', buggy)
  s = choose(s, 'alice', [four])
  assert.equal(zoneOf(s, four), 'characters')
  const veteran = field(s, 'alice', 'P-084'), five = field(s, 'alice', 'OP09-055'), three = field(s, 'alice', 'ST25-004')
  assert.ok(!attackerIds(s, 'alice').includes(veteran), 'cannot attack')
  assert.ok(!attackerIds(s, 'alice').includes(three), 'cost 4: cannot attack'); assert.ok(attackerIds(s, 'alice').includes(five), 'cost 5')
  s = endTurn(s)
  const bobFour = field(s, 'bob', 'ST25-004')
  assert.ok(!attackerIds(s, 'bob').includes(bobFour), 'the opponent Characters of cost 3 or 4 neither')
})

test('M6 ST-25 Cross Guild searches 4 for a Cross Guild card as Main and Trigger; Richie blocks; Mr.1 is played for its printed cost', () => {
  let s = game(5)
  const guild = put(s, 'alice', 'OP09-057', 'hand'), card = put(s, 'alice', 'OP09-054', 'deckTop')
  s = startEffect(s, 'alice', 'OP09-057.main-search')
  s = choose(s, 'alice', [card])
  assert.equal(zoneOf(s, card), 'hand')
  void guild
  let t = game(3)
  put(t, 'alice', 'OP09-057', 'life')
  t = endTurn(t)
  t = lifeTrigger(t, 'alice')
  assert.ok(pendingChoice(t, 'alice'), 'Trigger search')
  let u = game(7)
  const mr1 = inHand(u, 'alice', 'OP09-055'), before = zones(u, 'alice').cost.filter(x => !u.instances[x].rested).length
  u = playCard(u, 'alice', mr1)
  assert.equal(zones(u, 'alice').cost.filter(x => !u.instances[x].rested).length, before - 5); assert.equal(power(u, mr1), 7000)
  const richie = field(u, 'alice', 'OP09-054')
  u = endTurn(u)
  u = attack(u, field(u, 'bob', 'OP09-055'), leaderOf(u, 'alice'))
  assert.ok((legal(u, 'alice').find(a => a.type === 'ACTIVATE_BLOCKER') as { blockerIds: string[] }).blockerIds.includes(richie))
  void offeredEffects; void attachDon
})

test('M6 ST-25 certificates validate against the current registry; all ST-25 cards are PLAYABLE_VERIFIED', async () => {
  const { ST25_CERTIFICATIONS, certificationErrors, effectiveStatus } = await import('../src/game/cards/certification')
  const { engineCatalog, currentEngineRegistry } = await import('../src/lib/engine/catalog')
  const { definitions } = engineCatalog(), registry = currentEngineRegistry()
  for (const c of ST25_CERTIFICATIONS) assert.deepEqual(certificationErrors(c, definitions.find(x => x.definitionId === c.definitionId), registry), [], c.definitionId)
  for (const n of ['OP09-042', ...ST25]) assert.equal(effectiveStatus(definitions.find(x => x.number === n)!), 'PLAYABLE_VERIFIED', n)
})
