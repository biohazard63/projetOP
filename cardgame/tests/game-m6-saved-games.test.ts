import test from 'node:test'
import assert from 'node:assert/strict'
import { projectState } from '../src/game/core'
import { REFERENCE_DECKS } from '../src/lib/engine/decks'
import { MemoryGameRepository } from '../src/lib/engine/repository'
import { PlayService } from '../src/lib/engine/service'

// A game saved by an earlier deployment carries the primitive manifest of that deployment: the audited list only grows at its
// end, so every earlier prefix must stay readable (production 500 on /api/play/games/active after adding primitives).
test('M6 saved games: a game whose primitive manifest is an earlier prefix of the current one stays readable', async () => {
  const repo = new MemoryGameRepository(), deck = REFERENCE_DECKS.find(d => d.id === 'starter-st15')!
  await new PlayService(repo).start('u1', { ref: deck.id, entries: deck.entries })
  const state = (await repo.findActive('u1'))!.state, primitives = state.effects!.primitives.primitives
  const added = primitives.findIndex(p => p.id === 'preventAttack')
  assert.ok(added > 0, 'the audited additions start with preventAttack')
  for (let end = added + 1; end <= primitives.length; end++) {
    const saved = structuredClone(state)
    saved.effects!.primitives.primitives = primitives.slice(0, end) as typeof primitives
    assert.doesNotThrow(() => projectState(saved, 'player'), `prefix of ${end} primitives`)
  }
  const unknown = structuredClone(state)
  unknown.effects!.primitives.primitives = [...primitives, { id: 'notAPrimitive', version: '1.0.0' }] as unknown as typeof primitives
  assert.throws(() => projectState(unknown, 'player'), /INVALID_EFFECT_STATE/, 'an unknown primitive is still refused')
})

// Manifests already published by a deployment (fa75fbf, 26f1673, 15f499c): new primitives may only follow them.
test('M6 saved games: the published manifest ending with scheduleEndOfTurn is a prefix of the current one', async () => {
  const repo = new MemoryGameRepository(), deck = REFERENCE_DECKS.find(d => d.id === 'starter-st15')!
  await new PlayService(repo).start('u2', { ref: deck.id, entries: deck.entries })
  const state = (await repo.findActive('u2'))!.state, ids = state.effects!.primitives.primitives.map(p => p.id)
  const published = ['preventAttack', 'trashCharacter', 'disableBlocker', 'returnGivenDon', 'lifeToDeckTop', 'arrangeLife', 'turnLifeFaceUp', 'lockLifeToHand', 'lockRefresh', 'setBasePower', 'scheduleEndOfTurn']
  const start = ids.indexOf('preventAttack')
  assert.deepEqual(ids.slice(start, start + published.length), published)
})
