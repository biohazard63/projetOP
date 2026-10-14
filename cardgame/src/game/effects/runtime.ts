import { enqueueTriggers, nextTriggers, completeScheduledTrigger } from './scheduler'
import { confirmPower, confirmMoveOperation, confirmRestOperation, recordOperation, processOperation, preflightCosts, payCosts, fieldDon, noteDonReturned } from './operations'
import { evaluateCharacteristics, hasBlockerAbility, ownCharacterCostAtLeast } from './characteristics'
import { shuffle, seededRandom } from '../core/random'
import type { GameState, Command, LegalAction } from '../core/types'
import { CARD_PRIMITIVES, PRIMITIVES, UNIVERSAL_PRIMITIVES, runtimeSchema, validateRegistry, type EffectRuntime, type EffectRegistry, type PrimitiveRegistry, type Condition,
  type OperationSpec, type ProposedOperation, type EffectContext } from './contracts'

// Same command dispatcher and continuation interpreter for laboratory and reviewed card programs.
export function createEffectRuntime(value: unknown): EffectRuntime {
  const registry = validateRegistry(value), modern = registry.version !== '1.0.0', scheduled = registry.version === '1.2.0' || registry.version === '1.3.0'
  const primitives: PrimitiveRegistry = registry.version === '1.0.0' ? structuredClone(PRIMITIVES) : registry.version === '1.1.0' ? structuredClone(CARD_PRIMITIVES) : registry.version === '1.3.0' ? structuredClone(UNIVERSAL_PRIMITIVES) : {
    version: '1.2.0', primitives: [
      { id: 'giveRestedDon', version: '1.0.0' }, { id: 'moveDon', version: '1.0.0' },
      { id: 'attachRestedDon', version: '1.0.0' }, { id: 'addPower', version: '1.0.0' },
      { id: 'koCharacter', version: '1.0.0' }, { id: 'drawCards', version: '1.0.0' },
      { id: 'setBasePowerFromOpponentLeader', version: '1.0.0' },
    ],
  }
  return { version: registry.version, engineVersion: registry.version === '1.3.0' ? 'm1.5e-1' : scheduled ? 'm1.5d-1' : modern ? 'm1.5c-1' : 'm1.5b-1', rulesVersion: '1.2.1', registry, primitives, nextId: 0, active: null, continuation: null, choice: null,
    usage: {}, events: [], trace: [], choiceHistory: [], modifiers: [], ...(scheduled ? { scheduler: { batches: [], history: [], orderChoice: null, resolvingId: null }, operations: [], payments: [] } : {}), ...(modern ? { powerModifiers: [], cardEvents: [], cardOperations: [], ...(scheduled ? { basePowerModifiers: [], blockerRestrictions: [] } : {}) } : {}) }
}
const recipient = (s: GameState, controller: string, who: 'CONTROLLER' | 'OPPONENT') => {
  const id = who === 'CONTROLLER' ? controller : s.players.find(p => p.id !== controller)?.id
  const p = s.players.find(p => p.id === id)
  if (!p) throw new Error('INVALID_EFFECT_PLAYER')
  return p
}
function condition(s: GameState, c: Condition, controller: string, source?: EffectContext['source']): boolean {
  if (c.kind === 'ALWAYS') return true
  if (c.kind === 'ALL_OF') return c.conditions.every(part => condition(s, part, controller, source))
  if (c.kind === 'ANY_OF') return c.conditions.some(part => condition(s, part, controller, source))
  if (c.kind === 'FIELD_DON_AT_MOST') { const p = recipient(s, controller, 'CONTROLLER'); return p.zones.cost.length + p.zones.attached.length <= c.maximum }
  if (c.kind === 'YOUR_TURN') return s.activePlayerId === controller
  if (c.kind === 'LIFE_AT_MOST') return recipient(s, controller, c.player).zones.life.length <= c.maximum
  if (c.kind === 'LIFE_AT_LEAST') return recipient(s, controller, c.player).zones.life.length >= c.minimum
  if (c.kind === 'OWN_CHARACTERS_AT_MOST') return recipient(s, controller, 'CONTROLLER').zones.characters.length <= c.maximum
  if (c.kind === 'ACTIVE_DON_AT_LEAST') return recipient(s, controller, 'CONTROLLER').zones.cost.filter(id => !s.instances[id].rested).length >= c.minimum
  if (c.kind === 'OPPONENT_TURN') return s.activePlayerId !== controller
  if (c.kind === 'LEADER_NAME_IS') { const p = recipient(s, controller, 'CONTROLLER'); return s.catalog.definitions.find(x => x.definitionId === s.instances[p.zones.leader[0]]?.definitionId)?.rulesName === c.name }
  if (c.kind === 'LIFE_LESS_THAN_OPPONENT') return recipient(s, controller, 'CONTROLLER').zones.life.length < recipient(s, controller, 'OPPONENT').zones.life.length
  if (c.kind === 'DON_AVAILABLE') return recipient(s, controller, c.player).zones.donDeck.length > 0
  if (c.kind === 'HAND_AT_MOST') return recipient(s, controller, c.player).zones.hand.length <= c.maximum
  if (c.kind === 'HAND_AT_LEAST') {
    const hand = recipient(s, controller, c.player).zones.hand
    return (c.traitsAny ? hand.filter(id => s.catalog.definitions.find(d => d.definitionId === s.instances[id].definitionId)?.traits.some(t => c.traitsAny!.includes(t))) : hand).length >= c.minimum
  }
  if (c.kind === 'BATTLE_OPPONENT_ATTRIBUTE') {
    const b = s.battle, me = source?.kind === 'CARD' ? source.presence.instanceId : undefined
    if (!b || !me || (b.attacker.instanceId !== me && b.target.instanceId !== me)) return false
    const other = s.instances[b.attacker.instanceId === me ? b.target.instanceId : b.attacker.instanceId]
    const d = other && s.catalog.definitions.find(x => x.definitionId === other.definitionId)
    return !!d && other.zone === 'characters' && d.attributes.includes(c.attribute)
  }
  if (c.kind === 'OPPONENT_MORE_FIELD_DON') { const me = recipient(s, controller, 'CONTROLLER'), foe = recipient(s, controller, 'OPPONENT'); return foe.zones.cost.length + foe.zones.attached.length > me.zones.cost.length + me.zones.attached.length }
  if (c.kind === 'OWN_CHARACTERS_AT_LEAST') return recipient(s, controller, 'CONTROLLER').zones.characters.length >= c.minimum
  if (c.kind === 'FIELD_CHARACTER_COST_AT_MOST') return s.players.some(player => player.zones.characters.some(id => {
    const current = evaluateCharacteristics(s, id).cost.current
    return current !== null && current <= c.maximum
  }))
  if (c.kind === 'OWN_CHARACTER_COST_AT_LEAST') return ownCharacterCostAtLeast(s, controller, c.minimum)
  if (c.kind === 'SOURCE_PLAYED_THIS_TURN') { if (source?.kind !== 'CARD') return false; const i = s.instances[source.presence.instanceId]; return !!i && i.zoneGeneration === source.presence.generation && i.playedOnTurn === s.turn }
  if (c.kind === 'OWN_CHARACTER_POWER_AT_LEAST') return recipient(s, controller, 'CONTROLLER').zones.characters.some(id => (evaluateCharacteristics(s, id).power.current ?? -1) >= c.minimum)
  if (c.kind === 'TRASH_AT_LEAST') return recipient(s, controller, 'CONTROLLER').zones.trash.length >= c.minimum
  if (c.kind === 'DON_DECK_AT_LEAST') return recipient(s, controller, 'CONTROLLER').zones.donDeck.length >= c.minimum
  if (c.kind === 'FIELD_DON_AT_LEAST') { const p = recipient(s, controller, 'CONTROLLER'); return p.zones.cost.length + p.zones.attached.length >= c.minimum }
  if (c.kind === 'LEADER_HAS_TRAIT') { const p = recipient(s, controller, 'CONTROLLER'); const d = s.catalog.definitions.find(x => x.definitionId === s.instances[p.zones.leader[0]]?.definitionId); return !!d?.traits.includes(c.trait) }
  if (c.kind === 'OPPONENT_CHARACTER_POWER_AT_LEAST') return recipient(s, controller, 'OPPONENT').zones.characters.some(id => {
    const power = evaluateCharacteristics(s, id).power[c.powerBasis === 'BASE' ? 'base' : 'current']
    return power !== null && power >= c.minimum
  })
  if (c.kind === 'SOURCE_ATTACHED_DON_AT_LEAST') {
    if (source?.kind !== 'CARD') return false
    const attached = s.players.find(p => p.id === controller)?.zones.attached ?? []
    return attached.filter(id => s.instances[id].attachedTo === source.presence.instanceId).length >= c.minimum
  }
  return false
}
// CR 1.2.1 §1-2-3: a concession may end the game while an ability waits for a choice. That choice is then frozen
// (nothing resolves after the end of the game) and stays bound to the version at which the concession was made.
function pendingVersion(s: GameState): number { return s.result?.reason === 'CONCESSION' && s.commands.at(-1)?.type === 'CONCEDE' ? s.version - 1 : s.version }
function next(r: EffectRuntime, gameId: string, kind: string): string { return `${gameId}:fx:${kind}:${r.nextId++}` }
const usageKey = (id: string, revision: string, source: EffectContext['source'], actor: string, turn: number) =>
  [id, revision, source.kind === 'CARD' ? `${source.presence.instanceId}:${source.presence.generation}` : source.kind === 'SYNTHETIC' ? source.extension : source.definitionId, actor, turn].map(part => { const text = String(part); return `${text.length}:${text}` }).join(':')
