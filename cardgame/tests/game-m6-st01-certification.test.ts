import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateCharacteristics } from '../src/game/effects/characteristics'
import { engineCatalog } from '../src/lib/engine/catalog'
import { validateEngineDeck } from '../src/game/rulesets/decks'
import { FREE_RULESET } from '../src/game/rulesets/free'
import { STARTER_DECKS } from '../src/game/cards/starterDecks'
import { act, attachDon, attack, choose, deckFor, definitionOf, endTurn, leaderOf, legal, newGame, offeredEffects, optionIds, pendingChoice, playCard, put, roundTrip, startEffect, toMain, vanilla, zoneOf } from './helpers/m6'

// M6 Lot A — ST-01 certification scenarios. Each test reproduces an official ST-01..04 FAQ ruling or the
// September 26, 2022 "up to" erratum (docs/game/evidence/m6/sources/), through real public commands only.
const red = (cards: (string | [string, number])[]) => deckFor('ST01-001', cards)
const st01 = ['ST01-002', 'ST01-004', 'ST01-005', 'ST01-006', 'ST01-008', 'ST01-011', 'ST01-012', 'ST01-013', 'ST01-015', 'ST01-016', 'ST01-017', 'OP01-006'] as const
const extra = (): [string, number][] => [[vanilla('RED', 7000, 8000), 1], [vanilla('RED', 5000, 5000), 1], [vanilla('RED', 4000, 4000), 1]].filter((x, i, a) => a.findIndex(y => y[0] === x[0]) === i) as [string, number][]
const game = (turn = 3) => toMain(newGame(red([...st01, ...extra()]), red([...st01, ...extra()])), turn)
const power = (s: Parameters<typeof evaluateCharacteristics>[0], id: string) => evaluateCharacteristics(s, id).power.current
const vanillaRed = (min: number) => vanilla('RED', min)

test('M6 ST-01 FAQ ST01-013: Zoro keeps +1000 with an attached DON!! during the opponent turn', () => {
  let s = game()
  const zoro = put(s, 'alice', 'ST01-013', 'characters')
  assert.equal(power(s, zoro), 5000)
  const don = s.players[0].zones.cost.find(id => !s.instances[id].rested)!
  s = act(s, 'alice', { type: 'ATTACH_DON', donIds: [don], targetId: zoro })
  assert.equal(power(s, zoro), 7000, 'own turn: +1000 DON!! and +1000 effect')
  s = endTurn(s)
  assert.equal(s.activePlayerId, 'bob'); assert.equal(power(s, zoro), 6000, 'opponent turn: the [DON!! x1] effect still applies')
  roundTrip(s)
})

test('M6 ST-01 FAQ ST01-015: Gum-Gum Jet Pistol compares the current power (6000 or less)', () => {
  let s = game(7)
  const big = vanilla('RED', 7000, 8000), target = put(s, 'bob', big, 'characters'), other = put(s, 'bob', 'ST01-012', 'characters')
  const otama = put(s, 'alice', 'OP01-006', 'hand')
  s = playCard(s, 'alice', otama); s = choose(s, 'alice', [target])
  assert.ok(power(s, target)! <= 6000, 'reduced by Otama')
  put(s, 'alice', 'ST01-015', 'hand')
  s = startEffect(s, 'alice', 'ST01-015.main-ko-character')
  const options = optionIds(s, 'alice')
  assert.ok(options.includes(target), 'printed 7000, current power 6000 or less: eligible')
  assert.ok(options.includes(other), '6000 power Luffy is eligible')
  s = choose(s, 'alice', [target]); assert.equal(zoneOf(s, target), 'trash')
  roundTrip(s)
})

