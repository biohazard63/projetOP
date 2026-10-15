import test from 'node:test'
import assert from 'node:assert/strict'
import { projectState } from '../src/game/core'
import { evaluateCharacteristics } from '../src/game/effects/characteristics'
import type { GameState } from '../src/game/core/types'
import { act, attachDon, attack, attackerIds, choose, deckFor, definitionOf, endTurn, finishBattle, inHand, leaderOf, legal, newGame, offeredEffects, optionIds, pendingChoice, playCard, put, roundTrip, startEffect, toMain, zoneOf } from './helpers/m6'

// M6 ST-13 (YELLOW The Three Brothers), official English texts (series 569013). Scenarios follow the official text, the ST-13 FAQ
// and the errata snapshot (docs/game/evidence/m6/sources/), through public commands only; face-up Life cards are public, the
// others stay hidden, and every state survives a JSON round trip.
const NO_TRIGGER = ['ST13-004', 'ST13-005', 'ST13-006', 'ST13-007', 'ST13-008', 'ST13-009', 'ST13-010', 'ST13-011', 'ST13-012', 'ST13-013', 'ST13-014', 'ST13-015', 'ST13-016']
const ST13 = [...NO_TRIGGER, 'ST13-017', 'ST13-018', 'ST13-019']
const BOB = ['OP03-106', 'OP03-107', 'OP03-115', 'OP03-110']
const game = (leader: string, turn = 5, cards = NO_TRIGGER) => toMain(newGame(deckFor(leader, cards), deckFor('OP03-099', BOB)), turn)
const zones = (s: GameState, owner: string) => s.players.find(p => p.id === owner)!.zones
const power = (s: GameState, id: string) => evaluateCharacteristics(s, id).power.current
const field = (s: GameState, owner: string, number: string, rested = false) => put(s, owner, number, 'characters', { playedEarlier: true, rested })
const pick = (s: GameState, owner: string, indexes: number[]) => { const c = pendingChoice(s, owner)!; return act(s, owner, { type: 'ANSWER_CHOICE', choiceId: c.choiceId, tokens: indexes.map(i => c.options[i].token) }) }
const startFrom = (s: GameState, owner: string, abilityId: string, sourceId: string) => {
  const a = offeredEffects(s, owner, abilityId).find(x => x.effectId.includes(sourceId))
  assert.ok(a, `${abilityId} from ${sourceId} not offered`)
  return act(s, owner, { type: 'START_EFFECT', effectId: a!.effectId })
}
const faceUpLifeSeenBy = (s: GameState, viewer: string, owner: string) => ((projectState(s, viewer) as unknown as { players: { id: string; lifeFaceUp?: { index: number }[] }[] }).players.find(p => p.id === owner)?.lifeFaceUp ?? []).map(x => x.index)
/** n damages (at most 4: one OP03-106 copy each) to Alice. */
const hitAlice = (s: GameState, n: number) => {
  for (let i = 0; i < n; i++) {
    // Three OP03-106 copies, then OP03-107 (2000) with 3 DON!! given: 5000, enough against a 5000 Leader.
    const attacker = field(s, 'bob', i < 3 ? 'OP03-106' : 'OP03-107')
    if (i >= 3) attachDon(s, 'bob', attacker, 3)
    s = finishBattle(attack(s, attacker, leaderOf(s, 'alice')))
  }
  return s
}

test('M6 FAQ ST13-001: Leader Sabo with a DON!! adds a cost 3 or more Character of 7000 power or more (DON!! included) face-up to the top of the Life for +2000 to a Character until the next turn', () => {
  let s = game('ST13-001', 5)
  const leader = leaderOf(s, 'alice'), ivan = field(s, 'alice', 'ST13-005'), dadan = field(s, 'alice', 'ST13-006')
  attachDon(s, 'alice', leader, 1)
  assert.equal(power(s, ivan), 4000)
  attachDon(s, 'alice', ivan, 3)
  s = startEffect(s, 'alice', 'ST13-001.activate-main-life')
  assert.deepEqual(optionIds(s, 'alice'), [ivan], 'FAQ ST13-001: 7000 power with DON!!')
  s = choose(s, 'alice', [ivan])
  s = roundTrip(choose(s, 'alice', [dadan]))
  assert.equal(zones(s, 'alice').life[0], ivan); assert.equal(s.instances[ivan].faceUp, true); assert.deepEqual(faceUpLifeSeenBy(s, 'bob', 'alice'), [0], 'public to the opponent')
  assert.equal(power(s, dadan), 6000)
  s = endTurn(s)
  assert.equal(power(s, dadan), 6000, 'until the start of your next turn')
})

