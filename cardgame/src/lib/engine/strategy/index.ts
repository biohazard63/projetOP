import { applyCommand, createGame, getLegalActions } from '../../../game/core/game'
import type { Command, GameInput, GameState } from '../../../game/core/types'
import { backedByLegalAction, botContext, fallback, type BotLevel, type Intent } from './context'
import { STRATEGIES } from './strategies'

export { BOT_LEVELS, type BotLevel } from './context'
export type BotDecision = { intent: Intent; usedFallback: boolean }

/** One bounded decision: the strategy sees only its projection; an unusable answer falls back safely. */
export function botDecision(state: GameState, seat: string, level: BotLevel): BotDecision {
  const ctx = botContext(state, seat)
  try {
    const intent = STRATEGIES[level].decide(ctx)
    if (backedByLegalAction(ctx, intent)) return { intent, usedFallback: false }
  } catch { /* fall through to the safe default */ }
  return { intent: fallback(ctx), usedFallback: true }
}

export type MatchResult = { winner: string | null; reason: string | null; turns: number; commands: number; fallbacks: number; refused: number; actions: Record<string, Record<string, number>> }
/** Bot-vs-bot match through public commands only (tournaments, tests). Bounded in commands. */
export function playMatch(input: GameInput, levels: Record<string, BotLevel>, maxCommands = 4000): MatchResult {
  let state = createGame(input), fallbacks = 0, refused = 0, commands = 0
  const actions: Record<string, Record<string, number>> = Object.fromEntries(input.players.map(p => [p.id, {}]))
  while (!state.result && commands < maxCommands) {
    const seat = [state.decisionPlayerId, state.activePlayerId, ...state.players.map(p => p.id)].find(id => id && getLegalActions(state, id).length)
    if (!seat) break
    let { intent, usedFallback } = botDecision(state, seat, levels[seat])
    let result = applyCommand(state, { ...intent, id: `m-${state.version}`, actorId: seat, expectedVersion: state.version } as Command)
    if (!result.ok) { refused++; intent = fallback(botContext(state, seat)); usedFallback = true; result = applyCommand(state, { ...intent, id: `f-${state.version}`, actorId: seat, expectedVersion: state.version } as Command) }
    if (!result.ok) throw new Error(`MATCH_STUCK:${result.error}`)
    if (usedFallback) fallbacks++
    const type = intent.type === 'MULLIGAN' && intent.redraw ? 'MULLIGAN_REDRAW' : intent.type === 'ATTACH_DON' ? `ATTACH_DON:${state.instances[intent.targetId as string]?.zone === 'leader' ? 'leader' : 'character'}` : intent.type
    actions[seat][type] = (actions[seat][type] ?? 0) + (intent.type === 'ATTACH_DON' ? (intent.donIds as string[]).length : 1)
    state = result.state; commands++
  }
  return { winner: state.result?.winnerId ?? null, reason: state.result?.reason ?? null, turns: state.turn, commands, fallbacks, refused, actions }
}
