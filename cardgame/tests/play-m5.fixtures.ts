import type { PrismaClient } from '@prisma/client'
import { MemoryGameRepository, PrismaGameRepository, type GameRepository } from '../src/lib/engine/repository'
import { PlayService } from '../src/lib/engine/service'
import { REFERENCE_DECKS } from '../src/lib/engine/decks'

// M5 browser fixture: a REAL game created and played through PlayService (same validation as the API), stopped at
// the first [Trigger] the human must answer. The human side only keeps, ends its turns and passes Counter/Blocker,
// so the bot (normal) attacks and a Life card with [Trigger] is revealed. The seed is fixed, so the state is the
// one any client would reach with those commands; nothing is written outside the isolated database.
type Action = { type: string; choiceId?: string; battleId?: string }
const red = () => ({ ref: 'reference-red', entries: structuredClone(REFERENCE_DECKS.find(d => d.id === 'reference-red')!.entries) })
async function toTrigger(repo: GameRepository, userId: string, seed: number) {
  const play = new PlayService(repo, () => seed)
  let view = await play.start(userId, red(), 'normal') as unknown as { gameId: string; version: number; status: string; legalActions: Action[] }
  for (let n = 0; n < 200 && view.status === 'ACTIVE'; n++) {
    const has = (t: string) => view.legalActions.find(a => a.type === t)
    if (has('ANSWER_TRIGGER')) return { gameId: view.gameId, version: view.version }
    const a = has('CHOOSE_FIRST') ? { type: 'CHOOSE_FIRST', choice: 'SECOND' } : has('MULLIGAN') ? { type: 'MULLIGAN', redraw: false }
      : has('PASS_BLOCKER') ? { type: 'PASS_BLOCKER', battleId: has('PASS_BLOCKER')!.battleId } : has('PASS_COUNTER') ? { type: 'PASS_COUNTER', battleId: has('PASS_COUNTER')!.battleId }
      : has('ADVANCE_PHASE') ? { type: 'ADVANCE_PHASE' } : has('END_MAIN') ? { type: 'END_MAIN' } : null
    if (!a) return null
    view = (await play.command(userId, view.gameId, { id: `fx-${view.version}`, expectedVersion: view.version, intent: a })).view as unknown as typeof view
  }
  return null
}
/** First seed (searched in memory) whose game reaches a human [Trigger]; then replayed on the isolated database. */
export async function prepareTriggerGame(db: PrismaClient, userId: string) {
  for (let seed = 1; seed < 200; seed++) {
    if (!(await toTrigger(new MemoryGameRepository(), `probe-${seed}`, seed))) continue
    const game = await toTrigger(new PrismaGameRepository(db), userId, seed)
    if (!game) throw new Error('the database replay diverged from the memory replay')
    return { ...game, seed }
  }
  throw new Error('no seed reaches a [Trigger] for the human side')
}
