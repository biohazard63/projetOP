import test from 'node:test'
import assert from 'node:assert/strict'
import { botContext, backedByLegalAction, fallback } from '../src/lib/engine/strategy/context'
import { botDecision, playMatch, BOT_LEVELS, type BotLevel } from '../src/lib/engine/strategy'
import { engineCatalog, engineRegistry, engineRuleset } from '../src/lib/engine/catalog'
import { REFERENCE_DECKS } from '../src/lib/engine/decks'
import { createGame, applyCommand } from '../src/game/core/game'
import type { Command, GameInput, GameState } from '../src/game/core/types'

// M5-4: three strategies on a public-only context. Matches are deterministic (fixed seeds) and use public commands only.
const cat = engineCatalog()
function input(seed: number, swap: boolean): GameInput {
  const [a, b] = swap ? [REFERENCE_DECKS[1], REFERENCE_DECKS[0]] : [REFERENCE_DECKS[0], REFERENCE_DECKS[1]]
  return { definitions: cat.definitions, printings: cat.printings, gameId: 'bots', seed, scope: 'BASIC_TURNS', chooserId: 'p1', ruleset: engineRuleset(), effectRegistry: engineRegistry(),
    players: [{ id: 'p1', cards: structuredClone(a.entries), donCount: 10 }, { id: 'p2', cards: structuredClone(b.entries), donCount: 10 }] }
}
function strings(value: unknown, into = new Set<string>()): Set<string> {
  if (typeof value === 'string') into.add(value)
  else if (Array.isArray(value)) value.forEach(v => strings(v, into))
  else if (value && typeof value === 'object') Object.values(value).forEach(v => strings(v, into))
  return into
}
/** Wins of `x` against `y` over seeds x {deck swap} x {seat swap}. */
function series(x: BotLevel, y: BotLevel, seeds: number[]) {
  let wins = 0, games = 0, fallbacks = 0
  const totals: Record<string, number> = {}
  for (const seed of seeds) for (const swap of [false, true]) for (const xSeat of ['p1', 'p2']) {
    const r = playMatch(input(seed * 7 + 3, swap), xSeat === 'p1' ? { p1: x, p2: y } : { p1: y, p2: x })
    games++; fallbacks += r.fallbacks; if (r.winner === xSeat) wins++
    assert.ok(r.winner !== null && r.commands < 4000, 'every match ends with a winner within the command bound')
    for (const [k, v] of Object.entries(r.actions[xSeat])) totals[k] = (totals[k] ?? 0) + v
  }
  return { wins, games, fallbacks, totals }
}

test('M5-4: a strategy context holds only its projection, legal actions and public rules', () => {
  let s = createGame(input(5, false))
  for (let n = 0; n < 60 && !s.result; n++) {
    const seat = [s.decisionPlayerId, s.activePlayerId, 'p1', 'p2'].find(id => id && botContext(s, id).actions.length)!
    const ctx = botContext(s, seat), seen = strings(ctx.projection), foe = s.players.find(p => p.id !== seat)!
    for (const id of [...foe.zones.hand, ...foe.zones.deck, ...foe.zones.life, ...s.players.find(p => p.id === seat)!.zones.life]) assert.equal(seen.has(id), false, `hidden ${id}`)
    assert.equal(JSON.stringify(ctx.projection).includes('"random"'), false)
    // returnsOneDon: a printed [Counter] cost read from the ability registry, public card rules like `definition`.
    assert.deepEqual(Object.keys(ctx).sort(), ['actions', 'definition', 'projection', 'returnsOneDon', 'seat'])
    const { intent } = botDecision(s, seat, 'hard')
    const r = applyCommand(s, { ...intent, id: `c-${s.version}`, actorId: seat, expectedVersion: s.version } as Command); assert.ok(r.ok); if (r.ok) s = r.state
  }
})

test('M5-4: forged or unusable intents are refused by the legality check and the fallback is always legal', () => {
  const s = createGame(input(9, false)), ctx = botContext(s, 'p1')
  assert.equal(backedByLegalAction(ctx, { type: 'END_MAIN' }), false)
  assert.equal(backedByLegalAction(ctx, { type: 'CHOOSE_FIRST', choice: 'FIRST' }), true)
  const safe = fallback(ctx); assert.ok(applyCommand(s, { ...safe, id: 'f', actorId: 'p1', expectedVersion: s.version } as Command).ok)
})

test('M5-4: all three levels finish every match with legal decisions and no fallback', () => {
  for (const level of BOT_LEVELS) { const r = series(level, level, [1]); assert.equal(r.fallbacks, 0, level); assert.equal(r.games, 4) }
})

test('M5-4: the levels are measurably ordered: hard and normal beat easy, hard beats normal', () => {
  const hardEasy = series('hard', 'easy', [1, 2]), normalEasy = series('normal', 'easy', [1, 2]), hardNormal = series('hard', 'normal', [1, 2, 3])
  assert.ok(hardEasy.wins >= 7, `hard vs easy ${hardEasy.wins}/${hardEasy.games}`)
  assert.ok(normalEasy.wins >= 7, `normal vs easy ${normalEasy.wins}/${normalEasy.games}`)
  assert.ok(hardNormal.wins > hardNormal.games / 2, `hard vs normal ${hardNormal.wins}/${hardNormal.games}`)
})

test('M5-4: defence and resources differ by level (easy never defends nor gives DON!!, hard blocks more and spends DON!! on attackers)', () => {
  const t = Object.fromEntries(BOT_LEVELS.map(l => [l, series(l, 'normal', [1]).totals])) as Record<BotLevel, Record<string, number>>
  for (const k of ['PLAY_COUNTER_CHARACTER', 'PLAY_COUNTER_EVENT', 'ACTIVATE_BLOCKER', 'ATTACH_DON:leader', 'ATTACH_DON:character']) assert.equal(t.easy[k] ?? 0, 0, `easy ${k}`)
  assert.ok((t.normal.PLAY_COUNTER_CHARACTER ?? 0) + (t.normal.PLAY_COUNTER_EVENT ?? 0) > 0, 'normal uses Counters')
  assert.ok((t.hard.ACTIVATE_BLOCKER ?? 0) > (t.normal.ACTIVATE_BLOCKER ?? 0), 'hard blocks more than normal')
  assert.equal(t.normal['ATTACH_DON:character'] ?? 0, 0, 'normal gives DON!! to its Leader only')
  assert.ok((t.hard['ATTACH_DON:character'] ?? 0) > 0, 'hard gives DON!! to the Character whose attack needs it')
  assert.ok((t.easy.PLAY_CARD ?? 0) < (t.normal.PLAY_CARD ?? 0), 'easy develops its board less')
})

test('M5-4: a victory scenario — hard reaches the opposing Leader with 0 Life and wins by damage', () => {
  const r = playMatch(input(10, false), { p1: 'hard', p2: 'easy' })
  assert.equal(r.winner, 'p1'); assert.equal(r.reason, 'LEADER_DAMAGED_AT_ZERO_LIFE')
  const s: GameState = createGame(input(10, false)); assert.equal(s.result ?? null, null)
})
