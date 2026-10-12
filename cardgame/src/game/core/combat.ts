import { evaluateCharacteristics } from '../effects/characteristics'
import { confirmMoveOperation, confirmRestOperation, confirmPower, processOperation } from '../effects/operations'
import { activateCounterProgram, confirmBattleKO } from '../effects/runtime'
import type { BattleState, Command, GameState, LegalAction } from './types'

const samePresence = (state: GameState, ref: BattleState['attacker']) => {
  const instance = state.instances[ref.instanceId]
  return !!instance && instance.zoneGeneration === ref.generation
}

export function combatActions(state: GameState, actorId: string): LegalAction[] {
  if (state.scope !== 'BASIC_TURNS' || state.result || state.phase !== 'MAIN' || state.effects?.choice || state.effects?.scheduler?.orderChoice) return []
  if (state.battle) {
    const battle = state.battle
    if (battle.step === 'LIFE_TRIGGER' && battle.pendingLifeTrigger) return actorId === battle.pendingLifeTrigger.actorId
      ? [{ type: 'ANSWER_TRIGGER', choiceId: battle.pendingLifeTrigger.id, choices: [false, true] }] : []
    if (battle.step === 'LIFE_CONTINUE') return actorId === battle.attackerControllerId ? [{ type: 'CONTINUE_LIFE_DAMAGE', battleId: battle.id }] : []
    if (battle.step === 'BLOCKER' && actorId === battle.defenderId) {
      const defender = state.players.find(p => p.id === actorId)!
      const attackerDefinition = state.catalog.definitions.find(d => d.definitionId === state.instances[battle.attacker.instanceId]?.definitionId)
      const unblockable = attackerDefinition?.review.combatKeywords?.includes('UNBLOCKABLE') ?? false
      const blockerIds = battle.blockersUsed === 0 && !unblockable ? defender.zones.characters.filter(id => id !== battle.target.instanceId && !state.instances[id].rested
        && state.catalog.definitions.find(d => d.definitionId === state.instances[id].definitionId)?.review.effects.some(e => e.kind === 'blocker')) : []
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
    const definition = state.catalog.definitions.find(d => d.definitionId === card.definitionId)
    const rush = definition?.review.combatKeywords?.some(keyword => keyword === 'RUSH' || keyword === 'RUSH_CHARACTER') ?? false
    return !card.rested && (card.playedOnTurn !== state.turn || card.zone === 'leader' || rush)
  }
  const attackerIds = [...attacker.zones.leader, ...attacker.zones.characters].filter(eligibleAttacker)
  const targetIds = [...defender.zones.leader, ...defender.zones.characters.filter(id => state.instances[id].rested)]
  const legalPairs = attackerIds.map(id => {
    const definition = state.catalog.definitions.find(d => d.definitionId === state.instances[id].definitionId)
    return { attackerId: id, targetIds: definition?.review.combatKeywords?.includes('RUSH_CHARACTER') ? targetIds.filter(targetId => state.instances[targetId].zone === 'characters') : targetIds }
  }).filter(pair => pair.targetIds.length)
  return legalPairs.length ? [{ type: 'DECLARE_ATTACK', attackerIds: legalPairs.map(p => p.attackerId), targetIds: [...new Set(legalPairs.flatMap(p => p.targetIds))], targetIdsByAttacker: Object.fromEntries(legalPairs.map(pair => [pair.attackerId, pair.targetIds])) }] : []
}

export function applyCombatCommand(state: GameState, command: Extract<Command, { type: 'DECLARE_ATTACK' | 'ACTIVATE_BLOCKER' | 'PASS_BLOCKER' | 'PLAY_COUNTER_CHARACTER' | 'PLAY_COUNTER_EVENT' | 'PASS_COUNTER' | 'RESOLVE_BATTLE' | 'CONTINUE_LIFE_DAMAGE' | 'ANSWER_TRIGGER' }>): void {
  if (command.type === 'DECLARE_ATTACK') {
    if (state.battle || state.scope !== 'BASIC_TURNS' || state.phase !== 'MAIN' || command.actorId !== state.activePlayerId) throw new Error('INVALID_ATTACK_WINDOW')
    const attacker = state.instances[command.attackerId]
    const target = state.instances[command.targetId]
    const attackerOwner = state.players.find(p => p.id === command.actorId)!
    const defender = state.players.find(p => p.id !== command.actorId)!
    const attackerDefinition = attacker && state.catalog.definitions.find(d => d.definitionId === attacker.definitionId)
    const keywords = attackerDefinition?.review.combatKeywords ?? []
    if (!attacker || attacker.controller !== command.actorId || !['leader', 'characters'].includes(attacker.zone) || attacker.rested
      || (attacker.zone === 'characters' && attacker.playedOnTurn === state.turn && !keywords.includes('RUSH') && !keywords.includes('RUSH_CHARACTER'))) throw new Error('INVALID_ATTACKER')
    if (!attackerOwner.zones[attacker.zone].includes(attacker.id)) throw new Error('INVALID_ATTACKER')
    if (!target || target.controller !== defender.id || !['leader', 'characters'].includes(target.zone) || (target.zone === 'characters' && !target.rested)
      || (keywords.includes('RUSH_CHARACTER') && target.zone !== 'characters')) throw new Error('INVALID_ATTACK_TARGET')
    const battleId = `${state.gameId}:battle:${state.version}`
    if (state.effects && ['1.2.0','1.3.0'].includes(state.effects.version)) {
      if (!confirmRestOperation(state, { instanceId: attacker.id, generation: attacker.zoneGeneration }, command.actorId, battleId, 'RULE')) throw new Error('ATTACKER_REST_PREVENTED')
    } else attacker.rested = true
    state.battle = { id: battleId, step: 'BLOCKER', attacker: { instanceId: attacker.id, generation: attacker.zoneGeneration }, attackerControllerId: attacker.controller, target: { instanceId: target.id, generation: target.zoneGeneration }, defenderId: defender.id, blockersUsed: 0, powerBonus: 0, counterModifiers: [] }
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
      battle.step = 'COUNTER'; return
    }
    if (command.type === 'ACTIVATE_BLOCKER') {
      const attackingInstance = state.instances[battle.attacker.instanceId]
      const attackingDefinition = attackingInstance && state.catalog.definitions.find(d => d.definitionId === attackingInstance.definitionId)
      if (battle.step !== 'BLOCKER' || battle.blockersUsed !== 0 || attackingDefinition?.review.combatKeywords?.includes('UNBLOCKABLE')) throw new Error('INVALID_BLOCKER_WINDOW')
      const blocker = state.instances[command.blockerId]
      const definition = blocker && state.catalog.definitions.find(d => d.definitionId === blocker.definitionId)
      if (!blocker || blocker.controller !== command.actorId || blocker.zone !== 'characters' || blocker.rested || blocker.id === battle.target.instanceId || !definition?.review.effects.some(e => e.kind === 'blocker')) throw new Error('INVALID_BLOCKER')
      if (state.effects && ['1.2.0','1.3.0'].includes(state.effects.version)) {
        if (!confirmRestOperation(state, { instanceId: blocker.id, generation: blocker.zoneGeneration }, command.actorId, battle.id, 'COST')) throw new Error('BLOCKER_REST_PREVENTED')
      } else blocker.rested = true
      battle.target = { instanceId: blocker.id, generation: blocker.zoneGeneration }; battle.blockersUsed = 1; battle.step = 'COUNTER'
      state.events.push({ sequence: state.events.length, type: 'BLOCKER_ACTIVATED', actorId: command.actorId, publicInstanceId: blocker.id }); return
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
  const attackPower = evaluateCharacteristics(state, attacker.id).power.current
  const targetPower = (evaluateCharacteristics(state, target.id).power.current ?? 0) + battle.counterModifiers.filter(m => m.target.instanceId === target.id && m.target.generation === target.zoneGeneration).reduce((n, m) => n + m.amount, 0)
  if (attackPower === null || targetPower === null) throw new Error('UNKNOWN_BATTLE_POWER')
  if (attackPower >= targetPower && target.zone === 'characters') {
    if (state.effects && ['1.2.0','1.3.0'].includes(state.effects.version)) confirmBattleKO(state, battle.target, battle.attacker, battle.id)
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
    state.events.push({ sequence: state.events.length, type: 'CHARACTER_KO', actorId: battle.attackerControllerId, publicInstanceId: target.id })
  } else if (attackPower >= targetPower && target.zone === 'leader') {
    const keywords = state.catalog.definitions.find(d => d.definitionId === attacker.definitionId)?.review.combatKeywords ?? []
    const damageCount = keywords.includes('DOUBLE_ATTACK') ? 2 : 1
    const banish = keywords.includes('BANISH')
    battle.lifeDamage = { remaining: damageCount, damageIndex: 0, banish }
    processLifeDamage(state, battle)
    return
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
