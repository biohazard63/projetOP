import { evaluateCharacteristics, hasBlockerAbility, hasCombatKeyword } from '../effects/characteristics'
import { confirmMoveOperation, confirmRestOperation, confirmPower, processOperation } from '../effects/operations'
import { activateCounterProgram, applyBattleGuard, battleKoReplacement, confirmBattleKO, protectedFromKO } from '../effects/runtime'
import type { BattleState, Command, GameState, LegalAction } from './types'

const samePresence = (state: GameState, ref: BattleState['attacker']) => {
  const instance = state.instances[ref.instanceId]
  return !!instance && instance.zoneGeneration === ref.generation
}

/** M6 "cannot attack until the end of your opponent's next turn" (same presence, before untilTurn). */
function attackProhibited(state: GameState, id: string): boolean {
  const i = state.instances[id]
  if (state.effects?.attackRestrictions?.some(r => r.subject.instanceId === id && r.subject.generation === i.zoneGeneration && state.turn < r.untilTurn)) return true
  // Printed prohibitions: of the card itself, or of all Characters in a cost range while the source is on the field.
  const rules = state.effects?.registry.attackProhibitions ?? []
  if (!rules.length) return false
  const leaderName = (playerId: string) => { const p = state.players.find(x => x.id === playerId)!; return state.catalog.definitions.find(d => d.definitionId === state.instances[p.zones.leader[0]]?.definitionId)?.rulesName }
  return rules.some(rule => {
    if (rule.self) return i.zone === 'characters' && i.definitionId === rule.definitionId && (!rule.leaderName || leaderName(i.controller) === rule.leaderName)
    const cost = i.zone === 'characters' ? evaluateCharacteristics(state, id).cost.current : null
    if (cost === null || cost < rule.all!.minCost || cost > rule.all!.maxCost) return false
    return state.players.some(p => p.zones.characters.some(c => state.instances[c].definitionId === rule.definitionId) && (!rule.leaderName || leaderName(p.id) === rule.leaderName))
  })
}
function blockerIsProhibited(state: GameState, battle: BattleState, blockerId: string): boolean {
  const b = state.instances[blockerId]
  if (state.effects?.blockerDisables?.some(d => d.subject.instanceId === blockerId && d.subject.generation === b?.zoneGeneration && d.turnId === state.turn)) return true
  return (state.effects?.blockerRestrictions ?? []).some(restriction => {
    if (restriction.subject.instanceId !== battle.attacker.instanceId || restriction.subject.generation !== battle.attacker.generation) return false
    if (restriction.scope === 'BATTLE' && restriction.battleId !== battle.id) return false
    if (restriction.scope === 'TURN' && restriction.turnId !== state.turn) return false
    if (restriction.minimumBlockerPower === undefined) return true
    const power = evaluateCharacteristics(state, blockerId).power.current
    return power !== null && power >= restriction.minimumBlockerPower
  })
}

