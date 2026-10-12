import test, { mock } from 'node:test'
import assert from 'node:assert/strict'
import { MemoryGameRepository } from '../src/lib/engine/repository'
import { PlayService, HUMAN_SEAT, BOT_SEAT, ENGINE_VERSION } from '../src/lib/engine/service'
import { REFERENCE_DECKS, deckEligibility } from '../src/lib/engine/decks'
import { engineCatalog, engineRegistry, engineRuleset, officialSubsetRuleset, m3EngineCatalog, m3EngineRuleset } from '../src/lib/engine/catalog'
import { FREE_RULESET, FREE_RULESET_ID } from '../src/game/rulesets/free'
import { validateEngineDeck, type DeckEntry } from '../src/game/rulesets/decks'
import { createGame, getLegalActions, restoreGame } from '../src/game/core/game'

// MUGIWARA_FREE: permanent format for /play. No calendar window and no official ban list; structural rules,
// implemented-cards-only admission, command legality and privacy are unchanged.
const cat = engineCatalog()
const deck = (i: number) => structuredClone(REFERENCE_DECKS[i].entries)
const numberOf = (e: DeckEntry) => cat.definitions.find(d => d.definitionId === cat.printings.find(p => p.printingKey === e.printingKey)!.definitionId)!

test('MUGIWARA_FREE is the default, permanent and carries no official restriction', () => {
  const r = engineRuleset()
  assert.equal(r.id, FREE_RULESET_ID); assert.equal(r.format, 'FREE')
  assert.equal(r.restrictionWindow, null); assert.deepEqual(r.restrictions, []); assert.equal(r.competitive, false)
  assert.deepEqual([...r.allowedNumbers].sort(), [...officialSubsetRuleset().allowedNumbers].sort(), 'same implemented cards as the reviewed catalogue')
  assert.notEqual(officialSubsetRuleset().id, FREE_RULESET_ID, 'the official subset stays a distinct format')
  assert.deepEqual(validateEngineDeck(deck(0), cat.definitions, cat.printings, { ...r, restrictionWindow: { from: '2026-10-12', through: '2026-10-12' } }), ['INVALID_FREE_FORMAT'], 'a free format cannot carry an expiring window')
  assert.ok(validateEngineDeck(deck(0), cat.definitions, cat.printings, { ...r, restrictions: [{ kind: 'banned', number: 'ST01-001', effectiveFrom: '2026-01-01', source: 'synthetic' }] }).includes('INVALID_FREE_FORMAT'))
})

test('MUGIWARA_FREE ignores official bans (synthetic restriction) that the official subset applies', () => {
  const target = numberOf(deck(1).find(e => numberOf(e).category !== 'LEADER')!).number
  const official = { ...officialSubsetRuleset(), restrictions: [...officialSubsetRuleset().restrictions, { kind: 'banned' as const, number: target, effectiveFrom: '2026-01-01', source: 'synthetic test restriction' }] }
  assert.ok(validateEngineDeck(deck(1), cat.definitions, cat.printings, official).includes(`RESTRICTED:${target}`))
  assert.deepEqual(validateEngineDeck(deck(1), cat.definitions, cat.printings, FREE_RULESET), [])
})

test('MUGIWARA_FREE keeps the structural rules: 50 cards, 4 copies, Leader colours, implemented cards only', () => {
  const v = (entries: DeckEntry[]) => validateEngineDeck(entries, cat.definitions, cat.printings, FREE_RULESET, 'playable')
  const d = deck(1), main = d.find(e => numberOf(e).category !== 'LEADER' && e.quantity < 4)!
  assert.ok(v(d.map(e => e === main ? { ...e, quantity: e.quantity - 1 } : e)).includes('EXACTLY_FIFTY_MAIN'))
  const four = d.find(e => numberOf(e).category !== 'LEADER' && e.quantity === 4)!, other = d.find(e => numberOf(e).category !== 'LEADER' && e !== four)!
  assert.ok(v(d.map(e => e === four ? { ...e, quantity: 5 } : e === other ? { ...e, quantity: e.quantity - 1 } : e).filter(e => e.quantity > 0)).includes(`TOO_MANY_COPIES:${numberOf(four).number}`))
  const purple = cat.printings.find(p => cat.definitions.find(x => x.definitionId === p.definitionId)?.colors.join() === 'PURPLE' && cat.definitions.find(x => x.definitionId === p.definitionId)?.category === 'CHARACTER')!
  assert.ok(v([...d.filter(e => e !== other), ...(other.quantity > 1 ? [{ ...other, quantity: other.quantity - 1 }] : []), { printingKey: purple.printingKey, quantity: 1 }]).includes('INCOMPATIBLE_COLOR'))
  assert.ok(validateEngineDeck(d, cat.definitions, cat.printings, { ...FREE_RULESET, allowedNumbers: FREE_RULESET.allowedNumbers.filter(n => n !== numberOf(main).number) }).includes(`NOT_ADMITTED:${numberOf(main).number}`), 'a card the engine does not implement is never playable')
  assert.ok(validateEngineDeck(d, cat.definitions, cat.printings, { ...FREE_RULESET, capabilities: [] }, 'playable').some(e => e.startsWith('UNSUPPORTED_EFFECT:')), 'an ability without executor is refused')
})

