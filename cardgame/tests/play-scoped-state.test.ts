import test from 'node:test'
import assert from 'node:assert/strict'
import { MemoryGameRepository } from '../src/lib/engine/repository'
import { PlayService } from '../src/lib/engine/service'
import { REFERENCE_DECKS } from '../src/lib/engine/decks'
import { getLegalActions } from '../src/game/core'
import { botIntent } from '../src/lib/engine/bot'

// A stored game only carries the definitions and effect programs of its two decks (it used to carry the whole catalogue,
// about 1.6 MB read, copied and written on every command). Full games are still played to the end through the service.
const deck = (id: string) => REFERENCE_DECKS.find(d => d.id === id)!
for (const [mine, theirs] of [['starter-st13-st13-003', 'starter-st16'], ['starter-st32', 'starter-st24'], ['starter-st01', 'random']] as const) {
  test(`scoped game state: ${mine} against ${theirs} only carries its cards and plays to the end`, async () => {
    const repo = new MemoryGameRepository(), play = new PlayService(repo, () => 23)
    await play.start('u', { ref: mine, entries: deck(mine).entries }, 'normal', theirs === 'random' ? 'random' : { kind: 'reference', id: theirs })
    let game = (await repo.findActive('u'))!
    const used = new Set([...deck(mine).entries, ...deck(game.botDeckRef).entries].map(e => e.printingKey))
    assert.ok(game.state.catalog.printings.every(p => used.has(p.printingKey)), 'only printings of the two decks')
    assert.ok(game.state.catalog.definitions.length <= used.size)
    assert.ok(JSON.stringify(game.state).length < 200_000, 'a fresh game stays small')
    for (let i = 0; i < 800 && game.status === 'ACTIVE'; i++) {
      const legal = getLegalActions(game.state, game.humanSeat)
      assert.ok(legal.length, 'the human seat always has an action while the game is active')
      const { view } = await play.command('u', game.id, { id: `c${i}`, expectedVersion: game.version, intent: botIntent(game.state, game.humanSeat, legal) })
      game = (await repo.findById(view.gameId))!
    }
    assert.equal(game.status, 'FINISHED')
  })
}
