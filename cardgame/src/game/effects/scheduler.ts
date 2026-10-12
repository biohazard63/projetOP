import type { GameState } from '../core/types'
import type { ScheduledTrigger, SchedulerState } from './contracts'

export function enqueueTriggers(s: GameState, triggers: ScheduledTrigger[], causeId: string): void {
  const q = s.effects!.scheduler!
  if (!triggers.length) return
  if (q.batches.some(b => b.id === causeId) || q.history.some(t => t.causeId === causeId)) throw new Error('DUPLICATE_TRIGGER_CAUSE')
  q.batches.push({ id: causeId, activePlayerId: s.activePlayerId!, triggers: structuredClone(triggers) })
}
// §§8-6-1/1-1: finish the oldest batch before cascades; choose among the
// current controller's simultaneous abilities, never by registry/card order.
export function nextTriggers(q: SchedulerState): ScheduledTrigger[] {
  while (q.batches.length && !q.batches[0].triggers.some(t => t.status === 'PENDING' || t.status === 'RESOLVING')) {
    q.history.push(...q.batches.shift()!.triggers)
  }
  const b = q.batches[0]
  if (!b) return []
  const pending = b.triggers.filter(t => t.status === 'PENDING')
  const active = pending.filter(t => t.controllerId === b.activePlayerId)
  return active.length ? active : pending
}
export function completeScheduledTrigger(q: SchedulerState): void {
  if (!q.resolvingId) return
  const t = q.batches.flatMap(b => b.triggers).find(t => t.id === q.resolvingId)
  if (!t || t.status !== 'RESOLVING') throw new Error('INVALID_TRIGGER_RESOLUTION')
  t.status = 'RESOLVED'; q.resolvingId = null
}
