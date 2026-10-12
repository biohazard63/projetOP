import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PURPLE_DECK } from '../../src/game/cards/m3PurpleDeck'
import { m3EngineCatalog as engineCatalog, engineRegistry, m3EngineRuleset as engineRuleset } from '../../src/lib/engine/catalog'
import { RED_M3_DECK } from '../../src/lib/engine/decks'
import { createGame, applyCommand, getLegalActions, projectState, restoreGame } from '../../src/game/core/game'
import type { Command, GameInput, GameState } from '../../src/game/core/types'

// M3-5: a complete game between two legal decks, driven only by getLegalActions/applyCommand. The policy
// below is a deterministic player: it reads its own projection plus public battle data, never the
// authoritative hidden zones, and never edits the state. Every command goes through the engine.
export const FULL_GAME_SEED = 52 // chosen by a seed sweep for mechanic coverage; the rules do not depend on it
// Red ST01-001 deck across ST-01, OP-01, OP-06 and promotion cards; 12 numbers x4 + P-016 x2 = 50.
export { RED_M3_DECK }
export function fullGameInput(seed = FULL_GAME_SEED): GameInput {
  const catalog = engineCatalog()
  return { definitions: catalog.definitions, printings: catalog.printings, gameId: 'm3-full-game', seed, scope: 'BASIC_TURNS', chooserId: 'alice',
    ruleset: engineRuleset(), effectRegistry: engineRegistry(),
    players: [{ id: 'alice', cards: structuredClone(PURPLE_DECK), donCount: 10 }, { id: 'bob', cards: structuredClone(RED_M3_DECK), donCount: 10 }] }
}

import { botIntent as decide } from '../../src/lib/engine/bot'
const numberOf = (s: GameState, id: string) => s.catalog.definitions.find(d => d.definitionId === s.instances[id]?.definitionId)?.number

function strings(value: unknown, into: Set<string>) {
  if (typeof value === 'string') into.add(value)
  else if (Array.isArray(value)) for (const v of value) strings(v, into)
  else if (value && typeof value === 'object') for (const v of Object.values(value)) strings(v, into)
  return into
}
/** Ids of the opponent's hand, deck and Life, and of anyone's Life, that a viewer's projection exposes. */
export function leakedIds(s: GameState, viewer: string): string[] {
  const seen = strings(projectState(s, viewer), new Set())
  return s.players.flatMap(p => [...p.zones.life, ...(p.id === viewer ? [] : [...p.zones.hand, ...p.zones.deck])]).filter(id => seen.has(id))
}

export type FullGameRun = { final: GameState; commands: Command[]; checkpoints: number; leaks: string[]; coverage: Record<string, number> }
export function runFullGame(seed = FULL_GAME_SEED, checkpointEvery = 25, maxCommands = 3000): FullGameRun {
  let s = createGame(fullGameInput(seed)), checkpoints = 0
  const commands: Command[] = [], leaks: string[] = [], coverage: Record<string, number> = {}
  const count = (key: string) => { coverage[key] = (coverage[key] ?? 0) + 1 }
  while (!s.result && commands.length < maxCommands) {
    const candidates = [s.decisionPlayerId, s.activePlayerId, ...s.players.map(p => p.id)].filter((id): id is string => !!id)
    const actor = candidates.find(id => getLegalActions(s, id).length)
    if (!actor) throw new Error(`NO_LEGAL_ACTION:${s.version}`)
    const intent = decide(s, actor, getLegalActions(s, actor))
    const command = { ...intent, id: `fg-${s.version}`, actorId: actor, expectedVersion: s.version } as Command
    const result = applyCommand(s, command)
    if (!result.ok) throw new Error(`REFUSED:${s.version}:${command.type}:${result.error}`)
    s = result.state; commands.push(command)
    count(command.type)
    if (command.type === 'START_EFFECT') count(`START_EFFECT:${command.effectId.split(':')[0]}`)
    if (command.type === 'PLAY_COUNTER_EVENT') count(`COUNTER_EVENT:${numberOf(s, command.cardId)}`)
    if (command.type === 'PLAY_CARD') count(`PLAY:${numberOf(s, command.instanceId)}`)
    for (const viewer of ['alice', 'bob']) leaks.push(...leakedIds(s, viewer).map(id => `${s.version}:${viewer}:${id}`))
    if (commands.length % checkpointEvery === 0) { s = restoreGame(JSON.stringify(s)); checkpoints++ }
  }
  for (const e of s.events) count(`EVENT:${e.type}`)
  return { final: s, commands, checkpoints, leaks, coverage }
}

// Evidence writer: `node --import tsx scripts/game/m3-full-game.ts`. Refuses to overwrite different evidence.
if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  const run = runFullGame()
  const trace = { seed: FULL_GAME_SEED, rulesVersion: run.final.ruleset.rulesVersion, ruleset: run.final.ruleset.id, decks: { alice: PURPLE_DECK, bob: RED_M3_DECK },
    result: run.final.result, turns: run.final.turn, commandCount: run.commands.length, checkpoints: run.checkpoints, leaks: run.leaks, coverage: run.coverage,
    commands: run.commands.map(c => ({ v: c.expectedVersion, actor: c.actorId, type: c.type, ...Object.fromEntries(Object.entries(c).filter(([k]) => !['id', 'actorId', 'expectedVersion', 'type'].includes(k))) })),
    publicEvents: run.final.events.map(e => ({ seq: e.sequence, type: e.type, actor: e.actorId ?? null })) }
  const out = resolve(__dirname, '../../../docs/game/evidence/m3/full-game-trace.json'), text = `${JSON.stringify(trace, null, 1)}\n`
  if (existsSync(out) && readFileSync(out, 'utf8') !== text) throw new Error(`EVIDENCE_EXISTS_AND_DIFFERS:${out}`)
  writeFileSync(out, text)
  console.log(JSON.stringify({ result: trace.result, turns: trace.turns, commands: trace.commandCount, checkpoints: trace.checkpoints, leaks: trace.leaks.length, out }))
}
