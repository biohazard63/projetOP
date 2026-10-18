import test from 'node:test'
import assert from 'node:assert/strict'
import { bridgeCards, currentEngineRegistry, engineCatalog, engineRuleset, playableCardIds, type PrismaCardRow } from '../src/lib/engine/catalog'
import { REFERENCE_DECKS, deckEligibility, userDeckEntries } from '../src/lib/engine/decks'
import { effectiveStatus } from '../src/game/cards/certification'
import { playMatch } from '../src/lib/engine/strategy'
import { scopedInput } from './helpers/m6'
import type { CardDefinition } from '../src/game/cards/types'

// A deck built in the deck builder (owned and playable cards only, GET /api/collection?playable=1) can be taken to /play: for
// every playable Leader, 50 playable cards of its colours from database rows go through the /play bridge, are eligible (rules and
// game creation) and play a complete game against the bot without fallback.
const row = (d: CardDefinition): PrismaCardRow => ({ id: `db-${d.number}`, code: d.number, name: d.rulesName, type: d.category, color: d.colors.join('/'), cost: d.category === 'LEADER' ? d.life ?? null : d.cost,
  power: d.power, counter: d.counter === null ? null : String(d.counter), imageUrl: '', isAltArt: false, isParallel: false, isSpecial: false })

test('decks of playable collection cards are eligible in /play and finish a bot game, for every playable Leader', () => {
  const { definitions, printings } = engineCatalog(), ruleset = engineRuleset()
  const ok = definitions.filter(d => effectiveStatus(d) === 'PLAYABLE_VERIFIED' && ruleset.allowedNumbers.includes(d.number))
  const leaders = ok.filter(d => d.category === 'LEADER')
  assert.ok(leaders.length >= 50, `${leaders.length} playable Leaders`)
  const failures: string[] = []
  leaders.forEach((leader, index) => {
    const pool = ok.filter(d => d.category !== 'LEADER' && d.colors.every(c => leader.colors.includes(c)))
    const cards: { cardId: string; quantity: number }[] = [{ cardId: `db-${leader.number}`, quantity: 1 }]
    // A different slice of the pool for each Leader, so that many compiled cards are played.
    const start = (index * 13) % Math.max(1, pool.length), ordered = [...pool.slice(start), ...pool.slice(0, start)]
    let n = 0; for (const d of ordered) { if (n >= 50) break; const q = Math.min(4, 50 - n); cards.push({ cardId: `db-${d.number}`, quantity: q }); n += q }
    assert.equal(n, 50, `${leader.number}: 50 playable cards of its colours`)
    const rows = [leader, ...pool].map(row)
    assert.ok(cards.every(c => playableCardIds(rows).has(c.cardId)), `${leader.number}: listed by the deck builder`)
    const bridge = bridgeCards(rows), deck = userDeckEntries(cards, bridge)
    assert.deepEqual(deck.errors, [], leader.number)
    assert.deepEqual(deckEligibility(deck.entries, bridge.printings), { ok: true, errors: [] }, leader.number)
    const merged = [...new Map([...printings, ...bridge.printings].map(p => [p.printingKey, p])).values()]
    const opponent = REFERENCE_DECKS[index % 2]
    let result: ReturnType<typeof playMatch>
    try { result = playMatch(scopedInput({ definitions, printings: merged, gameId: `collection-${leader.number}`, seed: 900 + index, scope: 'BASIC_TURNS', chooserId: 'p1', ruleset, effectRegistry: currentEngineRegistry(),
      players: [{ id: 'p1', cards: structuredClone(deck.entries), donCount: 10 }, { id: 'p2', cards: structuredClone(opponent.entries), donCount: 10 }] }), { p1: 'normal', p2: 'normal' }) } catch (e) { failures.push(`${leader.number}: ${(e as Error).message}`); return }
    if (!result.winner || result.fallbacks || result.refused) failures.push(`${leader.number}: winner ${result.winner ?? '-'}, fallbacks ${result.fallbacks}, refused ${result.refused}`)
  })
  assert.deepEqual(failures, [])
})