test('M6 ST-01 FAQ ST01-016: Diable Jambe Trigger only K.O.s a Character with its own [Blocker], not ST01-012', () => {
  let s = game()
  const chopper = put(s, 'alice', 'ST01-006', 'characters'), luffy = put(s, 'alice', 'ST01-012', 'characters')
  const jambe = put(s, 'bob', 'ST01-016', 'life'), life = s.players[1].zones.life
  life.splice(life.indexOf(jambe), 1); life.unshift(jambe)
  const attacker = put(s, 'alice', vanillaRed(5000), 'characters')
  s = attack(s, attacker, leaderOf(s, 'bob'))
  s = act(s, 'bob', { type: 'PASS_BLOCKER', battleId: s.battle!.id }); s = act(s, 'bob', { type: 'PASS_COUNTER', battleId: s.battle!.id })
  s = act(s, 'alice', { type: 'RESOLVE_BATTLE', battleId: s.battle!.id })
  const trigger = legal(s, 'bob').find(a => a.type === 'ANSWER_TRIGGER')
  assert.ok(trigger?.type === 'ANSWER_TRIGGER', 'Bob is offered the [Trigger] of the revealed Diable Jambe')
  s = act(s, 'bob', { type: 'ANSWER_TRIGGER', choiceId: trigger.choiceId, activate: true })
  const options = optionIds(s, 'bob')
  assert.ok(options.includes(chopper), 'Chopper has its own [Blocker] and costs 1')
  assert.ok(!options.includes(luffy), 'ST01-012 only mentions [Blocker] in its text')
  s = choose(s, 'bob', [chopper]); assert.equal(zoneOf(s, chopper), 'trash')
  roundTrip(s)
})

test('M6 ST-01 FAQ ST01-012: after the Luffy battle, another attacker can be blocked again', () => {
  let s = game()
  const luffy = put(s, 'alice', 'ST01-012', 'characters'), other = put(s, 'alice', vanillaRed(4000), 'characters')
  put(s, 'bob', 'ST01-006', 'characters')
  attachDon(s, 'alice', luffy, 2)
  s = attack(s, luffy, leaderOf(s, 'bob'))
  assert.ok(!legal(s, 'bob').some(a => a.type === 'ACTIVATE_BLOCKER'), 'no [Blocker] during this battle')
  s = act(s, 'bob', { type: 'PASS_BLOCKER', battleId: s.battle!.id }); s = act(s, 'bob', { type: 'PASS_COUNTER', battleId: s.battle!.id })
  s = act(s, 'alice', { type: 'RESOLVE_BATTLE', battleId: s.battle!.id })
  while (legal(s, 'bob').some(a => a.type === 'ANSWER_TRIGGER')) { const t = legal(s, 'bob').find(a => a.type === 'ANSWER_TRIGGER') as { choiceId: string }; s = act(s, 'bob', { type: 'ANSWER_TRIGGER', choiceId: t.choiceId, activate: false }) }
  s = attack(s, other, leaderOf(s, 'bob'))
  assert.ok(legal(s, 'bob').some(a => a.type === 'ACTIVATE_BLOCKER'), 'the next battle allows [Blocker]')
})

test('M6 ST-01 FAQ ST01-005: Jinbe may give +1000 to another Jinbe (other than this card means this Character)', () => {
  let s = game()
  const a = put(s, 'alice', 'ST01-005', 'characters'), b = put(s, 'alice', 'ST01-005', 'characters')
  attachDon(s, 'alice', a, 1)
  s = attack(s, a, leaderOf(s, 'bob'))
  const options = optionIds(s, 'alice')
  assert.ok(options.includes(b) && !options.includes(a), 'the other Jinbe is a target, the attacking one is not')
  s = choose(s, 'alice', [b]); assert.equal(power(s, b), 6000)
})

test('M6 ST-01 FAQ ST01-001 and erratum: Leader Luffy gives up to 1 rested DON!!, never an attached one', () => {
  let s = game()
  const robin = put(s, 'alice', 'ST01-008', 'characters')
  const cost = s.players[0].zones.cost
  s.instances[cost[0]].rested = true; s.instances[cost[1]].rested = true
  attachDon(s, 'alice', robin, 1)
  const effect = offeredEffects(s, 'alice', 'ST01-001')[0]
  s = act(s, 'alice', { type: 'START_EFFECT', effectId: effect.effectId })
  const choice = pendingChoice(s, 'alice')!
  assert.equal(choice.min, 0, 'up to 1 (erratum)')
  const attached = s.players[0].zones.attached
  assert.ok(choice.options.every(o => !('instanceId' in o) || !attached.includes(o.instanceId!)), 'a DON!! already given is not a rested DON!! card')
  s = act(s, 'alice', { type: 'ANSWER_CHOICE', choiceId: choice.choiceId, tokens: [] })
  assert.equal(s.effects?.choice, null)
  assert.ok(!legal(s, 'alice').some(a => a.type === 'START_EFFECT' && a.effectId === effect.effectId), 'once per turn')
})

