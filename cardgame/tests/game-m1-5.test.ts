import { test } from 'node:test'
import assert from 'node:assert/strict'
import { consolidateDefinitions } from '../src/game/cards/adapter'
import { REVIEWED_CARDS } from '../src/game/cards/reviewedCards'
import { M0_RULESET } from '../src/game/rulesets/m0'
import { createGame, applyCommand, getLegalActions, projectState, restoreGame } from '../src/game/core/game'
import { assertGameInvariants } from '../src/game/core/invariants'
import { effectivePower } from '../src/game/core/turns'
import type { CardInput } from '../src/game/cards/types'
import type { GameInput, GameState, TurnIntent } from '../src/game/core/types'

function input(seed = 42): GameInput {
  const cards: CardInput[] = Object.entries(REVIEWED_CARDS).map(([number, facts]) => ({ ...structuredClone(facts), number, printingKey: `${number}::standard`, extensions: [], databaseIds: [], life: facts.category === 'LEADER' ? 5 : null, lifeEvidence: facts.category === 'LEADER' ? [{ field: 'life', value: 5, source: 'https://en.onepiece-cardgame.com/cardlist/?series=569001', checkedAt: '2026-10-10', language: 'en' }] : [] }))
  // A synthetic vanilla Stage fixture. Never persisted or presented as an official card.
  const stage = structuredClone(cards.find(c => c.number === 'ST01-003')!)
  Object.assign(stage, { number: 'OP99-998', printingKey: 'OP99-998::standard', category: 'STAGE', nameFr: 'Fixture Stage', rulesName: 'Fixture Stage', cost: 2, power: null, counter: null, attributes: [] })
  cards.push(stage)
  const catalog = consolidateDefinitions(cards); assert.deepEqual(catalog.errors, [])
  const main = cards.filter(c => c.category === 'CHARACTER' && c.number !== 'P-016').map(c => ({ printingKey: c.printingKey, quantity: 4 }))
  main.push({ printingKey: stage.printingKey, quantity: 2 })
  const deck = [{ printingKey: 'ST01-001::standard', quantity: 1 }, ...main]
  return { ...catalog, gameId: 'turn-test', seed, scope: 'BASIC_TURNS', chooserId: 'alice', players: [{ id: 'alice', cards: structuredClone(deck), donCount: 10 }, { id: 'bob', cards: structuredClone(deck), donCount: 10 }], ruleset: { ...structuredClone(M0_RULESET), date: '2026-10-11', allowedNumbers: [...M0_RULESET.allowedNumbers, 'OP99-998'] } }
}
function command(s: GameState, intent: TurnIntent) { return { ...intent, id: `c-${s.version}`, actorId: s.activePlayerId!, expectedVersion: s.version } }
function act(s: GameState, intent: TurnIntent): GameState {
  const r = applyCommand(s, command(s, intent)); if (!r.ok) assert.fail(r.error)
  assertGameInvariants(r.state)
  return r.state
}
function prepared(first: 'FIRST' | 'SECOND' = 'FIRST', options = input()) {
  let s = createGame(options)
  const chosen = applyCommand(s, { id: 'choose', actorId: 'alice', expectedVersion: 0, type: 'CHOOSE_FIRST', choice: first }); if (!chosen.ok) assert.fail(chosen.error)
  s = chosen.state
  for (let n = 0; n < 2; n++) {
    const result = applyCommand(s, { id: `keep-${n}`, actorId: s.decisionPlayerId!, expectedVersion: s.version, type: 'MULLIGAN', redraw: false }); if (!result.ok) assert.fail(result.error)
    s = result.state
  }
  return s
}
function toMain(s: GameState) {
  while (s.phase !== 'MAIN' && !s.result) s = act(s, { type: 'ADVANCE_PHASE' })
  return s
}
function end(s: GameState) { return act(act(s, { type: 'END_MAIN' }), { type: 'ADVANCE_PHASE' }) }
function funded() {
  let s = toMain(prepared())
  while (s.turn < 11) s = toMain(end(s))
  return s
}
function active(s: GameState) { return s.players.find(p => p.id === s.activePlayerId)! }
function readyDon(s: GameState) { return active(s).zones.cost.filter(id => !s.instances[id].rested) }
// Arrange isolated snapshot fixtures, preserving every instance and private zone flags.
function handCard(s: GameState, number: string) {
  const p = active(s)
  const held = p.zones.hand.find(id => s.instances[id].printingKey === `${number}::standard`)
  if (held) return held
  const id = p.zones.deck.find(id => s.instances[id].printingKey === `${number}::standard`)!
  assert.ok(id, number)
  p.zones.deck.splice(p.zones.deck.indexOf(id), 1); p.zones.hand.push(id)
  s.instances[id].zone = 'hand'; s.instances[id].zoneGeneration++
  return id
}
function play(s: GameState, number: string, replaceId: string | null = null) {
  const id = handCard(s, number)
  const d = s.catalog.definitions.find(d => d.number === number)!
  return act(s, { type: 'PLAY_CARD', instanceId: id, donIds: readyDon(s).slice(0, d.cost!), replaceId })
}
function rejected(s: GameState, intent: TurnIntent) {
  const before = JSON.stringify(s)
  const r = applyCommand(s, command(s, intent))
  assert.equal(r.ok, false); assert.equal(JSON.stringify(s), before)
}

