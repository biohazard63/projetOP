import { scopedInput } from './helpers/m6'
import test from 'node:test'
import assert from 'node:assert/strict'
import { engineCatalog, currentEngineRegistry, engineRuleset } from '../src/lib/engine/catalog'
import { REFERENCE_DECKS, deckEligibility } from '../src/lib/engine/decks'
import { playMatch } from '../src/lib/engine/strategy'
import type { DeckEntry } from '../src/game/rulesets/decks'

// ST-09, ST-10 and ST-11 have no resolvable product list (starter-compositions.json); their certified cards are exercised
// in legal 50-card decks built from them (4 copies each, in order) against offered decks, through public commands only.
const range = (set: string, from: number, to: number, skip: string[] = []) => Array.from({ length: to - from + 1 }, (_, i) => `${set}-${String(from + i).padStart(3, '0')}`).filter(n => !skip.includes(n))
function deck(leader: string, numbers: string[]): DeckEntry[] {
  const entries = [{ printingKey: `${leader}::standard`, quantity: 1 }]; let total = 0
  for (const n of numbers) { const q = Math.min(4, 50 - total); if (q <= 0) break; entries.push({ printingKey: `${n}::standard`, quantity: q }); total += q }
  return entries
}
const decks: [string, DeckEntry[], string, number][] = [
  ['ST-10 Law', deck('ST10-001', range('ST10', 4, 17)), 'starter-st12', 1],
  ['ST-10 Luffy', deck('ST10-002', range('ST10', 4, 17).reverse()), 'reference-red', 2],
  ['ST-10 Kid', deck('ST10-003', range('ST10', 4, 17)), 'reference-red', 1],
  ['ST-09 Yamato', deck('ST09-001', [...range('ST09', 2, 15, ['ST09-010']), 'ST07-012']), 'starter-st07', 1],
  ['ST-11 Uta', deck('ST11-001', [...range('ST11', 2, 5), 'OP02-028', 'OP02-033', 'OP02-039', 'OP02-043', 'ST12-002', 'ST12-005', 'ST12-004', 'ST12-008', 'ST12-006', 'ST12-015']), 'starter-st12', 2],
]

test('decks of certified ST-09, ST-10 and ST-11 cards finish complete bot games without fallback or refused commands', () => {
  const { definitions, printings } = engineCatalog()
  for (const [name, entries, opponentId, seed] of decks) {
    assert.deepEqual(deckEligibility(entries), { ok: true, errors: [] }, name)
    const opponent = REFERENCE_DECKS.find(d => d.id === opponentId)!
    const result = playMatch(scopedInput({ definitions, printings, gameId: `${name}-${opponentId}`.replace(/\W+/g, '-'), seed, scope: 'BASIC_TURNS', chooserId: 'p1', ruleset: engineRuleset(), effectRegistry: currentEngineRegistry(),
      players: [{ id: 'p1', cards: structuredClone(entries), donCount: 10 }, { id: 'p2', cards: structuredClone(opponent.entries), donCount: 10 }] }), { p1: 'normal', p2: 'normal' })
    assert.ok(result.winner, `${name} should reach a winner`)
    assert.equal(result.fallbacks, 0, `${name}: no bot fallback`)
    assert.equal(result.refused, 0, `${name}: no refused command`)
  }
})