for (const date of ['2026-10-12T12:00:00Z', '2026-10-13T08:00:00Z', '2026-11-01T20:00:00Z', '2031-02-28T00:00:00Z']) {
  test(`/play creates games with the three reference decks on ${date.slice(0, 10)}`, async t => {
    mock.timers.enable({ apis: ['Date'], now: new Date(date) }); t.after(() => mock.timers.reset())
    assert.equal(new Date().toISOString(), new Date(date).toISOString())
    for (const [i, ref] of REFERENCE_DECKS.entries()) {
      assert.deepEqual(deckEligibility(deck(i)), { ok: true, errors: [] }, `${ref.id} eligible`)
      const repo = new MemoryGameRepository(), play = new PlayService(repo, () => 42 + i), uid = `free-${date}-${ref.id}`
      const view = await play.start(uid, { ref: ref.id, entries: deck(i) }, 'normal')
      const stored = repo.games.get(view.gameId)!
      assert.equal(stored.rulesetId, FREE_RULESET_ID); assert.equal(stored.state.ruleset.id, FREE_RULESET_ID); assert.equal(stored.status, 'ACTIVE')
      assert.ok(getLegalActions(stored.state, HUMAN_SEAT).length > 0, 'the human can act')
    }
  })
}

test('existing games keep their stored ruleset (M4 subset and M5 subset) and can still be played', async () => {
  for (const [label, catalog, ruleset] of [['m3', m3EngineCatalog(), m3EngineRuleset()], ['m5', engineCatalog(), officialSubsetRuleset()]] as const) {
    const state = createGame({ gameId: `legacy-${label}`, seed: 7, scope: 'BASIC_TURNS', chooserId: HUMAN_SEAT, definitions: catalog.definitions, printings: catalog.printings, ruleset, effectRegistry: engineRegistry(),
      players: [{ id: HUMAN_SEAT, cards: deck(1), donCount: 10 }, { id: BOT_SEAT, cards: deck(0), donCount: 10 }] })
    const repo = new MemoryGameRepository(), play = new PlayService(repo, () => 1), uid = `legacy-${label}`
    const created = (await repo.create({ userId: uid, status: 'ACTIVE', humanSeat: HUMAN_SEAT, botSeat: BOT_SEAT, deckRef: 'reference-red', botDeckRef: 'reference-purple', botLevel: 'normal', rulesetId: ruleset.id, engineVersion: ENGINE_VERSION, version: state.version, state: JSON.parse(JSON.stringify(state)), result: null }, []))!
    let view = await play.view(uid, created.id) as unknown as { version: number; legalActions: { type: string }[]; status: string }
    for (let n = 0; n < 12 && view.status === 'ACTIVE'; n++) {
      const a = view.legalActions[0] as { type: string } & Record<string, unknown>
      const intent = a.type === 'CHOOSE_FIRST' ? { type: 'CHOOSE_FIRST', choice: 'FIRST' } : a.type === 'MULLIGAN' ? { type: 'MULLIGAN', redraw: false } : view.legalActions.some(x => x.type === 'END_MAIN') ? { type: 'END_MAIN' } : { type: 'ADVANCE_PHASE' }
      view = (await play.command(uid, created.id, { id: `l-${n}`, expectedVersion: view.version, intent })).view as unknown as typeof view
    }
    const after = repo.games.get(created.id)!
    assert.equal(after.state.ruleset.id, ruleset.id, `${label}: the stored ruleset is preserved`); assert.ok(after.version > state.version)
    assert.equal(restoreGame(JSON.stringify(after.state)).ruleset.id, ruleset.id)
  }
})
