import { getLegalActions, projectState } from '../../../game/core/game'
import type { CardDefinition } from '../../../game/cards/types'
import type { GameState, LegalAction } from '../../../game/core/types'

// M5-4 — strategy layer, separate from the rules engine. A strategy receives ONLY: the projection of its own
// seat (what that player may see), its legal actions, and public card rules (printed definitions). It never
// receives GameState, so it cannot read the opponent's hand, deck, Life or the PRNG.
export type Projection = ReturnType<typeof projectState>
export type Seat = Projection['players'][number]
export type Visible = { id: string; kind: string; printingKey: string | null; definitionId: string | null; rested: boolean; attachedTo: string | null; power: number | null }
export type Intent = Record<string, unknown> & { type: string }
export type BotContext = { seat: string; projection: Projection; actions: LegalAction[]; definition: (definitionId: string | null | undefined) => CardDefinition | undefined }
export type Strategy = { id: BotLevel; decide(ctx: BotContext): Intent }
export type BotLevel = 'easy' | 'normal' | 'hard'
export const BOT_LEVELS: BotLevel[] = ['easy', 'normal', 'hard']

/** Builds the bounded, public-only context. Card rules come from the catalogue, which is public information. */
export function botContext(state: GameState, seat: string): BotContext {
  const byId = new Map(state.catalog.definitions.map(d => [d.definitionId, d]))
  return { seat, projection: projectState(state, seat), actions: getLegalActions(state, seat), definition: id => (id ? byId.get(id) : undefined) }
}
export const of = <T extends LegalAction['type']>(ctx: BotContext, type: T) => ctx.actions.filter((a): a is Extract<LegalAction, { type: T }> => a.type === type)
export function seats(ctx: BotContext) {
  const me = ctx.projection.players.find(p => p.id === ctx.seat)!, foe = ctx.projection.players.find(p => p.id !== ctx.seat)!
  return { me, foe, hand: (me.hand ?? []) as Visible[], myField: [...me.leader, ...me.characters] as Visible[], foeField: [...foe.leader, ...foe.characters] as Visible[] }
}
export function visible(ctx: BotContext, id: string): Visible | undefined {
  for (const p of ctx.projection.players) for (const zone of [p.leader, p.characters, p.stage, p.trash, p.cost, p.attached, p.hand ?? []] as Visible[][]) {
    const found = zone.find(v => v.id === id); if (found) return found
  }
  return undefined
}
export const cardOf = (ctx: BotContext, id: string) => ctx.definition(visible(ctx, id)?.definitionId)
export const powerOf = (ctx: BotContext, id: string) => visible(ctx, id)?.power ?? 0
export const activeDon = (seat: Seat) => (seat.cost as Visible[]).filter(d => !d.rested).length
/** Estimated bonus of a Counter Event from its printed text (a heuristic for decisions, never a rule). */
export function eventBonus(d: CardDefinition | undefined): number {
  const match = d?.review.effectOriginal.match(/\+(\d+) power/)
  return match ? Number(match[1]) : 0
}
export function battleGap(ctx: BotContext): number {
  const battle = ctx.projection.battle
  if (!battle) return 0
  return powerOf(ctx, battle.attacker) - (powerOf(ctx, battle.target) + (battle.counterBonus ?? 0)) + 1000
}

/** Always-legal fallback: answers the pending window with its least committing option. */
export function fallback(ctx: BotContext): Intent {
  const a = ctx.actions
  const choice = of(ctx, 'ANSWER_CHOICE')[0]
  if (choice) return { type: 'ANSWER_CHOICE', choiceId: choice.choiceId, tokens: choice.options.slice(0, choice.choiceType === 'ORDER' ? choice.max : choice.min).map(o => o.token) }
  const first = of(ctx, 'CHOOSE_FIRST')[0]; if (first) return { type: 'CHOOSE_FIRST', choice: 'FIRST' }
  if (of(ctx, 'MULLIGAN')[0]) return { type: 'MULLIGAN', redraw: false }
  const trigger = of(ctx, 'ANSWER_TRIGGER')[0]; if (trigger) return { type: 'ANSWER_TRIGGER', choiceId: trigger.choiceId, activate: false }
  for (const type of ['PASS_BLOCKER', 'PASS_COUNTER', 'RESOLVE_BATTLE', 'CONTINUE_LIFE_DAMAGE'] as const) { const x = of(ctx, type)[0]; if (x) return { type, battleId: x.battleId } }
  if (a.some(x => x.type === 'ADVANCE_PHASE')) return { type: 'ADVANCE_PHASE' }
  if (a.some(x => x.type === 'END_MAIN')) return { type: 'END_MAIN' }
  throw new Error('NO_FALLBACK_ACTION')
}
/** Checks that an intent is backed by a legal action of the context (type and referenced ids). */
export function backedByLegalAction(ctx: BotContext, intent: Intent): boolean {
  const same = ctx.actions.filter(a => a.type === intent.type)
  if (!same.length) return false
  const has = (list: string[] | undefined, id: unknown) => typeof id === 'string' && !!list?.includes(id)
  switch (intent.type) {
    case 'PLAY_CARD': return same.some(a => a.type === 'PLAY_CARD' && a.instanceId === intent.instanceId && Array.isArray(intent.donIds) && (intent.donIds as string[]).every(id => a.eligibleDonIds.includes(id)) && (intent.replaceId === null || a.replacementIds.includes(intent.replaceId as string)))
    case 'DECLARE_ATTACK': return same.some(a => a.type === 'DECLARE_ATTACK' && has(a.attackerIds, intent.attackerId) && has(a.targetIdsByAttacker?.[intent.attackerId as string] ?? a.targetIds, intent.targetId))
    case 'ATTACH_DON': return same.some(a => a.type === 'ATTACH_DON' && has(a.targetIds, intent.targetId) && Array.isArray(intent.donIds) && (intent.donIds as string[]).every(id => a.eligibleDonIds.includes(id)))
    case 'ACTIVATE_BLOCKER': return same.some(a => a.type === 'ACTIVATE_BLOCKER' && has(a.blockerIds, intent.blockerId))
    case 'PLAY_COUNTER_CHARACTER': return same.some(a => a.type === 'PLAY_COUNTER_CHARACTER' && has(a.cardIds, intent.cardId) && has(a.targetIds, intent.targetId))
    case 'PLAY_COUNTER_EVENT': return same.some(a => a.type === 'PLAY_COUNTER_EVENT' && has(a.eventIds, intent.cardId))
    case 'START_EFFECT': return same.some(a => a.type === 'START_EFFECT' && a.effectId === intent.effectId)
    case 'ANSWER_CHOICE': return same.some(a => a.type === 'ANSWER_CHOICE' && a.choiceId === intent.choiceId && Array.isArray(intent.tokens) && (intent.tokens as string[]).length >= a.min && (intent.tokens as string[]).length <= a.max && (intent.tokens as string[]).every(t => a.options.some(o => o.token === t)))
    default: return true
  }
}
