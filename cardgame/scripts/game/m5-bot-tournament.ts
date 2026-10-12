import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { playMatch, BOT_LEVELS, type BotLevel } from '../../src/lib/engine/strategy'
import { engineCatalog, engineRegistry, engineRuleset } from '../../src/lib/engine/catalog'
import { REFERENCE_DECKS } from '../../src/lib/engine/decks'
import type { GameInput } from '../../src/game/core/types'

// M5-4 evidence: every pairing of bot levels on fixed seeds, both reference decks, both seats.
// Deterministic: same code + same seeds = same file content (no timestamp). Refuses to overwrite existing evidence.
// npx tsx scripts/game/m5-bot-tournament.ts ../docs/game/evidence/m5/bot-tournament.json
const out = process.argv[2]
if (!out) throw new Error('usage: m5-bot-tournament.ts <output.json>')
if (fs.existsSync(out)) throw new Error(`${out} exists: evidence files are never overwritten`)
const cat = engineCatalog(), SEEDS = Array.from({ length: 10 }, (_, i) => i + 1)
function input(seed: number, swap: boolean): GameInput {
  const [a, b] = swap ? [REFERENCE_DECKS[1], REFERENCE_DECKS[0]] : [REFERENCE_DECKS[0], REFERENCE_DECKS[1]]
  return { definitions: cat.definitions, printings: cat.printings, gameId: 'tournament', seed, scope: 'BASIC_TURNS', chooserId: 'p1', ruleset: engineRuleset(), effectRegistry: engineRegistry(),
    players: [{ id: 'p1', cards: structuredClone(a.entries), donCount: 10 }, { id: 'p2', cards: structuredClone(b.entries), donCount: 10 }] }
}
const pairings: unknown[] = [], behaviour: Record<string, Record<string, number>> = {}, perLevelMs: Record<string, number[]> = {}
let totalGames = 0, totalFallbacks = 0, totalRefused = 0, unfinished = 0
for (const x of BOT_LEVELS) for (const y of BOT_LEVELS) {
  if (BOT_LEVELS.indexOf(y) < BOT_LEVELS.indexOf(x)) continue
  let wins = 0, games = 0, turns = 0, commands = 0, fallbacks = 0, refused = 0
  for (const seed of SEEDS) for (const swap of [false, true]) for (const xSeat of ['p1', 'p2'] as const) {
    const levels: Record<string, BotLevel> = xSeat === 'p1' ? { p1: x, p2: y } : { p1: y, p2: x }
    const t = performance.now(), r = playMatch(input(seed * 7 + 3, swap), levels), ms = performance.now() - t
    games++; turns += r.turns; commands += r.commands; fallbacks += r.fallbacks; refused += r.refused
    if (r.winner === xSeat) wins++
    if (r.winner === null) unfinished++
    ;(perLevelMs[`${x}/${y}`] ??= []).push(Math.round(ms / Math.max(1, r.commands) * 1000) / 1000)
    if (x !== y) for (const seat of ['p1', 'p2']) { const b = (behaviour[levels[seat]] ??= {}); for (const [k, v] of Object.entries(r.actions[seat])) b[k] = (b[k] ?? 0) + v }
  }
  totalGames += games; totalFallbacks += fallbacks; totalRefused += refused
  pairings.push({ x, y, games, winsOfX: wins, winRateOfX: Math.round(wins / games * 1000) / 1000, averageTurns: Math.round(turns / games * 10) / 10, averageCommands: Math.round(commands / games), fallbacks, refused })
}
const msPerCommand = Object.fromEntries(Object.entries(perLevelMs).map(([k, v]) => { const s = [...v].sort((a, b) => a - b); return [k, { p50: s[Math.floor(s.length / 2)], max: s.at(-1) }] }))
const report = {
  description: 'M5-4 bot tournament: every level pairing, seeds 1..10 (engine seed = seed*7+3), both reference decks swapped, both seats swapped. Commands are public commands checked by the engine; a fallback is a strategy intent not backed by a legal action, replaced by the first legal action.',
  ruleset: engineRuleset().id, decks: REFERENCE_DECKS.slice(0, 2).map(d => d.id), seeds: SEEDS,
  totals: { games: totalGames, unfinished, fallbacks: totalFallbacks, refusedCommands: totalRefused },
  pairings,
  behaviourAcrossMixedPairings: behaviour,
  note: 'msPerCommand is machine dependent and indicative only (wall clock of the whole engine + strategy loop).',
  msPerCommand,
}
const text = JSON.stringify(report, null, 2) + '\n'
fs.writeFileSync(out, text, { flag: 'wx' })
console.log(JSON.stringify({ out, sha256: createHash('sha256').update(JSON.stringify({ ...report, msPerCommand: undefined })).digest('hex'), totals: report.totals, pairings }, null, 1))
