import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateCharacteristics } from '../src/game/effects/characteristics'
import type { GameState } from '../src/game/core/types'
import { act, attachDon, attack, choose, deckFor, endTurn, finishBattle, inHand, leaderOf, legal, newGame, optionIds, pendingChoice, playCard, put, roundTrip, startEffect, toMain, zoneOf } from './helpers/m6'

// M6 ST-08 (Monkey.D.Luffy, black). Scenarios follow the official text, the ST-08 FAQ and the errata snapshot
// (docs/game/evidence/m6/sources/qa_st-08.txt, errata-all.json), through public commands only.
const ST08 = ['ST08-002', 'ST08-003', 'ST08-004', 'ST08-005', 'ST08-006', 'ST08-007', 'ST08-008', 'ST08-009', 'ST08-010', 'ST08-011', 'ST08-012', 'ST08-013', 'ST08-014', 'ST08-015']
const game = (turn = 3) => toMain(newGame(deckFor('ST08-001', ST08), deckFor('ST08-001', ST08)), turn)
const cost = (s: GameState, id: string) => evaluateCharacteristics(s, id).cost.current
const power = (s: GameState, id: string) => evaluateCharacteristics(s, id).power.current
const attachedTo = (s: GameState, owner: string, id: string) => s.players.find(p => p.id === owner)!.zones.attached.filter(d => s.instances[d].attachedTo === id).length
const first = (s: GameState, owner: string) => { const c = pendingChoice(s, owner); assert.ok(c, 'pending choice'); return act(s, owner, { type: 'ANSWER_CHOICE', choiceId: c!.choiceId, tokens: c!.options.slice(0, 1).map(o => o.token) }) }
const lifeHit = (s: GameState, attackerNumber: string): GameState => {
  const defender = s.players.find(p => p.id !== s.activePlayerId)!.id
  s = attack(s, put(s, s.activePlayerId!, attackerNumber, 'characters'), leaderOf(s, defender))
  s = act(s, defender, { type: 'PASS_BLOCKER', battleId: s.battle!.id }); s = act(s, defender, { type: 'PASS_COUNTER', battleId: s.battle!.id })
  s = act(s, s.activePlayerId!, { type: 'RESOLVE_BATTLE', battleId: s.battle!.id })
  const t = legal(s, defender).find(a => a.type === 'ANSWER_TRIGGER') as { choiceId: string } | undefined
  assert.ok(t, 'Life Trigger offered')
  return act(s, defender, { type: 'ANSWER_TRIGGER', choiceId: t!.choiceId, activate: true })
}

test('M6 ST-08 FAQ ST08-001 and ST08-005: Shanks K.O.s every cost 1 or less Character of both players and the Leader gives 1 rested DON per K.O.', () => {
  let s = game(9)
  const own = put(s, 'alice', 'ST08-008', 'characters'), foe = put(s, 'bob', 'ST08-008', 'characters'), big = put(s, 'bob', 'ST08-010', 'characters')
  const shanks = put(s, 'alice', 'ST08-005', 'hand'), discard = inHand(s, 'alice', 'ST08-003')
  s = playCard(s, 'alice', shanks)
  assert.ok(optionIds(s, 'alice').includes(discard))
  s = choose(s, 'alice', [discard])
  assert.equal(zoneOf(s, discard), 'trash')
  assert.equal(zoneOf(s, own), 'trash', 'own cost-1 Character too (FAQ ST08-005)'); assert.equal(zoneOf(s, foe), 'trash'); assert.equal(zoneOf(s, big), 'characters')
  const leader = leaderOf(s, 'alice')
  s = roundTrip(first(s, 'alice')); s = first(s, 'alice')
  assert.equal(attachedTo(s, 'alice', leader), 2, 'one rested DON!! for each K.O.d Character (FAQ ST08-001)')
  assert.equal(pendingChoice(s, 'alice'), undefined)
})

