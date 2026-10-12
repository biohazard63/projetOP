import { assertEffectState } from '../effects/runtime'
import { ZONES, type GameState } from './types'
import { resolveLeaderLife } from '../cards/leaderLife'

// M1/M1.5 conservation: future combat/effects must extend these guards, not bypass them.
export function assertGameInvariants(state: GameState): void {
  if (![1, 2].includes(state.schemaVersion) || !['SETUP_ONLY', 'BASIC_TURNS'].includes(state.scope) || state.automaticPlayReady !== false || !Array.isArray(state.players) || state.players.length !== 2) throw new Error('INVALID_STATE_HEADER')
  if (state.battle !== null && state.battle !== undefined) {
    const battle = state.battle
    const attacker = state.instances[battle.attacker.instanceId], target = state.instances[battle.target.instanceId]
    if (!battle.id || !['BLOCKER', 'COUNTER', 'DAMAGE', 'LIFE_TRIGGER', 'LIFE_CONTINUE'].includes(battle.step) || !state.players.some(p => p.id === battle.attackerControllerId) || !state.players.some(p => p.id === battle.defenderId)
      || battle.attackerControllerId === battle.defenderId || !Number.isSafeInteger(battle.blockersUsed) || battle.blockersUsed < 0 || battle.blockersUsed > 1 || !Number.isSafeInteger(battle.powerBonus)
      || !attacker || attacker.controller !== battle.attackerControllerId || (!['LIFE_TRIGGER', 'LIFE_CONTINUE'].includes(battle.step) && (!['leader', 'characters'].includes(attacker.zone) || attacker.zoneGeneration !== battle.attacker.generation || !attacker.rested))
      || !target || target.controller !== battle.defenderId || !['leader', 'characters'].includes(target.zone) || (target.zone === 'characters' && !target.rested) || target.zoneGeneration !== battle.target.generation || state.phase !== 'MAIN'
      || !Array.isArray(battle.counterModifiers) || battle.counterModifiers.some(m => !state.instances[m.target.instanceId] || !Number.isSafeInteger(m.target.generation) || !Number.isSafeInteger(m.amount) || m.amount < 0)
      || (['LIFE_TRIGGER', 'LIFE_CONTINUE'].includes(battle.step) && (!battle.lifeDamage || target.zone !== 'leader' || !Number.isSafeInteger(battle.lifeDamage.remaining) || battle.lifeDamage.remaining < 0 || battle.lifeDamage.remaining > 2 || !Number.isSafeInteger(battle.lifeDamage.damageIndex) || battle.lifeDamage.damageIndex < 0))
      || (battle.step === 'LIFE_TRIGGER' && (!battle.pendingLifeTrigger || battle.pendingLifeTrigger.actorId !== battle.defenderId || state.players.find(p => p.id === battle.defenderId)?.zones.life[0] !== battle.pendingLifeTrigger.presence.instanceId || state.instances[battle.pendingLifeTrigger.presence.instanceId]?.zoneGeneration !== battle.pendingLifeTrigger.presence.generation))
      || (battle.step !== 'LIFE_TRIGGER' && !!battle.pendingLifeTrigger)) throw new Error('INVALID_BATTLE_STATE')
  }
  assertEffectState(state)
  if (!state.players.every(p => typeof p.id === 'string' && p.id.length > 0) || state.players[0].id === state.players[1].id) throw new Error('INVALID_PLAYERS')
  if (!(state.scope === 'SETUP_ONLY' ? ['CHOOSE_FIRST', 'MULLIGAN', 'REFRESH'] : ['CHOOSE_FIRST', 'MULLIGAN', 'REFRESH', 'DRAW', 'DON', 'MAIN', 'END']).includes(state.phase)) throw new Error('UNSUPPORTED_PHASE')
  if (!Number.isSafeInteger(state.version) || state.version !== state.commands.length || !Number.isSafeInteger(state.random.value) || state.random.value < 1 || state.random.value > 0xffffffff || !Number.isSafeInteger(state.random.draws) || state.random.draws < 0) throw new Error('INVALID_VERSION_OR_RANDOM')
  const ids = state.players.map(p => p.id)
  if (!ids.includes(state.chooserId)) throw new Error('INVALID_CHOOSER')
  const seen = new Set<string>()
  for (const p of state.players) {
    if (!['PENDING', 'KEPT', 'REDRAWN'].includes(p.mulligan)) throw new Error('INVALID_MULLIGAN')
    const own = Object.values(state.instances).filter(i => i.owner === p.id)
    if (own.length !== 61 || own.filter(i => i.kind === 'DON').length !== 10 || own.filter(i => i.kind === 'CARD').length !== 51) throw new Error('CARD_CONSERVATION')
    for (const zone of ZONES) {
      if (!Array.isArray(p.zones[zone])) throw new Error('INVALID_ZONE')
      for (const id of p.zones[zone]) {
        const i = state.instances[id]
        if (seen.has(id) || !i || i.id !== id || i.owner !== p.id || i.controller !== p.id || i.zone !== zone) throw new Error('DUPLICATE_OR_MISPLACED_INSTANCE')
        seen.add(id)
        if (typeof i.rested !== 'boolean' || !Number.isSafeInteger(i.zoneGeneration) || i.zoneGeneration < 0 || (state.scope === 'SETUP_ONLY' && (i.rested || i.attachedTo !== null))) throw new Error('INVALID_INSTANCE_STATE')
        if (i.faceUp !== ['leader', 'characters', 'stage', 'trash', 'cost', 'attached', 'temporary'].includes(zone)) throw new Error('INVALID_VISIBILITY')
        if (i.kind === 'DON') {
          if (!['donDeck', 'cost', 'attached'].includes(zone) || i.definitionId !== null || i.printingKey !== null) throw new Error('INVALID_DON')
        } else {
          const d = state.catalog.definitions.find(d => d.definitionId === i.definitionId)
          const printing = state.catalog.printings.find(p => p.printingKey === i.printingKey)
          if (!d || !printing || printing.definitionId !== d.definitionId) throw new Error('UNKNOWN_DEFINITION')
          if ((zone === 'leader') !== (d.category === 'LEADER') || (zone !== 'leader' && !['deck', 'hand', 'life', 'characters', 'stage', 'trash', 'temporary'].includes(zone)) || (zone === 'characters' && d.category !== 'CHARACTER') || (zone === 'stage' && d.category !== 'STAGE') || (zone === 'temporary' && d.category === 'DON')) throw new Error('INVALID_CARD_ZONE')
        }
        if (zone === 'attached') {
          const target = i.attachedTo && state.instances[i.attachedTo]
          if (!target || target.owner !== p.id || !['leader', 'characters'].includes(target.zone)) throw new Error('INVALID_ATTACHMENT_TARGET')
        } else if (i.attachedTo !== null) throw new Error('UNEXPECTED_ATTACHMENT')
        if (!['leader', 'characters', 'stage', 'cost', 'attached'].includes(zone) && i.rested) throw new Error('INVALID_RESTED_ZONE')
        if (i.playedOnTurn != null && (!Number.isSafeInteger(i.playedOnTurn) || i.playedOnTurn < 1 || i.playedOnTurn > state.turn || !['characters', 'stage'].includes(zone))) throw new Error('INVALID_PLAYED_TURN')
      }
    }
    if (p.zones.leader.length !== 1 || p.zones.characters.length > 5 || p.zones.stage.length > 1 || (state.scope === 'SETUP_ONLY' && p.zones.donDeck.length !== 10)) throw new Error('INVALID_STARTING_ZONES')
    const leader = state.catalog.definitions.find(d => d.definitionId === state.instances[p.zones.leader[0]].definitionId)!
    const life = resolveLeaderLife(leader.lifeEvidence)
    if (life.status !== 'verified' || life.life !== leader.life) throw new Error('UNVERIFIED_LEADER_LIFE')
    const prepared = !['CHOOSE_FIRST', 'MULLIGAN'].includes(state.phase)
    const expectedHand = state.phase === 'CHOOSE_FIRST' ? 0 : 5
    const confirmedLifeDamage = state.events.filter(e => (e.type === 'LIFE_DAMAGED' || e.type === 'LIFE_PAID' || e.type === 'LIFE_TRASHED') && e.actorId === p.id).length
    const expectedLife = prepared ? Math.max(0, leader.life! - confirmedLifeDamage) : 0
    if (p.zones.life.length !== expectedLife || ((!prepared || state.scope === 'SETUP_ONLY') && (p.zones.hand.length !== expectedHand || p.zones.deck.length !== 50 - expectedHand - (prepared ? leader.life! : 0)))) throw new Error('INVALID_SETUP_COUNTS')
    if (prepared && p.mulligan === 'PENDING') throw new Error('UNFINISHED_MULLIGAN')
    if (state.phase === 'CHOOSE_FIRST' && p.mulligan !== 'PENDING') throw new Error('EARLY_MULLIGAN')
    if (p.turns !== (prepared ? (p.id === state.firstPlayerId ? Math.ceil(state.turn / 2) : Math.floor(state.turn / 2)) : 0)) throw new Error('INVALID_TURN_COUNTS')
  }
  if (seen.size !== 122 || Object.keys(state.instances).length !== 122) throw new Error('CARD_CONSERVATION')
  if (state.phase === 'CHOOSE_FIRST') {
    if (state.version !== 0 || state.firstPlayerId !== null || state.activePlayerId !== null || state.decisionPlayerId !== state.chooserId || state.turn !== 0) throw new Error('INVALID_CHOICE_STATE')
  } else {
    if (!ids.includes(state.firstPlayerId!) || state.activePlayerId !== (state.turn <= 1 || state.turn % 2 === 1 ? state.firstPlayerId : ids.find(id => id !== state.firstPlayerId))) throw new Error('INVALID_FIRST_PLAYER')
    const ordered = [...state.players].sort(p => p.id === state.firstPlayerId ? -1 : 1)
    if (ordered[0].mulligan === 'PENDING' && ordered[1].mulligan !== 'PENDING') throw new Error('MULLIGAN_OUT_OF_ORDER')
    if (state.phase === 'MULLIGAN' && (state.decisionPlayerId !== ordered.find(p => p.mulligan === 'PENDING')?.id || state.turn !== 0)) throw new Error('INVALID_DECISION_PLAYER')
    if (state.phase === 'MULLIGAN' && state.version !== 1 + state.players.filter(p => p.mulligan !== 'PENDING').length) throw new Error('INVALID_MULLIGAN_VERSION')
    if (state.scope === 'SETUP_ONLY' && state.phase === 'REFRESH' && (state.version !== 3 || state.decisionPlayerId !== null || state.turn !== 1)) throw new Error('INVALID_PREPARED_STATE')
  }
  const running = !['CHOOSE_FIRST', 'MULLIGAN'].includes(state.phase)
  if (running && (!Number.isSafeInteger(state.turn) || state.turn < 1 || state.decisionPlayerId !== null)) throw new Error('INVALID_RUNNING_STATE')
  if (state.result) {
    const losers = state.players.filter(p => p.zones.deck.length === 0).map(p => p.id)
    if (state.scope !== 'BASIC_TURNS') throw new Error('INVALID_RESULT')
    if (state.result.reason === 'EMPTY_DECK') {
      if (!losers.length || JSON.stringify(losers) !== JSON.stringify(state.result.loserIds) || state.result.winnerId !== (losers.length === 1 ? ids.find(id => id !== losers[0]) : null)) throw new Error('INVALID_RESULT')
    } else {
      const loserId = state.result.loserIds[0]
      if (state.result.loserIds.length !== 1 || !loserId || state.players.find(p => p.id === loserId)?.zones.life.length !== 0
        || state.result.winnerId !== ids.find(id => id !== loserId) || !state.events.some(e => e.type === 'LIFE_DAMAGED' && e.actorId === loserId)) throw new Error('INVALID_RESULT')
    }
  }
  if (state.events.some((e, index) => e.sequence !== index || (e.actorId !== undefined && !ids.includes(e.actorId)))) throw new Error('INVALID_EVENT_LOG')
  if (state.events.some(e=>e.revealedCard && (e.type!=='CARD_REVEALED' || !['1.2.0','1.3.0'].includes(state.effects?.version ?? '') || e.publicInstanceId || !state.catalog.printings.some(p=>p.printingKey===e.revealedCard!.printingKey && p.definitionId===e.revealedCard!.definitionId)))) throw new Error('INVALID_REVEALED_CARD_EVENT')
  // DON!! cards are interchangeable and the DON!! deck is an open area (CR 1.2.1 §3-3-2): a DON!! given then
  // returned by DON!! −X stays nameable. Other cards named by a public event must still be face up.
  if (state.events.some(e => e.publicInstanceId && (!['CARD_REVEALED', 'CARD_MOVED', 'TRIGGER_ACTIVATED', 'CARD_TRASHED', 'CARD_PLAYED', 'DON_ATTACHED', 'CHARACTER_KO', 'ATTACK_DECLARED', 'BLOCKER_ACTIVATED', 'COUNTER_PLAYED'].includes(e.type) || (!state.instances[e.publicInstanceId]?.faceUp && state.instances[e.publicInstanceId]?.kind !== 'DON')))) throw new Error('PRIVATE_INSTANCE_IN_PUBLIC_EVENT')
}
