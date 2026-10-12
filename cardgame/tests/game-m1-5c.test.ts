import test from 'node:test'
import { writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { createGame, applyCommand, getLegalActions, restoreGame, projectState, assertGameInvariants, evaluateCharacteristics, type GameState, type Command } from '../src/game/core'
import { consolidateDefinitions } from '../src/game/cards/adapter'
import { REVIEWED_CARDS } from '../src/game/cards/reviewedCards'
import { PROTOTYPE_REGISTRY, prototypeCards } from '../src/game/cards/effectPrototype'
import { validateRegistry, type EffectRegistry } from '../src/game/effects/contracts'
import { M0_RULESET } from '../src/game/rulesets/m0'
import type { CardInput } from '../src/game/cards/types'

type Intent = Command extends infer C ? C extends Command ? Omit<C, 'id' | 'actorId' | 'expectedVersion'> : never : never
function envelope(s: GameState, intent: Intent, actor = s.decisionPlayerId ?? s.activePlayerId!): Command { return { ...intent, actorId: actor, id: `c-${s.version}`, expectedVersion: s.version } }
function accept(s: GameState, intent: Intent, actor?: string) { const r = applyCommand(s, envelope(s, intent, actor)); if (!r.ok) assert.fail(r.error); assertGameInvariants(r.state); return r.state }
function reject(s: GameState, raw: unknown, error?: string) { const before = JSON.stringify(s), r = applyCommand(s, raw); assert.equal(r.ok, false); if (!r.ok && error) assert.equal(r.error, error); assert.equal(JSON.stringify(s), before) }
function input(registry: EffectRegistry = structuredClone(PROTOTYPE_REGISTRY), seed = 16) {
  const extra: CardInput[] = Object.entries(REVIEWED_CARDS).filter(([n, f]) => !prototypeCards().some(c => c.number === n) && f.review.effects.length === 0).map(([number, facts]) => ({ ...structuredClone(facts), number, printingKey: `${number}::standard`, databaseIds: [], extensions: [], life: null, lifeEvidence: [] }))
  const cards = [...prototypeCards(), ...extra], catalog = consolidateDefinitions(cards); assert.deepEqual(catalog.errors, [])
  const main = cards.filter(c => c.category !== 'LEADER'), quantities = main.map((c, i) => ({ printingKey: c.printingKey, quantity: i < 12 ? 4 : 2 }))
  // 13 distinct main numbers: 12*4 + 2 = 50. Retain only the first 13.
  const deck = [{ printingKey: 'ST01-001::standard', quantity: 1 }, ...quantities.slice(0, 13)]
  return { ...catalog, gameId: 'real-fx', seed, scope: 'BASIC_TURNS' as const, chooserId: 'alice', ruleset: { ...structuredClone(M0_RULESET), allowedNumbers: cards.map(c => c.number) },
    players: [{ id: 'alice', cards: deck, donCount: 10 }, { id: 'bob', cards: deck, donCount: 10 }] as [{ id: string; cards: typeof deck; donCount: number }, { id: string; cards: typeof deck; donCount: number }], effectRegistry: registry }
}
function game(registry?: EffectRegistry, seed?: number) {
  let s = createGame(input(registry, seed)); s = accept(s, { type: 'CHOOSE_FIRST', choice: 'FIRST' }); s = accept(s, { type: 'MULLIGAN', redraw: false }); s = accept(s, { type: 'MULLIGAN', redraw: false })
  while (s.phase !== 'MAIN') s = accept(s, { type: 'ADVANCE_PHASE' }); return s
}
function nextTurn(s: GameState) { s = accept(s, { type: 'END_MAIN' }); s = accept(s, { type: 'ADVANCE_PHASE' }); while (s.phase !== 'MAIN') s = accept(s, { type: 'ADVANCE_PHASE' }); return s }
function start(s: GameState, number: string, source?: string) { const action = getLegalActions(s, s.activePlayerId!).find(a => a.type === 'START_EFFECT' && a.effectId.startsWith(number + '.') && (!source || a.effectId.includes(source))); assert.ok(action && action.type === 'START_EFFECT'); return accept(s, { type: 'START_EFFECT', effectId: action.effectId }) }
function answer(s: GameState, ids: string[]) { const c = s.effects!.choice!; const tokens = ids.map(id => { const o = c.options.find(o => o.presence.instanceId === id); assert.ok(o); return o.token }); return accept(s, { type: 'ANSWER_CHOICE', choiceId: c.id, tokens }, c.actorId) }
function find(s: GameState, number: string, owner = 'alice') { return Object.values(s.instances).find(i => i.owner === owner && i.definitionId?.startsWith(number + '@') && i.zone === 'hand')?.id }
function playableGame(number: string) {
  for (let seed = 1; seed < 60; seed++) { let s = game(undefined, seed); s = nextTurn(nextTurn(s)); if (find(s, number)) return s }
  assert.fail('fixture seed with requested card not found')
}
function play(s: GameState, number: string) { const id = find(s, number); assert.ok(id); const action = getLegalActions(s, s.activePlayerId!).find(a => a.type === 'PLAY_CARD' && a.instanceId === id); assert.ok(action && action.type === 'PLAY_CARD'); return accept(s, { type: 'PLAY_CARD', instanceId: id, donIds: action.eligibleDonIds.slice(0, action.cost), replaceId: null }) }

test('reviewed card bundle validates and pins DSL 1.1 independently of artwork', () => { const s = game(); assert.equal(s.effects!.engineVersion, 'm1.5c-1'); assert.deepEqual(validateRegistry(JSON.parse(JSON.stringify(PROTOTYPE_REGISTRY))), PROTOTYPE_REGISTRY); assert.deepEqual(restoreGame(JSON.stringify(s)), s); assert.equal(s.automaticPlayReady, false) })
test('real Luffy zero choice completes without mandatory recipient or DON', () => { const s = start(game(), 'ST01-001'), end = answer(s, []); assert.equal(end.effects!.choice, null); assert.equal(end.effects!.events.length, 0); reject(end, envelope(end, { type: 'START_EFFECT', effectId: s.effects!.active!.definitionId })); assert.ok(!getLegalActions(end, 'alice').some(a => a.type === 'START_EFFECT' && a.effectId.startsWith('ST01-001.'))) })
test('Luffy uses only rested cost DON, never attached or DON-deck cards', () => {
  let s = play(playableGame('ST01-007'), 'ST01-007'); const don = s.players[0].zones.cost.find(id => s.instances[id].rested)!; s = start(s, 'ST01-001'); assert.deepEqual(s.effects!.choice!.options.map(o => o.presence.instanceId), s.players[0].zones.cost.filter(id => s.instances[id].rested));
  s = answer(s, [don]); s = answer(s, [s.players[0].zones.leader[0]]); assert.equal(s.instances[don].zone, 'attached'); assert.equal(s.effects!.events.at(-1)!.targetId, s.players[0].zones.leader[0]); assert.equal(evaluateCharacteristics(s, s.players[0].zones.leader[0]).power.current, 6000)
})
test('Nami can target herself and observes her once-per-turn limit', () => {
  let s = play(playableGame('ST01-007'), 'ST01-007'); const nami = s.players[0].zones.characters[0]; s = start(s, 'ST01-007', nami); const don = s.effects!.choice!.options[0].presence.instanceId; s = answer(s, [don]); s = answer(s, [nami]); assert.equal(s.instances[don].attachedTo, nami); assert.equal(evaluateCharacteristics(s, nami).power.current, 2000); assert.ok(!getLegalActions(s, 'alice').some(a => a.type === 'START_EFFECT' && a.effectId.startsWith('ST01-007.')))
})
test('source in hand/trash, opponent actor and wrong phase cannot activate', () => {
  const s = game(); reject(s, envelope(s, { type: 'START_EFFECT', effectId: 'ST01-007.attach:forged:0' })); const action = getLegalActions(s, 'alice').find(a => a.type === 'START_EFFECT'); assert.ok(action && action.type === 'START_EFFECT'); reject(s, envelope(s, { type: 'START_EFFECT', effectId: action.effectId }, 'bob'), 'ILLEGAL_ACTION'); const end = accept(s, { type: 'END_MAIN' }); reject(end, envelope(end, { type: 'START_EFFECT', effectId: action.effectId }), 'ILLEGAL_ACTION')
})
test('real effect JSON recovery across both choices, replay never doubles DON', () => {
  let s = play(playableGame('ST01-007'), 'ST01-007'); s = start(s, 'ST01-001'); const don = s.effects!.choice!.options[0].presence.instanceId; s = answer(restoreGame(JSON.stringify(s)), [don]); const c = s.effects!.choice!; const command = envelope(s, { type: 'ANSWER_CHOICE', choiceId: c.id, tokens: [c.options[0].token] }); const r = applyCommand(restoreGame(JSON.stringify(s)), command); assert.ok(r.ok); const replay = applyCommand(r.state, command); assert.ok(replay.ok && replay.replayed); assert.equal(replay.state.effects!.events.length, 1); reject(r.state, { ...command, id: 'other' }, 'STALE_VERSION')
})
test('pending real choice rejects normal command and invalid options without partial state', () => { const s = start(game(), 'ST01-001'); reject(s, envelope(s, { type: 'END_MAIN' }), 'ILLEGAL_ACTION'); reject(s, envelope(s, { type: 'ANSWER_CHOICE', choiceId: s.effects!.choice!.id, tokens: ['forged'] }), 'INVALID_CHOICE_RESPONSE') })
test('private hand, deck and Life remain hidden throughout real public choice', () => { const s = start(game(), 'ST01-001'); for (const viewer of ['bob', null]) { const json = JSON.stringify(projectState(restoreGame(JSON.stringify(s)), viewer)); for (const id of [...s.players[0].zones.hand, ...s.players[0].zones.deck, ...s.players[0].zones.life]) assert.ok(!json.includes(JSON.stringify(id))); assert.ok(!json.includes('registry')); assert.ok(!json.includes('bindings')) } })
test('Brook triggers from confirmed PLAY_CARD and can give zero, one or two DON', () => {
  for (const count of [0, 1, 2]) { let s = play(playableGame('ST01-011'), 'ST01-011'); assert.equal(s.effects!.active!.definitionId, 'ST01-011.attach'); assert.equal(s.effects!.choice!.max, 2); const dons = s.effects!.choice!.options.slice(0, count).map(o => o.presence.instanceId); s = answer(s, dons); if (count) s = answer(s, [s.players[0].zones.characters[0]]); assert.equal(s.effects!.events.length, count); if (count) assert.equal(new Set(s.effects!.events.map(e => e.targetId)).size, 1); assert.equal(s.effects!.choice, null) }
})
test('Brook cannot be manually activated or triggered by an invalid play', () => { const s = playableGame('ST01-011'), id = find(s, 'ST01-011')!; assert.ok(!getLegalActions(s, 'alice').some(a => a.type === 'START_EFFECT' && a.effectId.startsWith('ST01-011.'))); reject(s, envelope(s, { type: 'PLAY_CARD', instanceId: id, donIds: [], replaceId: null }), 'INVALID_PAYMENT'); assert.equal(s.effects!.cardEvents!.length, 0) })
test('Brook confirmed play replay cannot enqueue a second trigger', () => { const s = playableGame('ST01-011'), id = find(s, 'ST01-011')!, dons = s.players[0].zones.cost.filter(id => !s.instances[id].rested).slice(0, 2), c = envelope(s, { type: 'PLAY_CARD', instanceId: id, donIds: dons, replaceId: null }); const r = applyCommand(s, c); assert.ok(r.ok); const replay = applyCommand(r.state, c); assert.ok(replay.ok && replay.replayed); assert.deepEqual(replay.state, r.state) })
test('Brook auto trigger does not recreate after serialization or later phase', () => { let s = answer(play(playableGame('ST01-011'), 'ST01-011'), []); const count = s.effects!.cardEvents!.length; s = nextTurn(restoreGame(JSON.stringify(s))); assert.equal(s.effects!.cardEvents!.length, count) })
test('Zoro continuous bonus includes both turns while normal DON bonus is own-turn only', () => {
  let s = play(playableGame('ST01-013'), 'ST01-013'); const zoro = s.players[0].zones.characters[0]; assert.deepEqual(evaluateCharacteristics(s, zoro).power, { printed: 5000, base: 5000, current: 5000 }); s = start(s, 'ST01-001'); s = answer(s, [s.effects!.choice!.options[0].presence.instanceId]); s = answer(s, [zoro]); assert.equal(evaluateCharacteristics(s, zoro).power.current, 7000); s = nextTurn(s); assert.equal(evaluateCharacteristics(s, zoro).power.current, 6000); s = nextTurn(s); assert.equal(evaluateCharacteristics(s, zoro).power.current, 5000)
})
test('Sunny pays REST_SOURCE before choice, cannot pay again while rested', () => { let s = play(playableGame('ST01-017'), 'ST01-017'); const sunny = s.players[0].zones.stage[0]; s = start(s, 'ST01-017'); assert.equal(s.instances[sunny].rested, true); assert.equal(s.effects!.cardEvents![0].type, 'SOURCE_RESTED'); s = answer(s, []); assert.ok(!getLegalActions(s, 'alice').some(a => a.type === 'START_EFFECT' && a.effectId.startsWith('ST01-017.'))); assert.equal(s.effects!.powerModifiers!.length, 0) })
test('Sunny excludes non-Straw-Hat cards and modifier lasts through End only', () => { let s = play(playableGame('ST01-017'), 'ST01-017'); const leader = s.players[0].zones.leader[0]; s = start(s, 'ST01-017'); assert.ok(s.effects!.choice!.options.every(o => s.catalog.definitions.find(d => d.definitionId === s.instances[o.presence.instanceId].definitionId)!.traits.includes('Straw Hat Crew'))); s = answer(s, [leader]); assert.equal(evaluateCharacteristics(s, leader).power.current, 6000); s = accept(s, { type: 'END_MAIN' }); assert.equal(evaluateCharacteristics(s, leader).power.current, 6000); s = accept(s, { type: 'ADVANCE_PHASE' }); assert.equal(evaluateCharacteristics(s, leader).power.current, 5000) })
test('invalid post-cost choice preserves paid cost and suspended prior command', () => { const s = start(play(playableGame('ST01-017'), 'ST01-017'), 'ST01-017'); reject(s, envelope(s, { type: 'ANSWER_CHOICE', choiceId: s.effects!.choice!.id, tokens: ['bad'] })); assert.equal(s.instances[s.players[0].zones.stage[0]].rested, true); assert.ok(s.effects!.choice) })
test('missing card program or incompatible registry blocks preparation explicitly', () => { const r = structuredClone(PROTOTYPE_REGISTRY); r.definitions = r.definitions.filter(d => d.id !== 'ST01-011.attach'); assert.throws(() => createGame(input(r)), /UNSUPPORTED_SETUP_EFFECT/); assert.throws(() => validateRegistry({ ...PROTOTYPE_REGISTRY, version: '2.0.0' })); assert.throws(() => validateRegistry({ ...PROTOTYPE_REGISTRY, definitions: [{ ...PROTOTYPE_REGISTRY.definitions[0], program: [{ kind: 'OPERATION', operation: { primitive: 'unknown' } }] }] }), /UNKNOWN_EFFECT_PRIMITIVE/) })
test('future new card definition executes an actual attachment with unchanged core and saved registry', () => {
  const run = () => {
    const registry = structuredClone(PROTOTYPE_REGISTRY), i = input(registry, 16)
    const original = i.definitions.find(d => d.number === 'ST01-007')!
    const future = structuredClone(original); future.number = 'OP99-999'; future.definitionId = 'OP99-999@TEST-FUTURE-SET'; future.review.revision = 'TEST-FUTURE-SET'; future.review.effects = [{ kind: 'declarative', abilityIds: ['TEST-FUTURE-SET.attach'] }]
    i.definitions.push(future)
    const printing = structuredClone(i.printings.find(p => p.printingKey === 'ST01-007::standard')!); printing.definitionId = future.definitionId; printing.printingKey = 'OP99-999::fixture'; i.printings.push(printing)
    i.ruleset.allowedNumbers.push(future.number)
    for (const p of i.players) p.cards = p.cards.map(c => c.printingKey === 'ST01-007::standard' ? { ...c, printingKey: printing.printingKey } : c)
    const program = structuredClone(registry.definitions.find(d => d.id === 'ST01-007.attach')!); program.id = 'TEST-FUTURE-SET.attach'; program.source = { kind: 'CARD_DEFINITION', definitionId: future.definitionId, zone: 'characters' }; registry.definitions.push(program)
    let s = createGame(i); s = accept(s, { type: 'CHOOSE_FIRST', choice: 'FIRST' }); s = accept(s, { type: 'MULLIGAN', redraw: false }); s = accept(s, { type: 'MULLIGAN', redraw: false }); while (s.phase !== 'MAIN') s = accept(s, { type: 'ADVANCE_PHASE' }); s = nextTurn(nextTurn(s))
    const id = find(s, future.number); assert.ok(id); s = play(s, future.number)
    const action = getLegalActions(s, 'alice').find(a => a.type === 'START_EFFECT' && a.effectId.startsWith(program.id)); assert.ok(action && action.type === 'START_EFFECT'); s = accept(s, { type: 'START_EFFECT', effectId: action.effectId })
    const don = s.effects!.choice!.options[0].presence.instanceId; s = answer(restoreGame(JSON.stringify(s)), [don]); s = answer(s, [id]); assert.equal(s.instances[don].attachedTo, id); assert.equal(s.effects!.events.length, 1); assert.deepEqual(restoreGame(JSON.stringify(s)), s); return s
  }
  assert.deepEqual(run(), run())
})
test('real-card runs deterministic and conserve all 122 instances over seeds', () => { for (const seed of [1, 2, 3, 4, 5]) { const run = () => answer(start(game(undefined, seed), 'ST01-001'), []); const a = run(); assert.deepEqual(a, run()); assert.equal(Object.keys(a.instances).length, 122); assertGameInvariants(a) } })

test('another Nami presence has an independent once-per-turn ledger', () => {
  let found: GameState | undefined
  for (let seed = 1; seed < 120; seed++) { let s = game(undefined, seed); s = nextTurn(nextTurn(s)); if (s.players[0].zones.hand.filter(id => s.instances[id].definitionId?.startsWith('ST01-007@')).length >= 2) { found = s; break } }
  assert.ok(found); let s = play(found, 'ST01-007'); s = play(s, 'ST01-007'); const [first, second] = s.players[0].zones.characters
  s = answer(start(s, 'ST01-007', first), []); assert.ok(getLegalActions(s, 'alice').some(a => a.type === 'START_EFFECT' && a.effectId.includes(second))); s = answer(start(s, 'ST01-007', second), []); assert.ok(!getLegalActions(s, 'alice').some(a => a.type === 'START_EFFECT' && a.effectId.startsWith('ST01-007.')))
})
test('ability identity captures source generation and rejects a forged former presence', () => {
  let s = play(playableGame('ST01-007'), 'ST01-007'); const source = s.players[0].zones.characters[0]; const a = getLegalActions(s, 'alice').find(a => a.type === 'START_EFFECT' && a.effectId.includes(source)); assert.ok(a && a.type === 'START_EFFECT'); reject(s, envelope(s, { type: 'START_EFFECT', effectId: a.effectId.replace(/:\d+$/, ':999') }), 'INVALID_EFFECT_COMMAND'); s = answer(start(s, 'ST01-007'), []); assert.deepEqual(restoreGame(JSON.stringify(s)), s)
})
test('a suspended card-source identity cannot be forged in a saved resolution', () => {
  const s = start(game(), 'ST01-001')
  for (const field of ['active', 'continuation', 'choice'] as const) { const raw = structuredClone(s), context = raw.effects![field]!.context; if (context.source.kind !== 'CARD') assert.fail(); context.source.definitionId = 'foreign'; assert.throws(() => restoreGame(JSON.stringify(raw))) }
})
test('wrong source zone and absent continuous source rejected at creation', () => {
  const r = structuredClone(PROTOTYPE_REGISTRY), d = r.definitions[0]; if (d.source.kind !== 'CARD_DEFINITION') assert.fail(); d.source.zone = 'stage'; assert.throws(() => createGame(input(r)), /INVALID_CARD_PROGRAM_SOURCE/)
  const c = structuredClone(PROTOTYPE_REGISTRY); c.continuous![0].definitionId = 'absent'; assert.throws(() => createGame(input(c)), /UNSUPPORTED_SETUP_EFFECT/)
})
test('unverified simultaneous On Play abilities are blocked rather than ordered lexically', () => {
  const r = structuredClone(PROTOTYPE_REGISTRY), brook = r.definitions.find(d => d.id === 'ST01-011.attach')!; r.definitions.push({ ...structuredClone(brook), id: 'second-on-play' })
  let found: GameState | undefined; for (let seed = 1; seed < 60; seed++) { let s = game(r, seed); s = nextTurn(nextTurn(s)); if (find(s, 'ST01-011')) { found = s; break } }
  assert.ok(found); const id = find(found, 'ST01-011')!, dons = found.players[0].zones.cost.filter(id => !found!.instances[id].rested).slice(0, 2)
  reject(found, envelope(found, { type: 'PLAY_CARD', instanceId: id, donIds: dons, replaceId: null }), 'SIMULTANEOUS_TRIGGER_ORDER_NOT_IMPLEMENTED')
})
test('known additive modifiers compose and projection consults the same evaluator', () => {
  let s = play(playableGame('ST01-013'), 'ST01-013'); const id = s.players[0].zones.characters[0]; s = nextTurn(nextTurn(s));
  // Fixture selects a seed with Sunny later in hand; using real commands only.
  if (!find(s, 'ST01-017')) {
    for (let seed = 1; seed < 100; seed++) { let trial = game(undefined, seed); trial = nextTurn(nextTurn(trial)); if (!find(trial, 'ST01-013')) continue; trial = play(trial, 'ST01-013'); trial = nextTurn(nextTurn(trial)); if (find(trial, 'ST01-017')) { s = trial; break } }
  }
  assert.ok(find(s, 'ST01-017')); s = play(s, 'ST01-017'); const zoro = s.players[0].zones.characters.find(i => s.instances[i].definitionId?.startsWith('ST01-013@'))!; s = answer(start(s, 'ST01-017'), [zoro]); s = start(s, 'ST01-001'); s = answer(s, [s.effects!.choice!.options[0].presence.instanceId]); s = answer(s, [zoro]); assert.equal(evaluateCharacteristics(s, zoro).power.current, 8000); const view = projectState(s, 'alice'); assert.equal(view.players[0].characters.find(c => c.id === zoro)!.power, 8000); assert.equal(evaluateCharacteristics(s, id).power.printed, 5000)
})
test('Luffy interacts with OP01 Hajrudin using the same DON primitive, no set branch', () => {
  let s: GameState | undefined
  for (let seed = 1; seed < 100; seed++) { let trial = game(undefined, seed); while (trial.turn < 5) trial = nextTurn(trial); if (find(trial, 'OP01-018')) { s = trial; break } }
  assert.ok(s); s = play(s, 'OP01-018'); const hajrudin = s.players[0].zones.characters[0]; s = start(s, 'ST01-001'); s = answer(s, [s.effects!.choice!.options[0].presence.instanceId]); s = answer(s, [hajrudin]); assert.equal(evaluateCharacteristics(s, hajrudin).power.current, 7000)
})
test('modifiers with unknown dependency/mode are rejected, not guessed', () => {
  const r = structuredClone(PROTOTYPE_REGISTRY); assert.throws(() => validateRegistry({ ...r, continuous: [{ ...r.continuous![0], mode: 'SET_BASE', dependencies: ['cycle'] }] }))
})

function koFixture() {
  for (let seed = 1; seed < 160; seed++) {
    let s = game(undefined, seed); while (s.turn < 9) s = nextTurn(s)
    if (!find(s, 'EB01-008') || !find(s, 'ST01-017') || !find(s, 'OP06-007', 'bob')) continue
    s = play(s, 'EB01-008'); const victim = s.players[0].zones.characters[0]
    s = nextTurn(s); const shanks = find(s, 'OP06-007', 'bob')!
    const action = getLegalActions(s, 'bob').find(a => a.type === 'PLAY_CARD' && a.instanceId === shanks); assert.ok(action && action.type === 'PLAY_CARD')
    s = accept(s, { type: 'PLAY_CARD', instanceId: shanks, donIds: action.eligibleDonIds.slice(0, action.cost), replaceId: null })
    return { state: s, victim }
  }
  assert.fail('real late-game fixture not found')
}
test('Shanks On Play confirms ordinary KO only after choosing a legal opponent target', () => {
  const { state, victim } = koFixture(); let s = answer(state, [victim]); assert.equal(s.effects!.choice!.actorId, 'alice'); s = answer(s, []); assert.equal(s.instances[victim].zone, 'trash'); assert.equal(s.effects!.cardOperations!.at(-1)!.type, 'KO'); assert.equal(s.effects!.cardOperations!.at(-1)!.outcome, 'CONFIRMED'); assert.equal(s.effects!.cardEvents!.filter(e => e.type === 'CARD_KO').length, 1)
})
test('real replacement discards Sunny instead of KO; never produces a false KO event', () => {
  const { state, victim } = koFixture(); let s = answer(state, [victim]); const stage = s.effects!.choice!.options[0].presence.instanceId; s = answer(restoreGame(JSON.stringify(s)), [stage]); assert.equal(s.instances[victim].zone, 'characters'); assert.equal(s.instances[stage].zone, 'trash'); assert.deepEqual(s.effects!.cardOperations!.map(o => [o.type, o.outcome]), [['KO', 'REPLACED'], ['TRASH_HAND', 'CONFIRMED']]); assert.equal(s.effects!.cardEvents!.filter(e => e.type === 'CARD_KO').length, 0); assert.equal(s.effects!.cardEvents!.filter(e => e.type === 'KO_REPLACED').length, 1); assertGameInvariants(s)
})
test('replacement private options belong to defender; Shanks controller cannot answer', () => {
  const { state, victim } = koFixture(), s = answer(state, [victim]), choice = s.effects!.choice!
  const attackView = JSON.stringify(projectState(s, 'bob')); for (const option of choice.options) assert.ok(!attackView.includes(JSON.stringify(option.presence.instanceId))); assert.ok(!attackView.includes(choice.id)); assert.ok('options' in projectState(s, 'alice').effects!.pendingChoice!); reject(s, envelope(s, { type: 'ANSWER_CHOICE', choiceId: choice.id, tokens: [choice.options[0].token] }, 'bob'), 'ILLEGAL_ACTION')
})
test('replacement resume is idempotent, stale response fails and no double hand discard', () => {
  const { state, victim } = koFixture(), s = answer(state, [victim]), choice = s.effects!.choice!, c = envelope(s, { type: 'ANSWER_CHOICE', choiceId: choice.id, tokens: [choice.options[0].token] }, 'alice'); const r = applyCommand(restoreGame(JSON.stringify(s)), c); assert.ok(r.ok); const replay = applyCommand(r.state, c); assert.ok(replay.ok && replay.replayed); assert.deepEqual(replay.state, r.state); reject(r.state, { ...c, id: 'stale' }, 'STALE_VERSION'); reject(r.state, { ...c, id: 'old', expectedVersion: r.state.version }, 'ILLEGAL_ACTION')
})
test('replacement cannot use a Character from hand or a forged card', () => { const { state, victim } = koFixture(), s = answer(state, [victim]), choice = s.effects!.choice!; assert.ok(choice.options.every(o => ['EVENT', 'STAGE'].includes(s.catalog.definitions.find(d => d.definitionId === s.instances[o.presence.instanceId].definitionId)!.category))); reject(s, envelope(s, { type: 'ANSWER_CHOICE', choiceId: choice.id, tokens: ['forged'] }, 'alice'), 'INVALID_CHOICE_RESPONSE') })
test('no payable replacement performs real KO directly, matching official EB01 FAQ', () => {
  const { state, victim } = koFixture(), raw = structuredClone(state), p = raw.players[0]
  // Authoritative fixture keeps all instances; remove eligible cards from hand before the KO selection.
  for (const id of [...p.zones.hand].filter(id => raw.catalog.definitions.find(d => d.definitionId === raw.instances[id].definitionId)!.category === 'STAGE')) { p.zones.hand.splice(p.zones.hand.indexOf(id), 1); p.zones.trash.push(id); raw.instances[id].zone = 'trash'; raw.instances[id].faceUp = true; raw.instances[id].zoneGeneration++ }
  assertGameInvariants(raw); const next = answer(raw, [victim]); assert.equal(next.effects!.choice, null); assert.equal(next.instances[victim].zone, 'trash')
})
test('Shanks zero targets completes without a KO or replacement choice', () => { const { state } = koFixture(), end = answer(state, []); assert.equal(end.effects!.choice, null); assert.equal(end.effects!.cardOperations!.length, 0) })
test('simultaneous real replacements explicitly blocked with no partial mutation', () => {
  const { state, victim } = koFixture(), raw = structuredClone(state); const rule = raw.effects!.registry.cardReplacements![0]; raw.effects!.registry.cardReplacements!.push({ ...rule, id: 'second-replacement' }); assertGameInvariants(raw); const c = raw.effects!.choice!; reject(raw, envelope(raw, { type: 'ANSWER_CHOICE', choiceId: c.id, tokens: [c.options.find(o => o.presence.instanceId === victim)!.token] }, 'bob'), 'REPLACEMENT_ORDER_NOT_IMPLEMENTED')
})
test('forged replacement continuation/actor/subject fails restoration', () => {
  const { state, victim } = koFixture(), s = answer(state, [victim])
  for (const mutate of [(r: GameState) => { r.effects!.continuation!.interception!.ownerId = 'bob' }, (r: GameState) => { r.effects!.continuation!.interception!.operation.subject.generation++ }, (r: GameState) => { r.effects!.choice!.actorId = 'bob' }]) { const raw = structuredClone(s); mutate(raw); assert.throws(() => restoreGame(JSON.stringify(raw))) }
})

test('paid replacement once-per-turn blocks a second KO in the same turn and presence', () => {
  const { state, victim } = koFixture(); let s = answer(state, [victim]); s = answer(s, [s.effects!.choice!.options[0].presence.instanceId]); const ledger = Object.keys(s.effects!.usage).find(k => k.includes('EB01-008.protect'))!; assert.ok(ledger)
  // Authoritative fixture: another Shanks in hand, sufficient active DON, and another payable Stage.
  // This arranges two confirmed On Play events; it does not invent an action that readies DON.
  const raw = structuredClone(s), bob = raw.players[1], alice = raw.players[0]
  const second = bob.zones.deck.find(id => raw.instances[id].definitionId?.startsWith('OP06-007@'))!, stage = alice.zones.deck.find(id => raw.instances[id].definitionId?.startsWith('ST01-017@'))!; assert.ok(second && stage)
  for (const [p, id] of [[bob, second], [alice, stage]] as const) { p.zones.deck.splice(p.zones.deck.indexOf(id), 1); p.zones.hand.push(id); raw.instances[id].zone = 'hand'; raw.instances[id].zoneGeneration++ }
  for (const id of bob.zones.cost) raw.instances[id].rested = false
  const configured = restoreGame(JSON.stringify(raw)); const action = getLegalActions(configured, 'bob').find(a => a.type === 'PLAY_CARD' && a.instanceId === second)!; assert.ok(action.type === 'PLAY_CARD')
  s = accept(configured, { type: 'PLAY_CARD', instanceId: second, donIds: action.eligibleDonIds.slice(0, action.cost), replaceId: null }); s = answer(s, [victim]); assert.equal(s.effects!.choice, null); assert.equal(s.instances[victim].zone, 'trash'); assert.equal(s.effects!.usage[ledger], 1)
})
test('pending KO is a proposal, never a confirmed operation before defender choice', () => {
  const { state, victim } = koFixture(), s = answer(state, [victim]); assert.equal(s.effects!.continuation!.interception!.operation.outcome, 'PROPOSED'); assert.equal(s.effects!.cardOperations!.length, 0); assert.equal(s.effects!.cardEvents!.filter(e => e.type === 'CARD_KO').length, 0)
})
test('replacement already consumed cannot be forged into a pending saved choice', () => {
  const { state, victim } = koFixture(); const s = answer(state, [victim]), done = answer(s, [s.effects!.choice!.options[0].presence.instanceId]); const forged = structuredClone(s); forged.effects!.usage = done.effects!.usage; assert.throws(() => restoreGame(JSON.stringify(forged)), /INVALID_REPLACEMENT_CHOICE/)
})
test('unsupported On KO trigger timing is refused at admission, never treated as vanilla', () => {
  const r = structuredClone(PROTOTYPE_REGISTRY); assert.throws(() => validateRegistry({ ...r, definitions: [{ ...r.definitions[0], timing: 'ON_KO' }] }))
})
test('Shanks targeting consults actual continuous power and excludes cards above threshold', () => {
  const { state, victim } = koFixture(); const raw = structuredClone(state); raw.effects!.registry.continuous!.push({ id: 'TEST-FUTURE-SET.power', definitionId: raw.instances[victim].definitionId!, zone: 'characters', characteristic: 'POWER', amount: 4000, minimumAttachedDon: 0 })
  // Saved options cannot be tampered or silently stale when the registry changes.
  assert.equal(evaluateCharacteristics(raw, victim).power.current, 11000); assert.throws(() => restoreGame(JSON.stringify(raw)), /INVALID_EFFECT_CHOICE/)
})

// Evidence export is opt-in and contains only synthetic test-game data, never application users.
test('resolution trace records proposed KO, private choice and actual replacement in order', () => {
  const { state, victim } = koFixture(); const pending = answer(state, [victim]); const end = answer(pending, [pending.effects!.choice!.options[0].presence.instanceId])
  const trace = { fixture: 'OP06-007 versus EB01-008; ST01-017 hand payment',
    before: { victimZone: state.instances[victim].zone, operations: state.effects!.cardOperations!.length },
    suspended: { operation: pending.effects!.continuation!.interception!.operation, choice: { actor: pending.effects!.choice!.actorId, visibility: pending.effects!.choice!.visibility, min: 0, max: 1 } },
    after: { operations: end.effects!.cardOperations, events: end.effects!.cardEvents, victimZone: end.instances[victim].zone, instanceCount: Object.keys(end.instances).length } }
  assert.deepEqual(trace.after.operations!.map(o => o.outcome), ['REPLACED', 'CONFIRMED']); assert.equal(trace.after.instanceCount, 122)
  if (process.env.M15C_REPORT_TRACES === '1') writeFileSync('../docs/game/evidence/m1_5c/resolution-trace.json', JSON.stringify(trace, null, 2) + '\n')
})