function restrictions(r: EffectRuntime, op: ProposedOperation): boolean {
  return r.registry.restrictions.some(rule => rule.playerId === op.playerId && (rule.prohibited === 'MOVE_DON' || (rule.prohibited === 'ADD_DON' && op.from === 'donDeck' && op.to === 'cost')))
}
function propose(s: GameState, spec: OperationSpec, context: EffectContext, original?: ProposedOperation, selected?: { instanceId: string; generation: number }): ProposedOperation {
  if (spec.primitive !== 'giveRestedDon' && spec.primitive !== 'attachRestedDon' && spec.primitive !== 'moveDon') throw new Error('INVALID_MOVE_PRIMITIVE')
  const r = s.effects!, p = recipient(s, context.controllerId, spec.player)
  const move = spec.primitive === 'moveDon' ? spec : undefined
  const from = spec.primitive === 'giveRestedDon' ? 'donDeck' : spec.primitive === 'attachRestedDon' ? 'cost' : move!.from
  const to = spec.primitive === 'giveRestedDon' ? 'cost' : spec.primitive === 'attachRestedDon' ? 'attached' : move!.to
  const rested = spec.primitive === 'giveRestedDon' || spec.primitive === 'attachRestedDon' ? true : move!.rested
  const subjectId = original?.subject.instanceId ?? selected?.instanceId ?? p.zones[from][0]
  const i = s.instances[subjectId]
  if (!i || i.kind !== 'DON' || i.owner !== p.id || i.zone !== from || !p.zones[from].includes(i.id)) throw new Error('EFFECT_OPERATION_UNAVAILABLE')
  if ((original && i.zoneGeneration !== original.subject.generation) || (selected && i.zoneGeneration !== selected.generation)) throw new Error('EFFECT_OPERATION_UNAVAILABLE')
  return { id: next(r, s.gameId, 'operation'), resolutionId: context.effectInstanceId, context: structuredClone(context), spec: structuredClone(spec),
    subject: { instanceId: i.id, generation: i.zoneGeneration }, playerId: p.id, from, to, rested, appliedReplacements: original ? [...original.appliedReplacements] : [] }
}
// CR 1.2.1 §3-7-6-1 / §3-8-5-1: before a card is played into a full area, 1 card already there goes to the trash.
// This is rule processing (§3-7-6-1-1): no effect applies to it (not a K.O.). The Character is chosen by the program.
function makeRoom(s: GameState, context: EffectContext, to: 'characters' | 'stage', replaceBinding: string | undefined): void {
  const r = s.effects!, player = s.players.find(p => p.id === context.controllerId)!
  const full = to === 'characters' ? player.zones.characters.length >= 5 : player.zones.stage.length >= 1
  if (!full) return
  const chosen = to === 'stage' ? [{ instanceId: player.zones.stage[0], generation: s.instances[player.zones.stage[0]].zoneGeneration }] : replaceBinding ? (r.continuation?.bindings[replaceBinding] ?? []) : []
  const old = chosen.length === 1 ? s.instances[chosen[0].instanceId] : undefined
  if (!old || old.zone !== to || old.controller !== context.controllerId || old.zoneGeneration !== chosen[0].generation) throw new Error('PLAY_FIELD_FULL')
  for (const id of [...player.zones.attached].filter(id => s.instances[id].attachedTo === old.id)) {
    const don = s.instances[id]; player.zones.attached.splice(player.zones.attached.indexOf(id), 1); player.zones.cost.push(id)
    don.zone = 'cost'; don.zoneGeneration++; don.rested = true; don.attachedTo = null
    recordOperation(s, { id: next(r, s.gameId, 'operation'), resolutionId: context.effectInstanceId, subject: { instanceId: id, generation: don.zoneGeneration - 1 }, controllerId: context.controllerId, type: 'MOVE_DON', intent: 'RULE', outcome: 'CONFIRMED', from: 'attached', to: 'cost' })
  }
  if (!processOperation(s, { id: next(r, s.gameId, 'operation'), resolutionId: context.effectInstanceId, subject: structuredClone(chosen[0]), controllerId: context.controllerId, type: 'MOVE_CARD', intent: 'RULE', outcome: 'CONFIRMED', from: to, to: 'trash' })) throw new Error('PLAY_FIELD_FULL')
  s.events.push({ sequence: s.events.length, type: 'CARD_TRASHED', actorId: context.controllerId, publicInstanceId: old.id })
}
function execute(s: GameState, spec: OperationSpec, context: EffectContext, selected?: { instanceId: string; generation: number }) {
  const r = s.effects!
  if (spec.primitive === 'koCharacter') throw new Error('KO_REQUIRES_RESOLUTION_CONTEXT')
  if (spec.primitive === 'returnToHand' || spec.primitive === 'moveToDeckBottom' || spec.primitive === 'restCard' || spec.primitive === 'setActive') {
    if (r.version !== '1.3.0') throw new Error('INCOMPATIBLE_EFFECT_VERSION')
    const subject = selected ?? (spec.primitive === 'setActive' && !spec.subjectBinding && context.source.kind === 'CARD' ? context.source.presence : undefined)
    const card = subject && s.instances[subject.instanceId]
    if (!subject || !card || card.zoneGeneration !== subject.generation) throw new Error('EFFECT_OPERATION_UNAVAILABLE')
    if (spec.primitive === 'restCard' || spec.primitive === 'setActive') {
      // A card already in the requested orientation is unchanged (the operation simply has no effect).
      if (!['leader', 'characters', 'stage', 'cost'].includes(card.zone)) throw new Error('EFFECT_OPERATION_UNAVAILABLE')
      if (spec.primitive === 'setActive' && card.controller !== context.controllerId) throw new Error('EFFECT_OPERATION_UNAVAILABLE')
      const rested = spec.primitive === 'restCard'
      if (card.rested === rested) return
      card.rested = rested
      recordOperation(s, { id: next(r, s.gameId, 'operation'), resolutionId: context.effectInstanceId, subject: structuredClone(subject), controllerId: context.controllerId, type: 'REST', intent: 'EFFECT', outcome: 'CONFIRMED', ...(rested ? {} : { to: 'active' }) })
      cardEvent(s, rested ? 'CARD_RESTED' : 'CARD_SET_ACTIVE', card.id, context)
      return
    }
    // Leaving the field: CR 1.2.1 §6-5-5-4 the DON!! cards given to it are placed rested in their owner's cost area.
    if (card.zone !== 'characters' || card.kind !== 'CARD') throw new Error('EFFECT_OPERATION_UNAVAILABLE')
    const owner = s.players.find(p => p.id === card.owner)!
    for (const id of [...owner.zones.attached].filter(id => s.instances[id].attachedTo === card.id)) {
      const don = s.instances[id]; owner.zones.attached.splice(owner.zones.attached.indexOf(id), 1); owner.zones.cost.push(id)
      don.zone = 'cost'; don.zoneGeneration++; don.rested = true; don.attachedTo = null
      recordOperation(s, { id: next(r, s.gameId, 'operation'), resolutionId: context.effectInstanceId, subject: { instanceId: id, generation: don.zoneGeneration - 1 }, controllerId: context.controllerId, type: 'MOVE_DON', intent: 'RULE', outcome: 'CONFIRMED', from: 'attached', to: 'cost' })
    }
    const to = spec.primitive === 'returnToHand' ? 'hand' : 'deck'
    if (!processOperation(s, { id: next(r, s.gameId, 'operation'), resolutionId: context.effectInstanceId, subject: structuredClone(subject), controllerId: context.controllerId, type: 'MOVE_CARD', intent: 'EFFECT', outcome: 'CONFIRMED', from: 'characters', to })) throw new Error('EFFECT_OPERATION_UNAVAILABLE')
    // The card is now in a hidden zone (hand or deck): the public event does not name the instance (privacy invariant).
    s.events.push({ sequence: s.events.length, type: 'CARD_MOVED', actorId: context.controllerId })
    return
  }
  if (spec.primitive === 'addCost' || spec.primitive === 'preventKO') {
    if (r.version !== '1.3.0') throw new Error('INCOMPATIBLE_EFFECT_VERSION')
    const subject = selected ?? (spec.primitive === 'preventKO' && !spec.subjectBinding && context.source.kind === 'CARD' ? context.source.presence : undefined), card = subject && s.instances[subject.instanceId]
    if (!subject || !card || card.zoneGeneration !== subject.generation || !['leader', 'characters'].includes(card.zone)) throw new Error('EFFECT_OPERATION_UNAVAILABLE')
    if (spec.primitive === 'addCost') (r.costModifiers ?? (r.costModifiers = [])).push({ id: next(r, s.gameId, 'cost'), subject: structuredClone(subject), amount: spec.amount, turnId: s.turn, ...(spec.duration === 'UNTIL_END_OF_OPPONENT_NEXT_TURN' ? { untilTurn: untilEndOfOpponentNextTurn(s, context.controllerId) } : {}) })
    else if (card.zone === 'characters') (r.koImmunities ?? (r.koImmunities = [])).push({ id: next(r, s.gameId, 'ko-immunity'), subject: structuredClone(subject), turnId: s.turn })
    return
  }
  if (spec.primitive === 'arrangeTopDeck') {
    if (r.version !== '1.3.0') throw new Error('INCOMPATIBLE_EFFECT_VERSION')
    const p = s.players.find(x => x.id === context.controllerId)!, order = r.continuation!.bindings[spec.orderBinding] ?? [], bottom = spec.bottomBinding ? r.continuation!.bindings[spec.bottomBinding] ?? [] : []
    const top = p.zones.deck.slice(0, order.length)
    // The ordered cards must be exactly the current top cards (same instances, same generations).
    if (order.some(ref => !top.includes(ref.instanceId) || s.instances[ref.instanceId].zoneGeneration !== ref.generation) || new Set(order.map(ref => ref.instanceId)).size !== top.length
      || (bottom.length && bottom.length !== order.length)) throw new Error('EFFECT_OPERATION_UNAVAILABLE')
    p.zones.deck.splice(0, order.length)
    const ids = order.map(ref => ref.instanceId)
    if (bottom.length) p.zones.deck.push(...ids); else p.zones.deck.unshift(...ids)
    return
  }
  if (spec.primitive === 'returnDon') {
    if (r.version !== '1.3.0') throw new Error('INCOMPATIBLE_EFFECT_VERSION')
    const don = selected && s.instances[selected.instanceId], p = s.players.find(x => x.id === context.controllerId)!
    if (!selected || !don || don.kind !== 'DON' || don.owner !== p.id || don.zoneGeneration !== selected.generation || !['cost', 'attached'].includes(don.zone)) throw new Error('EFFECT_OPERATION_UNAVAILABLE')
    const from = don.zone as 'cost' | 'attached'
    p.zones[from].splice(p.zones[from].indexOf(don.id), 1); p.zones.donDeck.push(don.id)
    don.zone = 'donDeck'; don.zoneGeneration++; don.rested = false; don.attachedTo = null; don.faceUp = false
    recordOperation(s, { id: next(r, s.gameId, 'operation'), resolutionId: context.effectInstanceId, subject: structuredClone(selected), controllerId: context.controllerId, type: 'MOVE_DON', intent: 'COST', outcome: 'CONFIRMED', from, to: 'donDeck' })
    noteDonReturned(s, p.id)
    return
  }
  if (spec.primitive === 'triggerCardToHand') {
    const source = context.source.kind === 'CARD' ? context.source.presence : undefined, card = source && s.instances[source.instanceId]
    if (r.version !== '1.3.0' || !source || !card || card.zone !== 'temporary' || card.zoneGeneration !== source.generation || card.owner !== context.controllerId) throw new Error('EFFECT_OPERATION_UNAVAILABLE')
    if (!processOperation(s, { id: next(r, s.gameId, 'operation'), resolutionId: context.effectInstanceId, subject: structuredClone(source), controllerId: context.controllerId, type: 'MOVE_CARD', intent: 'EFFECT', outcome: 'CONFIRMED', from: 'temporary', to: 'hand' })) throw new Error('EFFECT_OPERATION_UNAVAILABLE')
    s.events.push({ sequence: s.events.length, type: 'CARD_MOVED', actorId: context.controllerId })
    return
  }
  if (spec.primitive === 'lifeToHand' || spec.primitive === 'addToLife' || spec.primitive === 'placeLife') {
    if (r.version !== '1.3.0') throw new Error('INCOMPATIBLE_EFFECT_VERSION')
    executeLife(s, spec, context, selected); return
  }
  if (spec.primitive === 'grantKeyword') {
    if (r.version !== '1.3.0') throw new Error('INCOMPATIBLE_EFFECT_VERSION')
    const subject = selected ?? (context.source.kind === 'CARD' ? context.source.presence : undefined), card = subject && s.instances[subject.instanceId]
    if (!subject || !card || card.zoneGeneration !== subject.generation || card.controller !== context.controllerId || !['leader', 'characters'].includes(card.zone)) throw new Error('EFFECT_OPERATION_UNAVAILABLE')
    if (spec.duration === 'THIS_BATTLE' && !s.battle) throw new Error('BATTLE_DURATION_OUTSIDE_BATTLE')
    ;(r.keywordGrants ?? (r.keywordGrants = [])).push({ id: next(r, s.gameId, 'keyword'), subject: structuredClone(subject), keyword: spec.keyword, turnId: s.turn, ...(spec.duration === 'THIS_BATTLE' ? { battleId: s.battle!.id } : {}) })
    return
  }
  if (spec.primitive === 'playCard') {
    if (r.version !== '1.3.0') throw new Error('INCOMPATIBLE_EFFECT_VERSION')
    const card = selected && s.instances[selected.instanceId]
    const definition = card && s.catalog.definitions.find(item => item.definitionId === card.definitionId)
    if (!selected || !card || !definition || card.owner !== context.controllerId || card.zone !== spec.from || card.zoneGeneration !== selected.generation
      || !['CHARACTER', 'STAGE'].includes(definition.category)) throw new Error('EFFECT_OPERATION_UNAVAILABLE')
    const to = definition.category === 'CHARACTER' ? 'characters' : 'stage'
    makeRoom(s, context, to, spec.replaceBinding)
    if (!processOperation(s, { id: next(r, s.gameId, 'operation'), resolutionId: context.effectInstanceId, subject: structuredClone(selected), controllerId: context.controllerId,
      type: 'MOVE_CARD', intent: 'EFFECT', outcome: 'CONFIRMED', from: spec.from, to })) throw new Error('EFFECT_OPERATION_UNAVAILABLE')
    card.playedOnTurn = s.turn
    if (spec.rested) card.rested = true
    s.events.push({ sequence: s.events.length, type: 'CARD_PLAYED', actorId: context.controllerId, publicInstanceId: card.id })
    return
  }
  if (spec.primitive === 'playSelfFromTrigger') {
    if (r.version !== '1.3.0' || context.source.kind !== 'CARD') throw new Error('INCOMPATIBLE_EFFECT_VERSION')
    const source = context.source.presence, card = s.instances[source.instanceId]
    const definition = card && s.catalog.definitions.find(item => item.definitionId === card.definitionId)
    if (!card || !definition || card.zone !== 'temporary' || card.zoneGeneration !== source.generation || card.controller !== context.controllerId
      || !['CHARACTER', 'STAGE'].includes(definition.category)) throw new Error('EFFECT_OPERATION_UNAVAILABLE')
    const to = definition.category === 'CHARACTER' ? 'characters' : 'stage'
    makeRoom(s, context, to, spec.replaceBinding)
    if (!processOperation(s, { id: next(r, s.gameId, 'operation'), resolutionId: context.effectInstanceId, subject: structuredClone(source), controllerId: context.controllerId,
      type: 'MOVE_CARD', intent: 'EFFECT', outcome: 'CONFIRMED', from: 'temporary', to })) throw new Error('EFFECT_OPERATION_UNAVAILABLE')
    card.playedOnTurn = s.turn
    s.events.push({ sequence: s.events.length, type: 'CARD_PLAYED', actorId: context.controllerId, publicInstanceId: card.id })
    return
  }
  if (spec.primitive === 'preventBlocker') {
    if (r.version !== '1.3.0') throw new Error('INCOMPATIBLE_EFFECT_VERSION')
    const subject = selected ?? (context.source.kind === 'CARD' ? context.source.presence : undefined)
    const instance = subject && s.instances[subject.instanceId]
    if (!subject || !instance || instance.zoneGeneration !== subject.generation || instance.controller !== context.controllerId || !['leader', 'characters'].includes(instance.zone)) throw new Error('EFFECT_OPERATION_UNAVAILABLE')
    const battleId = spec.duration === 'THIS_BATTLE' ? s.battle?.id : undefined
    if (spec.duration === 'THIS_BATTLE' && (!s.battle || s.battle.step === 'LIFE_TRIGGER' || s.battle.step === 'LIFE_CONTINUE'
      || s.battle.attacker.instanceId !== subject.instanceId || s.battle.attacker.generation !== subject.generation)) throw new Error('INVALID_BLOCKER_RESTRICTION_WINDOW')
    const list = r.blockerRestrictions ?? (r.blockerRestrictions = [])
    for (let index = list.length - 1; index >= 0; index--) {
      const current = list[index]
      if ((current.scope === 'BATTLE' && current.battleId !== s.battle?.id)
        || (current.scope === 'TURN' && current.turnId !== s.turn)) list.splice(index, 1)
    }
    const id = next(r, s.gameId, 'blocker-restriction')
    list.push({ id, source: structuredClone(context.source), subject: structuredClone(subject), controllerId: context.controllerId,
      scope: spec.duration === 'THIS_BATTLE' ? 'BATTLE' : 'TURN', ...(battleId ? { battleId } : {}), ...(spec.duration === 'THIS_TURN' ? { turnId: s.turn } : {}),
      ...(spec.minimumBlockerPower === undefined ? {} : { minimumBlockerPower: spec.minimumBlockerPower }) })
    cardEvent(s, 'BLOCKER_RESTRICTION_CREATED', instance.id, context)
    return
  }
  if (spec.primitive === 'drawCards') {
    const p = recipient(s, context.controllerId, spec.player)
    const moved = p.zones.deck.splice(0, spec.amount)
    for (const id of moved) { p.zones.hand.push(id); s.instances[id].zone = 'hand'; s.instances[id].zoneGeneration++; s.instances[id].faceUp = false }
    if (moved.length) s.events.push({ sequence: s.events.length, type: 'DRAWN', actorId: p.id })
    return
  }
  if (spec.primitive === 'moveCard') {
    const refs = r.continuation!.bindings[spec.subjectBinding] ?? []
    const target = selected ?? (refs.length === 1 ? refs[0] : undefined)
    const card = target && s.instances[target.instanceId]
    const p = recipient(s, context.controllerId, spec.player)
    if (!card || card.kind !== 'CARD' || card.owner !== p.id || card.zone !== spec.from || card.zoneGeneration !== target.generation || !p.zones[spec.from].includes(card.id)) throw new Error('EFFECT_OPERATION_UNAVAILABLE')
    const moved = processOperation(s, { id:next(r,s.gameId,'operation'), resolutionId:context.effectInstanceId, subject:structuredClone(target), controllerId:context.controllerId, type:'MOVE_CARD', intent:'EFFECT', outcome:'CONFIRMED', from:spec.from, to:spec.to })
    if (moved && spec.deckPosition === 'TOP') { p.zones.deck.splice(p.zones.deck.indexOf(card.id), 1); p.zones.deck.unshift(card.id) }
    if (moved && spec.audience === 'PUBLIC') s.events.push({sequence:s.events.length,type:'CARD_MOVED',actorId:p.id,publicInstanceId:card.id})
    return
  }
  if (spec.primitive === 'preventAttack') {
    if (r.version !== '1.3.0') throw new Error('INCOMPATIBLE_EFFECT_VERSION')
    const card = selected && s.instances[selected.instanceId]
    if (!selected || !card || card.zoneGeneration !== selected.generation || card.zone !== 'characters') throw new Error('EFFECT_OPERATION_UNAVAILABLE')
    // "until the end of your opponent's next turn": through the next turn.
    ;(r.attackRestrictions ?? (r.attackRestrictions = [])).push({ id: next(r, s.gameId, 'attack-restriction'), subject: structuredClone(selected), untilTurn: untilEndOfOpponentNextTurn(s, context.controllerId) })
    return
  }
  if (spec.primitive === 'disableBlocker') {
    if (r.version !== '1.3.0') throw new Error('INCOMPATIBLE_EFFECT_VERSION')
    const card = selected && s.instances[selected.instanceId]
    if (!selected || !card || card.zoneGeneration !== selected.generation || card.zone !== 'characters' || card.controller === context.controllerId) throw new Error('EFFECT_OPERATION_UNAVAILABLE')
    ;(r.blockerDisables ?? (r.blockerDisables = [])).push({ id: next(r, s.gameId, 'blocker-disable'), subject: structuredClone(selected), turnId: s.turn })
    return
  }
  if (spec.primitive === 'trashCharacter') {
    if (r.version !== '1.3.0') throw new Error('INCOMPATIBLE_EFFECT_VERSION')
    const card = selected && s.instances[selected.instanceId], p = card && s.players.find(x => x.id === card.controller)
    if (!selected || !card || !p || card.zoneGeneration !== selected.generation || card.zone !== 'characters' || card.controller === context.controllerId) throw new Error('EFFECT_OPERATION_UNAVAILABLE')
    // Trashing is not a K.O.: no [On K.O.] (FAQ ST19-003). Given DON!! return rested to the cost area (CR 6-5-5-4).
    for (const don of p.zones.attached.filter(id => s.instances[id].attachedTo === card.id)) { p.zones.attached.splice(p.zones.attached.indexOf(don), 1); p.zones.cost.push(don); const d = s.instances[don]; d.zone = 'cost'; d.zoneGeneration++; d.attachedTo = null; d.rested = true }
    p.zones.characters.splice(p.zones.characters.indexOf(card.id), 1); p.zones.trash.push(card.id)
    card.zone = 'trash'; card.zoneGeneration++; card.rested = false; card.faceUp = true; card.playedOnTurn = null
    s.events.push({ sequence: s.events.length, type: 'CARD_TRASHED', actorId: card.controller, publicInstanceId: card.id })
    return
  }
  if (spec.primitive === 'trashLife') {
    // Trashing a Life card is not damage: no [Trigger], no defeat check of its own (FAQ ST04-001: no Life, nothing happens).
    const p = recipient(s, context.controllerId, spec.player), card = selected && s.instances[selected.instanceId]
    if (!selected || !card || card.owner !== p.id || card.zone !== 'life' || card.zoneGeneration !== selected.generation || p.zones.life[0] !== card.id) throw new Error('EFFECT_OPERATION_UNAVAILABLE')
    if (!processOperation(s, { id:next(r,s.gameId,'operation'), resolutionId:context.effectInstanceId, subject:structuredClone(selected), controllerId:context.controllerId, type:'MOVE_CARD', intent:'EFFECT', outcome:'CONFIRMED', from:'life', to:'trash' })) return
    s.events.push({ sequence:s.events.length, type:'LIFE_TRASHED', actorId:p.id })
    s.events.push({ sequence:s.events.length, type:'CARD_TRASHED', actorId:p.id, publicInstanceId:card.id }) // the trash is an open area (CR 3-5-2)
    return
  }
  if (spec.primitive === 'setBasePowerFromOpponentLeader') {
    const subject = context.source.kind === 'CARD' ? context.source.presence : undefined
    const instance = subject && s.instances[subject.instanceId]
    const opponent = recipient(s, context.controllerId, 'OPPONENT')
    const leaderId = opponent.zones.leader[0]
    const leaderPower = leaderId ? evaluateCharacteristics(s, leaderId).power.current : null
    if (!subject || !instance || instance.zone !== 'characters' || instance.zoneGeneration !== subject.generation || instance.controller !== context.controllerId || leaderPower === null) throw new Error('EFFECT_OPERATION_UNAVAILABLE')
    const player = s.players.find(p => p.id === context.controllerId)!
    r.basePowerModifiers!.push({ id: next(r, s.gameId, 'base-power'), subject: structuredClone(subject), source: structuredClone(context.source), value: leaderPower, expiresForPlayerId: player.id, expiresAtPlayerTurn: player.turns + 1 })
    cardEvent(s, 'POWER_MODIFIER_CREATED', instance.id, context)
    return
  }
  if (spec.primitive === 'addPower') {
    const subject = selected ?? (context.source.kind === 'CARD' ? context.source.presence : undefined)
    const i = subject && s.instances[subject.instanceId]
    const recipientPlayer = recipient(s, context.controllerId, spec.player)
    if (!i || i.zoneGeneration !== subject.generation || i.controller !== recipientPlayer.id || !['leader', 'characters'].includes(i.zone)) throw new Error('EFFECT_OPERATION_UNAVAILABLE')
    if (spec.duration === 'THIS_BATTLE') {
      if (!s.battle) throw new Error('BATTLE_DURATION_OUTSIDE_BATTLE')
      s.battle.counterModifiers.push({ target: structuredClone(subject), amount: spec.amount })
    } else if (r.version === '1.2.0') confirmPower(s, subject, spec.amount, context)
    // "until the start of your next turn": through the controller's next turn start (the next turn if it is the opponent's).
    else r.powerModifiers!.push({ id: next(r, s.gameId, 'modifier'), subject: structuredClone(subject), source: structuredClone(context.source), amount: spec.amount, turnId: s.turn,
      ...(spec.duration === 'UNTIL_START_OF_YOUR_NEXT_TURN' ? { untilTurn: s.turn + (s.activePlayerId === context.controllerId ? 2 : 1) } : spec.duration === 'UNTIL_END_OF_YOUR_NEXT_TURN' ? { untilTurn: s.turn + (s.activePlayerId === context.controllerId ? 3 : 2) } : spec.duration === 'UNTIL_END_OF_OPPONENT_NEXT_TURN' ? { untilTurn: untilEndOfOpponentNextTurn(s, context.controllerId) } : {}) })
    cardEvent(s, 'POWER_MODIFIER_CREATED', i.id, context); return
  }
  // "add up to 1 DON!! card from your DON!! deck": with an empty DON!! deck nothing happens (FAQ ST04-008/014/015/017).
  if (r.version === '1.3.0' && spec.primitive === 'moveDon' && spec.from === 'donDeck' && !selected && !recipient(s, context.controllerId, spec.player).zones.donDeck.length) return
  let op = propose(s, spec, context, undefined, selected)
  if (spec.primitive === 'attachRestedDon') {
    const targets = r.continuation!.bindings[spec.targetBinding], target = targets?.length === 1 ? s.instances[targets[0].instanceId] : undefined
    const don = s.instances[op.subject.instanceId]
    if (!target || target.zoneGeneration !== targets[0].generation || target.controller !== context.controllerId || !['leader', 'characters'].includes(target.zone) || !don.rested) throw new Error('EFFECT_OPERATION_UNAVAILABLE')
    op.targetId = target.id
  }
  // §§8-1-3-4: only a unique eligible replacement is supported; no invented priority.
  for (let steps = 0; steps <= r.registry.replacements.length; steps++) {
    if (restrictions(r, op)) { r.trace.push({ operation: op, outcome: 'PREVENTED' }); return }
    const eligible = r.registry.replacements.filter(rule => !op.appliedReplacements.includes(rule.id)
      && rule.match.primitive === op.spec.primitive
      && (rule.match.recipient === 'EITHER' || recipient(s, context.controllerId, rule.match.recipient).id === op.playerId)
      && condition(s, rule.condition, context.controllerId))
  if (eligible.length > 1) throw new Error('REPLACEMENT_ORDER_NOT_IMPLEMENTED')
    const rule = eligible[0]
    if (!rule) {
      // Validate again immediately before commit. No card function may mutate a zone.
      const i = s.instances[op.subject.instanceId], p = s.players.find(p => p.id === op.playerId)!
      if (i.zone !== op.from || i.zoneGeneration !== op.subject.generation || !p.zones[op.from].includes(i.id)) throw new Error('EFFECT_OPERATION_UNAVAILABLE')
      if (r.version === '1.2.0') processOperation(s, { id:op.id, resolutionId:op.resolutionId, subject:op.subject, controllerId:context.controllerId, intent:'EFFECT', type:op.to === 'attached' ? 'ATTACH_DON' : 'MOVE_DON', outcome:'CONFIRMED', from:op.from, to:op.to }, { rested:op.rested, targetId:op.targetId })
      else {
      p.zones[op.from].splice(p.zones[op.from].indexOf(i.id), 1); p.zones[op.to].push(i.id)
      i.zone = op.to; i.zoneGeneration++; i.rested = op.rested; i.faceUp = op.to !== 'donDeck'; i.attachedTo = op.targetId ?? null
      if (op.to === 'donDeck') noteDonReturned(s, p.id)
      }
      r.trace.push({ operation: structuredClone(op), outcome: 'CONFIRMED' })

      r.events.push({ sequence: r.events.length, operationId: op.id, resolutionId: op.resolutionId, type: 'DON_MOVED', subjectId: i.id,
        playerId: p.id, from: op.from, to: op.to, ...(op.targetId ? { targetId: op.targetId } : {}), rested: i.rested, appliedReplacements: [...op.appliedReplacements], audience: op.spec.audience, controllerId: context.controllerId })
      return
    }
    if (rule.action.kind === 'PREVENT') { op.appliedReplacements.push(rule.id); r.trace.push({ operation: op, outcome: 'PREVENTED' }); return }
    const replaced = propose(s, rule.action.operation, context, op)
    replaced.appliedReplacements.push(rule.id)
    r.trace.push({ operation: op, outcome: 'REPLACED' }); op = replaced
  }
  throw new Error('REPLACEMENT_LIMIT')
}
// M6 Life family. The Life area is secret (CR 1.2.1 §3-10-2): public events never name a Life card; the Life count
// stays reconciled with the LIFE_* events (game invariants).
function executeLife(s: GameState, spec: Extract<OperationSpec, { primitive: 'lifeToHand' | 'addToLife' | 'placeLife' }>, context: EffectContext, selected?: { instanceId: string; generation: number }) {
  const r = s.effects!, card = selected && s.instances[selected.instanceId]
  if (!selected || !card || card.kind !== 'CARD' || card.zoneGeneration !== selected.generation) throw new Error('EFFECT_OPERATION_UNAVAILABLE')
  const owner = s.players.find(p => p.id === card.owner)!
  if (spec.primitive === 'placeLife') {
    if (card.zone !== 'life' || owner.zones.life[0] !== card.id) throw new Error('EFFECT_OPERATION_UNAVAILABLE')
    if (r.continuation!.bindings[spec.bottomBinding]?.length) { owner.zones.life.shift(); owner.zones.life.push(card.id) }
    return
  }
  if (spec.primitive === 'lifeToHand') {
    if (card.zone !== 'life' || card.owner !== context.controllerId || (owner.zones.life[0] !== card.id && owner.zones.life.at(-1) !== card.id)) throw new Error('EFFECT_OPERATION_UNAVAILABLE')
    if (!processOperation(s, { id: next(r, s.gameId, 'operation'), resolutionId: context.effectInstanceId, subject: structuredClone(selected), controllerId: context.controllerId, type: 'MOVE_CARD', intent: 'EFFECT', outcome: 'CONFIRMED', from: 'life', to: 'hand' })) return
    s.events.push({ sequence: s.events.length, type: 'LIFE_TO_HAND', actorId: owner.id })
    return
  }
  const side = spec.side ?? 'OWN'
  if (card.zone !== spec.from || (spec.from !== 'characters' && (card.owner !== context.controllerId || side !== 'OWN')) || (spec.from === 'characters' && (card.controller === context.controllerId) !== (side === 'OWN'))) throw new Error('EFFECT_OPERATION_UNAVAILABLE')
  if (spec.from === 'characters') {
    // Leaving the field: CR 1.2.1 §6-5-5-4 the DON!! cards given to it are placed rested in their owner's cost area.
    const controller = s.players.find(p => p.id === card.controller)!
    for (const id of [...controller.zones.attached].filter(id => s.instances[id].attachedTo === card.id)) {
      const don = s.instances[id]; controller.zones.attached.splice(controller.zones.attached.indexOf(id), 1); controller.zones.cost.push(id)
      don.zone = 'cost'; don.zoneGeneration++; don.rested = true; don.attachedTo = null
      recordOperation(s, { id: next(r, s.gameId, 'operation'), resolutionId: context.effectInstanceId, subject: { instanceId: id, generation: don.zoneGeneration - 1 }, controllerId: context.controllerId, type: 'MOVE_DON', intent: 'RULE', outcome: 'CONFIRMED', from: 'attached', to: 'cost' })
    }
  }
  if (!processOperation(s, { id: next(r, s.gameId, 'operation'), resolutionId: context.effectInstanceId, subject: structuredClone(selected), controllerId: context.controllerId, type: 'MOVE_CARD', intent: 'EFFECT', outcome: 'CONFIRMED', from: spec.from, to: 'life' })) return
  // processOperation appends (the bottom of the Life area); "to the top" unless the bottom was chosen.
  if (!(spec.bottomBinding && r.continuation!.bindings[spec.bottomBinding]?.length)) { owner.zones.life.pop(); owner.zones.life.unshift(card.id) }
  card.faceUp = spec.faceUp
  s.events.push({ sequence: s.events.length, type: 'LIFE_ADDED', actorId: owner.id, ...(spec.faceUp ? { publicInstanceId: card.id } : {}) })
}
function resume(s: GameState) {
  const r = s.effects!, c = r.continuation!, active = r.active!
  const d = r.registry.definitions.find(d => d.id === c.definitionId && d.revision === c.definitionRevision)!
  active.status = 'RESOLVING'
  while (c.pc < d.program.length) {
    const step = d.program[c.pc]
    if (step.kind === 'SHUFFLE_DECK') {
      const player = recipient(s, c.context.controllerId, step.player)
      player.zones.deck = shuffle(player.zones.deck, s.random, seededRandom)
      c.pc++; continue
    }
    if (step.kind === 'REVEAL_BINDING') {
      for (const ref of c.bindings[step.bind] ?? []) {
        const card = s.instances[ref.instanceId]
        if (!card || card.zoneGeneration !== ref.generation || !card.definitionId || !card.printingKey) throw new Error('INVALID_REVEAL_SUBJECT')
        s.events.push({ sequence:s.events.length, type:'CARD_REVEALED', actorId:c.context.controllerId, revealedCard:{ definitionId:card.definitionId, printingKey:card.printingKey } })
      }
      c.pc++; continue
    }
    if (step.kind === 'OPERATION' && step.operation.primitive === 'koCharacter') {
      const op = step.operation, refs = c.bindings[op.subjectBinding]
      if (!refs) throw new Error('INVALID_EFFECT_BINDING')
      if (refs.length > 1 && r.version !== '1.3.0') throw new Error('KO_BATCH_NOT_IMPLEMENTED')
      if (c.koCursor === undefined && ((step.whenCondition && !condition(s, step.whenCondition, c.context.controllerId, c.context.source)) || (step.whenBindingNonempty && !c.bindings[step.whenBindingNonempty]?.length))) {
        if (op.resultBinding) c.bindings[op.resultBinding] = []
        c.pc++; continue
      }
      if (c.koCursor === undefined && op.resultBinding) c.bindings[op.resultBinding] = []
      // Several bound Characters are K.O.'d in binding order; a suspended replacement keeps the position in koCursor.
      let suspended = false
      for (let index = c.koCursor ?? 0; index < refs.length; index++) {
        if (!resolveKO(s, refs[index], c.context, op.player === 'ANY')) { if (refs.length > 1) c.koCursor = index; suspended = true; break }
        recordKOResult(s, c, refs[index])
      }
      if (suspended) return
      delete c.koCursor; c.pc++; continue
    }
    if (step.kind === 'SEARCH_TOP_DECK') {
      if (c.searchFlow) { active.status = 'SUSPENDED'; return }
      if (step.whenBindingNonempty && !c.bindings[step.whenBindingNonempty]?.length) { c.bindings[step.bind] = []; c.pc++; continue }
      const player = s.players.find(p => p.id === c.context.controllerId)!
      const ids = player.zones.deck.slice(0, step.amount)
      const topCards = ids.map(instanceId => ({ instanceId, generation: s.instances[instanceId].zoneGeneration }))
      const candidates = ids.filter(instanceId => {
        const definition=s.catalog.definitions.find(d=>d.definitionId===s.instances[instanceId].definitionId)
        return !!definition && (step.trait===undefined || definition.traits.includes(step.trait))
          && (step.traitsAny===undefined || step.traitsAny.some(t=>definition.traits.includes(t))) && (step.colorsAny===undefined || step.colorsAny.some(c=>definition.colors.includes(c)))
          && (step.category===undefined || definition.category===step.category)
          && (step.excludeRulesName===undefined || definition.rulesName!==step.excludeRulesName)
      })
        .map(instanceId => ({ instanceId, generation: s.instances[instanceId].zoneGeneration }))
      c.searchFlow = { stage: 'SELECT', topCards, candidates, selected: [], remainder: [], bind: step.bind }
      createSearchChoice(s, 'SELECT', candidates, step.bind, 0, Math.min(step.maxSelected, candidates.length))
      active.status = 'SUSPENDED'; return
    }
    if (step.kind === 'OPERATION') {
      if (step.whenCondition && !condition(s,step.whenCondition,c.context.controllerId,c.context.source)) { c.pc++; continue }
      if (step.whenBindingNonempty && !c.bindings[step.whenBindingNonempty]?.length) { c.pc++; continue }
      const binding = 'subjectBinding' in step.operation ? step.operation.subjectBinding : undefined
      if (binding) {
        const refs = c.bindings[binding]
        if (!refs) throw new Error('INVALID_EFFECT_BINDING')
        for (const ref of refs) execute(s, step.operation, c.context, ref)
      } else execute(s, step.operation, c.context)
      c.pc++; continue
    }
    if (step.kind === 'MODE') {
      if (step.whenBindingNonempty && !c.bindings[step.whenBindingNonempty]?.length) {
        for (let mode = 0; mode < step.modes; mode++) c.bindings[`${step.bind}.${mode}`] = []
        c.pc++; continue
      }
      const chooserId = step.chooser === 'OPPONENT' ? s.players.find(p => p.id !== c.context.controllerId)!.id : c.context.controllerId
      r.choice = { id: next(r, s.gameId, 'choice'), actorId: chooserId, expectedVersion: s.version + 1, choiceType: 'SELECT', optional: false, min: 1, max: 1, visibility: 'PUBLIC',
        options: [], continuationId: c.id, context: structuredClone(c.context), bind: step.bind, modes: step.modes }
      active.status = 'SUSPENDED'; return
    }
    if (step.kind === 'CHECK') {
      c.bindings[step.bind] = condition(s, step.condition, c.context.controllerId, c.context.source) && c.context.source.kind === 'CARD' ? [structuredClone(c.context.source.presence)] : []
      c.pc++; continue
    }
    if (step.kind === 'BIND_ALL') {
      c.bindings[step.bind] = select(s, c.context.controllerId, step.selector, c.context.source).map(id => ({ instanceId: id, generation: s.instances[id].zoneGeneration }))
      c.pc++; continue
    }
    if (step.whenBindingNonempty && !c.bindings[step.whenBindingNonempty]?.length) { c.bindings[step.bind] = []; c.pc++; continue }
    if (step.whenCondition && !condition(s, step.whenCondition, c.context.controllerId, c.context.source)) { c.bindings[step.bind] = []; c.pc++; continue }
    const chooserId = step.chooser === 'OPPONENT' ? s.players.find(p => p.id !== c.context.controllerId)!.id : c.context.controllerId
    const instances = select(s, chooserId, step.selector, c.context.source)
    if (step.skipIfNone && !instances.length) { c.bindings[step.bind] = []; c.pc++; continue }
    const min = step.clampMin ? Math.min(step.min, instances.length) : step.min
    if (!step.optional && instances.length < min) throw new Error('CHOICE_UNAVAILABLE')
    const choiceId = next(r, s.gameId, 'choice')
    const max = step.choiceType === 'ORDER' ? instances.length : Math.min(step.max, instances.length)
    if (max > 10) throw new Error('CHOICE_LIMIT')
    r.choice = { id: choiceId, actorId: chooserId, expectedVersion: s.version + 1, choiceType: step.choiceType,
      optional: step.optional, min: step.choiceType === 'ORDER' ? instances.length : min, max, visibility: step.visibility,
      options: instances.map((id, index) => ({ token: `${choiceId}:option:${index}`, presence: { instanceId: id, generation: s.instances[id].zoneGeneration } })),
      continuationId: c.id, context: structuredClone(c.context), bind: step.bind, ...(step.allOrNone ? { allOrNone: true as const } : {}), ...(step.reveal ? { reveal: step.reveal } : {}), ...(step.conceal ? { conceal: true as const } : {}) }
    active.status = 'SUSPENDED'; return
  }
  active.status = 'COMPLETED'; r.continuation = null; r.choice = null
  if (c.context.source.kind === 'CARD') cardEvent(s, 'ABILITY_COMPLETED', c.context.source.presence.instanceId, c.context)
}
function createSearchChoice(s: GameState, choiceType: 'SELECT' | 'ORDER', refs: { instanceId: string; generation: number }[], bind: string, min: number, max: number) {
  const r = s.effects!, c = r.continuation!, choiceId = next(r, s.gameId, 'choice')
  r.choice = { id: choiceId, actorId: c.context.controllerId, expectedVersion: s.version + 1, choiceType, optional: min === 0, min, max, visibility: 'PRIVATE',
    options: refs.map((presence, index) => ({ token: `${choiceId}:option:${index}`, presence: structuredClone(presence) })), continuationId: c.id, context: structuredClone(c.context), bind }
}
function answerSearchChoice(s: GameState, tokens: string[]) {
  const r = s.effects!, c = r.continuation!, q = r.choice!, flow = c.searchFlow!
  const selected = tokens.map(token => q.options.find(o => o.token === token)!.presence)
  if (flow.stage === 'SELECT') {
    if (selected.some(ref => !flow.candidates.some(candidate => candidate.instanceId === ref.instanceId && candidate.generation === ref.generation))) throw new Error('INVALID_CHOICE_RESPONSE')
    flow.selected = structuredClone(selected)
    const chosenIds=new Set(selected.map(ref=>ref.instanceId))
    flow.remainder = flow.topCards.filter(ref => !chosenIds.has(ref.instanceId))
    c.bindings[flow.bind] = selected.map(ref=>({instanceId:ref.instanceId,generation:ref.generation+1}))
    for(const chosen of selected) {
      const player = s.players.find(p => p.id === c.context.controllerId)!, card = s.instances[chosen.instanceId]
      if (card.zone !== 'deck' || card.zoneGeneration !== chosen.generation) throw new Error('INVALID_CHOICE_RESPONSE')
      player.zones.deck.splice(player.zones.deck.indexOf(card.id), 1); player.zones.hand.push(card.id)
      card.zone = 'hand'; card.zoneGeneration++; card.faceUp = false
      s.events.push({ sequence: s.events.length, type: 'CARD_REVEALED', actorId: c.context.controllerId, revealedCard: { definitionId: card.definitionId!, printingKey: card.printingKey! } })
    }
    const step = r.registry.definitions.find(d => d.id === c.definitionId && d.revision === c.definitionRevision)!.program[c.pc]
    if (step.kind === 'SEARCH_TOP_DECK' && step.remainder === 'TRASH') {
      // "Then, trash the rest": the remaining looked-at cards go to the (open) trash.
      const player = s.players.find(p => p.id === c.context.controllerId)!
      for (const ref of flow.remainder) {
        const card = s.instances[ref.instanceId]
        if (card.zone !== 'deck' || card.zoneGeneration !== ref.generation) throw new Error('INVALID_CHOICE_RESPONSE')
        player.zones.deck.splice(player.zones.deck.indexOf(card.id), 1); player.zones.trash.push(card.id)
        card.zone = 'trash'; card.zoneGeneration++; card.faceUp = true
        s.events.push({ sequence: s.events.length, type: 'CARD_TRASHED', actorId: player.id, publicInstanceId: card.id })
      }
      delete c.searchFlow; r.choice = null; c.pc++
      return
    }
    flow.stage = 'ORDER'
    createSearchChoice(s, 'ORDER', flow.remainder, flow.bind, flow.remainder.length, flow.remainder.length)
    return
  }
  if (selected.length !== flow.remainder.length || selected.some(ref => !flow.remainder.some(item => item.instanceId === ref.instanceId && item.generation === ref.generation))) throw new Error('INVALID_CHOICE_RESPONSE')
  const player = s.players.find(p => p.id === c.context.controllerId)!
  const currentTop = player.zones.deck.slice(0, flow.remainder.length)
  if (currentTop.length !== flow.remainder.length || currentTop.some(id => !flow.remainder.some(ref => ref.instanceId === id && s.instances[id].zoneGeneration === ref.generation))) throw new Error('INVALID_CHOICE_RESPONSE')
  player.zones.deck.splice(0, currentTop.length)
  player.zones.deck.push(...selected.map(ref => ref.instanceId))
  delete c.searchFlow; r.choice = null; c.pc++
}
export function effectActions(s: GameState, actorId: string): LegalAction[] {
  const r = s.effects
  if (!r) return []
  if (r.scheduler?.orderChoice) {
    const q = r.scheduler.orderChoice
    return q.actorId === actorId ? [{ type: 'ANSWER_CHOICE', choiceId: q.id, choiceType: 'ORDER', optional: false, min: 1, max: 1, options: q.options.map(o => ({ token: o.token, triggerId: o.triggerId })) }] : []
  }
  if (r.choice) {
    if (r.choice.actorId !== actorId) return []
    const c = r.choice
    return [{ type: 'ANSWER_CHOICE', choiceId: c.id, choiceType: c.choiceType, optional: c.optional, min: c.min, max: c.max, ...(c.allOrNone ? { allOrNone: true } : {}),
      options: choiceOptions(s, c, actorId) }]
  }
  if (s.scope !== 'BASIC_TURNS' || s.phase !== 'MAIN' || s.activePlayerId !== actorId || s.result) return []
  return r.registry.definitions.filter(d => d.timing === 'MAIN' || d.timing === 'ACTIVATE_MAIN').flatMap(d => sources(s, d, actorId).filter(source => condition(s, d.condition, actorId, source) && payable(s, d, source)
    && (d.usage.kind === 'UNLIMITED' || !r.usage[usageKey(d.id, d.revision, source, actorId, s.turn)]))
    .map(source => ({ type: 'START_EFFECT' as const, effectId: actionId(d, source), ...(d.optionalCost === 'TAKE_TOP_LIFE_TO_HAND' ? { optionalCost:d.optionalCost } : {}),
      ...(d.cost.kind === 'DON_MINUS' ? { donMinus: { amount: d.cost.amount, eligibleDonIds: fieldDon(s, actorId) } } : {}) })))
}
export function applyEffectCommand(s: GameState, command: Extract<Command, { type: 'START_EFFECT' | 'ANSWER_CHOICE' }>) {
  const r = s.effects
  if (!r) throw new Error('EFFECTS_NOT_ENABLED')
  if (r.scheduler?.orderChoice) {
    const q = r.scheduler.orderChoice
    if (command.type !== 'ANSWER_CHOICE' || command.choiceId !== q.id || command.actorId !== q.actorId || command.expectedVersion !== q.expectedVersion || command.tokens.length !== 1) throw new Error('INVALID_CHOICE_RESPONSE')
    const option = q.options.find(o => o.token === command.tokens[0])
    if (!option) throw new Error('INVALID_CHOICE_RESPONSE')
    r.choiceHistory.push({ choiceId: q.id, actorId: q.actorId, tokens: [...command.tokens], visibility: 'PRIVATE' }); r.scheduler.orderChoice = null
    activateScheduled(s, option.triggerId); drainScheduler(s); return
  }
  if (command.type === 'START_EFFECT') {
    if (s.phase !== 'MAIN' || s.activePlayerId !== command.actorId || s.battle || s.result || r.choice || r.scheduler?.orderChoice || r.continuation) throw new Error('INVALID_EFFECT_WINDOW')
    const candidate = r.registry.definitions.filter(d => d.timing === 'MAIN' || d.timing === 'ACTIVATE_MAIN').flatMap(d => sources(s, d, command.actorId).map(source => ({ d, source }))).find(c => actionId(c.d, c.source) === command.effectId)
    const d = candidate?.d, source = candidate?.source
    if (r.choice || !d || !source || (command.donMinusIds !== undefined && d.cost.kind !== 'DON_MINUS') || (command.payOptionalCost && !d.optionalCost) || (command.payOptionalCost && source.kind === 'CARD' && !s.players.find(p=>p.id===command.actorId)!.zones.life.length) || !payable(s, d, source) || !condition(s, d.condition, command.actorId, source)) throw new Error('INVALID_EFFECT_COMMAND')
    const key = usageKey(d.id, d.revision, source, command.actorId, s.turn)
    if (d.usage.kind !== 'UNLIMITED' && r.usage[key]) throw new Error('INVALID_EFFECT_COMMAND')
    begin(s, d, source, command.actorId, command.payOptionalCost === true, undefined, undefined, command.donMinusIds)
  } else {
    const c = r.choice, continuation = r.continuation
    if (!c || !continuation || c.id !== command.choiceId || c.actorId !== command.actorId || c.expectedVersion !== command.expectedVersion) throw new Error('INVALID_CHOICE_RESPONSE')
    const options = command.tokens.map(t => c.modes !== undefined ? { token: t, presence: { instanceId: '', generation: 0 } } : c.options.find(o => o.token === t))
    if (new Set(command.tokens).size !== command.tokens.length || command.tokens.length < c.min || command.tokens.length > c.max || options.some(o => !o)
      || (c.allOrNone && command.tokens.length !== 0 && command.tokens.length !== c.max)) throw new Error('INVALID_CHOICE_RESPONSE')
    if (c.modes !== undefined) {
      const index = command.tokens.length === 1 ? modeTokens(c).indexOf(command.tokens[0]) : -1
      if (index < 0) throw new Error('INVALID_CHOICE_RESPONSE')
      const marker = continuation.context.source.kind === 'CARD' ? [structuredClone(continuation.context.source.presence)] : []
      for (let mode = 0; mode < c.modes; mode++) continuation.bindings[`${c.bind}.${mode}`] = mode === index ? structuredClone(marker) : []
      r.choiceHistory.push({ choiceId: c.id, actorId: c.actorId, tokens: [...command.tokens], visibility: 'PUBLIC' })
      r.choice = null; continuation.pc++
      resume(s)
      if (r.scheduler?.resolvingId && !r.continuation && !r.choice && !r.scheduler.orderChoice) drainScheduler(s)
      return
    }
    if (continuation.searchFlow) {
      r.choiceHistory.push({ choiceId: c.id, actorId: c.actorId, tokens: [...command.tokens], visibility: 'PRIVATE' })
      answerSearchChoice(s, command.tokens)
      if (r.choice) return
      if (r.continuation) resume(s)
      if (r.scheduler?.resolvingId && !r.continuation && !r.choice && !r.scheduler.orderChoice) drainScheduler(s)
      return
    }
    const selected = options.map(o => o!.presence)
    if (continuation.interception) {
      answerReplacement(s, selected); resume(s); return
    }
    const anyOwner = cardsSelector(s, continuation)
    if (selected.some(ref => !s.instances[ref.instanceId] || s.instances[ref.instanceId].zoneGeneration !== ref.generation || (!anyOwner && s.instances[ref.instanceId].owner !== selectOwner(s, continuation, c.actorId)))) throw new Error('INVALID_CHOICE_RESPONSE')
    continuation.bindings[c.bind] = structuredClone(selected)
    // ONCE_PER_TURN_WHEN_CHOSEN: used only once its first choice names a card.
    const active = r.active, used = active && r.registry.definitions.find(d => d.id === active.definitionId && d.revision === active.revision)
    if (used?.usage.kind === 'ONCE_PER_TURN_WHEN_CHOSEN' && continuation.pc === 0 && selected.length) r.usage[usageKey(used.id, used.revision, active!.context.source, active!.context.controllerId, s.turn)] = 1
    r.choiceHistory.push({ choiceId: c.id, actorId: c.actorId, tokens: [...command.tokens], visibility: c.visibility })
    r.choice = null; continuation.pc++
  }
  if (r.continuation) resume(s)
  if (r.scheduler?.resolvingId && !r.continuation && !r.choice && !r.scheduler.orderChoice) drainScheduler(s)
}
export function assertEffectState(s: GameState): void {
  if (s.schemaVersion === 1) { if (s.effects !== undefined) throw new Error('INVALID_EFFECT_STATE'); return }
  if (!s.effects || s.scope !== 'BASIC_TURNS') throw new Error('INVALID_EFFECT_STATE')
  const parsed = runtimeSchema.safeParse(s.effects)
  if (!parsed.success) throw new Error('INVALID_EFFECT_STATE')
  const r = s.effects, ids = s.players.map(p => p.id)
  if (r.version !== r.registry.version || r.primitives.version !== r.version || r.engineVersion !== (r.version === '1.0.0' ? 'm1.5b-1' : r.version === '1.2.0' ? 'm1.5d-1' : r.version === '1.3.0' ? 'm1.5e-1' : 'm1.5c-1')
    || (r.version === '1.0.0' ? r.powerModifiers !== undefined || r.cardEvents !== undefined || r.cardOperations !== undefined : !r.powerModifiers || !r.cardEvents || !r.cardOperations)
    || (r.version === '1.2.0' && !r.basePowerModifiers) || (r.version === '1.3.0' && (!r.basePowerModifiers || !r.scheduler || !r.operations || !r.payments))) throw new Error('INVALID_EFFECT_VERSIONS')
  if (r.version === '1.2.0' || r.version === '1.3.0') assertScheduler(s)
  else if (r.scheduler || r.operations || r.payments) throw new Error('INVALID_EFFECT_VERSIONS')
  if (r.powerModifiers?.some(m => !s.instances[m.subject.instanceId] || !Number.isSafeInteger(m.amount) || m.turnId > s.turn)) throw new Error('INVALID_POWER_MODIFIER')
  if (r.basePowerModifiers?.some(m => {
    const subject = s.instances[m.subject.instanceId], source = m.source.kind === 'CARD' ? s.instances[m.source.presence.instanceId] : undefined
    return !subject || subject.kind !== 'CARD' || !Number.isSafeInteger(m.value) || !ids.includes(m.expiresForPlayerId)
      || m.source.kind !== 'CARD' || !source || source.definitionId !== m.source.definitionId || m.expiresAtPlayerTurn < 1
  })) throw new Error('INVALID_BASE_POWER_MODIFIER')
  // A subject named while public may since have been moved to a hidden zone by a traced operation, and a DON!! card may have
  // returned to its DON!! deck (same rules as public events).
  const hiddenByEffect = new Set((r.operations ?? []).filter(o => o.type === 'MOVE_CARD' && o.outcome === 'CONFIRMED' && ['hand', 'deck'].includes(o.to ?? '')).map(o => o.subject.instanceId))
  if (r.cardEvents?.some((e, index) => e.sequence !== index || !ids.includes(e.controllerId) || (!s.instances[e.subjectId]?.faceUp && s.instances[e.subjectId]?.kind !== 'DON' && !hiddenByEffect.has(e.subjectId)))) throw new Error('INVALID_CARD_EFFECT_EVENT')
  if (r.registry.version !== '1.0.0') {
    for (const d of r.registry.definitions) {
      const source = d.source
      const definition = source.kind === 'CARD_DEFINITION' && s.catalog.definitions.find(c => c.definitionId === source.definitionId)
      if (!definition || source.kind !== 'CARD_DEFINITION' || (source.zone === 'temporary' ? definition.category === 'DON' : source.zone === 'hand' ? definition.category !== 'EVENT' : definition.category !== ({ leader: 'LEADER', characters: 'CHARACTER', stage: 'STAGE' }[source.zone]))) throw new Error('INVALID_CARD_PROGRAM_SOURCE')
    }
    if ([...r.registry.continuous ?? [], ...r.registry.cardReplacements ?? []].some(d => s.catalog.definitions.find(c => c.definitionId === d.definitionId)?.category !== ({ leader: 'LEADER', stage: 'STAGE', characters: 'CHARACTER', hand: 'CHARACTER' } as Record<string, string>)[d.zone])) throw new Error('INVALID_CONTINUOUS_SOURCE')
  }
  for (const m of r.powerModifiers ?? []) {
    if (m.source.kind !== 'CARD' || !s.instances[m.source.presence.instanceId] || s.instances[m.source.presence.instanceId].definitionId !== m.source.definitionId || s.instances[m.subject.instanceId].kind !== 'CARD') throw new Error('INVALID_POWER_MODIFIER')
  }
  if (r.registry.restrictions.some(rule => !ids.includes(rule.playerId))) throw new Error('INVALID_EFFECT_PLAYER')
  if (r.events.some((e, index) => e.sequence !== index || !ids.includes(e.playerId) || !ids.includes(e.controllerId) || s.instances[e.subjectId]?.kind !== 'DON')) throw new Error('INVALID_EFFECT_EVENT')
  if (r.trace.some(t => !ids.includes(t.operation.playerId) || !ids.includes(t.operation.context.controllerId) || s.instances[t.operation.subject.instanceId]?.kind !== 'DON')) throw new Error('INVALID_EFFECT_TRACE')
  if (r.cardOperations?.some(o => o.outcome === 'PROPOSED' || !ids.includes(o.controllerId) || s.instances[o.subject.instanceId]?.kind !== 'CARD' || (o.outcome === 'REPLACED' && !r.registry.cardReplacements?.some(rule => rule.id === o.replacementId) && !r.registry.leaderReplacements?.some(rule=>rule.id===o.replacementId)))) throw new Error('INVALID_CARD_OPERATION')
  const operationIds = [...r.trace.map(t => t.operation.id), ...(r.cardOperations ?? []).map(o => o.id)]
  if (new Set(operationIds).size !== operationIds.length || new Set(r.events.map(e => e.operationId)).size !== r.events.length) throw new Error('DUPLICATE_EFFECT_OPERATION')
  for (const e of r.events) {
    const trace = r.trace.find(t => t.operation.id === e.operationId)
    if (!trace || trace.outcome !== 'CONFIRMED' || trace.operation.resolutionId !== e.resolutionId || trace.operation.subject.instanceId !== e.subjectId
      || trace.operation.from !== e.from || trace.operation.to !== e.to || trace.operation.rested !== e.rested || trace.operation.targetId !== e.targetId || trace.operation.spec.audience !== e.audience
      || trace.operation.playerId !== e.playerId || trace.operation.context.controllerId !== e.controllerId) throw new Error('INVALID_EFFECT_EVENT')
  }
  const schedulerIds = r.scheduler ? [...r.scheduler.history, ...r.scheduler.batches.flatMap(b=>b.triggers)].map(t=>t.id) : []
  const generatedIds = [...schedulerIds, ...(r.scheduler?.orderChoice ? [r.scheduler.orderChoice.id] : []), ...(r.operations??[]).map(o=>o.id), ...operationIds, ...r.choiceHistory.map(c => c.choiceId), ...(r.active ? [r.active.id] : []), ...(r.continuation ? [r.continuation.id] : []), ...(r.choice ? [r.choice.id] : []), ...(r.continuation?.interception ? [r.continuation.interception.operation.id] : []), ...(r.powerModifiers ?? []).map(m => m.id)]
  for (const generated of generatedIds) {
    const prefix = `${s.gameId}:fx:`
    const serial = Number(generated.slice(generated.lastIndexOf(':') + 1))
    if (!generated.startsWith(prefix) || !Number.isSafeInteger(serial) || serial < 0 || serial >= r.nextId) throw new Error('INVALID_EFFECT_ID_SEQUENCE')
  }
  if (!r.active) { if (r.choice || r.continuation) throw new Error('INVALID_EFFECT_STATE'); return }
  const a = r.active, source = a.context.source
  if (source.kind === 'CARD') {
    const i = s.instances[source.presence.instanceId]
    if (!i || i.definitionId !== source.definitionId || i.controller !== a.context.controllerId || (a.status === 'SUSPENDED' && i.zoneGeneration !== source.presence.generation && !validActivatedKO(s, source) && !validActivatedMainEvent(s, source, a.context.effectInstanceId) && !validSelfReturnedSource(s, source, a.context.effectInstanceId))) throw new Error('INVALID_CARD_EFFECT_SOURCE')
  }
  const d = r.registry.definitions.find(d => d.id === a.definitionId && d.revision === a.revision)
  if (!d || !ids.includes(a.context.controllerId) || a.context.effectInstanceId !== a.id || !matchesSource(d, a.context.source)) throw new Error('INVALID_EFFECT_STATE')
  if (a.status === 'COMPLETED') { if (r.choice || r.continuation) throw new Error('INVALID_EFFECT_STATE'); return }
  // A command may only publish a completed or suspended resolution, never an in-flight mutation.
  const c = r.continuation, choice = r.choice
  if (a.status !== 'SUSPENDED' || !c || !choice || c.definitionId !== d.id || c.definitionRevision !== d.revision || c.pc >= d.program.length
    || choice.continuationId !== c.id || (!c.interception && choice.actorId !== (chooserOf(s, c) ?? a.context.controllerId)) || choice.expectedVersion !== pendingVersion(s)
    || JSON.stringify(c.context) !== JSON.stringify(a.context) || JSON.stringify(choice.context) !== JSON.stringify(a.context)) throw new Error('INVALID_EFFECT_CONTINUATION')
  if (c.interception) { assertReplacementChoice(s); return }
  const step = d.program[c.pc]
  if (step.kind === 'SEARCH_TOP_DECK') {
    const flow = c.searchFlow, refs = flow?.stage === 'SELECT' ? flow.candidates : flow?.remainder
    const min = flow?.stage === 'SELECT' ? 0 : flow?.remainder.length ?? -1
    const max = flow?.stage === 'SELECT' ? Math.min(step.maxSelected, flow.candidates.length) : flow?.remainder.length ?? -1
    if (!flow || choice.bind !== step.bind || choice.visibility !== 'PRIVATE' || choice.actorId !== c.context.controllerId
      || choice.choiceType !== flow.stage || choice.min !== min || choice.max !== max
      || JSON.stringify(choice.options.map(o => o.presence.instanceId)) !== JSON.stringify(refs?.map(ref => ref.instanceId))
      || choice.options.some(o => s.instances[o.presence.instanceId]?.zoneGeneration !== o.presence.generation)) throw new Error('INVALID_EFFECT_CHOICE')
    const deck = s.players.find(p => p.id === c.context.controllerId)!.zones.deck
    if (flow.topCards.some(ref => !s.instances[ref.instanceId] || s.instances[ref.instanceId].owner !== c.context.controllerId)
      || (flow.stage === 'SELECT' && flow.topCards.some((ref, index) => deck[index] !== ref.instanceId || s.instances[ref.instanceId].zoneGeneration !== ref.generation))
      || (flow.stage === 'ORDER' && flow.remainder.some(ref => s.instances[ref.instanceId]?.zone !== 'deck' || s.instances[ref.instanceId]?.zoneGeneration !== ref.generation))) throw new Error('INVALID_SEARCH_CONTINUATION')
    return
  }
  if (step.kind === 'MODE') {
    if (choice.modes !== step.modes || choice.bind !== step.bind || choice.options.length || choice.min !== 1 || choice.max !== 1 || choice.optional || choice.visibility !== 'PUBLIC' || choice.choiceType !== 'SELECT') throw new Error('INVALID_EFFECT_CHOICE')
    return
  }
  if (choice.modes !== undefined || (choice.reveal ?? null) !== (step.kind === 'CHOICE' ? step.reveal ?? null : null) || (choice.conceal ?? null) !== (step.kind === 'CHOICE' ? step.conceal ?? null : null)) throw new Error('INVALID_EFFECT_CHOICE')
  if (step.kind !== 'CHOICE' || choice.bind !== step.bind || choice.visibility !== step.visibility || choice.choiceType !== step.choiceType || choice.optional !== step.optional) throw new Error('INVALID_EFFECT_CHOICE')
  const expected = select(s, choice.actorId, step.selector, c.context.source)
  if (JSON.stringify(choice.options.map(o => o.presence.instanceId)) !== JSON.stringify(expected) || new Set(choice.options.map(o => o.token)).size !== choice.options.length
    || choice.options.some(o => s.instances[o.presence.instanceId]?.zoneGeneration !== o.presence.generation)
    || choice.min !== (step.choiceType === 'ORDER' ? expected.length : step.clampMin ? Math.min(step.min, expected.length) : step.min) || choice.max !== (step.choiceType === 'ORDER' ? expected.length : Math.min(step.max, expected.length))
    || (choice.allOrNone === true) !== (step.allOrNone === true)) throw new Error('INVALID_EFFECT_CHOICE')
}
// Instance ids follow the deck list, so an id in a secret area identifies the card. Life is secret to both
// players (CR 1.2.1 §3-10-2) and projections only count it; hand and deck are secret to the opponent.
function visibleOption(s: GameState, o: { token: string; presence: { instanceId: string } }, viewerId: string | null, reveal = false, conceal = false) {
  const i = s.instances[o.presence.instanceId]
  if (conceal && i?.zone === 'deck') return { token: o.token, slot: { kind: 'DECK_TOP' as const, ownerId: i.owner } }
  if (conceal && i?.zone === 'hand') return { token: o.token, slot: { kind: 'HAND_CARD' as const, ownerId: i.owner } }
  // A Life option is named by its position (top / bottom of whose Life); its identity only for a private peek.
  const slot = i?.zone === 'life' ? { slot: { kind: s.players.find(p => p.id === i.owner)!.zones.life[0] === i.id ? 'LIFE_TOP' as const : 'LIFE_BOTTOM' as const, ownerId: i.owner } } : {}
  if (reveal) return { token: o.token, instanceId: o.presence.instanceId, ...slot }
  return i && (i.zone === 'life' || (i.owner !== viewerId && ['hand', 'deck'].includes(i.zone))) ? { token: o.token, ...slot } : { token: o.token, instanceId: o.presence.instanceId }
}
const modeTokens = (c: NonNullable<EffectRuntime['choice']>) => Array.from({ length: c.modes ?? 0 }, (_, index) => `${c.id}:mode:${index}`)
/** The options the chooser sees: modes, or cards (a peek reveals hidden cards to the chooser only). */
function choiceOptions(s: GameState, c: NonNullable<EffectRuntime['choice']>, viewerId: string | null) {
  if (c.modes !== undefined) return modeTokens(c).map((token, index) => ({ token, slot: { kind: 'MODE' as const, index } }))
  return c.options.map(o => visibleOption(s, o, viewerId, c.reveal === 'CHOOSER' && viewerId === c.actorId, c.conceal === true))
}
export function projectEffects(s: GameState, viewerId: string | null) {
  const r = s.effects
  if (!r) return undefined
  const c = r.choice, order = r.scheduler?.orderChoice
  return { ...(order ? { ordering: order.actorId === viewerId ? { id: order.id, actorId: order.actorId, expectedVersion: order.expectedVersion, options: structuredClone(order.options) } : { actorId: order.actorId, waiting: true } } : {}), status: r.active?.status ?? null,
    pendingChoice: !c ? null : (c.actorId === viewerId || c.visibility === 'PUBLIC') ? { id: c.id, actorId: c.actorId, expectedVersion: c.expectedVersion, choiceType: c.choiceType,
      optional: c.optional, min: c.min, max: c.max, options: choiceOptions(s, c, viewerId) }
      : { actorId: c.actorId, waiting: true },
    cardEvents: r.cardEvents?.map(e => ({ ...e })),
    events: r.events.filter(e => e.audience === 'PUBLIC' || e.controllerId === viewerId).map(e => ({ sequence: e.sequence, type: e.type, playerId: e.playerId, subjectId: e.subjectId, from: e.from, to: e.to, rested: e.rested })),
  }
}
function select(s: GameState, actor: string, selector: import('./contracts').Selector, source?: EffectContext['source']): string[] {
  const p = s.players.find(p => p.id === actor)!
  if (selector.kind === 'OWN_ZONE') return p.zones[selector.zone].filter(id => s.instances[id].kind === selector.cardKind)
  if (selector.kind === 'OWN_LEADER_OR_CHARACTER') return [...p.zones.leader, ...p.zones.characters]
    .filter(id => !selector.excludeSource || source?.kind !== 'CARD' || id !== source.presence.instanceId)
  if (selector.kind === 'OPPONENT_CHARACTER') return s.players.find(q => q.id !== actor)!.zones.characters.filter(id => { const power = evaluateCharacteristics(s, id).power[selector.powerBasis === 'BASE' ? 'base' : 'current']; return power !== null && (selector.maximumPower === undefined || power <= selector.maximumPower) })
  if (selector.kind === 'OPPONENT_BLOCKER_COST_AT_MOST') return s.players.find(q => q.id !== actor)!.zones.characters.filter(id => {
    const definition = s.catalog.definitions.find(d => d.definitionId === s.instances[id].definitionId)
    const cost = evaluateCharacteristics(s, id).cost.current
    return !!definition?.review.effects.some(effect => effect.kind === 'blocker') && cost !== null && cost <= selector.maximumCost
  })
  if (selector.kind === 'OPPONENT_RESTED_CHARACTER_COST_AT_MOST') return s.players.find(q => q.id !== actor)!.zones.characters.filter(id => {
    const definition = s.catalog.definitions.find(d => d.definitionId === s.instances[id].definitionId)
    const cost = evaluateCharacteristics(s, id).cost.current
    return s.instances[id].rested && cost !== null && cost <= selector.maximumCost && definition?.category === 'CHARACTER'
  })
  if (selector.kind === 'OWN_RESTED_DON') return p.zones.cost.filter(id => s.instances[id].rested)
  if (selector.kind === 'OPPONENT_TOP_LIFE') return s.players.find(q => q.id !== actor)!.zones.life.slice(0, 1)
  if (selector.kind === 'CARDS') {
    const owners = selector.side === 'OWN' ? [p] : selector.side === 'OPPONENT' ? s.players.filter(q => q.id !== actor) : [p, ...s.players.filter(q => q.id !== actor)]
    const ids = owners.flatMap(q => selector.zone === 'leader' ? q.zones.leader : selector.zone === 'leaderOrCharacters' ? [...q.zones.leader, ...q.zones.characters] : selector.zone === 'fieldDon' ? [...q.zones.cost, ...q.zones.attached] : selector.topN ? q.zones.deck.slice(0, selector.topN)
      : selector.zone === 'life' ? [...new Set(selector.lifeEnd === 'TOP_OR_BOTTOM' ? [q.zones.life[0], q.zones.life.at(-1)] : [q.zones.life[0]])].filter((id): id is string => !!id) : q.zones[selector.zone])
    return ids.filter(id => {
      const i = s.instances[id]
      if (selector.excludeSource && source?.kind === 'CARD' && id === source.presence.instanceId) return false
      if (selector.rested !== undefined && i.rested !== selector.rested) return false
      if (selector.zone === 'cost' || selector.zone === 'fieldDon') return i.kind === 'DON'
      const definition = s.catalog.definitions.find(d => d.definitionId === i.definitionId)
      if (!definition) return false
      if (selector.categories && !selector.categories.includes(definition.category as 'CHARACTER' | 'EVENT' | 'STAGE')) return false
      const traitOk = !selector.traitsAny || selector.traitsAny.some(t => definition.traits.includes(t)), attributeOk = !selector.attributesAny || selector.attributesAny.some(a => definition.attributes.includes(a))
      if (selector.traitOrAttribute ? !traitOk && !attributeOk : !traitOk || !attributeOk) return false
      if (selector.inBinding && !(s.effects?.continuation?.bindings[selector.inBinding] ?? []).some(ref => ref.instanceId === id && ref.generation === i.zoneGeneration)) return false
      if (selector.colorsAny && !selector.colorsAny.some(color => definition.colors.includes(color))) return false
      if (selector.battledWithSource && !battledWith(s, source, i)) return false
      if (selector.nameIs && definition.rulesName !== selector.nameIs) return false
      if (selector.nameNot && definition.rulesName === selector.nameNot) return false
      if (selector.noBaseEffect && (definition.review.effectOriginal.trim() || definition.review.triggerOriginal.trim())) return false
      // Only a Character's own [Blocker] counts, not the word in another ability (FAQ ST01-016).
      if (selector.hasBlocker && !hasBlockerAbility(s, id)) return false
      const onField = ['leader', 'characters', 'stage'].includes(i.zone)
      const cost = onField ? evaluateCharacteristics(s, id).cost.current : definition.cost
      if ((selector.maxCost !== undefined || selector.minCost !== undefined) && cost === null) return false
      if (selector.maxCost !== undefined && cost! > selector.maxCost) return false
      if (selector.minCost !== undefined && cost! < selector.minCost) return false
      if (selector.minPower !== undefined) {
        const power = onField ? evaluateCharacteristics(s, id).power[selector.powerBasis === 'BASE' ? 'base' : 'current'] : definition.power
        if (power === null || power < selector.minPower) return false
      }
      if (selector.maxPower !== undefined) {
        const power = onField ? evaluateCharacteristics(s, id).power[selector.powerBasis === 'BASE' ? 'base' : 'current'] : definition.power
        if (power === null || power > selector.maxPower) return false
      }
      return true
    })
  }
  if (selector.kind !== 'OWN_FIELD') throw new Error('UNKNOWN_SELECTOR')
  return [...p.zones.leader, ...p.zones.characters].filter(id => (!selector.excludeSource || source?.kind !== 'CARD' || id !== source.presence.instanceId)
    && (!selector.trait || s.catalog.definitions.find(d => d.definitionId === s.instances[id].definitionId)!.traits.includes(selector.trait)))
}
/** The card the source battled in the last announced battle, still in the same presence (FAQ ST08-013). */
function battledWith(s: GameState, source: EffectContext['source'] | undefined, card: GameState['instances'][string]): boolean {
  if (source?.kind !== 'CARD') return false
  const e = [...s.events].reverse().find(event => event.type === 'CHARACTER_BATTLED' && event.publicInstanceId === source.presence.instanceId)
  return !!e?.battled && e.battled.instanceId === card.id && e.battled.generation === card.zoneGeneration
}
function sources(s: GameState, d: import('./contracts').EffectDefinition, actor: string): EffectContext['source'][] {
  const source = d.source
  if (source.kind === 'SYNTHETIC') return [source]
  if (source.kind !== 'CARD_DEFINITION') return []
  return Object.values(s.instances).filter(i => i.definitionId === source.definitionId && i.controller === actor && i.zone === source.zone)
    .map(i => ({ kind: 'CARD' as const, definitionId: source.definitionId, presence: { instanceId: i.id, generation: i.zoneGeneration } }))
}
function matchesSource(d: import('./contracts').EffectDefinition, source: EffectContext['source']): boolean {
  return d.source.kind === 'CARD_DEFINITION' ? source.kind === 'CARD' && source.definitionId === d.source.definitionId : JSON.stringify(source) === JSON.stringify(d.source)
}
/** [Once Per Turn] for automatic abilities: not captured again once used this turn (same key as activations). */
function usable(s: GameState, d: import('./contracts').EffectDefinition, source: EffectContext['source'], actorId: string): boolean {
  return d.usage.kind === 'UNLIMITED' || !s.effects!.usage[usageKey(d.id, d.revision, source, actorId, s.turn)]
}
function payable(s: GameState, d: import('./contracts').EffectDefinition, source: EffectContext['source']): boolean {
  if (s.effects?.version === '1.2.0' || s.effects?.version === '1.3.0') {
    const controllerId = source.kind === 'CARD' ? s.instances[source.presence.instanceId].controller : ''
    const context = { controllerId, source, effectInstanceId: 'preflight', turnId: s.turn, windowId: 'main' }
    if (preflightCosts(s, d.cost, context) !== 'PAID') return false
    if (source.kind === 'CARD') {
      const definition = s.catalog.definitions.find(item=>item.definitionId===source.definitionId)
      // An Event's printed cost is paid only to activate its [Main]; a [Trigger] is activated without it (FAQ ST02-015).
      if (definition?.category==='EVENT' && d.timing==='MAIN' && source.presence && preflightCosts(s,{kind:'REST_DON',amount:definition.cost??0},context)!=='PAID') return false
    }
    return true
  }
  return d.cost.kind === 'NONE' || (d.cost.kind === 'REST_SOURCE' && source.kind === 'CARD' && !s.instances[source.presence.instanceId]?.rested)
}
function actionId(d: import('./contracts').EffectDefinition, source: EffectContext['source']): string {
  return source.kind === 'CARD' ? `${d.id}:${source.presence.instanceId}:${source.presence.generation}` : d.id
}
function cardEvent(s: GameState, type: NonNullable<EffectRuntime['cardEvents']>[number]['type'], subjectId: string, context: EffectContext) {
  const events = s.effects!.cardEvents!
  events.push({ sequence: events.length, type, controllerId: context.controllerId, subjectId, resolutionId: context.effectInstanceId })
}
function begin(s: GameState, d: import('./contracts').EffectDefinition, source: EffectContext['source'], actor: string, payOptionalCost = false, counterBattleId?: string, optionalDonId?: string, costDonIds?: string[]) {
  const r = s.effects!, effectInstanceId = next(r, s.gameId, 'resolution')
  const context: EffectContext = { controllerId: actor, source: structuredClone(source), effectInstanceId, turnId: s.turn, windowId: counterBattleId ? `${counterBattleId}:counter` : `${s.gameId}:main:${s.turn}` }
  if (r.version === '1.2.0' || r.version === '1.3.0') {
    const payment = payCosts(s, d.cost, context, costDonIds)
    if (payment === 'INITIAL_UNPAYABLE') throw new Error('INVALID_ACTIVATION_COST')
    if (payment === 'INTERRUPTED') {
      if (d.usage.kind === 'ONCE_PER_TURN') r.usage[usageKey(d.id, d.revision, source, actor, s.turn)] = 1
      r.active = { id: effectInstanceId, definitionId: d.id, revision: d.revision, context, status: 'COMPLETED' }; r.continuation = null; return
    }
  } else if (d.cost.kind === 'REST_SOURCE') {
    if (source.kind !== 'CARD' || !payable(s, d, source)) throw new Error('INVALID_ACTIVATION_COST')
    s.instances[source.presence.instanceId].rested = true; cardEvent(s, 'SOURCE_RESTED', source.presence.instanceId, context)
  }
  const sourceInstance = source.kind === 'CARD' ? s.instances[source.presence.instanceId] : undefined
  const sourceDefinition = source.kind === 'CARD' ? s.catalog.definitions.find(item=>item.definitionId===source.definitionId) : undefined
  const eventActivation = !!sourceInstance && sourceInstance.zone==='hand' && sourceDefinition?.category==='EVENT'
  if (eventActivation) {
    if (source.kind !== 'CARD') throw new Error('INVALID_EVENT_EFFECT_SOURCE')
    if (r.version !== '1.3.0' || (counterBattleId ? d.timing !== 'COUNTER' : d.timing !== 'MAIN')) throw new Error('EVENT_RUNTIME_UNAVAILABLE')
    if (!counterBattleId) {
      const printedCost = { kind:'REST_DON' as const, amount:sourceDefinition!.cost ?? 0 }
      const payment = payCosts(s, printedCost, context)
      if (payment === 'INITIAL_UNPAYABLE') throw new Error('MAIN_EVENT_INITIAL_UNPAYABLE')
      if (payment === 'INTERRUPTED') {
        r.active = { id:effectInstanceId, definitionId:d.id, revision:d.revision, context, status:'COMPLETED' }; r.continuation = null; return
      }
    }
    if (payOptionalCost && d.optionalCost === 'TAKE_TOP_LIFE_TO_HAND') {
      const owner = s.players.find(p=>p.id===actor)!, lifeId=owner.zones.life[0]
      if (!lifeId) throw new Error('OPTIONAL_LIFE_COST_UNAVAILABLE')
      const moved = confirmMoveOperation(s,{instanceId:lifeId,generation:s.instances[lifeId].zoneGeneration},actor,effectInstanceId,'life','hand','COST')
      if (!moved) throw new Error('OPTIONAL_LIFE_COST_INTERRUPTED')
      s.events.push({sequence:s.events.length,type:'LIFE_PAID',actorId:actor})
    }
    const moved = confirmMoveOperation(s,source.presence,actor,effectInstanceId,'hand','trash','RULE')
    if (!moved) throw new Error('MAIN_EVENT_ACTIVATION_FAILED')
    cardEvent(s,'EVENT_ACTIVATED',sourceInstance!.id,context)
    if (optionalDonId && d.optionalCost === 'RETURN_ONE_DON') {
      const don=s.instances[optionalDonId], from=don.zone as 'cost'|'attached'
      if (!confirmMoveOperation(s,{instanceId:don.id,generation:don.zoneGeneration},actor,effectInstanceId,from,'donDeck','COST')) {
        r.active={id:effectInstanceId,definitionId:d.id,revision:d.revision,context,status:'COMPLETED'};r.continuation=null;return
      }
    }
    if (d.optionalCost && !payOptionalCost) {
      r.active={id:effectInstanceId,definitionId:d.id,revision:d.revision,context,status:'COMPLETED'};r.continuation=null;return
    }
  }
  r.active = { id: effectInstanceId, definitionId: d.id, revision: d.revision, context, status: 'RESOLVING' }
  r.continuation = { id: next(r, s.gameId, 'continuation'), definitionId: d.id, definitionRevision: d.revision, pc: 0, context: structuredClone(context), bindings: {} }
  if (d.usage.kind === 'ONCE_PER_TURN') r.usage[usageKey(d.id, d.revision, source, actor, s.turn)] = 1
  if (source.kind === 'CARD') cardEvent(s, 'ABILITY_ACTIVATED', source.presence.instanceId, context)
}
/** Counter programs enter the same JSON continuation interpreter as Main Events. */
export function activateCounterProgram(s: GameState, actor: string, cardId: string, paymentDonIds: string[], optionalDonIds: string[], payOptionalLife: boolean, battleId: string): void {
  const r=s.effects, battle=s.battle, card=s.instances[cardId]
  const definition=card && s.catalog.definitions.find(d=>d.definitionId===card.definitionId)
  const spec=definition?.review.counterEvent
  if (!r || r.version!=='1.3.0' || !battle || battle.id!==battleId || battle.step!=='COUNTER' || battle.defenderId!==actor
    || r.choice || r.continuation || r.scheduler?.orderChoice || !card || card.zone!=='hand' || card.owner!==actor
    || definition?.category!=='EVENT' || spec?.kind!=='DECLARATIVE' || definition.cost!==spec.printedCost) throw new Error('INVALID_COUNTER_EVENT')
  const program=r.registry.definitions.find(d=>d.id===spec.abilityId && d.timing==='COUNTER' && d.source.kind==='CARD_DEFINITION' && d.source.definitionId===definition.definitionId && d.source.zone==='hand')
  if (!program) throw new Error('UNSUPPORTED_COUNTER_PROGRAM')
  const owner=s.players.find(p=>p.id===actor)!
  if (paymentDonIds.length!==spec.printedCost || new Set(paymentDonIds).size!==paymentDonIds.length
    || paymentDonIds.some(id=>!owner.zones.cost.includes(id) || s.instances[id]?.kind!=='DON' || s.instances[id].rested)) throw new Error('COUNTER_EVENT_INITIAL_UNPAYABLE')
  if (optionalDonIds.length > 0 && (program.optionalCost!=='RETURN_ONE_DON' || optionalDonIds.length!==1 || !['cost','attached'].includes(s.instances[optionalDonIds[0]]?.zone)
    || s.instances[optionalDonIds[0]]?.owner!==actor || !owner.zones[s.instances[optionalDonIds[0]].zone as 'cost'|'attached'].includes(optionalDonIds[0]))) throw new Error('INVALID_COUNTER_EVENT_EFFECT_CHOICE')
  if (payOptionalLife && optionalDonIds.length) throw new Error('INVALID_COUNTER_EVENT_EFFECT_CHOICE')
  // Same rule as the DON_MINUS activation cost: a MOVE_DON prohibition makes DON!! −1 unpayable, refused before any payment.
  if (optionalDonIds.length && r.registry.restrictions.some(rule=>rule.playerId===actor && rule.prohibited==='MOVE_DON')) throw new Error('COUNTER_EVENT_DON_MINUS_UNAVAILABLE')
  if (payOptionalLife && (program.optionalCost!=='TAKE_TOP_LIFE_TO_HAND' || owner.zones.life.length===0)) throw new Error('COUNTER_EVENT_LIFE_COST_UNAVAILABLE')
  const rested=owner.zones.cost.filter(id=>s.instances[id].rested).length
  if (paymentDonIds.length && r.registry.restrictions.some(rule=>rule.playerId===actor && rule.prohibited==='REST' && (rule.afterRestedDon===undefined || rested>=rule.afterRestedDon))) throw new Error('COUNTER_EVENT_INITIAL_UNPAYABLE')
  const source={kind:'CARD' as const,definitionId:definition.definitionId,presence:{instanceId:cardId,generation:card.zoneGeneration}}
  if (!condition(s,program.condition,actor,source)) throw new Error('COUNTER_EVENT_CONDITION_UNAVAILABLE')
  // Printed cost: stop at the first prevented DON!!, keep confirmed ones, and record the outcome like PLAY_CARD.
  const before=r.operations!.length
  let interrupted=false
  for(const id of paymentDonIds) {
    if (!confirmRestOperation(s,{instanceId:id,generation:s.instances[id].zoneGeneration},actor,battleId,'COST')) { interrupted=true; break }
  }
  r.payments!.push({resolutionId:battleId,outcome:interrupted?'INTERRUPTED':'PAID',paidOperationIds:r.operations!.slice(before).filter(o=>o.outcome==='CONFIRMED').map(o=>o.id)})
  if (interrupted) return
  begin(s,program,source,actor,payOptionalLife || optionalDonIds.length>0,battleId,optionalDonIds[0])
  s.events.push({sequence:s.events.length,type:'COUNTER_PLAYED',actorId:actor,publicInstanceId:cardId})
  if(r.continuation) resume(s)
}
// Capture abilities only from confirmed events. Combat timings use the same serialized scheduler as ON_PLAY/KO.
export function capturePlayedEffects(s: GameState, events: GameState['events']): void {
  const r = s.effects
  if (!r || r.version === '1.0.0') return
  const eligible = events.filter(e => ['CARD_PLAYED', 'ATTACK_DECLARED', 'BLOCKER_ACTIVATED', 'TRIGGER_ACTIVATED', 'CHARACTER_BATTLED', 'BATTLE_PAIRED'].includes(e.type) && e.publicInstanceId).flatMap(e => {
    const i = s.instances[e.publicInstanceId!]
    const timing = e.type === 'CARD_PLAYED' ? 'ON_PLAY' : e.type === 'ATTACK_DECLARED' ? 'WHEN_ATTACKING' : e.type === 'BLOCKER_ACTIVATED' ? 'ON_BLOCK' : e.type === 'CHARACTER_BATTLED' ? 'END_OF_BATTLE_WITH_CHARACTER' : e.type === 'BATTLE_PAIRED' ? 'ON_BATTLE_PAIRED' : 'TRIGGER'
    return r.registry.definitions.filter(d => d.timing === timing || ((timing === 'WHEN_ATTACKING' || timing === 'ON_BLOCK') && d.timing === 'WHEN_ATTACKING_OR_ON_BLOCK')).flatMap(d => sources(s, d, i.controller)
      .filter(source => source.kind === 'CARD' && source.presence.instanceId === i.id)
      .map(source => ({ d, source, actor: i.controller, sequence: e.sequence })))
  })
  if (r.version === '1.2.0' || r.version === '1.3.0') {
    for (const e of events.filter(e => (['CARD_PLAYED', 'ATTACK_DECLARED', 'BLOCKER_ACTIVATED', 'TRIGGER_ACTIVATED', 'CHARACTER_BATTLED', 'BATTLE_PAIRED'].includes(e.type) && e.publicInstanceId) || (r.version === '1.3.0' && (e.type === 'MAIN_ENDED' || e.type === 'DON_RETURNED')))) {
      const causeId = e.type === 'CARD_PLAYED' ? `${s.gameId}:played:${e.sequence}` : `${s.gameId}:event:${e.sequence}`
      // [End of Your Turn]: every such ability on the field of the player whose Main Phase just ended.
      const observe = (timing: 'END_OF_YOUR_TURN' | 'ON_DON_RETURNED' | 'ON_OPPONENT_BLOCKER' | 'ON_OPPONENT_ATTACK', actor: string) => r.registry.definitions.filter(d => d.timing === timing)
        .flatMap(d => sources(s, d, actor).filter(source => source.kind === 'CARD').map(source => ({ d, source, actor })))
      const matches = e.type === 'MAIN_ENDED' ? observe('END_OF_YOUR_TURN', e.actorId!)
        // A DON!! of this player returned to its DON!! deck; an opposing [Blocker] activated (ST10-006).
        : e.type === 'DON_RETURNED' ? observe('ON_DON_RETURNED', e.actorId!)
        // Only the abilities captured for THIS event (one card can be named by several events of the same command).
        : [...eligible.filter(t => t.sequence === e.sequence && t.source.kind === 'CARD' && t.source.presence.instanceId === e.publicInstanceId),
          ...(e.type === 'BLOCKER_ACTIVATED' && r.version === '1.3.0' ? observe('ON_OPPONENT_BLOCKER', s.players.find(p => p.id !== s.instances[e.publicInstanceId!].controller)!.id) : []),
          // "when your opponent attacks": the defending player's observers (M6, OP09-001).
          ...(e.type === 'ATTACK_DECLARED' && r.version === '1.3.0' ? observe('ON_OPPONENT_ATTACK', s.players.find(p => p.id !== s.instances[e.publicInstanceId!].controller)!.id) : [])]
      enqueueTriggers(s, matches.filter(t => condition(s,t.d.condition,t.actor,t.source) && usable(s,t.d,t.source,t.actor)).map(t => makeTrigger(s,t.d,t.source,t.actor,causeId,false)), causeId)
    }
    drainScheduler(s); return
  }
  if (eligible.length > 1 || (eligible.length && r.choice)) throw new Error('SIMULTANEOUS_TRIGGER_ORDER_NOT_IMPLEMENTED')
  if (eligible.length) {
    const { d, source, actor } = eligible[0]
    if (!condition(s, d.condition, actor) || !payable(s, d, source)) return
    begin(s, d, source, actor); cardEvent(s, 'ON_PLAY_CAPTURED', source.kind === 'CARD' ? source.presence.instanceId : '', r.active!.context); resume(s)
  }
}
/** The chooser of the choice the continuation is waiting on, when the program names one ("your opponent chooses"). */
function chooserOf(s: GameState, c: import('./contracts').SerializableContinuation): string | undefined {
  const step = s.effects!.registry.definitions.find(d => d.id === c.definitionId)?.program[c.pc]
  return (step?.kind === 'CHOICE' || step?.kind === 'MODE') && step.chooser === 'OPPONENT' ? s.players.find(p => p.id !== c.context.controllerId)!.id : undefined
}
function cardsSelector(s: GameState, continuation: import('./contracts').SerializableContinuation): boolean {
  const step = s.effects!.registry.definitions.find(d => d.id === continuation.definitionId)!.program[continuation.pc]
  return step.kind === 'CHOICE' && step.selector.kind === 'CARDS'
}
function selectOwner(s: GameState, continuation: import('./contracts').SerializableContinuation, actor: string) {
  const step = s.effects!.registry.definitions.find(d => d.id === continuation.definitionId)!.program[continuation.pc]
  return step.kind === 'CHOICE' && (step.selector.kind === 'OPPONENT_CHARACTER' || step.selector.kind === 'OPPONENT_BLOCKER_COST_AT_MOST' || step.selector.kind === 'OPPONENT_RESTED_CHARACTER_COST_AT_MOST' || step.selector.kind === 'OPPONENT_TOP_LIFE') ? s.players.find(p => p.id !== actor)!.id : actor
}
function replacementOptions(s: GameState, ownerId: string, replacementId: string, protectedId?: string) {
  const rule = s.effects!.registry.cardReplacements!.find(d => d.id === replacementId)!
  const owner = s.players.find(p => p.id === ownerId)!
  // The protecting Character itself (any copy on the field other than the K.O.'d one).
  if (rule.match === 'NAMED_ALLY_KO_BY_EFFECT') return owner.zones.characters.filter(id => id !== protectedId && s.instances[id].definitionId === rule.definitionId)
  return owner.zones.hand.filter(id => rule.categories.some(category => category === s.catalog.definitions.find(d => d.definitionId === s.instances[id].definitionId)!.category))
}
/** Replacement rules for the K.O. by effect of `i`: its own, and those of allies protecting it by name. */
function koReplacementRules(s: GameState, i: GameState['instances'][string], source: EffectContext['source']) {
  const r = s.effects!, name = s.catalog.definitions.find(d => d.definitionId === i.definitionId)?.rulesName
  return (r.registry.cardReplacements ?? []).filter(rule => rule.match === 'NAMED_ALLY_KO_BY_EFFECT'
    ? rule.protectedName === name && replacementOptions(s, i.controller, rule.id, i.id).length > 0
    : rule.definitionId === i.definitionId && !r.usage[usageKey(rule.id, '1.1.0', source, i.controller, s.turn)] && replacementOptions(s, i.controller, rule.id).length > 0)
}
function commitKO(s: GameState, op: NonNullable<EffectRuntime['cardOperations']>[number], context: EffectContext) {
  const i = s.instances[op.subject.instanceId], p = s.players.find(p => p.id === i.owner)!
  if (i.zone !== 'characters' || i.zoneGeneration !== op.subject.generation) throw new Error('INVALID_KO_SUBJECT')
  const causeId = op.id
  const scheduled = ['1.2.0','1.3.0'].includes(s.effects!.version)
  const observers = scheduled ? s.effects!.registry.definitions.filter(d=>d.timing==='ON_CHARACTER_KO').flatMap(d=>s.players.flatMap(p=>sources(s,d,p.id).filter(()=>condition(s,d.condition,p.id)).map(source=>makeTrigger(s,d,source,p.id,causeId,false)))) : []
  const captured = scheduled ? s.effects!.registry.definitions.filter(d => d.timing === 'ON_KO' && d.source.kind === 'CARD_DEFINITION' && d.source.definitionId === i.definitionId && condition(s,d.condition,i.controller,{ kind: 'CARD', definitionId: i.definitionId!, presence: structuredClone(op.subject) })).map(d => makeTrigger(s,d,{ kind: 'CARD', definitionId: i.definitionId!, presence: structuredClone(op.subject) },i.controller,causeId,true)) : []
  // No On KO definitions are admitted in this version; never confuse a rule trash with KO.
  for (const id of [...p.zones.attached].filter(id => s.instances[id].attachedTo === i.id)) {
    const don = s.instances[id]; p.zones.attached.splice(p.zones.attached.indexOf(id), 1); p.zones.cost.push(id)
    don.zone = 'cost'; don.zoneGeneration++; don.rested = true; don.attachedTo = null
    if (['1.2.0','1.3.0'].includes(s.effects!.version)) recordOperation(s,{ id:next(s.effects!,s.gameId,'operation'), resolutionId:context.effectInstanceId, subject:{instanceId:id,generation:don.zoneGeneration-1},controllerId:context.controllerId,type:'MOVE_DON',intent:'RULE',outcome:'CONFIRMED',from:'attached',to:'cost' })
  }
  if (['1.2.0','1.3.0'].includes(s.effects!.version)) processOperation(s,{...op,type:'KO',intent:'EFFECT',outcome:'CONFIRMED',from:'characters',to:'trash'})
  else {
  p.zones.characters.splice(p.zones.characters.indexOf(i.id), 1); p.zones.trash.push(i.id)
  i.zone = 'trash'; i.zoneGeneration++; i.rested = false; i.playedOnTurn = null
  }
  op.outcome = 'CONFIRMED'; s.effects!.cardOperations!.push(op); cardEvent(s, 'CARD_KO', i.id, context)
  s.events.push({ sequence: s.events.length, type: 'CHARACTER_KO', actorId: context.controllerId, publicInstanceId: i.id })
  if (scheduled) { enqueueTriggers(s,[...captured,...observers],causeId) }
}