test('M6 FAQ ST13-002: Leader Ace with 2 DON!! adds a cost 5 Character face-up to the Life from the top 5, and trashes every face-up Life card at the end of the turn', () => {
  let s = game('ST13-002', 5)
  const leader = leaderOf(s, 'alice'), five = put(s, 'alice', 'ST13-008', 'deckTop')
  attachDon(s, 'alice', leader, 2)
  s = startEffect(s, 'alice', 'ST13-002.activate-main-life')
  s = choose(s, 'alice', [five])
  while (pendingChoice(s, 'alice')) s = pick(s, 'alice', pendingChoice(s, 'alice')!.options.map((_, i) => i))
  s = roundTrip(s)
  assert.equal(zones(s, 'alice').life[0], five); assert.equal(s.instances[five].faceUp, true)
  const life = zones(s, 'alice').life.length
  s = endTurn(s)
  assert.equal(zoneOf(s, five), 'trash'); assert.equal(zones(s, 'alice').life.length, life - 1, 'face-down Life cards stay')
})

test('M6 FAQ ST13-003: with Leader Luffy a face-up Life card goes to the bottom of the deck instead of the hand, without its Trigger, also for Makino whose cost is then not paid; it adds up to 2 cost 5 Characters from hand and trash face-up at 0 Life', () => {
  let s = toMain(newGame(deckFor('ST13-003', ST13), deckFor('OP03-099', BOB)), 4)
  const ev = put(s, 'alice', 'ST13-018', 'life'); s.instances[ev].faceUp = true
  s.events.push({ sequence: s.events.length, type: 'LIFE_TURNED_FACE_UP', actorId: 'alice', publicInstanceId: ev })
  const hand = zones(s, 'alice').hand.length
  s = roundTrip(finishBattle(attack(s, field(s, 'bob', 'OP03-106'), leaderOf(s, 'alice'))))
  assert.equal(zones(s, 'alice').deck.at(-1), ev, 'bottom of the deck'); assert.equal(s.instances[ev].faceUp, false)
  assert.equal(zones(s, 'alice').hand.length, hand, 'not added to hand, no Trigger')
  let t = game('ST13-003', 5)
  const top = zones(t, 'alice').life[0]; t.instances[top].faceUp = true
  t.events.push({ sequence: t.events.length, type: 'LIFE_TURNED_FACE_UP', actorId: 'alice', publicInstanceId: top })
  const life = zones(t, 'alice').life.length
  t = playCard(t, 'alice', inHand(t, 'alice', 'ST13-012'))
  t = pick(t, 'alice', [0])
  assert.equal(pendingChoice(t, 'alice'), undefined, 'FAQ ST13-003: Makino cost not paid, nothing happens'); assert.equal(zones(t, 'alice').life.length, life - 1)
  let u = endTurn(game('ST13-003', 5))
  u = hitAlice(u, zones(u, 'alice').life.length)
  u = endTurn(u)
  assert.equal(zones(u, 'alice').life.length, 0)
  const a = put(u, 'alice', 'ST13-008', 'hand'), b = put(u, 'alice', 'ST13-011', 'trash'), leader = leaderOf(u, 'alice')
  attachDon(u, 'alice', leader, 2)
  u = startEffect(u, 'alice', 'ST13-003.activate-main-life')
  u = choose(u, 'alice', [zones(u, 'alice').hand.find(id => id !== a)!])
  u = roundTrip(choose(u, 'alice', [a, b]))
  assert.equal(zones(u, 'alice').life.length, 2); assert.ok([a, b].every(id => u.instances[id].faceUp && zoneOf(u, id) === 'life'), 'FAQ ST13-003: one from hand and one from trash')
})