test('M6 ST-08 Shanks without a trashed card K.O.s nothing; the Leader gives no DON during the opponent turn', () => {
  let s = game(9)
  const foe = put(s, 'bob', 'ST08-008', 'characters')
  inHand(s, 'alice', 'ST08-003')
  s = playCard(s, 'alice', put(s, 'alice', 'ST08-005', 'hand'))
  s = choose(s, 'alice', [])
  assert.equal(zoneOf(s, foe), 'characters')
  let t = game(9)
  const victim = put(t, 'alice', 'ST08-008', 'characters', { rested: true })
  t = endTurn(t)
  t = finishBattle(attack(t, put(t, 'bob', 'ST08-010', 'characters'), victim))
  assert.equal(zoneOf(t, victim), 'trash')
  assert.equal(pendingChoice(t, 'alice'), undefined); assert.equal(attachedTo(t, 'alice', leaderOf(t, 'alice')), 0)
})

test('M6 ST-08 Leader gives up to 1 rested DON after a battle K.O. during its turn and may choose none', () => {
  let s = game(5)
  s = playCard(s, 'alice', put(s, 'alice', 'ST08-008', 'hand'))
  s = choose(s, 'alice', [])
  const foe = put(s, 'bob', 'ST08-003', 'characters', { rested: true })
  s = finishBattle(attack(s, put(s, 'alice', 'ST08-010', 'characters'), foe))
  assert.equal(zoneOf(s, foe), 'trash')
  assert.equal(pendingChoice(s, 'alice')!.options.length, 1, 'only the rested DON!!')
  const leader = leaderOf(s, 'alice')
  s = choose(s, 'alice', [])
  assert.equal(attachedTo(s, 'alice', leader), 0)
})

test('M6 ST-08 Uta cannot be K.O.d in battle by a Leader but can by a Character; Activate Main rests it for -2 cost', () => {
  let s = game(3)
  const uta = put(s, 'alice', 'ST08-002', 'characters', { rested: true })
  s = endTurn(s)
  const bobLeader = leaderOf(s, 'bob')
  attachDon(s, 'bob', bobLeader, 2)
  s = finishBattle(attack(s, bobLeader, uta))
  assert.equal(zoneOf(s, uta), 'characters', 'not K.O.d by a Leader')
  s = finishBattle(attack(s, put(s, 'bob', 'ST08-003', 'characters'), uta))
  assert.equal(zoneOf(s, uta), 'trash', 'K.O.d by a Character')
  let t = game(3)
  const uta2 = put(t, 'alice', 'ST08-002', 'characters'), garp = put(t, 'bob', 'ST08-010', 'characters')
  t = startEffect(t, 'alice', 'ST08-002.activate-main-cost')
  assert.equal(t.instances[uta2].rested, true)
  t = choose(t, 'alice', [garp])
  assert.equal(cost(t, garp), 3)
})

test('M6 ST-08 Mr.2 with a DON after battling as attacker may K.O. the battled Character and then K.O.s itself; declining keeps both', () => {
  let s = game(5)
  const mr2 = put(s, 'alice', 'ST08-013', 'characters'), shanks = put(s, 'bob', 'ST08-005', 'characters', { rested: true }), other = put(s, 'bob', 'ST08-003', 'characters')
  attachDon(s, 'alice', mr2, 1)
  s = finishBattle(attack(s, mr2, shanks))
  assert.equal(zoneOf(s, shanks), 'characters', 'Mr.2 lost the battle')
  assert.deepEqual(optionIds(s, 'alice'), [shanks], 'only the Character it battled')
  s = roundTrip(s)
  s = choose(s, 'alice', [shanks])
  assert.equal(zoneOf(s, shanks), 'trash'); assert.equal(zoneOf(s, mr2), 'trash', 'if you do, K.O. this Character'); assert.equal(zoneOf(s, other), 'characters')
  let t = game(5)
  const mr = put(t, 'alice', 'ST08-013', 'characters'), foe = put(t, 'bob', 'ST08-005', 'characters', { rested: true })
  attachDon(t, 'alice', mr, 1)
  t = choose(finishBattle(attack(t, mr, foe)), 'alice', [])
  assert.equal(zoneOf(t, mr), 'characters'); assert.equal(zoneOf(t, foe), 'characters')
})