export function combatActions(state: GameState, actorId: string): LegalAction[] {
  if (state.scope !== 'BASIC_TURNS' || state.result || state.phase !== 'MAIN' || state.effects?.choice || state.effects?.scheduler?.orderChoice) return []
  if (state.battle) {
    const battle = state.battle
    if (battle.step === 'LIFE_TRIGGER' && battle.pendingLifeTrigger) return actorId === battle.pendingLifeTrigger.actorId
      ? [{ type: 'ANSWER_TRIGGER', choiceId: battle.pendingLifeTrigger.id, choices: [false, true] }] : []
    if (battle.step === 'LIFE_CONTINUE') return actorId === battle.attackerControllerId ? [{ type: 'CONTINUE_LIFE_DAMAGE', battleId: battle.id }] : []
    if (battle.step === 'KO_REPLACEMENT') {
      const pending = battle.pendingReplacement!
      if (actorId !== pending.actorId) return []
      // A Life option is named by its position only (hidden zone); other options by their card.
      const owner = state.players.find(p => p.id === pending.actorId)!
      return [{ type: 'ANSWER_CHOICE', choiceId: pending.id, choiceType: 'SELECT', optional: true, min: 0, max: 1, options: pending.options.map(o => state.instances[o.presence.instanceId].zone === 'life'
        ? { token: o.token, slot: { kind: owner.zones.life[0] === o.presence.instanceId ? 'LIFE_TOP' as const : 'LIFE_BOTTOM' as const, ownerId: owner.id } } : { token: o.token, instanceId: o.presence.instanceId }) }]
    }
    if (battle.step === 'BLOCKER' && actorId === battle.defenderId) {
      const defender = state.players.find(p => p.id === actorId)!
      const unblockable = hasCombatKeyword(state, battle.attacker.instanceId, 'UNBLOCKABLE')
      const blockerIds = battle.blockersUsed === 0 && !unblockable ? defender.zones.characters.filter(id => id !== battle.target.instanceId && !state.instances[id].rested
        && hasBlockerAbility(state, id)
        && !blockerIsProhibited(state, battle, id)) : []
      return [...(blockerIds.length ? [{ type: 'ACTIVATE_BLOCKER' as const, blockerIds, battleId: battle.id }] : []), { type: 'PASS_BLOCKER', battleId: battle.id }]
    }
    if (battle.step === 'COUNTER' && actorId === battle.defenderId) {
      const defender = state.players.find(p => p.id === actorId)!
      const cardIds = defender.zones.hand.filter(id => {
        const card = state.catalog.definitions.find(d => d.definitionId === state.instances[id].definitionId)
        return card?.category === 'CHARACTER' && card.counter !== null
      })
      const targetIds = [...defender.zones.leader, ...defender.zones.characters]
      const availableDonIds = defender.zones.cost.filter(id => !state.instances[id].rested)
      const eventIds = defender.zones.hand.filter(id => {
        const card = state.catalog.definitions.find(d => d.definitionId === state.instances[id].definitionId)
        return card?.category === 'EVENT' && !!card.review.counterEvent && availableDonIds.length >= card.review.counterEvent.printedCost
      })
      const donMinusIds = [...defender.zones.cost, ...defender.zones.attached]
      return [
        ...(cardIds.length ? [{ type: 'PLAY_COUNTER_CHARACTER' as const, cardIds, targetIds, battleId: battle.id }] : []),
        ...(eventIds.length ? [{ type: 'PLAY_COUNTER_EVENT' as const, eventIds, targetIds, paymentDonIds: availableDonIds, donMinusIds, battleId: battle.id }] : []),
        { type: 'PASS_COUNTER', battleId: battle.id },
      ]
    }
    return battle.step === 'DAMAGE' && actorId === battle.attackerControllerId ? [{ type: 'RESOLVE_BATTLE', battleId: battle.id }] : []
  }
  if (actorId !== state.activePlayerId || state.players.find(p => p.id === actorId)?.turns === 1) return []
  const attacker = state.players.find(p => p.id === actorId)!
  const defender = state.players.find(p => p.id !== actorId)!
  const eligibleAttacker = (id: string) => {
    const card = state.instances[id]
    const rush = hasCombatKeyword(state, id, 'RUSH') || hasCombatKeyword(state, id, 'RUSH_CHARACTER')
    return !card.rested && (card.playedOnTurn !== state.turn || card.zone === 'leader' || rush) && !attackProhibited(state, id)
  }
  const attackerIds = [...attacker.zones.leader, ...attacker.zones.characters].filter(eligibleAttacker)
  const targetIds = [...defender.zones.leader, ...defender.zones.characters.filter(id => state.instances[id].rested)]
  // "This Character can also attack your opponent's active Characters" (M6 conditional keyword).
  const allTargets = [...defender.zones.leader, ...defender.zones.characters]
  const legalPairs = attackerIds.map(id => {
    const base = hasCombatKeyword(state, id, 'ATTACK_ACTIVE_CHARACTERS') ? allTargets : targetIds
    return { attackerId: id, targetIds: hasCombatKeyword(state, id, 'RUSH_CHARACTER') ? base.filter(targetId => state.instances[targetId].zone === 'characters') : base }
  }).filter(pair => pair.targetIds.length)
  return legalPairs.length ? [{ type: 'DECLARE_ATTACK', attackerIds: legalPairs.map(p => p.attackerId), targetIds: [...new Set(legalPairs.flatMap(p => p.targetIds))], targetIdsByAttacker: Object.fromEntries(legalPairs.map(pair => [pair.attackerId, pair.targetIds])) }] : []
}