test('M6 FAQ ST13-004: Newgate adds the top deck card to the Life, then places 1 Life card face-down on top of the deck and the rest back in any order, sides kept', () => {
  let s = game('ST13-001', 11)
  const deckTop = zones(s, 'alice').deck[0], ivan = field(s, 'alice', 'ST13-005', false)
  attachDon(s, 'alice', ivan, 3); attachDon(s, 'alice', leaderOf(s, 'alice'), 1)
  s = startEffect(s, 'alice', 'ST13-001.activate-main-life'); s = choose(s, 'alice', [ivan]); s = choose(s, 'alice', [])
  const life = zones(s, 'alice').life.length
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST13-004'))
  s = pick(s, 'alice', [0])
  assert.equal(zones(s, 'alice').life.length, life + 1); assert.equal(zones(s, 'alice').life[0], deckTop)
  const toDeck = zones(s, 'alice').life.find(id => id !== ivan && id !== deckTop)!
  s = choose(s, 'alice', [toDeck])
  assert.equal(zones(s, 'alice').deck[0], toDeck); assert.equal(s.instances[toDeck].faceUp, false)
  const order = [...optionIds(s, 'alice')].reverse()
  s = roundTrip(choose(s, 'alice', order))
  assert.deepEqual(zones(s, 'alice').life, order); assert.equal(s.instances[ivan].faceUp, true, 'FAQ ST13-004: face-up stays face-up')
  assert.deepEqual(faceUpLifeSeenBy(s, 'bob', 'alice'), [order.indexOf(ivan)])
})

test('M6 ST-13 Ivankov trashes a top or bottom Life card to reveal and add a cost 5 Character from hand face-down; Sabo cost 5 trashes a Life card to K.O. a cost 5 or less', () => {
  let s = game('ST13-001', 5)
  const five = put(s, 'alice', 'ST13-015', 'hand'), life = zones(s, 'alice').life.length
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST13-005'))
  s = pick(s, 'alice', [0])
  s = roundTrip(choose(s, 'alice', [five]))
  assert.equal(zones(s, 'alice').life[0], five); assert.equal(s.instances[five].faceUp, false); assert.equal(zones(s, 'alice').life.length, life)
  assert.deepEqual(faceUpLifeSeenBy(s, 'bob', 'alice'), [], 'face-down: hidden')
  let t = endTurn(game('ST13-001', 7))
  const foe = field(t, 'bob', 'OP03-106')
  t = endTurn(t)
  t = playCard(t, 'alice', inHand(t, 'alice', 'ST13-008'))
  t = pick(t, 'alice', [0])
  t = roundTrip(choose(t, 'alice', [foe]))
  assert.equal(zoneOf(t, foe), 'trash')
})

test('M6 ST-13 Dadan plays up to 1 each of Sabo, Ace and Luffy of cost 2 from hand; the cost 2 brothers trash themselves to reveal the top Life card and play a matching cost 5, then the Leader gets +2000 until the end of the next opposing turn', () => {
  let s = game('ST13-001', 7)
  const sabo = put(s, 'alice', 'ST13-007', 'hand'), ace = put(s, 'alice', 'ST13-010', 'hand'), luffy = put(s, 'alice', 'ST13-014', 'hand')
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST13-006'))
  s = choose(s, 'alice', [sabo]); s = choose(s, 'alice', [ace]); s = roundTrip(choose(s, 'alice', [luffy]))
  assert.ok([sabo, ace, luffy].every(id => zoneOf(s, id) === 'characters'))
  let t = game('ST13-001', 5)
  const sabo5 = put(t, 'alice', 'ST13-008', 'life'), s2 = field(t, 'alice', 'ST13-007'), leader = leaderOf(t, 'alice')
  t = startEffect(t, 'alice', 'ST13-007.activate-main-reveal')
  t = choose(t, 'alice', [s2])
  t = roundTrip(choose(t, 'alice', [sabo5]))
  assert.equal(zoneOf(t, sabo5), 'characters', 'played from the Life (its [On Play] is then offered)'); assert.equal(zoneOf(t, s2), 'trash')
  t = choose(t, 'alice', [leader])
  assert.equal(power(t, leader), 7000)
  t = choose(t, 'alice', [])
  t = endTurn(t)
  assert.equal(power(t, leader), 7000, 'during the opponent next turn')
  let u = game('ST13-001', 5)
  put(u, 'alice', 'ST13-015', 'life')
  const a2 = field(u, 'alice', 'ST13-010')
  u = startEffect(u, 'alice', 'ST13-010.activate-main-reveal')
  u = choose(u, 'alice', [a2])
  assert.equal(pendingChoice(u, 'alice'), undefined, 'not a [Portgas.D.Ace] with a cost of 5: nothing')
})

