import type { GameState } from '../core/types'
import type { CombatKeyword } from '../cards/types'

/** Evaluates printed and data-driven conditional keywords from the same serialized game snapshot. */
export function hasCombatKeyword(s: GameState, id: string, keyword: CombatKeyword): boolean {
  const instance = s.instances[id]
  if (!instance) return false
  const definition = s.catalog.definitions.find(card => card.definitionId === instance.definitionId)
  if (!definition || !['leader', 'characters'].includes(instance.zone)) return false
  if (definition.review.combatKeywords?.includes(keyword)) return true
  if (s.effects?.keywordGrants?.some(g => g.keyword === keyword && g.turnId === s.turn && (g.battleId === undefined || g.battleId === s.battle?.id) && g.subject.instanceId === id && g.subject.generation === instance.zoneGeneration)) return true
  const attached = s.players.find(player => player.id === instance.controller)?.zones.attached
    .filter(donId => s.instances[donId]?.attachedTo === id).length ?? 0
  return (s.effects?.registry.conditionalKeywords ?? []).some(effect => effect.definitionId === instance.definitionId
    && effect.zone === instance.zone && effect.keyword === keyword && attached >= effect.minimumAttachedDon
    && (effect.whenAnyCharacterCostAtMost === undefined || s.players.some(p => p.zones.characters.some(c => { const v = evaluateCharacteristics(s, c).cost.current; return v !== null && v <= effect.whenAnyCharacterCostAtMost! }))))
}

// No cached/current characteristics in state. Values are recomputed from the serialized sources.
export function evaluateCharacteristics(s: GameState, id: string) {
  const i = s.instances[id]
  if (!i) throw new Error('UNKNOWN_CHARACTERISTIC_SUBJECT')
  const d = s.catalog.definitions.find(d => d.definitionId === i.definitionId)
  if (!d) return { power: { printed: null, base: null, current: null }, cost: { printed: null, base: null, current: null } }
  const attached = s.players.find(p => p.id === i.controller)!.zones.attached.filter(don => s.instances[don].attachedTo === id).length
  const field = ['leader', 'characters'].includes(i.zone)
  const controller = s.players.find(p => p.id === i.controller)!
  const active = (m: NonNullable<NonNullable<GameState['effects']>['registry']['continuous']>[number], source: typeof i) => {
    const don = controller.zones.attached.filter(x => s.instances[x].attachedTo === source.id).length
    return source.zone === m.zone && don >= m.minimumAttachedDon && (m.minimumOwnCharacters === undefined || controller.zones.characters.length >= m.minimumOwnCharacters)
      && (!m.duringYourTurn || s.activePlayerId === source.controller) && (!m.sourceRested || source.rested)
      && (!m.duringOpponentTurn || s.activePlayerId !== source.controller) && (m.maximumOwnLife === undefined || controller.zones.life.length <= m.maximumOwnLife) && (m.minimumOwnLife === undefined || controller.zones.life.length >= m.minimumOwnLife)
  }
  const all = s.effects?.registry.continuous ?? []
  const own = all.filter(m => !m.targets && m.definitionId === d.definitionId && active(m, i))
  const aura = field ? all.filter(m => m.targets && m.targets.traitsAny.some(t => d.traits.includes(t))).flatMap(m => controller.zones.characters
    .filter(id => s.instances[id].definitionId === m.definitionId && active(m, s.instances[id])).map(() => m)) : []
  const continuous = [...own, ...aura]
  const activeBaseModifiers = s.effects?.basePowerModifiers?.filter(m => m.subject.instanceId === id && m.subject.generation === i.zoneGeneration
    && field && (s.players.find(p => p.id === m.expiresForPlayerId)?.turns ?? Number.MAX_SAFE_INTEGER) < m.expiresAtPlayerTurn) ?? []
  if (activeBaseModifiers.length > 1) throw new Error('BASE_POWER_MODIFIER_ORDER_NOT_IMPLEMENTED')
  const basePower = activeBaseModifiers[0]?.value ?? d.power
  const power = (field && s.activePlayerId === i.controller ? attached * 1000 : 0)
    + continuous.filter(m => m.characteristic === 'POWER').reduce((n, m) => n + m.amount, 0)
    + (s.effects?.powerModifiers?.filter(m => m.subject.instanceId === id && m.subject.generation === i.zoneGeneration && (m.untilTurn === undefined ? m.turnId === s.turn : s.turn >= m.turnId && s.turn < m.untilTurn) && field).reduce((n, m) => n + m.amount, 0) ?? 0)
  const cost = continuous.filter(m => m.characteristic === 'COST').reduce((n, m) => n + m.amount, 0)
    + (field ? s.effects?.costModifiers?.filter(m => m.subject.instanceId === id && m.subject.generation === i.zoneGeneration && m.turnId === s.turn).reduce((n, m) => n + m.amount, 0) ?? 0 : 0)
  return { power: { printed: d.power, base: basePower, current: basePower === null ? null : basePower + power },
    cost: { printed: d.cost, base: d.cost, current: d.cost === null ? null : Math.max(0, d.cost + cost) } }
}