export function applyCombatCommand(state: GameState, command: Extract<Command, { type: 'DECLARE_ATTACK' | 'ACTIVATE_BLOCKER' | 'PASS_BLOCKER' | 'PLAY_COUNTER_CHARACTER' | 'PLAY_COUNTER_EVENT' | 'PASS_COUNTER' | 'RESOLVE_BATTLE' | 'CONTINUE_LIFE_DAMAGE' | 'ANSWER_TRIGGER' | 'ANSWER_CHOICE' }>): void {
  if (command.type === 'DECLARE_ATTACK') {
    if (state.battle || state.scope !== 'BASIC_TURNS' || state.phase !== 'MAIN' || command.actorId !== state.activePlayerId) throw new Error('INVALID_ATTACK_WINDOW')
    const attacker = state.instances[command.attackerId]
    const target = state.instances[command.targetId]
    const attackerOwner = state.players.find(p => p.id === command.actorId)!
    const defender = state.players.find(p => p.id !== command.actorId)!
    const rush = attacker && (hasCombatKeyword(state, attacker.id, 'RUSH') || hasCombatKeyword(state, attacker.id, 'RUSH_CHARACTER'))
    const rushCharacter = attacker && hasCombatKeyword(state, attacker.id, 'RUSH_CHARACTER')
    if (!attacker || attacker.controller !== command.actorId || !['leader', 'characters'].includes(attacker.zone) || attacker.rested
      || (attacker.zone === 'characters' && attacker.playedOnTurn === state.turn && !rush) || attackProhibited(state, attacker.id)) throw new Error('INVALID_ATTACKER')
    if (!attackerOwner.zones[attacker.zone].includes(attacker.id)) throw new Error('INVALID_ATTACKER')
    if (!target || target.controller !== defender.id || !['leader', 'characters'].includes(target.zone) || (target.zone === 'characters' && !target.rested && !hasCombatKeyword(state, attacker.id, 'ATTACK_ACTIVE_CHARACTERS'))
      || (rushCharacter && target.zone !== 'characters')) throw new Error('INVALID_ATTACK_TARGET')
    const battleId = `${state.gameId}:battle:${state.version}`
    if (state.effects && ['1.2.0','1.3.0'].includes(state.effects.version)) {
      if (!confirmRestOperation(state, { instanceId: attacker.id, generation: attacker.zoneGeneration }, command.actorId, battleId, 'RULE')) throw new Error('ATTACKER_REST_PREVENTED')
    } else attacker.rested = true
    state.battle = { id: battleId, step: 'BLOCKER', attacker: { instanceId: attacker.id, generation: attacker.zoneGeneration }, attackerControllerId: attacker.controller, target: { instanceId: target.id, generation: target.zoneGeneration }, defenderId: defender.id, blockersUsed: 0, powerBonus: 0, ...(target.zone === 'characters' && !target.rested ? { activeTarget: true as const } : {}), counterModifiers: [] }
    state.events.push({ sequence: state.events.length, type: 'ATTACK_DECLARED', actorId: command.actorId, publicInstanceId: attacker.id })
    return
  }

  const battle = state.battle
  if (!battle) throw new Error('INVALID_BATTLE_RESOLUTION')
  if (command.type === 'ANSWER_TRIGGER') {
    const pending = battle.pendingLifeTrigger
    if (battle.step !== 'LIFE_TRIGGER' || !pending || command.actorId !== pending.actorId || command.choiceId !== pending.id) throw new Error('INVALID_TRIGGER_RESPONSE')
    const player = state.players.find(p => p.id === pending.actorId)!, life = state.instances[pending.presence.instanceId]
    const definition = life && state.catalog.definitions.find(d => d.definitionId === life.definitionId)
    if (!life || life.zone !== 'life' || life.zoneGeneration !== pending.presence.generation || player.zones.life[0] !== life.id || !definition?.review.triggerOriginal.trim()) throw new Error('INVALID_TRIGGER_RESPONSE')
    player.zones.life.shift()
    if (command.activate) {
      const trigger = state.effects?.registry.definitions.find(d => d.timing === 'TRIGGER' && d.source.kind === 'CARD_DEFINITION' && d.source.definitionId === definition.definitionId)
      if (!trigger) throw new Error('UNSUPPORTED_TRIGGER_EFFECT')
      player.zones.temporary.push(life.id); life.zone = 'temporary'; life.zoneGeneration++; life.faceUp = true
      state.events.push({ sequence: state.events.length, type: 'LIFE_DAMAGED', actorId: player.id })
      state.events.push({ sequence: state.events.length, type: 'CARD_REVEALED', actorId: player.id, revealedCard: { definitionId: definition.definitionId, printingKey: life.printingKey! } })
      state.events.push({ sequence: state.events.length, type: 'TRIGGER_ACTIVATED', actorId: player.id, publicInstanceId: life.id })
    } else {
      player.zones.hand.push(life.id); life.zone = 'hand'; life.zoneGeneration++; life.faceUp = false
      state.events.push({ sequence: state.events.length, type: 'LIFE_DAMAGED', actorId: player.id })
    }
    delete battle.pendingLifeTrigger // absent, not undefined: the JSON round trip must give back an equal state
    battle.lifeDamage!.remaining--; battle.lifeDamage!.damageIndex++
    battle.step = 'LIFE_CONTINUE'
    return
  }
  if (command.type === 'ANSWER_CHOICE') {
    const pending = battle.pendingReplacement
    if (battle.step !== 'KO_REPLACEMENT' || !pending || command.actorId !== pending.actorId || command.choiceId !== pending.id || command.tokens.length > 1) throw new Error('INVALID_CHOICE_RESPONSE')
    const chosen = command.tokens.map(token => pending.options.find(o => o.token === token))
    if (chosen.some(o => !o)) throw new Error('INVALID_CHOICE_RESPONSE')
    const attacker = state.instances[battle.attacker.instanceId], target = state.instances[battle.target.instanceId]
    delete battle.pendingReplacement; battle.step = 'DAMAGE'
    if (chosen.length) applyBattleGuard(state, pending, battle.target, chosen[0]!.presence, battle.id)
    else if (confirmBattleKO(state, battle.target, battle.attacker, battle.id)) state.events.push({ sequence: state.events.length, type: 'CHARACTER_KO', actorId: battle.attackerControllerId, publicInstanceId: target.id })
    finishBattle(state, battle, attacker, target, true)
    return
  }
  if (command.battleId !== battle.id) throw new Error('INVALID_BATTLE_RESOLUTION')
  if (command.type === 'CONTINUE_LIFE_DAMAGE') {
    if (battle.step !== 'LIFE_CONTINUE' || command.actorId !== battle.attackerControllerId || !battle.lifeDamage) throw new Error('INVALID_LIFE_DAMAGE_CONTINUATION')
    processLifeDamage(state, battle)
    return
  }
  if (command.type === 'PASS_BLOCKER' || command.type === 'ACTIVATE_BLOCKER' || command.type === 'PLAY_COUNTER_CHARACTER' || command.type === 'PLAY_COUNTER_EVENT' || command.type === 'PASS_COUNTER') {
    if (command.actorId !== battle.defenderId || !samePresence(state, battle.attacker) || !samePresence(state, battle.target)) throw new Error('INVALID_BATTLE_RESPONSE')
    if (command.type === 'PASS_BLOCKER') {
      if (battle.step !== 'BLOCKER') throw new Error('INVALID_BATTLE_STEP')
      battle.step = 'COUNTER'; battlePaired(state, battle); return
    }
    if (command.type === 'ACTIVATE_BLOCKER') {
      if (battle.step !== 'BLOCKER' || battle.blockersUsed !== 0 || hasCombatKeyword(state, battle.attacker.instanceId, 'UNBLOCKABLE')) throw new Error('INVALID_BLOCKER_WINDOW')
      const blocker = state.instances[command.blockerId]
      const definition = blocker && state.catalog.definitions.find(d => d.definitionId === blocker.definitionId)
      if (!blocker || blocker.controller !== command.actorId || blocker.zone !== 'characters' || blocker.rested || blocker.id === battle.target.instanceId || !definition || !hasBlockerAbility(state, blocker.id) || blockerIsProhibited(state, battle, blocker.id)) throw new Error('INVALID_BLOCKER')
      if (state.effects && ['1.2.0','1.3.0'].includes(state.effects.version)) {
        if (!confirmRestOperation(state, { instanceId: blocker.id, generation: blocker.zoneGeneration }, command.actorId, battle.id, 'COST')) throw new Error('BLOCKER_REST_PREVENTED')
      } else blocker.rested = true
      battle.target = { instanceId: blocker.id, generation: blocker.zoneGeneration }; battle.blockersUsed = 1; battle.step = 'COUNTER'
      state.events.push({ sequence: state.events.length, type: 'BLOCKER_ACTIVATED', actorId: command.actorId, publicInstanceId: blocker.id }); battlePaired(state, battle); return
    }
    if (command.type === 'PASS_COUNTER') {
      if (battle.step !== 'COUNTER') throw new Error('INVALID_COUNTER_WINDOW')
      battle.step = 'DAMAGE'; return
    }
    if (battle.step !== 'COUNTER') throw new Error('INVALID_COUNTER_WINDOW')
    if (command.type === 'PLAY_COUNTER_EVENT') {
      const card = state.instances[command.cardId]
      const definition = card && state.catalog.definitions.find(d => d.definitionId === card.definitionId)
      const spec = definition?.review.counterEvent
      const owner = state.players.find(p => p.id === command.actorId)!
      if (!card || card.owner !== command.actorId || card.zone !== 'hand' || definition?.category !== 'EVENT' || !spec || definition.cost !== spec.printedCost) throw new Error('INVALID_COUNTER_EVENT')
      if (spec.kind === 'DECLARATIVE') {
        if (command.targetId !== null) throw new Error('INVALID_COUNTER_EVENT_EFFECT_CHOICE')
        activateCounterProgram(state, command.actorId, card.id, command.paymentDonIds, command.donMinusIds, command.lifePayment===true, battle.id)
        return
      }
      if (spec.kind === 'OPTIONAL_LIFE_POWER' && !['1.2.0','1.3.0'].includes(state.effects?.version ?? '')) throw new Error('UNIFIED_COUNTER_EFFECTS_REQUIRED')
      if (command.paymentDonIds.length !== spec.printedCost || new Set(command.paymentDonIds).size !== command.paymentDonIds.length
        || command.paymentDonIds.some(id => !owner.zones.cost.includes(id) || state.instances[id].kind !== 'DON' || state.instances[id].rested || state.instances[id].controller !== command.actorId)) throw new Error('COUNTER_EVENT_INITIAL_UNPAYABLE')
      const restedDonCount = owner.zones.cost.filter(id => state.instances[id].rested).length
      if (command.paymentDonIds.length && state.effects?.registry.restrictions.some(rule => rule.playerId === command.actorId && rule.prohibited === 'REST' && (rule.afterRestedDon === undefined || restedDonCount >= rule.afterRestedDon))) throw new Error('COUNTER_EVENT_INITIAL_UNPAYABLE')
      let returnDons: (typeof state.instances)[string][] = []
      let target: (typeof state.instances)[string] | undefined
      const lifePayment = spec.kind === 'OPTIONAL_LIFE_POWER' && command.lifePayment === true
      if (command.lifePayment === true && spec.kind !== 'OPTIONAL_LIFE_POWER') throw new Error('INVALID_COUNTER_EVENT_EFFECT_CHOICE')
      if (lifePayment && owner.zones.life.length === 0) throw new Error('COUNTER_EVENT_LIFE_COST_UNAVAILABLE')
      if (spec.kind === 'DON_MINUS_POWER' && command.donMinusIds.length) {
        returnDons = command.donMinusIds.map(id => state.instances[id]!)
        target = command.targetId === null ? undefined : state.instances[command.targetId]
        if (returnDons.length !== spec.donMinus || new Set(command.donMinusIds).size !== command.donMinusIds.length || returnDons.some(returnDon => !returnDon || returnDon.kind !== 'DON' || returnDon.owner !== command.actorId || !['cost', 'attached'].includes(returnDon.zone)
          || !owner.zones[returnDon.zone].includes(returnDon.id) || (returnDon.zone === 'attached' && (!returnDon.attachedTo || state.instances[returnDon.attachedTo]?.owner !== command.actorId)))
          || !target || target.controller !== command.actorId || !['leader', 'characters'].includes(target.zone)) throw new Error('INVALID_COUNTER_EVENT_EFFECT_CHOICE')
      } else if (spec.kind === 'DON_MINUS_POWER' && command.targetId !== null) throw new Error('INVALID_COUNTER_EVENT_EFFECT_CHOICE')
      else if (spec.kind === 'OPTIONAL_LIFE_POWER') {
        target = command.targetId === null ? undefined : state.instances[command.targetId]
        if (command.donMinusIds.length || (!lifePayment && command.targetId !== null) || (command.targetId !== null && (!target || target.controller !== command.actorId || !['leader', 'characters'].includes(target.zone)))) throw new Error('INVALID_COUNTER_EVENT_EFFECT_CHOICE')
      } else if (command.donMinusIds.length) throw new Error('INVALID_COUNTER_EVENT_EFFECT_CHOICE')
      for (const id of command.paymentDonIds) {
        if (state.effects && ['1.2.0','1.3.0'].includes(state.effects.version)) {
          // A restriction may become applicable after an earlier cost has been
          // paid. Keep those confirmed payments and stop before activating the Event.
          if (!confirmRestOperation(state, { instanceId: id, generation: state.instances[id].zoneGeneration }, command.actorId, battle.id, 'COST')) return
        } else state.instances[id].rested = true
      }
      if (state.effects && ['1.2.0','1.3.0'].includes(state.effects.version)) {
        if (!confirmMoveOperation(state, { instanceId: card.id, generation: card.zoneGeneration }, command.actorId, battle.id, 'hand', 'trash', 'RULE')) throw new Error('COUNTER_EVENT_ACTIVATION_FAILED')
      } else {
        owner.zones.hand.splice(owner.zones.hand.indexOf(card.id), 1); owner.zones.trash.push(card.id)
        card.zone = 'trash'; card.zoneGeneration++; card.faceUp = true
      }
      if (lifePayment) {
        const lifeId = owner.zones.life.shift()!
        owner.zones.hand.push(lifeId); state.instances[lifeId].zone = 'hand'; state.instances[lifeId].zoneGeneration++; state.instances[lifeId].faceUp = false
        state.events.push({ sequence: state.events.length, type: 'LIFE_PAID', actorId: owner.id })
      }
      if (returnDons.length && target) {
        for (const returnDon of returnDons) {
          const from = returnDon.zone as 'cost' | 'attached'
          if (state.effects && ['1.2.0','1.3.0'].includes(state.effects.version)) {
            if (!confirmMoveOperation(state, { instanceId: returnDon.id, generation: returnDon.zoneGeneration }, command.actorId, battle.id, from, 'donDeck', 'COST')) throw new Error('COUNTER_EVENT_DON_MINUS_INTERRUPTED')
          } else {
            owner.zones[from].splice(owner.zones[from].indexOf(returnDon.id), 1); owner.zones.donDeck.push(returnDon.id)
            returnDon.zone = 'donDeck'; returnDon.zoneGeneration++; returnDon.rested = false; returnDon.attachedTo = null; returnDon.faceUp = false
          }
        }
        if (state.effects && ['1.2.0','1.3.0'].includes(state.effects.version)) {
          const subject = { instanceId: target.id, generation: target.zoneGeneration }
          processOperation(state, { id: `${state.gameId}:fx:counter-power:${state.effects.nextId++}`, resolutionId: battle.id, subject, controllerId: command.actorId, type: 'ADD_POWER', intent: 'EFFECT', outcome: 'CONFIRMED', amount: spec.powerBonus })
          battle.counterModifiers.push({ target: subject, amount: spec.powerBonus })
        } else battle.counterModifiers.push({ target: { instanceId: target.id, generation: target.zoneGeneration }, amount: spec.powerBonus })
      }
      if (spec.kind === 'OPTIONAL_LIFE_POWER' && lifePayment && target) {
        const context = { controllerId: command.actorId, source: { kind: 'CARD' as const, definitionId: card.definitionId!, presence: { instanceId: card.id, generation: card.zoneGeneration - 1 } }, effectInstanceId: battle.id, turnId: state.turn, windowId: `${battle.id}:counter` }
        confirmPower(state, { instanceId: target.id, generation: target.zoneGeneration }, spec.powerBonus, context)
      }
      state.events.push({ sequence: state.events.length, type: 'COUNTER_PLAYED', actorId: command.actorId, publicInstanceId: card.id })
      return
    }
    const card = state.instances[command.cardId], definition = card && state.catalog.definitions.find(d => d.definitionId === card.definitionId)
    const target = state.instances[command.targetId]
    if (!card || card.owner !== command.actorId || card.zone !== 'hand' || !definition || definition.category !== 'CHARACTER' || definition.counter === null
      || !target || target.controller !== command.actorId || !['leader', 'characters'].includes(target.zone)) throw new Error('INVALID_COUNTER_CHARACTER')
    const owner = state.players.find(p => p.id === card.owner)!
    if (state.effects && ['1.2.0','1.3.0'].includes(state.effects.version)) {
      if (!confirmMoveOperation(state, { instanceId: card.id, generation: card.zoneGeneration }, command.actorId, battle.id, 'hand', 'trash', 'RULE')) throw new Error('COUNTER_MOVE_PREVENTED')
    } else {
      owner.zones.hand.splice(owner.zones.hand.indexOf(card.id), 1); owner.zones.trash.push(card.id)
      card.zone = 'trash'; card.zoneGeneration++; card.faceUp = true
    }
    battle.counterModifiers.push({ target: { instanceId: target.id, generation: target.zoneGeneration }, amount: definition.counter })
    state.events.push({ sequence: state.events.length, type: 'COUNTER_PLAYED', actorId: command.actorId, publicInstanceId: card.id }); return
  }
  if (command.actorId !== battle.attackerControllerId) throw new Error('INVALID_BATTLE_RESOLUTION')
  if (battle.step !== 'DAMAGE') throw new Error('INVALID_BATTLE_STEP')
  if (!samePresence(state, battle.attacker) || !samePresence(state, battle.target)) {
    state.events.push({ sequence: state.events.length, type: 'BATTLE_RESOLVED', actorId: battle.attackerControllerId })
    state.battle = null
    return
  }
  const attacker = state.instances[battle.attacker.instanceId]
  const target = state.instances[battle.target.instanceId]
  // "+X power during this battle" applies to either participant (Counters on the target, When Attacking on the attacker).
  const attackBase = evaluateCharacteristics(state, attacker.id).power.current
  const attackPower = attackBase === null ? null : attackBase + battle.counterModifiers.filter(m => m.target.instanceId === attacker.id && m.target.generation === attacker.zoneGeneration).reduce((n, m) => n + m.amount, 0)
  const targetPower = (evaluateCharacteristics(state, target.id).power.current ?? 0) + battle.counterModifiers.filter(m => m.target.instanceId === target.id && m.target.generation === target.zoneGeneration).reduce((n, m) => n + m.amount, 0)
  if (attackPower === null || targetPower === null) throw new Error('UNKNOWN_BATTLE_POWER')
  // FAQ ST02-010: "battles your opponent's Character" is met once the Damage Step compared powers against a Character.
  const battledCharacter = target.zone === 'characters'
  if (attackPower >= targetPower && target.zone === 'characters') {
    // M6: a printed replacement of this K.O. ("If this Character would be K.O.'d, you may ... instead") pauses the battle for its
    // owner's choice (KO_REPLACEMENT); a Character that cannot be K.O.'d in battle is not asked.
    const pending = state.effects?.version === '1.3.0' && !protectedFromKO(state, battle.target, 'BATTLE', battle.attacker.instanceId) ? battleKoReplacement(state, battle.target, battle.id) : null
    if (pending) { battle.step = 'KO_REPLACEMENT'; battle.pendingReplacement = pending; return }
    let kod = true
    if (state.effects && ['1.2.0','1.3.0'].includes(state.effects.version)) kod = confirmBattleKO(state, battle.target, battle.attacker, battle.id)
    else {
      const owner = state.players.find(p => p.id === target.owner)!
      const attached = owner.zones.attached.filter(id => state.instances[id].attachedTo === target.id)
      for (const donId of attached) {
        owner.zones.attached.splice(owner.zones.attached.indexOf(donId), 1)
        owner.zones.cost.push(donId)
        state.instances[donId].zone = 'cost'; state.instances[donId].zoneGeneration++; state.instances[donId].rested = true; state.instances[donId].attachedTo = null
      }
      owner.zones.characters.splice(owner.zones.characters.indexOf(target.id), 1)
      owner.zones.trash.push(target.id)
      target.zone = 'trash'; target.zoneGeneration++; target.rested = false; target.faceUp = true; target.playedOnTurn = null
    }
    if (kod) state.events.push({ sequence: state.events.length, type: 'CHARACTER_KO', actorId: battle.attackerControllerId, publicInstanceId: target.id })
  } else if (attackPower >= targetPower && target.zone === 'leader') {
    const damageCount = hasCombatKeyword(state, attacker.id, 'DOUBLE_ATTACK') ? 2 : 1
    const banish = hasCombatKeyword(state, attacker.id, 'BANISH')
    battle.lifeDamage = { remaining: damageCount, damageIndex: 0, banish }
    processLifeDamage(state, battle)
    return
  }
  finishBattle(state, battle, attacker, target, battledCharacter)
}
/** End of a battle that compared powers: battle announcements, then the battle is resolved. */
function finishBattle(state: GameState, battle: NonNullable<GameState['battle']>, attacker: GameState['instances'][string], target: GameState['instances'][string], battledCharacter: boolean) {
  // Each participant still on the field announces the Character it battled (attacker first; the defending Character
  // only when the attacker is a Character, FAQ ST08-013: a Character K.O.'d in that battle announces nothing).
  if (battledCharacter && listens(state, 'END_OF_BATTLE_WITH_CHARACTER')) {
    state.events.push({ sequence: state.events.length, type: 'CHARACTER_BATTLED', actorId: battle.attackerControllerId, publicInstanceId: attacker.id, battled: { ...battle.target } })
    if (attacker.zone === 'characters' && target.zone === 'characters' && target.zoneGeneration === battle.target.generation)
      state.events.push({ sequence: state.events.length, type: 'CHARACTER_BATTLED', actorId: target.controller, publicInstanceId: target.id, battled: { ...battle.attacker } })
  }
  state.events.push({ sequence: state.events.length, type: 'BATTLE_RESOLVED', actorId: battle.attackerControllerId })
  state.battle = null
}