// Combat uses the same confirmed-KO boundary as declarative effects. Battle KOs
// are not effect KOs, so effect-only replacement rules are intentionally skipped.
export function confirmBattleKO(s: GameState, ref: { instanceId: string; generation: number }, attackerRef: { instanceId: string; generation: number }, battleId: string): boolean {
  const r = s.effects, target = s.instances[ref.instanceId], attacker = s.instances[attackerRef.instanceId]
  if (protectedFromKO(s, ref, 'BATTLE', attackerRef.instanceId)) return false
  if (!r || !['1.2.0','1.3.0'].includes(r.version) || !target || target.zone !== 'characters' || target.zoneGeneration !== ref.generation || !attacker?.definitionId || attacker.zoneGeneration !== attackerRef.generation) throw new Error('BATTLE_KO_PIPELINE_UNAVAILABLE')
  const context: EffectContext = { controllerId: attacker.controller, source: { kind: 'CARD', definitionId: attacker.definitionId, presence: structuredClone(attackerRef) }, effectInstanceId: battleId, turnId: s.turn, windowId: `${battleId}:damage` }
  const op: NonNullable<EffectRuntime['cardOperations']>[number] = { id: next(r, s.gameId, 'operation'), resolutionId: battleId, subject: structuredClone(ref), controllerId: attacker.controller, type: 'KO', outcome: 'CONFIRMED' }
  commitKO(s, op, context)
  drainScheduler(s)
  return true
}
/** "Cannot be K.O.'d" (M6): printed protections (in battle / by effects, with N field DON!!) and temporary ones this turn. */
export function protectedFromKO(s: GameState, ref: { instanceId: string; generation: number }, from: 'BATTLE' | 'EFFECT', attackerId?: string, effectControllerId?: string): boolean {
  const r = s.effects, i = s.instances[ref.instanceId]
  if (!r || r.version !== '1.3.0' || !i) return false
  if (r.koImmunities?.some(k => k.subject.instanceId === ref.instanceId && k.subject.generation === ref.generation && k.turnId === s.turn)) return true
  const p = s.players.find(x => x.id === i.controller)!
  const attackerIsLeader = !!attackerId && s.instances[attackerId]?.zone === 'leader'
  const attached = p.zones.attached.filter(id => s.instances[id].attachedTo === i.id).length
  return !!r.registry.koProtections?.some(k => k.definitionId === i.definitionId && k.from === from && i.zone === k.zone && (k.minimumFieldDon === undefined || p.zones.cost.length + p.zones.attached.length >= k.minimumFieldDon)
    && (!k.byLeaders || attackerIsLeader) && (k.minimumAttachedDon === undefined || attached >= k.minimumAttachedDon) && (k.maximumOwnLife === undefined || p.zones.life.length <= k.maximumOwnLife)
    && (!k.opponentEffectsOnly || (effectControllerId !== undefined && effectControllerId !== i.controller))
    && (!k.duringOpponentTurn || s.activePlayerId !== i.controller) && (k.whenOwnCharacterCostAtLeast === undefined || ownCharacterCostAtLeast(s, i.controller, k.whenOwnCharacterCostAtLeast)))
}
/** "If you do": the K.O. step's resultBinding collects each bound Character that was really K.O.'d (now in the trash). */
function recordKOResult(s: GameState, c: import('./contracts').SerializableContinuation, ref: { instanceId: string; generation: number }) {
  const step = s.effects!.registry.definitions.find(d => d.id === c.definitionId && d.revision === c.definitionRevision)!.program[c.pc]
  if (step.kind !== 'OPERATION' || step.operation.primitive !== 'koCharacter' || !step.operation.resultBinding) return
  const i = s.instances[ref.instanceId]
  if (i.zone === 'trash' && i.zoneGeneration === ref.generation + 1) (c.bindings[step.operation.resultBinding] ??= []).push({ instanceId: i.id, generation: i.zoneGeneration })
}
/** After an answered K.O. replacement: continue the batch, or leave the K.O. step. */
function advanceKO(s: GameState, c: import('./contracts').SerializableContinuation) {
  const step = s.effects!.registry.definitions.find(d => d.id === c.definitionId && d.revision === c.definitionRevision)!.program[c.pc]
  const refs = step.kind === 'OPERATION' && step.operation.primitive === 'koCharacter' ? c.bindings[step.operation.subjectBinding] ?? [] : []
  if (c.koCursor !== undefined && c.koCursor + 1 < refs.length) c.koCursor++
  else { delete c.koCursor; c.pc++ }
}
function resolveKO(s: GameState, ref: { instanceId: string; generation: number }, context: EffectContext, anySide = false): boolean {
  const r = s.effects!, i = s.instances[ref.instanceId]
  if (!i || i.zone !== 'characters' || i.zoneGeneration !== ref.generation || (!anySide && i.controller === context.controllerId)) throw new Error('INVALID_KO_SUBJECT')
  if (protectedFromKO(s, ref, 'EFFECT', undefined, context.controllerId)) return true // nothing happens to a Character that cannot be K.O.'d
  const op: NonNullable<EffectRuntime['cardOperations']>[number] = { id: next(r, s.gameId, 'operation'), resolutionId: context.effectInstanceId, subject: structuredClone(ref), controllerId: context.controllerId, type: 'KO', outcome: 'PROPOSED' }
  const source: EffectContext['source'] = { kind: 'CARD', definitionId: i.definitionId!, presence: structuredClone(ref) }
  const rules = koReplacementRules(s, i, source)
  const leaders = leaderReplacementCandidates(s, i.id)
  if (rules.length + leaders.length > 1) throw new Error('REPLACEMENT_ORDER_NOT_IMPLEMENTED')
  if (leaders.length) { suspendLeaderReplacement(s,op,context,leaders[0]); return false }
  if (!rules.length) { commitKO(s, op, context); return true }
  const rule = rules[0], c = r.continuation!, choiceId = next(r, s.gameId, 'choice')
  c.interception = { operation: op, replacementId: rule.id, ownerId: i.controller }
  r.choice = { id: choiceId, actorId: i.controller, expectedVersion: s.version + 1, choiceType: 'SELECT', optional: true, min: 0, max: 1, visibility: 'PRIVATE',
    options: replacementOptions(s, i.controller, rule.id, i.id).map((id, index) => ({ token: `${choiceId}:option:${index}`, presence: { instanceId: id, generation: s.instances[id].zoneGeneration } })),
    continuationId: c.id, context: structuredClone(context), bind: '__replacement' }
  r.active!.status = 'SUSPENDED'; return false
}
function answerReplacement(s: GameState, refs: { instanceId: string; generation: number }[]) {
  const r = s.effects!, c = r.continuation!, choice = r.choice!, pending = c.interception!, op = pending.operation
  if (r.registry.leaderReplacements?.some(rule=>rule.id===pending.replacementId)) { answerLeaderReplacement(s,refs); return }
  assertReplacementChoice(s, false)
  if (refs.length) {
    const ref = refs[0], i = s.instances[ref.instanceId], p = s.players.find(p => p.id === pending.ownerId)!
    const rule = r.registry.cardReplacements!.find(d => d.id === pending.replacementId)!, ally = rule.match === 'NAMED_ALLY_KO_BY_EFFECT'
    if (!i || i.zone !== (ally ? 'characters' : 'hand') || i.zoneGeneration !== ref.generation || i.owner !== p.id || !replacementOptions(s, p.id, pending.replacementId, op.subject.instanceId).includes(i.id)) throw new Error('INVALID_CHOICE_RESPONSE')
    if (ally) {
      // Trashing the protecting Character is not a K.O.; its given DON!! return rested to the cost area.
      for (const don of p.zones.attached.filter(id => s.instances[id].attachedTo === i.id)) { p.zones.attached.splice(p.zones.attached.indexOf(don), 1); p.zones.cost.push(don); const d = s.instances[don]; d.zone = 'cost'; d.zoneGeneration++; d.attachedTo = null; d.rested = true }
      p.zones.characters.splice(p.zones.characters.indexOf(i.id), 1); p.zones.trash.push(i.id); i.zone = 'trash'; i.zoneGeneration++; i.faceUp = true; i.rested = false; i.playedOnTurn = null
      s.events.push({ sequence: s.events.length, type: 'CARD_TRASHED', actorId: p.id, publicInstanceId: i.id })
    } else { p.zones.hand.splice(p.zones.hand.indexOf(i.id), 1); p.zones.trash.push(i.id); i.zone = 'trash'; i.zoneGeneration++; i.faceUp = true; i.rested = false }
    op.outcome = 'REPLACED'; op.replacementId = pending.replacementId; r.cardOperations!.push(op)
    r.cardOperations!.push({ id: next(r, s.gameId, 'operation'), resolutionId: op.resolutionId, subject: structuredClone(ref), controllerId: p.id, type: ally ? 'TRASH_CHARACTER' : 'TRASH_HAND', outcome: 'CONFIRMED', replacementId: pending.replacementId })
    const subject = s.instances[op.subject.instanceId], source: EffectContext['source'] = { kind: 'CARD', definitionId: subject.definitionId!, presence: structuredClone(op.subject) }
    if (!ally) r.usage[usageKey(pending.replacementId, '1.1.0', source, p.id, s.turn)] = 1
    const replacementContext = { ...c.context, controllerId: p.id, source }
    if (!ally) cardEvent(s, 'HAND_CARD_TRASHED', i.id, replacementContext)
    cardEvent(s, 'KO_REPLACED', subject.id, replacementContext)
  } else { commitKO(s, op, c.context); recordKOResult(s, c, op.subject) }
  r.choiceHistory.push({ choiceId: choice.id, actorId: choice.actorId, tokens: refs.map(ref => choice.options.find(o => o.presence.instanceId === ref.instanceId)!.token), visibility: 'PRIVATE' })
  delete c.interception; r.choice = null; advanceKO(s, c)
}
function assertReplacementChoice(s: GameState, checkVersion = true) {
  const r = s.effects!, c = r.continuation!, pending = c.interception!, choice = r.choice!
  if (r.registry.leaderReplacements?.some(rule=>rule.id===pending.replacementId)) { assertLeaderReplacement(s,checkVersion); return }
  const rule = r.registry.cardReplacements?.find(d => d.id === pending.replacementId), subject = s.instances[pending.operation.subject.instanceId]
  const d = r.registry.definitions.find(d => d.id === c.definitionId)!, step = d.program[c.pc]
  const subjectName = subject && s.catalog.definitions.find(x => x.definitionId === subject.definitionId)?.rulesName
  if (!rule || !subject || subject.zone !== 'characters' || subject.zoneGeneration !== pending.operation.subject.generation
    || (rule.match === 'NAMED_ALLY_KO_BY_EFFECT' ? rule.protectedName !== subjectName : subject.definitionId !== rule.definitionId) || subject.controller !== pending.ownerId
    || (rule.match === 'SELF_KO_BY_EFFECT' && r.usage[usageKey(rule.id, '1.1.0', { kind: 'CARD', definitionId: subject.definitionId!, presence: pending.operation.subject }, pending.ownerId, s.turn)])
    || pending.operation.controllerId !== c.context.controllerId || pending.operation.resolutionId !== c.context.effectInstanceId || pending.operation.type !== 'KO' || pending.operation.outcome !== 'PROPOSED'
    || step.kind !== 'OPERATION' || step.operation.primitive !== 'koCharacter' || !c.bindings[step.operation.subjectBinding]?.some(ref => ref.instanceId === subject.id && ref.generation === subject.zoneGeneration)
    || choice.actorId !== pending.ownerId || choice.bind !== '__replacement' || choice.visibility !== 'PRIVATE' || choice.min !== 0 || choice.max !== 1 || !choice.optional || choice.choiceType !== 'SELECT'
    || (checkVersion && choice.expectedVersion !== pendingVersion(s)) || JSON.stringify(choice.options.map(o => o.presence.instanceId)) !== JSON.stringify(replacementOptions(s, pending.ownerId, pending.replacementId, pending.operation.subject.instanceId))
    || new Set(choice.options.map(o => o.token)).size !== choice.options.length || choice.options.some(o => s.instances[o.presence.instanceId]?.zoneGeneration !== o.presence.generation)) throw new Error('INVALID_REPLACEMENT_CHOICE')
}
export type { EffectRegistry }