// Bandai v1.2.1 §§6-1..6-4: both orders, skip first player's first draw, only 1 DON.
test('M1.5 both orders execute the first two turns with exact Draw and DON exceptions', () => {
  for (const order of ['FIRST', 'SECOND'] as const) {
    let s = prepared(order)
    const first = s.firstPlayerId!
    s = toMain(s)
    assert.equal(active(s).id, first); assert.equal(active(s).zones.hand.length, 5)
    assert.equal(active(s).zones.cost.length, 1); assert.equal(active(s).zones.donDeck.length, 9)
    s = toMain(end(s))
    assert.notEqual(active(s).id, first); assert.equal(active(s).zones.hand.length, 6)
    assert.equal(active(s).zones.cost.length, 2); assert.equal(active(s).zones.donDeck.length, 8)
    s = toMain(end(s))
    assert.equal(active(s).id, first); assert.equal(active(s).zones.hand.length, 6)
    assert.equal(active(s).zones.cost.length, 3)
  }
})
test('M1.5 phases expose only active-player decisions and cannot be skipped', () => {
  let s = prepared()
  for (const phase of ['REFRESH', 'DRAW', 'DON'] as const) {
    assert.equal(s.phase, phase)
    assert.deepEqual(getLegalActions(s, 'bob'), [])
    assert.deepEqual(getLegalActions(s, 'alice'), [{ type: 'ADVANCE_PHASE' }])
    rejected(s, { type: 'END_MAIN' })
    s = act(s, { type: 'ADVANCE_PHASE' })
  }
  assert.equal(s.phase, 'MAIN'); rejected(s, { type: 'ADVANCE_PHASE' })
  s = act(s, { type: 'END_MAIN' }); assert.equal(s.phase, 'END')
  rejected(s, { type: 'END_MAIN' })
  s = act(s, { type: 'ADVANCE_PHASE' }); assert.equal(s.phase, 'REFRESH'); assert.equal(s.activePlayerId, 'bob')
})
// §6-4-2/3: distribute the remaining DON, never fabricate any.
test('M1.5 DON distribution handles one remaining and zero, preserving all ten per player', () => {
  let s = toMain(prepared())
  while (s.turn < 11) s = toMain(end(s))
  assert.equal(active(s).zones.cost.length, 10); assert.equal(active(s).zones.donDeck.length, 0)
  assert.equal(s.events.filter(e => e.type === 'DON_ADDED').length, 11)
  s = toMain(end(s)); assert.equal(active(s).zones.cost.length, 10)
  s = toMain(end(s)); assert.equal(active(s).zones.cost.length, 10)
  assert.equal(Object.values(s.instances).filter(i => i.kind === 'DON').length, 20)
})
// §§2-7, 6-5-3: exact payment, active DON only; played cards enter active.
test('M1.5 playing a Character pays its exact cost and preserves all instances', () => {
  let s = toMain(prepared()); const id = handCard(s, 'ST01-003'); const don = readyDon(s)[0]
  const before = JSON.stringify(s)
  s = act(s, { type: 'PLAY_CARD', instanceId: id, donIds: [don], replaceId: null })
  assert.ok(active(s).zones.characters.includes(id)); assert.equal(s.instances[id].rested, false)
  assert.equal(s.instances[id].faceUp, true); assert.equal(s.instances[don].rested, true)
  assert.equal(s.instances[id].playedOnTurn, 1); assert.equal(Object.keys(s.instances).length, 122)
  assert.ok(before.includes(id)); assert.deepEqual(s.events.slice(-2).map(e => e.type), ['CARD_REVEALED', 'CARD_PLAYED'])
})
test('M1.5 rejects insufficient, duplicate, foreign and already rested payment without mutations', () => {
  let s = toMain(prepared()); const expensive = handCard(s, 'ST01-010')
  rejected(s, { type: 'PLAY_CARD', instanceId: expensive, donIds: readyDon(s), replaceId: null })
  s = funded(); const id = handCard(s, 'OP99-998'); const don = readyDon(s)[0]
  rejected(s, { type: 'PLAY_CARD', instanceId: id, donIds: [don, don], replaceId: null })
  rejected(s, { type: 'PLAY_CARD', instanceId: id, donIds: [s.players[1].zones.cost[0], don], replaceId: null })
  s.instances[don].rested = true
  rejected(s, { type: 'PLAY_CARD', instanceId: id, donIds: [don, readyDon(s)[0]], replaceId: null })
})
// §3-7-6 and §6-5-5-4: replacement is a rule trash, not KO; DON return rested.
test('M1.5 sixth Character requires a chosen replacement and returns its attached DON rested', () => {
  let s = funded()
  for (let n = 0; n < 5; n++) {
    const id = [...active(s).zones.hand, ...active(s).zones.deck].find(id => {
      const d = s.catalog.definitions.find(d => d.definitionId === s.instances[id].definitionId)!
      return d.category === 'CHARACTER' && d.cost === 1
    })!
    const number = s.catalog.definitions.find(d => d.definitionId === s.instances[id].definitionId)!.number
    s = play(s, number)
  }
  const target = active(s).zones.characters[0]; const don = readyDon(s)[0]
  s = act(s, { type: 'ATTACH_DON', donIds: [don], targetId: target })
  const id = handCard(s, 'ST01-009')
  rejected(s, { type: 'PLAY_CARD', instanceId: id, donIds: readyDon(s).slice(0, 2), replaceId: null })
  s = act(s, { type: 'PLAY_CARD', instanceId: id, donIds: readyDon(s).slice(0, 2), replaceId: target })
  assert.equal(active(s).zones.characters.length, 5); assert.ok(active(s).zones.trash.includes(target))
  assert.equal(s.instances[don].zone, 'cost'); assert.equal(s.instances[don].rested, true); assert.equal(s.instances[don].attachedTo, null)
  assert.deepEqual(s.events.slice(-3).map(e => e.type), ['CARD_REVEALED', 'CARD_TRASHED', 'CARD_PLAYED'])
})
test('M1.5 Stage play replaces the existing Stage; wrong replacement and premature trash are rejected', () => {
  let s = funded(); s = play(s, 'OP99-998')
  const old = active(s).zones.stage[0]
  // Force the other Stage into hand, not the already played one.
  const id = handCard(s, 'OP99-998')
  rejected(s, { type: 'PLAY_CARD', instanceId: id, donIds: readyDon(s).slice(0, 2), replaceId: active(s).zones.leader[0] })
  s = act(s, { type: 'PLAY_CARD', instanceId: id, donIds: readyDon(s).slice(0, 2), replaceId: null })
  assert.deepEqual(active(s).zones.stage, [id]); assert.ok(active(s).zones.trash.includes(old))
  assert.equal(s.instances[old].faceUp, true)
})
// §§6-5-5, 6-2: boost during owner's turn only; attached DON return in owner's Refresh.
test('M1.5 attachments affect power only on own turn and Refresh restores all field resources', () => {
  let s = funded(); s = play(s, 'ST01-003'); s = play(s, 'OP99-998')
  const p = active(s); const leader = p.zones.leader[0]; const character = p.zones.characters[0]; const stage = p.zones.stage[0]
  const donors = readyDon(s).slice(0, 2)
  s = act(s, { type: 'ATTACH_DON', donIds: donors, targetId: leader })
  assert.equal(effectivePower(s, leader), 7000)
  s.instances[leader].rested = true; s.instances[character].rested = true; s.instances[stage].rested = true
  const costBefore = s.players[0].zones.cost.length
  s = end(s); assert.equal(effectivePower(s, leader), 5000)
  assert.equal(s.players[0].zones.attached.length, 2)
  s = end(toMain(s)); assert.equal(s.phase, 'REFRESH')
  s = act(s, { type: 'ADVANCE_PHASE' })
  assert.equal(s.players[0].zones.attached.length, 0)
  assert.equal(s.players[0].zones.cost.length, costBefore + 2)
  for (const id of [...s.players[0].zones.cost, leader, character, stage]) assert.equal(s.instances[id].rested, false)
  assert.equal(effectivePower(s, leader), 5000)
})
test('M1.5 attachment rejects stages, opponents, rested DON, duplicates and empty lists', () => {
  let s = funded(); s = play(s, 'OP99-998')
  const don = readyDon(s)[0], leader = active(s).zones.leader[0]
  for (const intent of [
    { type: 'ATTACH_DON' as const, donIds: [don], targetId: active(s).zones.stage[0] },
    { type: 'ATTACH_DON' as const, donIds: [don], targetId: s.players[1].zones.leader[0] },
    { type: 'ATTACH_DON' as const, donIds: [don, don], targetId: leader },
    { type: 'ATTACH_DON' as const, donIds: [], targetId: leader },
  ]) rejected(s, intent)
  s.instances[don].rested = true
  rejected(s, { type: 'ATTACH_DON', donIds: [don], targetId: leader })
})
test('M1.5 actions list affordable hand cards and active DON only; Events and abilities are unavailable', () => {
  const s = toMain(prepared()); const id = handCard(s, 'ST01-003'); const expensive = handCard(s, 'ST01-010')
  const actions = getLegalActions(s, 'alice')
  assert.ok(actions.some(a => a.type === 'PLAY_CARD' && a.instanceId === id))
  assert.equal(actions.some(a => a.type === 'PLAY_CARD' && a.instanceId === expensive), false)
  assert.equal(actions.some(a => String(a.type) === 'ATTACK' || String(a.type) === 'ACTIVATE_EFFECT'), false)
  assert.equal(applyCommand(s, { ...command(s, { type: 'END_MAIN' }), type: 'ACTIVATE_EFFECT' }).ok, false)
})
test('M1.5 zero-cost fixture can be played without DON; zero Life alone is not defeat', () => {
  const options = input()
  const karoo = options.definitions.find(d => d.number === 'ST01-003')!; karoo.cost = 0 // Numeric edge fixture, not an official correction.
  const leader = options.definitions.find(d => d.category === 'LEADER')!; leader.life = 0; leader.lifeEvidence[0].value = 0
  let s = toMain(prepared('FIRST', options)); const id = handCard(s, 'ST01-003')
  s = act(s, { type: 'PLAY_CARD', instanceId: id, donIds: [], replaceId: null })
  assert.equal(readyDon(s).length, 1); assert.equal(s.result, null)
})
// §§9-1, 9-2-1-2: drawing LAST card loses immediately, not a turn later.
test('M1.5 drawing the last deck card ends the game and disables every action', () => {
  let s = toMain(prepared())
  while (s.turn < 3) s = toMain(end(s))
  s = end(s); s = end(toMain(s)) // Alice turn 3, at Refresh.
  const p = active(s)
  while (p.zones.deck.length > 1) {
    const id = p.zones.deck.shift()!; p.zones.hand.push(id); s.instances[id].zone = 'hand'; s.instances[id].zoneGeneration++
  }
  s = act(s, { type: 'ADVANCE_PHASE' }); assert.equal(s.phase, 'DRAW')
  s = act(s, { type: 'ADVANCE_PHASE' })
  assert.deepEqual(s.result, { reason: 'EMPTY_DECK', loserIds: ['alice'], winnerId: 'bob' })
  assert.equal(s.phase, 'DRAW'); assert.deepEqual(getLegalActions(s, 'alice'), [])
  rejected(s, { type: 'ADVANCE_PHASE' })
})
test('M1.5 an already empty deck resolves at the next rule boundary without inventing a card', () => {
  let s = toMain(prepared()); const p = active(s)
  for (const id of p.zones.deck.splice(0)) { p.zones.hand.push(id); s.instances[id].zone = 'hand'; s.instances[id].zoneGeneration++ }
  s = act(s, { type: 'END_MAIN' })
  assert.equal(s.result!.winnerId, 'bob'); assert.equal(Object.keys(s.instances).length, 122)
})
test('M1.5 repeated phase, play and attachment commands are idempotent; stale changes are refused', () => {
  let s = funded()
  const id = handCard(s, 'ST01-003')
  const intents: TurnIntent[] = [{ type: 'PLAY_CARD', instanceId: id, donIds: readyDon(s).slice(0, 1), replaceId: null }, { type: 'ATTACH_DON', donIds: readyDon(s).slice(1, 2), targetId: active(s).zones.leader[0] }, { type: 'END_MAIN' }, { type: 'ADVANCE_PHASE' }]
  for (const intent of intents) {
    const c = command(s, intent), first = applyCommand(s, c); if (!first.ok) assert.fail(first.error)
    const repeated = applyCommand(first.state, Object.fromEntries(Object.entries(c).reverse())); if (!repeated.ok) assert.fail(repeated.error)
    assert.equal(repeated.replayed, true); assert.deepEqual(repeated.state, first.state)
    assert.deepEqual(applyCommand(first.state, { ...c, id: 'new-stale' }), { ok: false, error: 'STALE_VERSION' })
    s = first.state
  }
})
test('M1.5 projection reveals public field/trash/attachments, never hidden cards or payment history', () => {
  let s = funded(); s = play(s, 'ST01-003')
  s = act(s, { type: 'ATTACH_DON', donIds: readyDon(s).slice(0, 1), targetId: active(s).zones.characters[0] })
  const view = projectState(s, 'bob'), json = JSON.stringify(view)
  assert.equal(view.players[0].characters.length, 1); assert.equal(view.players[0].attached.length, 1)
  assert.equal(view.players[0].hand, null)
  for (const p of s.players) for (const id of [...p.zones.deck, ...p.zones.life, ...(p.id === 'alice' ? p.zones.hand : [])]) assert.equal(json.includes(`"${id}"`), false)
  assert.equal('random' in view, false); assert.equal('commands' in view, false)
  assert.deepEqual(projectState(s, null).players.map(p => p.hand), [null, null])
  const forged = structuredClone(s)
  forged.events.push({ sequence: forged.events.length, type: 'DRAWN', publicInstanceId: forged.players[0].zones.deck[0] })
  assert.throws(() => projectState(forged, 'bob'), /PRIVATE_INSTANCE_IN_PUBLIC_EVENT/)
})
test('M1.5 serializable loop integrates setup, legal actions, immutable commands and restoration deterministically', () => {
  function run(seed: number) {
    let s = toMain(prepared('SECOND', input(seed)))
    while (s.turn < 15) {
      const allowed = getLegalActions(s, s.activePlayerId!)
      const candidate = allowed.find(a => a.type === 'PLAY_CARD' && !a.requiresReplacement)
      if (candidate?.type === 'PLAY_CARD') s = act(s, { type: 'PLAY_CARD', instanceId: candidate.instanceId, donIds: candidate.eligibleDonIds.slice(0, candidate.cost), replaceId: null })
      const attach = getLegalActions(s, s.activePlayerId!).find(a => a.type === 'ATTACH_DON')
      if (attach?.type === 'ATTACH_DON') s = act(s, { type: 'ATTACH_DON', donIds: attach.eligibleDonIds.slice(0, 1), targetId: attach.targetIds[0] })
      s = restoreGame(JSON.stringify(toMain(end(s))))
    }
    return s
  }
  const first = run(45); assert.deepEqual(first, run(45)); assert.notDeepEqual(first, run(46))
  assert.equal(Object.keys(first.instances).length, 122)
})
test('M1.5 scripted pass-only game reaches real deck exhaustion solely through legal commands', () => {
  let s = prepared()
  let acceptedCount = 0
  while (!s.result) {
    assert.ok(acceptedCount++ < 600)
    s = act(s, s.phase === 'MAIN' ? { type: 'END_MAIN' } : { type: 'ADVANCE_PHASE' })
  }
  assert.equal(s.result.reason, 'EMPTY_DECK'); assert.equal(s.result.loserIds[0], 'bob')
  assert.equal(Object.keys(s.instances).length, 122)
})