function processLifeDamage(state: GameState, battle: NonNullable<GameState['battle']>) {
  const damage = battle.lifeDamage
  if (!damage) throw new Error('MISSING_LIFE_DAMAGE_CONTEXT')
  const defender = state.players.find(p => p.id === battle.defenderId)!
  while (damage.remaining > 0) {
    if (defender.zones.life.length === 0) {
      state.events.push({ sequence: state.events.length, type: 'LIFE_DAMAGED', actorId: defender.id })
      state.result = { reason: 'LEADER_DAMAGED_AT_ZERO_LIFE', loserIds: [defender.id], winnerId: battle.attackerControllerId }
      state.decisionPlayerId = null
      state.events.push({ sequence: state.events.length, type: 'GAME_ENDED', actorId: battle.attackerControllerId })
      damage.remaining = 0
      state.battle = null
      break
    }
    const lifeId = defender.zones.life[0], life = state.instances[lifeId]
    const definition = state.catalog.definitions.find(d => d.definitionId === life.definitionId)!
    if (!damage.banish && definition.review.triggerOriginal.trim()) {
      battle.step = 'LIFE_TRIGGER'
      battle.pendingLifeTrigger = { id: `${battle.id}:trigger:${damage.damageIndex}`, actorId: defender.id, presence: { instanceId: life.id, generation: life.zoneGeneration } }
      return
    }
    defender.zones.life.shift()
    if (damage.banish) {
      defender.zones.trash.push(lifeId); life.zone = 'trash'; life.zoneGeneration++; life.faceUp = true
      state.events.push({ sequence: state.events.length, type: 'CARD_TRASHED', actorId: defender.id, publicInstanceId: lifeId })
    } else {
      defender.zones.hand.push(lifeId); life.zone = 'hand'; life.zoneGeneration++; life.faceUp = false
    }
    state.events.push({ sequence: state.events.length, type: 'LIFE_DAMAGED', actorId: defender.id })
    damage.remaining--; damage.damageIndex++
  }
  if (damage.remaining === 0 && !battle.pendingLifeTrigger) {
    battle.step = 'LIFE_CONTINUE'
    if (state.result) return
    state.events.push({ sequence: state.events.length, type: 'BATTLE_RESOLVED', actorId: battle.attackerControllerId })
    state.battle = null
  }
}

// The attacker and its final target are known once the Block Step ends: each participating Character is announced
// (BATTLE_PAIRED) so that "when this Character battles ..." abilities can be captured (FAQ ST05-010).
// Battle-step announcements exist only for games whose registry has an ability listening to them, so that games
// without such cards (and their historical traces) keep exactly the same public event sequence.
function listens(state: GameState, timing: 'END_OF_BATTLE_WITH_CHARACTER' | 'ON_BATTLE_PAIRED'): boolean {
  return !!state.effects?.registry.definitions.some(d => d.timing === timing)
}
function battlePaired(state: GameState, battle: NonNullable<GameState['battle']>): void {
  if (!listens(state, 'ON_BATTLE_PAIRED')) return
  for (const ref of [battle.attacker, battle.target]) {
    const i = state.instances[ref.instanceId]
    if (i?.zone === 'characters') state.events.push({ sequence: state.events.length, type: 'BATTLE_PAIRED', actorId: i.controller, publicInstanceId: i.id })
  }
}