test('M6 FAQ ST13-009: Shanks turns a face-up Life card in any position face-down so that, with 7 or more opposing hand cards, the top opposing Life card is trashed', () => {
  let s = game('ST13-002', 9)
  const p = zones(s, 'alice'), second = p.life[1]; s.instances[second].faceUp = true
  s.events.push({ sequence: s.events.length, type: 'LIFE_TURNED_FACE_UP', actorId: 'alice', publicInstanceId: second })
  for (const n of ['OP03-106', 'OP03-107', 'OP03-110']) put(s, 'bob', n, 'hand')
  assert.ok(zones(s, 'bob').hand.length >= 7)
  const oppLife = zones(s, 'bob').life.length
  s = playCard(s, 'alice', inHand(s, 'alice', 'ST13-009'))
  s = choose(s, 'alice', [second])
  s = roundTrip(pick(s, 'alice', [0]))
  assert.equal(s.instances[second].faceUp, false); assert.equal(zones(s, 'bob').life.length, oppLife - 1)
  assert.deepEqual(faceUpLifeSeenBy(s, 'bob', 'alice'), [])
})

test('M6 FAQ ST13-011: Ace cost 5 gains Rush on play with 2 or less Life and keeps it; Luffy cost 5 gains +2000 until the next turn then draws 1 and trashes the top Life card', () => {
  let s = endTurn(game('ST13-001', 7))
  s = hitAlice(s, 3)
  s = endTurn(s)
  assert.ok(zones(s, 'alice').life.length <= 2)
  const ace = inHand(s, 'alice', 'ST13-011')
  s = playCard(s, 'alice', ace)
  assert.ok(attackerIds(s, 'alice').includes(ace))
  let t = game('ST13-001', 7)
  const luffy = field(t, 'alice', 'ST13-015'), life = zones(t, 'alice').life.length, h = zones(t, 'alice').hand.length
  t = roundTrip(startEffect(t, 'alice', 'ST13-015.activate-main-power'))
  assert.equal(power(t, luffy), 8000); assert.equal(zones(t, 'alice').life.length, life - 1); assert.equal(zones(t, 'alice').hand.length, h + 1)
  assert.equal(offeredEffects(t, 'alice', 'ST13-015.activate-main-power').length, 0, 'once per turn')
})

test('M6 FAQ ST13-012: Makino adds a Life card to hand to look at all Life cards and place them back in any order, sides kept; Garp and The Three Brothers Bond look at 5 for a brother of cost 5 or less', () => {
  let s = game('ST13-001', 5)
  const makino = inHand(s, 'alice', 'ST13-012'), h = zones(s, 'alice').hand.length
  s = playCard(s, 'alice', makino)
  s = pick(s, 'alice', [0])
  const order = [...optionIds(s, 'alice')].reverse()
  s = roundTrip(choose(s, 'alice', order))
  assert.deepEqual(zones(s, 'alice').life, order); assert.equal(zones(s, 'alice').hand.length, h - 1 + 1)
  let t = game('ST13-001', 5)
  const ace = put(t, 'alice', 'ST13-011', 'deckTop'), sabo7 = put(t, 'alice', 'ST13-009', 'deckTop')
  t = playCard(t, 'alice', inHand(t, 'alice', 'ST13-013'))
  assert.ok(optionIds(t, 'alice').includes(ace)); assert.ok(!optionIds(t, 'alice').includes(sabo7), 'Shanks is not a brother')
  t = choose(t, 'alice', [ace])
  while (pendingChoice(t, 'alice')) t = pick(t, 'alice', pendingChoice(t, 'alice')!.options.map((_, i) => i))
  assert.equal(zoneOf(t, ace), 'hand')
  let u = toMain(newGame(deckFor('ST13-001', ST13), deckFor('OP03-099', BOB)), 5)
  const sabo = put(u, 'alice', 'ST13-008', 'deckTop')
  u = startFrom(u, 'alice', 'ST13-019.main-search', inHand(u, 'alice', 'ST13-019'))
  u = choose(u, 'alice', [sabo])
  while (pendingChoice(u, 'alice')) u = pick(u, 'alice', pendingChoice(u, 'alice')!.options.map((_, i) => i))
  assert.equal(zoneOf(u, sabo), 'hand')
})

