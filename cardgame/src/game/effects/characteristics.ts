import type { GameState } from '../core/types'
import type { CombatKeyword } from '../cards/types'

type Continuous = NonNullable<NonNullable<GameState['effects']>['registry']['continuous']>[number]

/** Evaluates printed and data-driven conditional keywords from the same serialized game snapshot. */
export function hasCombatKeyword(s: GameState, id: string, keyword: CombatKeyword | 'BLOCKER'): boolean {
  const instance = s.instances[id]
  if (!instance) return false
  const definition = s.catalog.definitions.find(card => card.definitionId === instance.definitionId)
  if (!definition || !['leader', 'characters'].includes(instance.zone)) return false
  if (keyword !== 'BLOCKER' && definition.review.combatKeywords?.includes(keyword)) return true
  if (s.effects?.keywordGrants?.some(g => g.keyword === keyword && g.turnId === s.turn && (g.battleId === undefined || g.battleId === s.battle?.id) && g.subject.instanceId === id && g.subject.generation === instance.zoneGeneration)) return true
  const attached = s.players.find(player => player.id === instance.controller)?.zones.attached
    .filter(donId => s.instances[donId]?.attachedTo === id).length ?? 0
  return (s.effects?.registry.conditionalKeywords ?? []).some(effect => effect.definitionId === instance.definitionId
    && effect.zone === instance.zone && effect.keyword === keyword && attached >= effect.minimumAttachedDon
    && (effect.whenAnyCharacterCostAtMost === undefined || s.players.some(p => p.zones.characters.some(c => { const v = evaluateCost(s, c); return v !== null && v <= effect.whenAnyCharacterCostAtMost! })))
    && (effect.whenOwnCharacterCostAtLeast === undefined || ownCharacterCostAtLeast(s, instance.controller, effect.whenOwnCharacterCostAtLeast))
    && (effect.minimumFieldDon === undefined || fieldDon(s, instance.controller) >= effect.minimumFieldDon)
    && (!effect.duringOpponentTurn || s.activePlayerId !== instance.controller)
    && (effect.minimumGivenDon === undefined || (s.players.find(p => p.id === instance.controller)?.zones.attached.length ?? 0) >= effect.minimumGivenDon)
    && (effect.minimumBaseCostCharacters === undefined || (s.players.find(p => p.id === instance.controller)?.zones.characters.filter(c => (s.catalog.definitions.find(d => d.definitionId === s.instances[c].definitionId)?.cost ?? -1) >= effect.minimumBaseCostCharacters!.minCost).length ?? 0) >= effect.minimumBaseCostCharacters.count))
}

/** A printed [Blocker] or one gained from a data-driven condition. */
export function hasBlockerAbility(s: GameState, id: string): boolean {
  const d = s.catalog.definitions.find(x => x.definitionId === s.instances[id]?.definitionId)
  return !!d && (d.review.effects.some(e => e.kind === 'blocker') || hasCombatKeyword(s, id, 'BLOCKER'))
}
/** DON!! cards on a player's field (cost area and given DON!!). */
export const fieldDon = (s: GameState, playerId: string) => { const p = s.players.find(x => x.id === playerId)!; return p.zones.cost.length + p.zones.attached.length }
/** "If you have a Character with a cost of N or more": the controller's Characters, at their current cost. */
export function ownCharacterCostAtLeast(s: GameState, controllerId: string, minimum: number): boolean {
  return !!s.players.find(p => p.id === controllerId)?.zones.characters.some(c => { const v = evaluateCost(s, c); return v !== null && v >= minimum })
}