test('M6 ST-08 FAQ ST08-013: Mr.2 defending acts after surviving a Character attack, not once K.O.d, not without DON and not against a Leader', () => {
  let s = game(5)
  const mr2 = put(s, 'alice', 'ST08-013', 'characters', { rested: true })
  attachDon(s, 'alice', mr2, 1)
  s = endTurn(s)
  const gaimon = put(s, 'bob', 'ST08-003', 'characters')
  s = finishBattle(attack(s, gaimon, mr2))
  assert.deepEqual(optionIds(s, 'alice'), [gaimon], 'the defending Mr.2 is offered its ability')
  s = choose(s, 'alice', [gaimon])
  assert.equal(zoneOf(s, gaimon), 'trash'); assert.equal(zoneOf(s, mr2), 'trash')
  let t = game(5)
  const lost = put(t, 'alice', 'ST08-013', 'characters', { rested: true })
  attachDon(t, 'alice', lost, 1)
  t = endTurn(t)
  t = finishBattle(attack(t, put(t, 'bob', 'ST08-005', 'characters'), lost))
  assert.equal(zoneOf(t, lost), 'trash'); assert.equal(pendingChoice(t, 'alice'), undefined, 'K.O.d in that battle: no activation')
  let u = game(5)
  const bare = put(u, 'alice', 'ST08-013', 'characters', { rested: true })
  u = endTurn(u)
  u = finishBattle(attack(u, put(u, 'bob', 'ST08-003', 'characters'), bare))
  assert.equal(pendingChoice(u, 'alice'), undefined, 'no DON!! given')
  let v = game(5)
  const lead = put(v, 'alice', 'ST08-013', 'characters', { rested: true })
  attachDon(v, 'alice', lead, 1)
  v = endTurn(v)
  v = finishBattle(attack(v, leaderOf(v, 'bob'), lead))
  assert.equal(zoneOf(v, lead), 'characters'); assert.equal(pendingChoice(v, 'alice'), undefined, 'a Leader is not a Character')
})

test('M6 ST-08 Gum-Gum Bell pays the optional top Life for -7 cost, does nothing without it, and its Trigger adds only a black Character cost 2 or less', () => {
  let s = game(3)
  put(s, 'alice', 'ST08-014', 'hand')
  const garp = put(s, 'bob', 'ST08-010', 'characters'), alice = () => s.players[0]
  const life = alice().zones.life.length, top = alice().zones.life[0]
  s = startEffect(s, 'alice', 'ST08-014.main-cost', { payOptionalCost: true })
  assert.equal(alice().zones.life.length, life - 1); assert.equal(zoneOf(s, top), 'hand')
  s = choose(s, 'alice', [garp])
  assert.equal(cost(s, garp), 0, 'cost never below 0')
  let t = game(3)
  const bell = put(t, 'alice', 'ST08-014', 'hand'), garp2 = put(t, 'bob', 'ST08-010', 'characters'), lifeBefore = t.players[0].zones.life.length
  t = startEffect(t, 'alice', 'ST08-014.main-cost', { payOptionalCost: false })
  assert.equal(zoneOf(t, bell), 'trash'); assert.equal(pendingChoice(t, 'alice'), undefined); assert.equal(cost(t, garp2), 5); assert.equal(t.players[0].zones.life.length, lifeBefore)
  let u = game(3)
  const higuma = put(u, 'alice', 'ST08-008', 'trash'), vivi = put(u, 'alice', 'ST08-007', 'trash')
  put(u, 'alice', 'ST08-014', 'life')
  u = endTurn(u)
  u = lifeHit(u, 'ST08-010')
  assert.deepEqual(optionIds(u, 'alice'), [higuma], 'Vivi costs 3')
  u = choose(u, 'alice', [higuma])
  assert.equal(zoneOf(u, higuma), 'hand'); assert.equal(zoneOf(u, vivi), 'trash')
})

