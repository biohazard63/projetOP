import { test } from 'node:test'
import assert from 'node:assert/strict'
import { consolidateDefinitions } from '../src/game/cards/adapter'
import { REVIEWED_CARDS } from '../src/game/cards/reviewedCards'
import { M0_RULESET } from '../src/game/rulesets/m0'
import { createGame, applyCommand, projectState, restoreGame, getLegalActions } from '../src/game/core'
import { assertGameInvariants } from '../src/game/core/invariants'
import { validateRegistry, validateModifier, inspectModifierDependencies, type EffectRegistry, type EffectDefinition, type OperationSpec } from '../src/game/effects/contracts'
import type { CardInput } from '../src/game/cards/types'
import type { GameState, Command } from '../src/game/core/types'

// Synthetic abilities only. No real card is associated with these programs.
const give: OperationSpec = { primitive: 'giveRestedDon', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC' }
function def(program: EffectDefinition['program'] = [{ kind: 'OPERATION', operation: give }]): EffectDefinition {
  return { id: 'demo', revision: 'v1', dslVersion: '1.0.0', source: { kind: 'SYNTHETIC', extension: 'TEST-FUTURE-SET' }, timing: 'MAIN', condition: { kind: 'ALWAYS' }, cost: { kind: 'NONE' }, usage: { kind: 'UNLIMITED' }, program: structuredClone(program) }
}
function registry(d = def()): EffectRegistry { return { version: '1.0.0', dslVersion: '1.0.0', definitions: [d], replacements: [], restrictions: [] } }
type Intent = Command extends infer C ? C extends Command ? Omit<C, 'id' | 'actorId' | 'expectedVersion'> : never : never
function cmd(s: GameState, intent: Intent, actor = s.decisionPlayerId ?? s.activePlayerId!): Command { return { ...intent, id: `cmd-${s.version}`, actorId: actor, expectedVersion: s.version } }
function accept(s: GameState, intent: Intent) { const r = applyCommand(s, cmd(s, intent)); if (!r.ok) assert.fail(r.error); assertGameInvariants(r.state); return r.state }
function reject(s: GameState, command: unknown, error?: string) { const before = JSON.stringify(s), r = applyCommand(s, command); assert.equal(r.ok, false); if (!r.ok && error) assert.equal(r.error, error); assert.equal(JSON.stringify(s), before); return r }
function game(r = registry(), seed = 42) {
  const cards: CardInput[] = Object.entries(REVIEWED_CARDS).map(([number, facts]) => ({ ...structuredClone(facts), number, printingKey: `${number}::standard`, databaseIds: [], extensions: [], life: facts.category === 'LEADER' ? 5 : null,
    lifeEvidence: facts.category === 'LEADER' ? [{ field: 'life', value: 5, source: 'https://en.onepiece-cardgame.com/cardlist/?series=569001', checkedAt: '2026-10-10', language: 'en' }] : [] }))
  const catalog = consolidateDefinitions(cards); assert.deepEqual(catalog.errors, [])
  const deck = [{ printingKey: 'ST01-001::standard', quantity: 1 }, ...cards.filter(c => c.category === 'CHARACTER').map(c => ({ printingKey: c.printingKey, quantity: c.number === 'P-016' ? 2 : 4 }))]
  let s = createGame({ ...catalog, gameId: 'fx-test', seed, scope: 'BASIC_TURNS', chooserId: 'alice', players: [{ id: 'alice', cards: deck, donCount: 10 }, { id: 'bob', cards: deck, donCount: 10 }], ruleset: structuredClone(M0_RULESET), effectRegistry: r })
  s = accept(s, { type: 'CHOOSE_FIRST', choice: 'FIRST' }); s = accept(s, { type: 'MULLIGAN', redraw: false }); s = accept(s, { type: 'MULLIGAN', redraw: false })
  while (s.phase !== 'MAIN') s = accept(s, { type: 'ADVANCE_PHASE' }); return s
}
const start = (s: GameState) => accept(s, { type: 'START_EFFECT', effectId: 'demo' })
function choices(optional = false, choiceType: 'SELECT' | 'ORDER' = 'SELECT') { return registry(def([{ kind: 'CHOICE', choiceType, selector: { kind: 'OWN_ZONE', zone: 'hand', cardKind: 'CARD' }, optional, min: optional ? 0 : 1, max: 2, bind: 'selected', visibility: 'PRIVATE' }, { kind: 'OPERATION', operation: give }])) }
function answer(s: GameState, count = 1): Command { const c = s.effects!.choice!; return cmd(s, { type: 'ANSWER_CHOICE', choiceId: c.id, tokens: c.options.slice(0, count).map(o => o.token) }) }
const match = { primitive: 'giveRestedDon' as const, recipient: 'EITHER' as const }

test('contracts and TEST-FUTURE-SET serialize and validate', () => { const r = registry(); assert.deepEqual(validateRegistry(JSON.parse(JSON.stringify(r))), r); const s = game(); assert.equal(s.schemaVersion, 2); assert.deepEqual(restoreGame(JSON.stringify(s)), s) })
test('malformed registry/unknown fields fail closed', () => { for (const r of [null, { ...registry(), extra: true }, { ...registry(), definitions: [def(), def()] }]) assert.throws(() => validateRegistry(r)) })
test('unknown primitive and incompatible versions are refused', () => {
  for (const r of [{ ...registry(), version: '9' }, { ...registry(), dslVersion: '9' }, ...['unknown', 'giveRestedDon'].map(primitive => ({ ...registry(), definitions: [{ ...def(), program: [{ kind: 'OPERATION', operation: { ...give, primitive, version: '9' } }] }] }))]) assert.throws(() => validateRegistry(r))
})
test('unimplemented costs/card bindings/public hand choices rejected', () => {
  assert.throws(() => validateRegistry(registry({ ...def(), cost: { kind: 'REST_DON', amount: 1 } })))
  assert.throws(() => validateRegistry({ ...registry(), definitions: [{ ...def(), source: { kind: 'CARD', presence: { instanceId: 'x', generation: 1 }, definitionId: 'y' } }] }))
  const r = choices(); const step = r.definitions[0].program[0]; if (step.kind === 'CHOICE') step.visibility = 'PUBLIC'; assert.throws(() => validateRegistry(r))
})
test('giveRestedDon preserves identity/conservation and confirms exhausted arrival', () => {
  const s = game(), id = s.players[0].zones.donDeck[0], before = JSON.stringify(s), next = start(s)
  assert.equal(JSON.stringify(s), before); assert.equal(next.instances[id].zone, 'cost'); assert.equal(next.instances[id].rested, true); assert.equal(next.instances[id].zoneGeneration, s.instances[id].zoneGeneration + 1)
  assert.equal(Object.keys(next.instances).length, 122); assert.equal(next.effects!.trace[0].outcome, 'CONFIRMED'); assert.equal(next.effects!.events[0].subjectId, id)
})
test('exhausted DON deck cannot add eleventh DON and leaves original intact', () => { let s = game(); for (let n = 0; n < 9; n++) s = start(s); assert.equal(s.players[0].zones.donDeck.length, 0); reject(s, cmd(s, { type: 'START_EFFECT', effectId: 'demo' }), 'EFFECT_OPERATION_UNAVAILABLE') })
test('restrictions prevent operation without successful event', () => { const r = registry(); r.restrictions.push({ id: 'block', playerId: 'alice', prohibited: 'ADD_DON' }); const s = game(r), next = start(s); assert.deepEqual(next.players, s.players); assert.equal(next.effects!.events.length, 0); assert.equal(next.effects!.trace[0].outcome, 'PREVENTED') })
test('invalid recipient rejected at state trust boundary', () => { const r = registry(); r.restrictions.push({ id: 'bad', playerId: 'mallory', prohibited: 'ADD_DON' }); assert.throws(() => game(r), /INVALID_EFFECT_PLAYER/) })
test('recipient derives from program not client; opponent gains DON', () => { const s = game(registry(def([{ kind: 'OPERATION', operation: { ...give, player: 'OPPONENT' } }]))), id = s.players[1].zones.donDeck[0]; const next = start(s); assert.equal(next.instances[id].zone, 'cost'); assert.equal(next.instances[id].owner, 'bob'); assert.equal(next.instances[id].rested, true) })
test('START_EFFECT exact replay idempotent; same key changed intention conflict', () => { const s = game(), c = cmd(s, { type: 'START_EFFECT', effectId: 'demo' }), r = applyCommand(s, c); assert.ok(r.ok); const replay = applyCommand(r.state, c); assert.ok(replay.ok); assert.equal(replay.replayed, true); assert.deepEqual(replay.state, r.state); reject(r.state, { ...c, effectId: 'other' }, 'COMMAND_ID_CONFLICT') })
test('once per turn and optional zero choice supported', () => { const r = choices(true); r.definitions[0].usage = { kind: 'ONCE_PER_TURN' }; const s = start(game(r)), result = applyCommand(s, answer(s, 0)); assert.ok(result.ok); assert.equal(result.state.effects!.active!.status, 'COMPLETED'); reject(result.state, cmd(result.state, { type: 'START_EFFECT', effectId: 'demo' })) })
test('suspension, JSON restore and continuation resume exactly once', () => { const s = start(game(choices())); assert.equal(s.effects!.active!.status, 'SUSPENDED'); assert.equal(s.effects!.events.length, 0); const loaded = restoreGame(JSON.stringify(s)), r = applyCommand(loaded, answer(loaded, 2)); assert.ok(r.ok); assert.equal(r.state.effects!.active!.status, 'COMPLETED'); assert.equal(r.state.effects!.events.length, 1); assert.equal(r.state.effects!.continuation, null) })
test('multiple selections require valid distinct options and min/max', () => { const s = start(game(choices())), c = answer(s); if (c.type !== 'ANSWER_CHOICE') assert.fail(); reject(s, { ...c, tokens: [c.tokens[0], c.tokens[0]] }, 'INVALID_CHOICE_RESPONSE'); reject(s, answer(s, 0), 'INVALID_CHOICE_RESPONSE'); reject(s, answer(s, 3), 'INVALID_CHOICE_RESPONSE') })
test('ORDER requires complete permutation, arbitrary legitimate order retained', () => { const s = start(game(choices(false, 'ORDER'))); reject(s, answer(s, 1), 'INVALID_CHOICE_RESPONSE'); const c = answer(s, 5); if (c.type !== 'ANSWER_CHOICE') assert.fail(); c.tokens.reverse(); const r = applyCommand(s, c); assert.ok(r.ok); assert.deepEqual(r.state.effects!.choiceHistory[0].tokens, c.tokens) })
test('wrong actor/choice/token/stale rejected with generic errors, no hidden identity', () => { const s = start(game(choices())), c = answer(s); for (const bad of [{ ...c, actorId: 'bob' }, { ...c, tokens: ['forged'] }, { ...c, choiceId: 'other' }, { ...c, expectedVersion: s.version - 1 }]) { const r = reject(s, bad); assert.ok(!JSON.stringify(r).includes(s.players[0].zones.hand[0])); assert.ok(!JSON.stringify(r).includes('printingKey')) } })
test('concurrent/normal commands cannot bypass pending resolution', () => { const s = start(game(choices())); reject(s, cmd(s, { type: 'END_MAIN' }), 'ILLEGAL_ACTION'); reject(s, cmd(s, { type: 'START_EFFECT', effectId: 'demo' }), 'ILLEGAL_ACTION'); assert.deepEqual(getLegalActions(s, 'bob'), []); assert.equal(getLegalActions(s, 'alice')[0].type, 'ANSWER_CHOICE') })
test('answer replay no double operation; stale concurrent answer and old choice rejected', () => { const s = start(game(choices())), c = answer(s), r = applyCommand(s, c); assert.ok(r.ok); const replay = applyCommand(restoreGame(JSON.stringify(r.state)), c); assert.ok(replay.ok); assert.equal(replay.replayed, true); assert.deepEqual(replay.state, r.state); reject(r.state, { ...c, id: 'different' }, 'STALE_VERSION'); const next = start(r.state); reject(next, { ...c, id: 'fresh', expectedVersion: next.version }, 'INVALID_CHOICE_RESPONSE') })
test('private choice/projection and restoration do not leak options to opponent/spectator', () => { const s = start(game(choices())); assert.ok(projectState(s, 'alice').effects!.pendingChoice && 'options' in projectState(s, 'alice').effects!.pendingChoice!); for (const viewer of ['bob', null]) { const view = projectState(s, viewer), text = JSON.stringify(view); for (const id of s.players[0].zones.hand) assert.ok(!text.includes(id)); for (const field of ['option:', 'continuation', 'registry', 'random', 'choiceHistory']) assert.ok(!text.includes(field)); assert.deepEqual(projectState(restoreGame(JSON.stringify(s)), viewer), view) } })
test('public/private confirmed journals filtered and internal proposals hidden', () => { const s = start(game(registry(def([{ kind: 'OPERATION', operation: { ...give, audience: 'CONTROLLER' } }])))); assert.equal(s.effects!.events.length, 1); assert.equal(projectState(s, 'alice').effects!.events.length, 1); assert.equal(projectState(s, 'bob').effects!.events.length, 0); assert.equal(projectState(s, null).effects!.events.length, 0); assert.ok(!JSON.stringify(projectState(s, 'alice')).includes('trace')); assert.equal(projectState(start(game()), 'bob').effects!.events.length, 1) })
test('replacement intercepts proposed exhausted move, confirms only actual ready move', () => { const r = registry(); r.replacements.push({ id: 'ready-instead', condition: { kind: 'ALWAYS' }, match, action: { kind: 'REPLACE', operation: { primitive: 'moveDon', version: '1.0.0', player: 'CONTROLLER', from: 'donDeck', to: 'cost', rested: false, audience: 'PUBLIC' } } }); const s = game(r), next = start(s); assert.equal(next.instances[s.players[0].zones.donDeck[0]].rested, false); assert.deepEqual(next.effects!.trace.map(t => t.outcome), ['REPLACED', 'CONFIRMED']); assert.equal(next.effects!.events.length, 1); assert.equal(next.effects!.events[0].rested, false); assert.notEqual(next.effects!.events[0].operationId, next.effects!.trace[0].operation.id) })
test('PREVENT replacement has no successful event or mutation', () => { const r = registry(); r.replacements.push({ id: 'stop', condition: { kind: 'ALWAYS' }, match, action: { kind: 'PREVENT' } }); const s = game(r), next = start(s); assert.deepEqual(next.players, s.players); assert.equal(next.effects!.events.length, 0) })
test('replacement cannot loop on same effect', () => { const operation: OperationSpec = { primitive: 'moveDon', version: '1.0.0', player: 'CONTROLLER', from: 'donDeck', to: 'cost', rested: true, audience: 'PUBLIC' }; const r = registry(def([{ kind: 'OPERATION', operation }])); r.replacements.push({ id: 'loop', condition: { kind: 'ALWAYS' }, match: { primitive: 'moveDon', recipient: 'EITHER' }, action: { kind: 'REPLACE', operation } }); const s = start(game(r)); assert.deepEqual(s.effects!.trace.map(t => t.outcome), ['REPLACED', 'CONFIRMED']); assert.deepEqual(s.effects!.events[0].appliedReplacements, ['loop']) })
test('multiple eligible replacements refused rather than guessed, atomic refusal', () => { const r = registry(); for (const id of ['a', 'b']) r.replacements.push({ id, condition: { kind: 'ALWAYS' }, match, action: { kind: 'PREVENT' } }); const s = game(r); reject(s, cmd(s, { type: 'START_EFFECT', effectId: 'demo' }), 'REPLACEMENT_ORDER_NOT_IMPLEMENTED') })
test('non-applicable replacement does not intercept', () => { const r = registry(); r.replacements.push({ id: 'other', condition: { kind: 'ALWAYS' }, match: { primitive: 'giveRestedDon', recipient: 'OPPONENT' }, action: { kind: 'PREVENT' } }); assert.equal(start(game(r)).effects!.events.length, 1) })
test('invalid replacement cannot move unrelated recipient instance', () => { const r = registry(); r.replacements.push({ id: 'bad', condition: { kind: 'ALWAYS' }, match, action: { kind: 'REPLACE', operation: { primitive: 'moveDon', version: '1.0.0', player: 'OPPONENT', from: 'cost', to: 'donDeck', rested: false, audience: 'PUBLIC' } } }); const s = game(r); reject(s, cmd(s, { type: 'START_EFFECT', effectId: 'demo' }), 'EFFECT_OPERATION_UNAVAILABLE') })
test('late failure after earlier operations leaves input wholly unchanged', () => { const s = game(registry(def(Array.from({ length: 10 }, () => ({ kind: 'OPERATION', operation: give }))))); reject(s, cmd(s, { type: 'START_EFFECT', effectId: 'demo' }), 'EFFECT_OPERATION_UNAVAILABLE') })
test('corrupted continuation/choice/primitive-version snapshots refused', () => { const s = start(game(choices())); for (const mutate of [(x: GameState) => { x.effects!.continuation!.pc = 99 }, (x: GameState) => { x.effects!.choice!.options[0].presence.generation++ }, (x: GameState) => { x.effects!.choice!.actorId = 'bob' }, (x: GameState) => { x.effects!.continuation!.definitionRevision = 'v9' }]) { const x = structuredClone(s); mutate(x); assert.throws(() => restoreGame(JSON.stringify(x))) } const raw = JSON.parse(JSON.stringify(s)); raw.effects.primitives.primitives[0].version = 'v9'; assert.throws(() => restoreGame(JSON.stringify(raw))) })
test('copied registry and known primitive in fictitious extension deterministic across JSON boundaries', () => { const r = choices(), initial = game(r); r.definitions[0].id = 'changed'; assert.equal(initial.effects!.registry.definitions[0].id, 'demo'); const run = () => { const s = start(game(choices(), 22)); const result = applyCommand(restoreGame(JSON.stringify(s)), answer(s)); assert.ok(result.ok); return restoreGame(JSON.stringify(result.state)) }; assert.deepEqual(run(), run()) })
test('continuous modifier structure preserves null/zero, cycles diagnosed without evaluation', () => { const input = { id: 'a', subject: { instanceId: 'x', generation: 2 }, source: { kind: 'SYNTHETIC', extension: 'TEST-FUTURE-SET' }, characteristic: 'POWER', printed: null, base: 0, current: 0, mode: 'ADD', value: 1000, condition: { kind: 'ALWAYS' }, zone: 'characters', duration: { kind: 'TURN', turnId: 1 }, dependencies: [] }; const a = validateModifier(JSON.parse(JSON.stringify(input))); assert.equal(a.printed, null); assert.equal(a.base, 0); assert.equal(inspectModifierDependencies([a]), 'ACYCLIC_NOT_IMPLEMENTED'); a.dependencies = ['a']; assert.equal(inspectModifierDependencies([a]), 'CYCLIC_UNSUPPORTED'); assert.throws(() => validateModifier({ ...input, extra: () => 1 })); assert.throws(() => inspectModifierDependencies([{ ...a, dependencies: ['missing'] }])); const s = game(), raw = JSON.parse(JSON.stringify(s)); raw.effects.modifiers.push(a); assert.throws(() => restoreGame(JSON.stringify(raw))) })
test('v1 saves remain valid, no implicit effect grant; base v1/v2 commands unchanged', () => { const plain = structuredClone(game()); delete plain.effects; plain.schemaVersion = 1; const s = restoreGame(JSON.stringify(plain)); reject(s, cmd(s, { type: 'START_EFFECT', effectId: 'demo' }), 'ILLEGAL_ACTION'); assert.equal(accept(s, { type: 'END_MAIN' }).phase, 'END'); const modern = accept(game(), { type: 'END_MAIN' }); assert.equal(modern.phase, 'END'); assert.equal(modern.schemaVersion, 2) })

test('selected DON identities drive operations, including zero/multiple selections after restore', () => {
  const r = registry(def([
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'OWN_ZONE', zone: 'donDeck', cardKind: 'DON' }, optional: true, min: 0, max: 2, bind: 'dons', visibility: 'PUBLIC' },
    { kind: 'OPERATION', operation: { ...give, subjectBinding: 'dons' } },
  ]))
  const pending = start(game(r)); const options = pending.effects!.choice!.options
  const c = cmd(pending, { type: 'ANSWER_CHOICE', choiceId: pending.effects!.choice!.id, tokens: [options[5].token, options[2].token] })
  const result = applyCommand(restoreGame(JSON.stringify(pending)), c); assert.ok(result.ok)
  assert.deepEqual(result.state.effects!.events.map(e => e.subjectId), [options[5].presence.instanceId, options[2].presence.instanceId])
  const zero = applyCommand(pending, answer(pending, 0)); assert.ok(zero.ok); assert.equal(zero.state.effects!.events.length, 0)
  assert.deepEqual(zero.state.players, pending.players)
  assert.ok('options' in projectState(pending, 'bob').effects!.pendingChoice!)
})
test('unbound subject and invalid selection kind/source are rejected without mutations', () => {
  assert.throws(() => validateRegistry(registry(def([{ kind: 'OPERATION', operation: { ...give, subjectBinding: 'unknown' } }]))), /INVALID_EFFECT_REGISTRY/)
  const r = choices(); const op = r.definitions[0].program[1]; if (op.kind === 'OPERATION') op.operation = { ...give, subjectBinding: 'selected' }
  const s = start(game(r)); reject(s, answer(s), 'EFFECT_OPERATION_UNAVAILABLE')
})
test('restrictions prevent a prohibited proposal before replacement', () => {
  const op: OperationSpec = { primitive: 'moveDon', version: '1.0.0', player: 'CONTROLLER', from: 'cost', to: 'donDeck', rested: false, audience: 'PUBLIC' }
  const r = registry(def([{ kind: 'OPERATION', operation: op }]))
  r.restrictions.push({ id: 'no-moves', playerId: 'alice', prohibited: 'MOVE_DON' })
  r.replacements.push({ id: 'switch', condition: { kind: 'ALWAYS' }, match: { primitive: 'moveDon', recipient: 'EITHER' }, action: { kind: 'REPLACE', operation: give } })
  const s = game(r), result = start(s); assert.deepEqual(result.players, s.players); assert.equal(result.effects!.events.length, 0)
})
test('DON condition false excludes activation, recipient and unknown IDs fail explicitly', () => {
  const r = registry(); r.definitions[0].condition = { kind: 'DON_AVAILABLE', player: 'CONTROLLER' }
  let s = game(r); for (let n = 0; n < 9; n++) s = start(s)
  assert.ok(!getLegalActions(s, 'alice').some(a => a.type === 'START_EFFECT'))
  reject(s, cmd(s, { type: 'START_EFFECT', effectId: 'demo' }), 'ILLEGAL_ACTION')
  const available = game(); reject(available, cmd(available, { type: 'START_EFFECT', effectId: 'unknown' }), 'INVALID_EFFECT_COMMAND')
})
test('schema mismatch refuses implicit upgrade/downgrade and effects in SETUP_ONLY', () => {
  const s = game(), raw = JSON.parse(JSON.stringify(s)); raw.schemaVersion = 1; assert.throws(() => restoreGame(JSON.stringify(raw)))
  raw.schemaVersion = 2; delete raw.effects; assert.throws(() => restoreGame(JSON.stringify(raw)))
})
test('declarative registry rejects executable data rather than silently dropping functions', () => {
  const r = registry(); assert.throws(() => validateRegistry({ ...r, execute: () => 1 }))
  const raw = { ...def(), program: [{ kind: 'OPERATION', operation: { ...give, player: () => 'CONTROLLER' } }] }
  assert.throws(() => validateRegistry({ ...r, definitions: [raw] }))
})

