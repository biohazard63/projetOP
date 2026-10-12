import type { GameState } from '../core/types'

// No cached/current characteristics in state. Values are recomputed from the serialized sources.
export function evaluateCharacteristics(s: GameState, id: string) {
  const i = s.instances[id]
  if (!i) throw new Error('UNKNOWN_CHARACTERISTIC_SUBJECT')
  const d = s.catalog.definitions.find(d => d.definitionId === i.definitionId)
  if (!d) return { power: { printed: null, base: null, current: null }, cost: { printed: null, base: null, current: null } }
  const attached = s.players.find(p => p.id === i.controller)!.zones.attached.filter(don => s.instances[don].attachedTo === id).length
  const field = ['leader', 'characters'].includes(i.zone)
  const continuous = s.effects?.registry.continuous?.filter(m => m.definitionId === d.definitionId && i.zone === m.zone && attached >= m.minimumAttachedDon) ?? []
  const activeBaseModifiers = s.effects?.basePowerModifiers?.filter(m => m.subject.instanceId === id && m.subject.generation === i.zoneGeneration
    && field && (s.players.find(p => p.id === m.expiresForPlayerId)?.turns ?? Number.MAX_SAFE_INTEGER) < m.expiresAtPlayerTurn) ?? []
  if (activeBaseModifiers.length > 1) throw new Error('BASE_POWER_MODIFIER_ORDER_NOT_IMPLEMENTED')
  const basePower = activeBaseModifiers[0]?.value ?? d.power
  const power = (field && s.activePlayerId === i.controller ? attached * 1000 : 0)
    + continuous.filter(m => m.characteristic === 'POWER').reduce((n, m) => n + m.amount, 0)
    + (s.effects?.powerModifiers?.filter(m => m.subject.instanceId === id && m.subject.generation === i.zoneGeneration && m.turnId === s.turn && field).reduce((n, m) => n + m.amount, 0) ?? 0)
  const cost = continuous.filter(m => m.characteristic === 'COST').reduce((n, m) => n + m.amount, 0)
  return { power: { printed: d.power, base: basePower, current: basePower === null ? null : basePower + power },
    cost: { printed: d.cost, base: d.cost, current: d.cost === null ? null : Math.max(0, d.cost + cost) } }
}
