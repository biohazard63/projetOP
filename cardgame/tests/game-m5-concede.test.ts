import test from 'node:test'
import assert from 'node:assert/strict'
import { botDecision } from '../src/lib/engine/strategy'
import { engineCatalog, engineRegistry, engineRuleset } from '../src/lib/engine/catalog'
import { REFERENCE_DECKS } from '../src/lib/engine/decks'
import { applyCommand, createGame, getLegalActions, restoreGame } from '../src/game/core/game'
import type { GameInput, GameState } from '../src/game/core/types'

// CR 1.2.1 §1-2-3: a player may concede at any time. Found by the M5 PostgreSQL integration test: a concession
// while an ability waited for a choice was refused (INVALID_EFFECT_CONTINUATION). Every state reached in bot games
// (choices, Counter/Blocker windows, [Trigger], ordering, replacement) must accept a concession by either player.
const cat = engineCatalog()
function input(seed: number, swap: boolean): GameInput {
  const [a, b] = swap ? [REFERENCE_DECKS[1], REFERENCE_DECKS[0]] : [REFERENCE_DECKS[0], REFERENCE_DECKS[1]]
  return { definitions: cat.definitions, printings: cat.printings, gameId: 'concede', seed, scope: 'BASIC_TURNS', chooserId: 'p1', ruleset: engineRuleset(), effectRegistry: engineRegistry(),
    players: [{ id: 'p1', cards: structuredClone(a.entries), donCount: 10 }, { id: 'p2', cards: structuredClone(b.entries), donCount: 10 }] }
}
test('CR 1-2-3: a concession is accepted in every reached state, including a suspended ability choice', () => {
  let states = 0, suspended = 0
  for (const [seed, swap] of [[3, false], [10, true], [17, false], [24, true], [31, false], [38, true]] as const) {
    let s: GameState = createGame(input(seed, swap))
    for (let n = 0; n < 600 && !s.result; n++) {
      if (s.effects?.choice) suspended++
      for (const actor of ['p1', 'p2']) {
        const r = applyCommand(s, { id: `c-${n}-${actor}`, expectedVersion: s.version, actorId: actor, type: 'CONCEDE' })
        assert.ok(r.ok, `seed ${seed} step ${n}: ${actor} concession refused: ${!r.ok && r.error}`)
        assert.deepEqual(r.state.result, { reason: 'CONCESSION', loserIds: [actor], winnerId: actor === 'p1' ? 'p2' : 'p1' })
        assert.deepEqual(getLegalActions(r.state, 'p1'), []); assert.deepEqual(getLegalActions(r.state, 'p2'), [])
        assert.deepEqual(restoreGame(JSON.stringify(r.state)), r.state, 'the conceded state stays JSON-restorable')
      }
      states++
      const seat = [s.decisionPlayerId, s.activePlayerId, 'p1', 'p2'].find(id => id && getLegalActions(s, id).length)!
      const { intent } = botDecision(s, seat, 'hard'), r = applyCommand(s, { ...intent, id: `m-${n}`, expectedVersion: s.version, actorId: seat } as never)
      assert.ok(r.ok, `bot move refused: ${!r.ok && r.error}`); s = r.state
    }
  }
  assert.ok(states > 300 && suspended > 0, `covered ${states} states, ${suspended} with a suspended ability choice`)
})
