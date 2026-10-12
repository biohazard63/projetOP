import { processOperation, confirmRest, preflightCosts } from '../effects/operations'
import type { EffectContext } from '../effects/contracts'
import { evaluateCharacteristics } from '../effects/characteristics'
import type { GameState, PublicEvent, TurnIntent, Zone, LegalAction } from './types'

const definition = (s: GameState, id: string) => s.catalog.definitions.find(d => d.definitionId === s.instances[id]?.definitionId)
const player = (s: GameState) => s.players.find(p => p.id === s.activePlayerId)!
function emit(s: GameState, type: PublicEvent['type'], publicInstanceId?: string) {
  s.events.push({ sequence: s.events.length, type, actorId: s.activePlayerId!, ...(publicInstanceId ? { publicInstanceId } : {}) })
}
function move(s: GameState, id: string, to: Zone, attachedTo: string | null = null) {
  const i = s.instances[id]
  const p = s.players.find(p => p.id === i.owner)!
  const index = p.zones[i.zone].indexOf(id)
  if (index < 0) throw new Error('INSTANCE_NOT_IN_ZONE')
  if (s.effects && ['1.2.0','1.3.0'].includes(s.effects.version)) {
    processOperation(s,{id:`${s.gameId}:fx:operation:${s.effects.nextId++}`,resolutionId:`${s.gameId}:turn:${s.turn}:command:${s.version}`,subject:{instanceId:id,generation:i.zoneGeneration},controllerId:s.activePlayerId!,type:i.kind==='DON'?(to==='attached'?'ATTACH_DON':'MOVE_DON'):'MOVE_CARD',intent:'RULE',outcome:'CONFIRMED',from:i.zone,to},{rested:i.rested,targetId:attachedTo??undefined})
    return
  }
  p.zones[i.zone].splice(index, 1); p.zones[to].push(id)
  i.zone = to; i.zoneGeneration++; i.attachedTo = attachedTo
  i.faceUp = ['leader', 'characters', 'stage', 'trash', 'cost', 'attached'].includes(to)
  if (!['leader', 'characters', 'stage'].includes(to)) i.playedOnTurn = null
}
function trash(s: GameState, id: string) {
  // §6-5-5-4: attached DON return rested, not to the DON deck. This is not a KO.
  for (const don of [...player(s).zones.attached].filter(d => s.instances[d].attachedTo === id)) { move(s, don, 'cost'); s.instances[don].rested = true }
  move(s, id, 'trash'); s.instances[id].rested = false
  emit(s, 'CARD_TRASHED', id)
}
export function processDefeat(s: GameState) {
  if (s.scope !== 'BASIC_TURNS' || ['CHOOSE_FIRST', 'MULLIGAN'].includes(s.phase) || s.result) return
  // §§1-2-1-1-2, 9-2-1-2: empty deck itself, not only a failed draw.
  const loserIds = s.players.filter(p => p.zones.deck.length === 0).map(p => p.id)
  if (loserIds.length) {
    s.result = { reason: 'EMPTY_DECK', loserIds, winnerId: loserIds.length === 1 ? s.players.find(p => p.id !== loserIds[0])!.id : null }
    s.decisionPlayerId = null
    emit(s, 'GAME_ENDED')
  }
}
export function basicActions(s: GameState, actor: string): LegalAction[] {
  if (s.scope !== 'BASIC_TURNS' || s.result || actor !== s.activePlayerId) return []
  if (['REFRESH', 'DRAW', 'DON', 'END'].includes(s.phase)) return [{ type: 'ADVANCE_PHASE' }]
  if (s.phase !== 'MAIN') return []
  const p = player(s)
  const eligibleDonIds = p.zones.cost.filter(id => !s.instances[id].rested)
  const actions: LegalAction[] = [{ type: 'END_MAIN' }]
  for (const id of p.zones.hand) {
    const d = definition(s, id)!
    if (!['CHARACTER', 'STAGE'].includes(d.category) || d.cost === null) continue
    const cost = evaluateCharacteristics(s, id).cost.current
    if (cost === null || cost > eligibleDonIds.length) continue
    const zone = d.category === 'CHARACTER' ? p.zones.characters : p.zones.stage
    const requiresReplacement = zone.length === (d.category === 'CHARACTER' ? 5 : 1)
    actions.push({ type: 'PLAY_CARD', instanceId: id, cost, eligibleDonIds: [...eligibleDonIds], replacementIds: requiresReplacement ? [...zone] : [], requiresReplacement })
  }
  if (eligibleDonIds.length) actions.push({ type: 'ATTACH_DON', eligibleDonIds, targetIds: [...p.zones.leader, ...p.zones.characters] })
  return actions
}
export function applyBasicTurn(s: GameState, command: TurnIntent): void {
  const p = player(s)
  processDefeat(s)
  if (s.result) return
  if (command.type === 'ADVANCE_PHASE') {
    // Phase boundaries are reserved for future mandatory-effect windows. Unsupported effects are not admitted.
    if (s.phase === 'REFRESH') {
      for (const id of [...p.zones.attached]) { move(s, id, 'cost'); s.instances[id].rested = true }
      for (const id of [...p.zones.leader, ...p.zones.characters, ...p.zones.stage, ...p.zones.cost]) s.instances[id].rested = false
      emit(s, 'REFRESHED'); s.phase = 'DRAW'
    } else if (s.phase === 'DRAW') {
      if (p.id === s.firstPlayerId && p.turns === 1) emit(s, 'DRAW_SKIPPED')
      else { move(s, p.zones.deck[0], 'hand'); emit(s, 'DRAWN') }
      processDefeat(s)
      if (!s.result) s.phase = 'DON'
    } else if (s.phase === 'DON') {
      const count = Math.min(p.zones.donDeck.length, p.id === s.firstPlayerId && p.turns === 1 ? 1 : 2)
      for (let n = 0; n < count; n++) { const id = p.zones.donDeck[0]; move(s, id, 'cost'); s.instances[id].rested = false }
      emit(s, 'DON_ADDED'); s.phase = 'MAIN'
    } else if (s.phase === 'END') {
      // No modifier or automatic ability exists in this admitted subset: no invented cleanup.
      emit(s, 'TURN_ENDED')
      s.activePlayerId = s.players.find(v => v.id !== p.id)!.id; s.turn++
      player(s).turns++; s.phase = 'REFRESH'
    } else throw new Error('ILLEGAL_PHASE')
  } else if (command.type === 'END_MAIN') {
    if (s.phase !== 'MAIN') throw new Error('ILLEGAL_PHASE')
    emit(s, 'MAIN_ENDED'); s.phase = 'END'
  } else if (command.type === 'PLAY_CARD') {
    const i = s.instances[command.instanceId]
    const d = definition(s, command.instanceId)
    if (s.phase !== 'MAIN' || !i || i.owner !== p.id || i.zone !== 'hand' || !d || !['CHARACTER', 'STAGE'].includes(d.category) || d.cost === null) throw new Error('INVALID_CARD_TO_PLAY')
    if (command.donIds.length !== evaluateCharacteristics(s, i.id).cost.current || new Set(command.donIds).size !== command.donIds.length || command.donIds.some(id => !p.zones.cost.includes(id) || s.instances[id].rested)) throw new Error('INVALID_PAYMENT')
    const field = d.category === 'CHARACTER' ? p.zones.characters : p.zones.stage
    const full = field.length === (d.category === 'CHARACTER' ? 5 : 1)
    if (d.category === 'CHARACTER' && (full ? command.replaceId === null || !field.includes(command.replaceId) : command.replaceId !== null)) throw new Error('INVALID_REPLACEMENT')
    if (d.category === 'STAGE' && command.replaceId !== null && (!full || command.replaceId !== field[0])) throw new Error('INVALID_REPLACEMENT')
    const context:EffectContext={controllerId:p.id,source:{kind:'CARD',definitionId:i.definitionId!,presence:{instanceId:i.id,generation:i.zoneGeneration}},effectInstanceId:`${s.gameId}:turn:${s.turn}:command:${s.version}`,turnId:s.turn,windowId:`${s.gameId}:main:${s.turn}`}
    if (s.effects && ['1.2.0','1.3.0'].includes(s.effects.version) && preflightCosts(s,{kind:'REST_DON',amount:command.donIds.length},context)!=='PAID') throw new Error('INVALID_PAYMENT')
    if (s.effects && ['1.2.0','1.3.0'].includes(s.effects.version)) s.events.push({sequence:s.events.length,type:'CARD_REVEALED',actorId:p.id,revealedCard:{definitionId:i.definitionId!,printingKey:i.printingKey!}})
    else emit(s, 'CARD_REVEALED', i.id)
    if (s.effects && ['1.2.0','1.3.0'].includes(s.effects.version)) {
      const before=s.effects.operations!.length
      let interrupted=false
      for (const id of command.donIds) if (!confirmRest(s,{instanceId:id,generation:s.instances[id].zoneGeneration},context)) interrupted=true
      s.effects.payments!.push({resolutionId:context.effectInstanceId,outcome:interrupted?'INTERRUPTED':'PAID',paidOperationIds:s.effects.operations!.slice(before).filter(o=>o.outcome==='CONFIRMED').map(o=>o.id)})
      if (interrupted) return
    } else for (const id of command.donIds) s.instances[id].rested = true
    if (full) trash(s, d.category === 'STAGE' ? field[0] : command.replaceId!)
    move(s, i.id, d.category === 'CHARACTER' ? 'characters' : 'stage')
    i.rested = false; i.playedOnTurn = s.turn
    emit(s, 'CARD_PLAYED', i.id)
  } else {
    if (s.phase !== 'MAIN' || ![...p.zones.leader, ...p.zones.characters].includes(command.targetId)) throw new Error('INVALID_DON_TARGET')
    if (!command.donIds.length || new Set(command.donIds).size !== command.donIds.length || command.donIds.some(id => !p.zones.cost.includes(id) || s.instances[id].rested)) throw new Error('INVALID_DON_ATTACHMENT')
    for (const id of command.donIds) { move(s, id, 'attached', command.targetId); emit(s, 'DON_ATTACHED', id) }
  }
  processDefeat(s)
}
export function effectivePower(s: GameState, id: string): number | null {
  return evaluateCharacteristics(s, id).power.current
}