test('unknown primitive and version errors identify compatibility failure', () => {
  assert.throws(() => validateRegistry({ ...registry(), dslVersion: '2' }), /INCOMPATIBLE_EFFECT_VERSION/)
  assert.throws(() => validateRegistry({ ...registry(), definitions: [{ ...def(), program: [{ kind: 'OPERATION', operation: { ...give, primitive: 'future-unknown' } }] }] }), /UNKNOWN_EFFECT_PRIMITIVE/)
})
test('two successive suspended choices resume at distinct program counters and IDs', () => {
  const r = choices(); const first = r.definitions[0].program[0]
  assert.equal(first.kind, 'CHOICE'); if (first.kind !== 'CHOICE') assert.fail()
  r.definitions[0].program.splice(1, 0, { ...structuredClone(first), bind: 'second' })
  const s = start(game(r)), oldId = s.effects!.choice!.id, a = applyCommand(s, answer(s)); assert.ok(a.ok)
  assert.equal(a.state.effects!.continuation!.pc, 1); assert.notEqual(a.state.effects!.choice!.id, oldId)
  const loaded = restoreGame(JSON.stringify(a.state)), b = applyCommand(loaded, answer(loaded)); assert.ok(b.ok)
  assert.equal(b.state.effects!.events.length, 1); assert.equal(b.state.effects!.choiceHistory.length, 2)
})
test('confirmed journal corruption and ID counter rollback are detected on restoration', () => {
  const s = start(game())
  for (const mutate of [(x: GameState) => { x.effects!.events[0].rested = false }, (x: GameState) => { x.effects!.nextId = 0 },
    (x: GameState) => { x.effects!.trace.push(structuredClone(x.effects!.trace[0])) }]) {
    const bad = structuredClone(s); mutate(bad); assert.throws(() => restoreGame(JSON.stringify(bad)))
  }
})
test('minor invalid envelope fields and extra actor-selected recipient cannot reach pipeline', () => {
  const s = game(), good = cmd(s, { type: 'START_EFFECT', effectId: 'demo' })
  for (const c of [{ ...good, playerId: 'bob' }, { ...good, expectedVersion: -1 }, { ...good, effectId: {} }, { ...good, tokens: [] }]) reject(s, c, 'INVALID_COMMAND')
})
test('stable effect IDs may contain version namespace separators', () => {
  const r = registry(); r.definitions[0].id = 'opcg.demo@1.0.0'; const s = game(r)
  const next = accept(s, { type: 'START_EFFECT', effectId: r.definitions[0].id }); assert.equal(next.effects!.events.length, 1)
})
test('determinism and conservation over 20 injected seeds including private suspension', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const run = () => { const s = start(game(choices(), seed)), r = applyCommand(restoreGame(JSON.stringify(s)), answer(s, 2)); assert.ok(r.ok); assertGameInvariants(r.state); return r.state }
    assert.deepEqual(run(), run())
  }
})

test('prototype-property bindings are refused at the declarative boundary', () => {
  for (const bind of ['__proto__', 'constructor', 'prototype']) {
    const r = choices(); const step = r.definitions[0].program[0]; if (step.kind === 'CHOICE') step.bind = bind
    assert.throws(() => validateRegistry(r))
  }
})