function makeTrigger(s: GameState, d: import('./contracts').EffectDefinition, source: EffectContext['source'], controllerId: string, causeId: string, activatedOnField: boolean): import('./contracts').ScheduledTrigger {
  if (d.timing === 'MAIN' || d.timing === 'ACTIVATE_MAIN' || d.timing === 'COUNTER') throw new Error('INVALID_AUTOMATIC_TIMING')
  return { id: next(s.effects!,s.gameId,'trigger'), definitionId:d.id, revision:d.revision, controllerId, source:structuredClone(source), causeId, timing:d.timing, status:'PENDING', activatedOnField,
    ...(activatedOnField && source.kind === 'CARD' ? { expectedTrashGeneration:source.presence.generation+1 } : {}) }
}
function validActivatedKO(s: GameState, source: EffectContext['source']): boolean {
  if (source.kind !== 'CARD') return false
  const q=s.effects!.scheduler, t=q?.batches.flatMap(b=>b.triggers).find(t=>t.id===q.resolvingId), i=s.instances[source.presence.instanceId]
  return !!t && t.activatedOnField && t.timing==='ON_KO' && t.status==='RESOLVING' && JSON.stringify(t.source)===JSON.stringify(source) && i.zone==='trash' && i.zoneGeneration===t.expectedTrashGeneration && !!s.effects!.cardOperations?.some(o=>o.id===t.causeId && o.type==='KO' && o.outcome==='CONFIRMED' && JSON.stringify(o.subject)===JSON.stringify(source.presence))
}
/** "until the end of your opponent's next turn" (exclusive turn): activated on the opponent's turn, it ends with that turn
 * (FAQ ST21-015). */