// Whether a continuous definition printed on `source` is active (conditions other than the cost condition).
function active(s: GameState, m: Continuous, source: GameState['instances'][string]): boolean {
  const controller = s.players.find(p => p.id === source.controller)!
  const don = controller.zones.attached.filter(x => s.instances[x].attachedTo === source.id).length
  return source.zone === m.zone && don >= m.minimumAttachedDon && (m.minimumOwnCharacters === undefined || controller.zones.characters.length >= m.minimumOwnCharacters)
    && (!m.duringYourTurn || s.activePlayerId === source.controller) && (!m.sourceRested || source.rested)
    && (!m.duringOpponentTurn || s.activePlayerId !== source.controller) && (m.maximumOwnLife === undefined || controller.zones.life.length <= m.maximumOwnLife) && (m.minimumOwnLife === undefined || controller.zones.life.length >= m.minimumOwnLife)
    && (m.minimumFieldDon === undefined || controller.zones.cost.length + controller.zones.attached.length >= m.minimumFieldDon)
    && (m.whenCharacter === undefined || characterExists(s, source.controller, m.whenCharacter))
}
/** "If you (your opponent) have a [Name] Character with N (base) power or more". */
function characterExists(s: GameState, controllerId: string, w: NonNullable<Continuous['whenCharacter']>): boolean {
  const p = s.players.find(x => w.side === 'OWN' ? x.id === controllerId : x.id !== controllerId)!
  return p.zones.characters.some(id => {
    const d = s.catalog.definitions.find(x => x.definitionId === s.instances[id].definitionId)
    if (!d || (w.namesAny && !w.namesAny.includes(d.rulesName))) return false
    const power = w.powerBasis === 'BASE' ? evaluateCharacteristics(s, id).power.base : evaluateCharacteristics(s, id).power.current
    return power !== null && power >= w.minPower
  })
}
/** Continuous definitions applying to card `id` (its own, and the auras of its controller's Leader, Characters and Stage). */
function continuousFor(s: GameState, id: string, characteristic: 'POWER' | 'COST'): Continuous[] {
  const i = s.instances[id], d = s.catalog.definitions.find(x => x.definitionId === i.definitionId)!
  const field = ['leader', 'characters'].includes(i.zone)
  const controller = s.players.find(p => p.id === i.controller)!
  const all = (s.effects?.registry.continuous ?? []).filter(m => m.characteristic === characteristic)
  const own = all.filter(m => !m.targets && m.definitionId === d.definitionId && active(s, m, i))
  const aura = field ? all.filter(m => m.targets && (!m.targets.traitsAny || m.targets.traitsAny.some(t => d.traits.includes(t)))
    && (!m.targets.colorsAny || m.targets.colorsAny.some(c => d.colors.includes(c))) && (!m.targets.charactersOnly || i.zone === 'characters')
    && (m.targets.maxBasePower === undefined || (d.power !== null && d.power <= m.targets.maxBasePower)))
    .flatMap(m => [...controller.zones.leader, ...controller.zones.characters, ...controller.zones.stage]
      .filter(x => s.instances[x].definitionId === m.definitionId && active(s, m, s.instances[x])).map(() => m)) : []
  return [...own, ...aura]
}
/** Current cost only; never reads power, so cost conditions cannot loop. */
export function evaluateCost(s: GameState, id: string): number | null {
  const i = s.instances[id]
  if (!i) throw new Error('UNKNOWN_CHARACTERISTIC_SUBJECT')
  const d = s.catalog.definitions.find(x => x.definitionId === i.definitionId)
  if (!d || d.cost === null) return null
  const field = ['leader', 'characters'].includes(i.zone)
  const cost = continuousFor(s, id, 'COST').reduce((n, m) => n + m.amount, 0)
    + (field ? s.effects?.costModifiers?.filter(m => m.subject.instanceId === id && m.subject.generation === i.zoneGeneration
      && (m.untilTurn === undefined ? m.turnId === s.turn : s.turn >= m.turnId && s.turn < m.untilTurn)).reduce((n, m) => n + m.amount, 0) ?? 0 : 0)
  return Math.max(0, d.cost + cost)
}

// No cached/current characteristics in state. Values are recomputed from the serialized sources.
export function evaluateCharacteristics(s: GameState, id: string) {
  const i = s.instances[id]
  if (!i) throw new Error('UNKNOWN_CHARACTERISTIC_SUBJECT')
  const d = s.catalog.definitions.find(d => d.definitionId === i.definitionId)
  if (!d) return { power: { printed: null, base: null, current: null }, cost: { printed: null, base: null, current: null } }
  const attached = s.players.find(p => p.id === i.controller)!.zones.attached.filter(don => s.instances[don].attachedTo === id).length
  const field = ['leader', 'characters'].includes(i.zone)
  const continuous = continuousFor(s, id, 'POWER').filter(m => m.whenOwnCharacterCostAtLeast === undefined
    || ownCharacterCostAtLeast(s, s.instances[id].controller, m.whenOwnCharacterCostAtLeast))
  const activeBaseModifiers = s.effects?.basePowerModifiers?.filter(m => m.subject.instanceId === id && m.subject.generation === i.zoneGeneration
    && field && (s.players.find(p => p.id === m.expiresForPlayerId)?.turns ?? Number.MAX_SAFE_INTEGER) < m.expiresAtPlayerTurn) ?? []
  if (activeBaseModifiers.length > 1) throw new Error('BASE_POWER_MODIFIER_ORDER_NOT_IMPLEMENTED')
  const basePower = activeBaseModifiers[0]?.value ?? d.power
  const power = (field && s.activePlayerId === i.controller ? attached * 1000 : 0)
    + continuous.reduce((n, m) => n + m.amount, 0)
    + (s.effects?.powerModifiers?.filter(m => m.subject.instanceId === id && m.subject.generation === i.zoneGeneration && (m.untilTurn === undefined ? m.turnId === s.turn : s.turn >= m.turnId && s.turn < m.untilTurn) && field).reduce((n, m) => n + m.amount, 0) ?? 0)
  return { power: { printed: d.power, base: basePower, current: basePower === null ? null : basePower + power },
    cost: { printed: d.cost, base: d.cost, current: evaluateCost(s, id) } }
}