test('M6 ST-01 FAQ ST01-011: Brook gives up to 2 rested DON!! to a single card, and may give only 1', () => {
  let s = game(5)
  for (const id of s.players[0].zones.cost.slice(0, 3)) s.instances[id].rested = true
  const robin = put(s, 'alice', 'ST01-008', 'characters')
  const brook = put(s, 'alice', 'ST01-011', 'hand')
  s = playCard(s, 'alice', brook)
  const dons = optionIds(s, 'alice')
  assert.ok(dons.length >= 2)
  s = choose(s, 'alice', [dons[0]])
  const target = pendingChoice(s, 'alice')!
  assert.equal(target.max, 1, 'one recipient only: no split between two cards')
  s = choose(s, 'alice', [robin])
  assert.equal(s.players[0].zones.attached.filter(id => s.instances[id].attachedTo === robin).length, 1)
  roundTrip(s)
})

test('M6 ST-01 FAQ ST01-002: a Blocker keeps the attack after a Counter raises it above the Usopp limit', () => {
  let s = game()
  const usopp = put(s, 'alice', 'ST01-002', 'characters'), blocker = put(s, 'bob', 'ST01-006', 'characters')
  attachDon(s, 'alice', usopp, 2)
  s = attack(s, usopp, leaderOf(s, 'bob'))
  const block = legal(s, 'bob').find(a => a.type === 'ACTIVATE_BLOCKER') as { blockerIds: string[] } | undefined
  assert.ok(block?.blockerIds.includes(blocker), 'a 1000 power Blocker may block Usopp')
  s = act(s, 'bob', { type: 'ACTIVATE_BLOCKER', blockerId: blocker, battleId: s.battle!.id })
  const counter = put(s, 'bob', 'ST01-011', 'hand')
  s = act(s, 'bob', { type: 'PLAY_COUNTER_CHARACTER', cardId: counter, targetId: blocker, battleId: s.battle!.id })
  assert.equal(s.battle!.target.instanceId, blocker, 'the target stays the Character that blocked')
})

test('M6 ST-01 FAQ ST01-004 and ST01-017: a rested Sanji cannot attack; Thousand Sunny can be used on the turn it is played', () => {
  let s = game(5)
  const sanji = put(s, 'alice', 'ST01-004', 'characters', { playedEarlier: false })
  attachDon(s, 'alice', sanji, 2)
  assert.ok((legal(s, 'alice').find(a => a.type === 'DECLARE_ATTACK') as { attackerIds: string[] } | undefined)?.attackerIds.includes(sanji), 'Rush with 2 DON!!')
  s.instances[sanji].rested = true
  assert.ok(!(legal(s, 'alice').find(a => a.type === 'DECLARE_ATTACK') as { attackerIds: string[] } | undefined)?.attackerIds.includes(sanji), 'rested: no attack')
  const sunny = put(s, 'alice', 'ST01-017', 'hand')
  s = playCard(s, 'alice', sunny)
  assert.ok(offeredEffects(s, 'alice', 'ST01-017.activate-main-boost').length, 'usable on the turn played')
})

test('M6 ST-01 deck: the exact Starter Deck composition is legal under MUGIWARA_FREE', () => {
  const deck = STARTER_DECKS.find(d => d.id === 'starter-st01')!
  assert.equal(deck.entries.reduce((n, e) => n + e.quantity, 0), 51)
  const { definitions, printings } = engineCatalog()
  assert.deepEqual(validateEngineDeck(deck.entries, definitions, printings, FREE_RULESET, 'playable'), [])
  for (const e of deck.entries) assert.ok(definitionOf(e.printingKey.split('::')[0]))
})