function untilEndOfOpponentNextTurn(s: GameState, controllerId: string): number { return s.turn + (s.activePlayerId === controllerId ? 2 : 1) }
/** M6: an ability whose cost returned its own source to its owner's hand ("You may return this Character to the owner's
 * hand: ...") keeps resolving; the move must be a confirmed MOVE_CARD of this resolution on exactly that presence. */
function validSelfReturnedSource(s: GameState, source: EffectContext['source'], resolutionId: string): boolean {
  if (source.kind !== 'CARD') return false
  const instance = s.instances[source.presence.instanceId]
  return instance.zone === 'hand' && instance.zoneGeneration === source.presence.generation + 1
    && !!s.effects?.operations?.some(o => o.resolutionId === resolutionId && o.type === 'MOVE_CARD' && o.outcome === 'CONFIRMED' && o.to === 'hand'
      && o.subject.instanceId === instance.id && o.subject.generation === source.presence.generation)
}
function validActivatedMainEvent(s: GameState, source: EffectContext['source'], resolutionId: string): boolean {
  if (source.kind !== 'CARD') return false
  const definition = s.catalog.definitions.find(d => d.definitionId === source.definitionId)
  const instance = s.instances[source.presence.instanceId]
  return definition?.category === 'EVENT' && definition.cost !== null && definition.cost >= 0
    && instance.zone === 'trash' && instance.zoneGeneration === source.presence.generation + 1
    && !!s.effects?.cardEvents?.some(event => event.type === 'EVENT_ACTIVATED' && event.subjectId === instance.id && event.resolutionId === resolutionId && event.controllerId === instance.controller)
}
function activateScheduled(s: GameState, triggerId: string) {
  const r=s.effects!, q=r.scheduler!, t=q.batches.flatMap(b=>b.triggers).find(t=>t.id===triggerId)
  if (!t || t.status!=='PENDING') throw new Error('INVALID_TRIGGER_CHOICE')
  const d=r.registry.definitions.find(d=>d.id===t.definitionId && d.revision===t.revision)!
  const source=t.source, i=source.kind==='CARD' ? s.instances[source.presence.instanceId] : undefined
  if (!i || source.kind!=='CARD' || (t.activatedOnField ? i.zone!=='trash' || i.zoneGeneration!==t.expectedTrashGeneration : i.zoneGeneration!==source.presence.generation || d.source.kind!=='CARD_DEFINITION' || i.zone!==d.source.zone) || (d.usage.kind!=='UNLIMITED' && r.usage[usageKey(d.id,d.revision,source,t.controllerId,s.turn)]) || !payable(s,d,source)) { t.status='INVALIDATED'; return }
  t.status='RESOLVING'; q.resolvingId=t.id; begin(s,d,source,t.controllerId)
  if (r.active!.status!=='COMPLETED') resume(s)
}
function finishScheduled(s: GameState) {
  const r = s.effects!, q = r.scheduler!, trigger = q.resolvingId ? q.batches.flatMap(b => b.triggers).find(t => t.id === q.resolvingId) : undefined
  if (trigger?.timing === 'TRIGGER' && trigger.source.kind === 'CARD') {
    const instance = s.instances[trigger.source.presence.instanceId], owner = s.players.find(p => p.id === instance.owner)!
    if (instance.zone === 'temporary' && instance.zoneGeneration === trigger.source.presence.generation) {
      owner.zones.temporary.splice(owner.zones.temporary.indexOf(instance.id), 1); owner.zones.trash.push(instance.id)
      instance.zone = 'trash'; instance.zoneGeneration++; instance.faceUp = true
      s.events.push({ sequence: s.events.length, type: 'CARD_TRASHED', actorId: owner.id, publicInstanceId: instance.id })
    } else if (instance.zoneGeneration !== trigger.source.presence.generation + 1 || !((['characters', 'stage'].includes(instance.zone) && s.events.some(event => event.type === 'CARD_PLAYED' && event.publicInstanceId === instance.id))
      || (instance.zone === 'hand' && s.effects!.operations?.some(o => o.type === 'MOVE_CARD' && o.from === 'temporary' && o.to === 'hand' && o.subject.instanceId === instance.id && o.outcome === 'CONFIRMED')))) throw new Error('TRIGGER_SOURCE_MOVED_DURING_RESOLUTION')
  }
  completeScheduledTrigger(q)
}
function drainScheduler(s: GameState) {
  const r=s.effects!, q=r.scheduler!
  if (r.choice || q.orderChoice) return
  if (q.resolvingId) {
    if (r.active?.status !== 'COMPLETED' || r.continuation) return
    finishScheduled(s)
  }
  // Finite bound is a technical refusal, never a fabricated game result.
  for (let budget=0;budget<1024;budget++) {
    const eligible=nextTriggers(q)
    if (!eligible.length) return
    if (eligible.length>1) {
      const choiceId=next(r,s.gameId,'order')
      q.orderChoice={id:choiceId,actorId:eligible[0].controllerId,expectedVersion:s.version+1,batchId:q.batches[0].id,options:eligible.map((t,index)=>({token:`${choiceId}:option:${index}`,triggerId:t.id}))}; return
    }
    activateScheduled(s,eligible[0].id)
    if (r.choice) return
    finishScheduled(s)
  }
  throw new Error('RESOLUTION_BUDGET_EXCEEDED')
}
function assertScheduler(s: GameState) {
 const r=s.effects!, q=r.scheduler
 if (!q || !r.operations || !r.payments) throw new Error('INVALID_SCHEDULER')
 const all=[...q.history,...q.batches.flatMap(b=>b.triggers)]
 if (q.history.some(t=>!['RESOLVED','INVALIDATED'].includes(t.status)) || q.batches.some(b=>b.activePlayerId!==s.activePlayerId || b.triggers.some(t=>t.causeId!==b.id))) throw new Error('INVALID_TRIGGER_BATCH')
 if (q.batches.some(b=>b.triggers.some(t=>t.status==='PENDING')) && !q.orderChoice && !r.choice) throw new Error('UNSUSPENDED_TRIGGER_QUEUE')
 if (new Set(all.map(t=>t.id)).size!==all.length || new Set(q.batches.map(b=>b.id)).size!==q.batches.length) throw new Error('DUPLICATE_TRIGGER')
 for (const t of all) {
  const d=r.registry.definitions.find(d=>d.id===t.definitionId && d.revision===t.revision), source=t.source
  if (!d || source.kind!=='CARD' || d.source.kind!=='CARD_DEFINITION' || d.source.definitionId!==source.definitionId || s.instances[source.presence.instanceId]?.definitionId!==source.definitionId || !s.players.some(p=>p.id===t.controllerId) || s.instances[source.presence.instanceId].controller!==t.controllerId || t.timing!==d.timing) throw new Error('INVALID_TRIGGER')
  if (t.activatedOnField && (t.timing!=='ON_KO' || t.expectedTrashGeneration!==source.presence.generation+1 || !r.cardOperations!.some(o=>o.id===t.causeId && o.outcome==='CONFIRMED' && o.type==='KO' && JSON.stringify(o.subject)===JSON.stringify(source.presence)))) throw new Error('INVALID_KO_CAPTURE')
  if (!t.activatedOnField && t.timing === 'END_OF_YOUR_TURN' && !s.events.some(e => e.type === 'MAIN_ENDED' && `${s.gameId}:event:${e.sequence}` === t.causeId && e.actorId === t.controllerId)) throw new Error('INVALID_TRIGGER_CAUSE')
  if (!t.activatedOnField && t.timing === 'ON_BATTLE_PAIRED' && !s.events.some(e => e.type === 'BATTLE_PAIRED' && `${s.gameId}:event:${e.sequence}` === t.causeId && e.publicInstanceId === source.presence.instanceId)) throw new Error('INVALID_TRIGGER_CAUSE')
  if (!t.activatedOnField && t.timing === 'ON_DON_RETURNED' && !s.events.some(e => e.type === 'DON_RETURNED' && `${s.gameId}:event:${e.sequence}` === t.causeId && e.actorId === t.controllerId)) throw new Error('INVALID_TRIGGER_CAUSE')
  if (!t.activatedOnField && t.timing === 'ON_OPPONENT_ATTACK' && !s.events.some(e => e.type === 'ATTACK_DECLARED' && `${s.gameId}:event:${e.sequence}` === t.causeId && e.publicInstanceId && s.instances[e.publicInstanceId].controller !== t.controllerId)) throw new Error('INVALID_TRIGGER_CAUSE')
  if (!t.activatedOnField && t.timing === 'ON_OPPONENT_BLOCKER' && !s.events.some(e => e.type === 'BLOCKER_ACTIVATED' && `${s.gameId}:event:${e.sequence}` === t.causeId && e.publicInstanceId && s.instances[e.publicInstanceId].owner !== t.controllerId)) throw new Error('INVALID_TRIGGER_CAUSE')
  if (!t.activatedOnField && t.timing === 'END_OF_BATTLE_WITH_CHARACTER' && !s.events.some(e => e.type === 'CHARACTER_BATTLED' && `${s.gameId}:event:${e.sequence}` === t.causeId && e.publicInstanceId === source.presence.instanceId)) throw new Error('INVALID_TRIGGER_CAUSE')
  if (!t.activatedOnField && ['ON_PLAY','WHEN_ATTACKING','ON_BLOCK','WHEN_ATTACKING_OR_ON_BLOCK','TRIGGER'].includes(t.timing)) {
   if (t.timing === 'TRIGGER') {
    if (!s.events.some(e => e.type === 'TRIGGER_ACTIVATED' && `${s.gameId}:event:${e.sequence}` === t.causeId && e.publicInstanceId === source.presence.instanceId)) throw new Error('INVALID_TRIGGER_CAUSE')
   } else {
   const expected = t.timing === 'ON_PLAY' ? ['CARD_PLAYED'] : t.timing === 'WHEN_ATTACKING' ? ['ATTACK_DECLARED'] : t.timing === 'ON_BLOCK' ? ['BLOCKER_ACTIVATED'] : ['ATTACK_DECLARED','BLOCKER_ACTIVATED']
   const causePrefix = t.timing === 'ON_PLAY' ? 'played' : 'event'
   if (!s.events.some(e=>expected.includes(e.type) && `${s.gameId}:${causePrefix}:${e.sequence}`===t.causeId && e.publicInstanceId===source.presence.instanceId)) throw new Error('INVALID_TRIGGER_CAUSE')
   }
  }
  if (t.timing==='ON_CHARACTER_KO' && !r.cardOperations!.some(o=>o.id===t.causeId && o.type==='KO' && o.outcome==='CONFIRMED')) throw new Error('INVALID_TRIGGER_CAUSE')
 if (!t.activatedOnField && !['ON_PLAY','ON_CHARACTER_KO','WHEN_ATTACKING','ON_BLOCK','WHEN_ATTACKING_OR_ON_BLOCK','TRIGGER','END_OF_YOUR_TURN','END_OF_BATTLE_WITH_CHARACTER','ON_BATTLE_PAIRED','ON_DON_RETURNED','ON_OPPONENT_BLOCKER','ON_OPPONENT_ATTACK'].includes(t.timing)) throw new Error('INVALID_TRIGGER')
 }
 const resolving=all.filter(t=>t.status==='RESOLVING')
 if (resolving.length!==(q.resolvingId?1:0) || (q.resolvingId && (resolving[0].id!==q.resolvingId || r.active?.definitionId!==resolving[0].definitionId || JSON.stringify(r.active.context.source)!==JSON.stringify(resolving[0].source)))) throw new Error('INVALID_TRIGGER_RESOLUTION')
 if (q.orderChoice) {
  const order=q.orderChoice, eligible=nextTriggers(structuredClone(q))
  if (r.choice || r.continuation || q.resolvingId || order.expectedVersion!==pendingVersion(s) || order.batchId!==q.batches[0]?.id || order.actorId!==eligible[0]?.controllerId || eligible.length<2 || JSON.stringify(order.options.map(o=>o.triggerId))!==JSON.stringify(eligible.map(t=>t.id)) || new Set(order.options.map(o=>o.token)).size!==order.options.length) throw new Error('INVALID_ORDER_CHOICE')
 }
 if (r.operations.some(o=>!s.instances[o.subject.instanceId] || !s.players.some(p=>p.id===o.controllerId)) || new Set(r.operations.map(o=>o.id)).size!==r.operations.length) throw new Error('INVALID_UNIFIED_OPERATION')
}
function leaderReplacementCandidates(s: GameState, subjectId: string) {
 const r=s.effects!, i=s.instances[subjectId], p=s.players.find(p=>p.id===i.controller)!
 if (r.version!=='1.2.0' || s.activePlayerId===p.id) return []
 const leader=s.instances[p.zones.leader[0]], source:EffectContext['source']={kind:'CARD',definitionId:leader.definitionId!,presence:{instanceId:leader.id,generation:leader.zoneGeneration}}
 return (r.registry.leaderReplacements??[]).filter(rule=>rule.definitionId===leader.definitionId && p.zones.attached.filter(id=>s.instances[id].attachedTo===leader.id).length>=rule.minimumAttachedDon && (evaluateCharacteristics(s,i.id).power.current ?? -Infinity)>=rule.minimumPower && !r.usage[usageKey(rule.id,'1.2.0',source,p.id,s.turn)])
}
function suspendLeaderReplacement(s:GameState,op:NonNullable<EffectRuntime['cardOperations']>[number],context:EffectContext,rule:NonNullable<EffectRegistry['leaderReplacements']>[number]) {
 const r=s.effects!, c=r.continuation!, i=s.instances[op.subject.instanceId], id=next(r,s.gameId,'choice')
 c.interception={operation:op,replacementId:rule.id,ownerId:i.controller}
 r.choice={id,actorId:i.controller,expectedVersion:s.version+1,choiceType:'SELECT',optional:true,min:0,max:1,visibility:'PRIVATE',options:[{token:`${id}:option:0`,presence:structuredClone(op.subject)}],continuationId:c.id,context:structuredClone(context),bind:'__replacement'}
 r.active!.status='SUSPENDED'
}
function assertLeaderReplacement(s:GameState,checkVersion=true) {
 const r=s.effects!, c=r.continuation!, pending=c.interception!, choice=r.choice!, op=pending.operation
 const i=s.instances[op.subject.instanceId], candidates=leaderReplacementCandidates(s,i.id), step=r.registry.definitions.find(d=>d.id===c.definitionId)!.program[c.pc]
 if (candidates.length!==1 || candidates[0].id!==pending.replacementId || i.zone!=='characters' || i.zoneGeneration!==op.subject.generation || pending.ownerId!==i.controller || op.type!=='KO' || op.outcome!=='PROPOSED' || op.controllerId!==c.context.controllerId || op.resolutionId!==c.context.effectInstanceId || step.kind!=='OPERATION' || step.operation.primitive!=='koCharacter' || !c.bindings[step.operation.subjectBinding]?.some(ref=>ref.instanceId===i.id && ref.generation===i.zoneGeneration) || choice.actorId!==i.controller || choice.bind!=='__replacement' || choice.visibility!=='PRIVATE' || choice.choiceType!=='SELECT' || !choice.optional || choice.min!==0 || choice.max!==1 || choice.options.length!==1 || JSON.stringify(choice.options[0].presence)!==JSON.stringify(op.subject) || (checkVersion && choice.expectedVersion!==pendingVersion(s))) throw new Error('INVALID_REPLACEMENT_CHOICE')
}
function answerLeaderReplacement(s:GameState,refs:{instanceId:string;generation:number}[]) {
 assertLeaderReplacement(s,false)
 const r=s.effects!,c=r.continuation!,pending=c.interception!,choice=r.choice!,op=pending.operation,rule=r.registry.leaderReplacements!.find(rule=>rule.id===pending.replacementId)!
 if (refs.length) {
  if (refs.length!==1 || JSON.stringify(refs[0])!==JSON.stringify(op.subject)) throw new Error('INVALID_CHOICE_RESPONSE')
  const p=s.players.find(p=>p.id===pending.ownerId)!,leader=s.instances[p.zones.leader[0]],source:EffectContext['source']={kind:'CARD',definitionId:leader.definitionId!,presence:{instanceId:leader.id,generation:leader.zoneGeneration}},context={...c.context,controllerId:p.id,source}
  confirmPower(s,op.subject,rule.amount,context)
  op.outcome='REPLACED';op.replacementId=rule.id;r.cardOperations!.push(op);recordOperation(s,{...op,type:'KO',intent:'EFFECT',outcome:'REPLACED'})
  r.usage[usageKey(rule.id,'1.2.0',source,p.id,s.turn)]=1;cardEvent(s,'KO_REPLACED',op.subject.instanceId,context)
 } else { commitKO(s,op,c.context); recordKOResult(s,c,op.subject) }
 r.choiceHistory.push({choiceId:choice.id,actorId:choice.actorId,tokens:refs.length?[choice.options[0].token]:[],visibility:'PRIVATE'})
 delete c.interception;r.choice=null;advanceKO(s,c)
}