test('M6 FAQ ST13-017: Flame Dragon King gives +4000 then rearranges the Life; Gum-Gum Jet Spear gives +2000 and draws at 0 Life; their Trigger swaps a Life card for a hand card', () => {
  let s = endTurn(toMain(newGame(deckFor('ST13-001', ST13), deckFor('OP03-099', BOB)), 5))
  const ev = put(s, 'alice', 'ST13-017', 'hand'), l = leaderOf(s, 'alice')
  s = attack(s, field(s, 'bob', 'OP03-106'), l)
  s = act(s, 'alice', { type: 'PASS_BLOCKER', battleId: s.battle!.id })
  const c = legal(s, 'alice').find(x => x.type === 'PLAY_COUNTER_EVENT') as { paymentDonIds: string[]; battleId: string }
  s = act(s, 'alice', { type: 'PLAY_COUNTER_EVENT', cardId: ev, targetId: null, paymentDonIds: c.paymentDonIds.slice(0, 2), donMinusIds: [], battleId: c.battleId })
  s = choose(s, 'alice', [l])
  const order = [...optionIds(s, 'alice')].reverse()
  s = roundTrip(choose(s, 'alice', order))
  assert.equal(s.battle!.counterModifiers.reduce((n, m) => n + m.amount, 0), 4000); assert.deepEqual(zones(s, 'alice').life, order)
  let t = endTurn(toMain(newGame(deckFor('ST13-001', ST13), deckFor('OP03-099', BOB)), 3))
  put(t, 'alice', 'ST13-018', 'life')
  t = attack(t, field(t, 'bob', 'OP03-106'), leaderOf(t, 'alice'))
  t = act(t, 'alice', { type: 'PASS_BLOCKER', battleId: t.battle!.id }); t = act(t, 'alice', { type: 'PASS_COUNTER', battleId: t.battle!.id })
  t = act(t, 'bob', { type: 'RESOLVE_BATTLE', battleId: t.battle!.id })
  t = act(t, 'alice', { type: 'ANSWER_TRIGGER', choiceId: (legal(t, 'alice').find(a => a.type === 'ANSWER_TRIGGER') as { choiceId: string }).choiceId, activate: true })
  const life = zones(t, 'alice').life.length
  t = pick(t, 'alice', [0])
  const fromHand = zones(t, 'alice').hand.at(-2)!
  t = roundTrip(choose(t, 'alice', [fromHand]))
  assert.equal(zones(t, 'alice').life.length, life); assert.equal(zones(t, 'alice').life[0], fromHand)
  void definitionOf
})

test('M6 ST-13 certificates validate against the current registry; all ST-13 cards are PLAYABLE_VERIFIED', async () => {
  const { ST13_CERTIFICATIONS, certificationErrors, effectiveStatus } = await import('../src/game/cards/certification')
  const { engineCatalog, currentEngineRegistry } = await import('../src/lib/engine/catalog')
  const { definitions } = engineCatalog(), registry = currentEngineRegistry()
  for (const c of ST13_CERTIFICATIONS) assert.deepEqual(certificationErrors(c, definitions.find(x => x.definitionId === c.definitionId), registry), [], c.definitionId)
  for (const n of ['ST13-001', 'ST13-002', 'ST13-003', ...ST13]) assert.equal(effectiveStatus(definitions.find(x => x.number === n)!), 'PLAYABLE_VERIFIED', n)
})