test('M6 ST-01 certificates: all 17 numbers are PLAYABLE_VERIFIED, each certificate validates against the current registry', async () => {
  const { ST01_CERTIFICATIONS, certificationErrors, effectiveStatus } = await import('../src/game/cards/certification')
  const { currentEngineRegistry } = await import('../src/lib/engine/catalog')
  const { definitions } = engineCatalog(), registry = currentEngineRegistry()
  for (const c of ST01_CERTIFICATIONS) assert.deepEqual(certificationErrors(c, definitions.find(d => d.definitionId === c.definitionId), registry), [], c.definitionId)
  const st01Numbers = Array.from({ length: 17 }, (_, i) => `ST01-${String(i + 1).padStart(3, '0')}`)
  for (const n of st01Numbers) assert.equal(effectiveStatus(definitionOf(n)), 'PLAYABLE_VERIFIED', n)
})

test('M6 ST-01 deck: offered in /play, full bot games end with a winner at every level, legal commands only, JSON-restorable', async () => {
  const { REFERENCE_DECKS, deckEligibility } = await import('../src/lib/engine/decks')
  const { playMatch } = await import('../src/lib/engine/strategy')
  const { currentEngineRegistry, engineRuleset } = await import('../src/lib/engine/catalog')
  const deck = REFERENCE_DECKS.find(d => d.id === 'starter-st01')
  assert.ok(deck, 'the certified ST-01 Starter Deck is listed in /play')
  assert.deepEqual(deckEligibility(deck!.entries), { ok: true, errors: [] })
  const purple = REFERENCE_DECKS.find(d => d.id === 'reference-purple')!, { definitions, printings } = engineCatalog()
  for (const [seed, level] of [[3, 'easy'], [11, 'normal'], [19, 'hard'], [27, 'hard']] as const) {
    const r = playMatch({ definitions, printings, gameId: 'st01-bots', seed, scope: 'BASIC_TURNS', chooserId: 'p1', ruleset: engineRuleset(), effectRegistry: currentEngineRegistry(),
      players: [{ id: 'p1', cards: structuredClone(deck!.entries), donCount: 10 }, { id: 'p2', cards: structuredClone(purple.entries), donCount: 10 }] }, { p1: level, p2: level })
    assert.ok(r.winner, `seed ${seed}: the game ends with a winner`); assert.equal(r.fallbacks, 0); assert.equal(r.refused, 0)
  }
})

test('M6 CR 3-7-6-1: a Trigger "Play this card" with 5 Characters trashes 1 chosen Character first (rule processing)', () => {
  let s = game()
  const own = ['ST01-008', 'ST01-008', 'ST01-008', 'ST01-005', 'ST01-005'].map(n => put(s, 'bob', n, 'characters'))
  const usopp = put(s, 'bob', 'ST01-002', 'life')
  const attacker = put(s, 'alice', vanilla('RED', 5000, 5000), 'characters')
  s = attack(s, attacker, leaderOf(s, 'bob'))
  s = act(s, 'bob', { type: 'PASS_BLOCKER', battleId: s.battle!.id }); s = act(s, 'bob', { type: 'PASS_COUNTER', battleId: s.battle!.id })
  s = act(s, 'alice', { type: 'RESOLVE_BATTLE', battleId: s.battle!.id })
  const trigger = legal(s, 'bob').find(a => a.type === 'ANSWER_TRIGGER') as { choiceId: string }
  s = act(s, 'bob', { type: 'ANSWER_TRIGGER', choiceId: trigger.choiceId, activate: true })
  const choice = pendingChoice(s, 'bob')!
  assert.equal(choice.min, 1); assert.deepEqual(optionIds(s, 'bob').sort(), [...own].sort())
  s = roundTrip(s)
  s = choose(s, 'bob', [own[2]])
  assert.equal(zoneOf(s, own[2]), 'trash', 'the chosen Character is trashed')
  assert.equal(zoneOf(s, usopp), 'characters'); assert.equal(s.players[1].zones.characters.length, 5)
  assert.ok(!s.effects!.cardEvents!.some(e => e.type === 'CARD_KO' && e.subjectId === own[2]), 'not a K.O.')
})