test('M6 ST-08 Nefeltari Vivi blocks and its Trigger plays it', () => {
  let s = game(3)
  const vivi = put(s, 'alice', 'ST08-007', 'life')
  s = endTurn(s)
  s = lifeHit(s, 'ST08-010')
  assert.equal(zoneOf(s, vivi), 'characters')
  s = finishBattle(s)
  s = endTurn(s); s = endTurn(s)
  s = attack(s, put(s, 'bob', 'ST08-003', 'characters'), leaderOf(s, 'alice'))
  assert.ok((legal(s, 'alice').find(a => a.type === 'ACTIVATE_BLOCKER') as { blockerIds: string[] } | undefined)?.blockerIds.includes(vivi))
})

test('M6 ST-02 Hawkins keeps its Your Turn restriction once defending Characters announce their battles', () => {
  const st02 = ['ST02-010', 'ST02-002', 'ST02-006']
  let s = toMain(newGame(deckFor('ST02-001', st02), deckFor('ST02-001', st02)), 3)
  const hawkins = put(s, 'alice', 'ST02-010', 'characters', { rested: true })
  attachDon(s, 'alice', hawkins, 1)
  s = endTurn(s)
  s = finishBattle(attack(s, put(s, 'bob', 'ST02-002', 'characters'), hawkins))
  assert.equal(zoneOf(s, hawkins), 'characters')
  assert.equal(s.instances[hawkins].rested, true, 'not set active during the opponent turn')
})

test('M6 ST-08 cards without other ability are played for their printed cost, keep their power and defend with their Counter or [Blocker]', () => {
  for (const number of ['ST08-003', 'ST08-010', 'ST08-011', 'ST08-012', 'ST08-006', 'ST08-007']) {
    let s = game(9)
    const d = s.catalog.definitions.find(x => x.number === number)!, blocker = d.review.effects.some(e => e.kind === 'blocker')
    const played = inHand(s, 'alice', number), held = inHand(s, 'alice', number, [played])
    s = playCard(s, 'alice', played)
    while (pendingChoice(s, 'alice')) s = choose(s, 'alice', [])
    assert.equal(zoneOf(s, played), 'characters'); assert.equal(power(s, played), d.power ?? 0, `${number} power`)
    s = endTurn(s)
    s = attack(s, put(s, 'bob', 'ST08-003', 'characters'), leaderOf(s, 'alice'))
    if (blocker) assert.ok((legal(s, 'alice').find(a => a.type === 'ACTIVATE_BLOCKER') as { blockerIds: string[] } | undefined)?.blockerIds.includes(played), `${number} can block`)
    else {
      s = act(s, 'alice', { type: 'PASS_BLOCKER', battleId: s.battle!.id })
      s = act(s, 'alice', { type: 'PLAY_COUNTER_CHARACTER', cardId: held, targetId: leaderOf(s, 'alice'), battleId: s.battle!.id })
      assert.equal(s.battle!.counterModifiers.reduce((n, m) => n + m.amount, 0), d.counter)
    }
  }
})

test('M6 ST-08 certificates validate against the current registry; all 15 numbers are PLAYABLE_VERIFIED', async () => {
  const { ST08_CERTIFICATIONS, certificationErrors, effectiveStatus } = await import('../src/game/cards/certification')
  const { engineCatalog, currentEngineRegistry } = await import('../src/lib/engine/catalog')
  const { definitions } = engineCatalog(), registry = currentEngineRegistry()
  for (const c of ST08_CERTIFICATIONS) assert.deepEqual(certificationErrors(c, definitions.find(x => x.definitionId === c.definitionId), registry), [], c.definitionId)
  for (let i = 1; i <= 15; i++) { const n = `ST08-${String(i).padStart(3, '0')}`; assert.equal(effectiveStatus(definitions.find(x => x.number === n)!), 'PLAYABLE_VERIFIED', n) }
})
