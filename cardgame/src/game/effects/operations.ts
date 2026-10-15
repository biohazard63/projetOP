import type { GameState, Zone } from '../core/types'
import type { Cost, EffectContext, PaymentOutcome, UnifiedOperation } from './contracts'
const next=(s:GameState,kind:string)=>`${s.gameId}:fx:${kind}:${s.effects!.nextId++}`
export function recordOperation(s:GameState,op:UnifiedOperation):void { s.effects!.operations!.push(structuredClone(op)) }
// The replacement decision is made before calling this commit boundary. The
// same discriminated operation and validation path serve costs and effects.
/** "When a DON!! card on your field is returned to your DON!! deck" (any cause, FAQ ST10-007): announced only for games whose
 * registry listens to it, so that other games keep their historical public event sequence. */
export function noteDonReturned(s:GameState,ownerId:string,resolutionId:string):void {
 if (!(s.effects?.version==='1.3.0' && s.effects.registry.definitions.some(d=>d.timing==='ON_DON_RETURNED'))) return
 const causes=s.effects.donReturnCauses ?? (s.effects.donReturnCauses=[])
 causes.push({sequence:s.events.length,resolutionId,playerId:ownerId}); if (causes.length>64) causes.splice(0,causes.length-64)
 s.events.push({sequence:s.events.length,type:'DON_RETURNED',actorId:ownerId})
}
export function processOperation(s:GameState,op:UnifiedOperation,details:{rested?:boolean;targetId?:string}={}):boolean {
 const i=s.instances[op.subject.instanceId],p=i && s.players.find(p=>p.id===i.owner)
 if (!i || !p || i.zoneGeneration!==op.subject.generation || !s.players.some(p=>p.id===op.controllerId)) throw new Error('EFFECT_OPERATION_UNAVAILABLE')
 if (op.type==='REST') {
  if (i.rested || i.controller!==op.controllerId || !['leader','characters','stage','cost'].includes(i.zone)) return false
  if (s.effects!.registry.restrictions.some(rule=>rule.playerId===i.controller && rule.prohibited==='REST' && (rule.afterRestedDon===undefined || p.zones.cost.filter(id=>s.instances[id].rested).length>=rule.afterRestedDon))) { recordOperation(s,{...op,outcome:'PREVENTED'});return false }
  i.rested=true
 } else if (op.type==='ADD_POWER') {
  if (i.kind!=='CARD' || !['leader','characters'].includes(i.zone) || op.amount===undefined) throw new Error('EFFECT_OPERATION_UNAVAILABLE')
 } else {
  if (!op.from || !op.to || i.zone!==op.from || !Object.hasOwn(p.zones,op.to) || !p.zones[i.zone].includes(i.id) || op.from===op.to) throw new Error('EFFECT_OPERATION_UNAVAILABLE')
  const to=op.to as Zone // Object.hasOwn checked the authoritative zone record.
  p.zones[i.zone].splice(p.zones[i.zone].indexOf(i.id),1);p.zones[to].push(i.id)
  i.zone=to;i.zoneGeneration++;i.rested=details.rested??false;i.attachedTo=details.targetId??null;i.faceUp=['leader','characters','stage','trash','cost','attached'].includes(to)
  if (!['leader','characters','stage'].includes(to)) i.playedOnTurn=null
 }
 recordOperation(s,{...op,outcome:'CONFIRMED'})
 if (op.type==='MOVE_DON' && op.to==='donDeck' && op.from!=='donDeck') noteDonReturned(s,i.owner,op.resolutionId)
 return true
}
export function confirmRest(s:GameState,subject:{instanceId:string;generation:number},context:EffectContext):boolean {
 return processOperation(s,{id:next(s,'operation'),resolutionId:context.effectInstanceId,subject,controllerId:context.controllerId,type:'REST',intent:'COST',outcome:'CONFIRMED'})
}
export function confirmRestOperation(s:GameState,subject:{instanceId:string;generation:number},controllerId:string,resolutionId:string,intent:'COST'|'RULE'):boolean {
 return processOperation(s,{id:next(s,'operation'),resolutionId,subject,controllerId,type:'REST',intent,outcome:'CONFIRMED'})
}
export function confirmMoveOperation(s:GameState,subject:{instanceId:string;generation:number},controllerId:string,resolutionId:string,from:Zone,to:Zone,intent:'COST'|'EFFECT'|'RULE'):boolean {
 return processOperation(s,{id:next(s,'operation'),resolutionId,subject,controllerId,type:'MOVE_CARD',intent,outcome:'CONFIRMED',from,to})
}
export function confirmPower(s:GameState,subject:{instanceId:string;generation:number},amount:number,context:EffectContext):void {
 const id=next(s,'operation')
 processOperation(s,{id,resolutionId:context.effectInstanceId,subject,controllerId:context.controllerId,type:'ADD_POWER',intent:'EFFECT',outcome:'CONFIRMED',amount})
 s.effects!.powerModifiers!.push({id:next(s,'modifier'),subject:structuredClone(subject),source:structuredClone(context.source),amount,turnId:s.turn})
}
function plannedSubjects(s:GameState,cost:Cost,context:EffectContext):string[] | null {
 if (cost.kind==='ALTERNATIVE') throw new Error('ALTERNATIVE_COST_NOT_IMPLEMENTED')
 const p=s.players.find(p=>p.id===context.controllerId)
 if (!p) return null
 const reserved=new Set<string>(), ids:string[]=[]
 for (const part of cost.kind==='SEQUENCE'?cost.parts:[cost]) {
  if (part.kind==='NONE') continue
  if (part.kind==='DON_MINUS') return null // needs the player's explicit DON!! selection (payCosts)
  if (part.kind==='REST_DON') {
   const available=p.zones.cost.filter(id=>!s.instances[id].rested && !reserved.has(id))
   if (available.length<part.amount) return null
   for (const id of available.slice(0,part.amount)) { reserved.add(id);ids.push(id) }
  } else {
   const source=context.source,i=source.kind==='CARD'?s.instances[source.presence.instanceId]:undefined
   // M6 "cannot be rested": a "rest this card" cost cannot be paid (FAQ EB02-011).
   const locked=!!s.effects?.restLocks?.some(l=>l.subject.instanceId===i?.id && l.subject.generation===i?.zoneGeneration && s.turn<l.untilTurn)
   if (!i || source.kind!=='CARD' || i.zoneGeneration!==source.presence.generation || i.controller!==p.id || !['leader','characters','stage'].includes(i.zone) || i.rested || locked || reserved.has(i.id)) return null
   reserved.add(i.id);ids.push(i.id)
  }
 }
 return ids
}
// CR 1.2.1 §10-2-10-1: DON!! cards on the field are those in the cost area and those given to the Leader or Characters.
export function fieldDon(s:GameState,playerId:string):string[] {
 const p=s.players.find(p=>p.id===playerId)
 return p ? [...p.zones.cost,...p.zones.attached].filter(id=>s.instances[id]?.kind==='DON') : []
}
export function preflightCosts(s:GameState,cost:Cost,context:EffectContext):PaymentOutcome {
 if (cost.kind==='DON_MINUS') {
  // A MOVE_DON prohibition on the player makes the return impossible from the start; nothing is paid.
  if (fieldDon(s,context.controllerId).length<cost.amount || s.effects!.registry.restrictions.some(rule=>rule.playerId===context.controllerId && rule.prohibited==='MOVE_DON')) return 'INITIAL_UNPAYABLE'
  return 'PAID'
 }
 const ids=plannedSubjects(s,cost,context)
 if (!ids) return 'INITIAL_UNPAYABLE'
 // Check prohibitions in the initial state. Later restrictions can interrupt an
 // initially feasible sequence; that is not an exception or a global rollback.
 const p=s.players.find(p=>p.id===context.controllerId)!
 if (ids.length && s.effects!.registry.restrictions.some(rule=>rule.playerId===p.id && rule.prohibited==='REST' && (rule.afterRestedDon===undefined || p.zones.cost.filter(id=>s.instances[id].rested).length>=rule.afterRestedDon))) return 'INITIAL_UNPAYABLE'
 return 'PAID'
}
export function payCosts(s:GameState,cost:Cost,context:EffectContext,donMinusIds?:string[]):PaymentOutcome {
 if (cost.kind==='DON_MINUS') {
  const field=new Set(fieldDon(s,context.controllerId))
  if (!donMinusIds || donMinusIds.length!==cost.amount || new Set(donMinusIds).size!==donMinusIds.length || donMinusIds.some(id=>!field.has(id))) throw new Error('INVALID_DON_MINUS_SELECTION')
  if (preflightCosts(s,cost,context)!=='PAID') return 'INITIAL_UNPAYABLE'
  const before=s.effects!.operations!.length
  let outcome:PaymentOutcome='PAID'
  for (const id of donMinusIds) {
   const don=s.instances[id]
   if (!processOperation(s,{id:next(s,'operation'),resolutionId:context.effectInstanceId,subject:{instanceId:id,generation:don.zoneGeneration},controllerId:context.controllerId,type:'MOVE_DON',intent:'COST',outcome:'CONFIRMED',from:don.zone,to:'donDeck'})) { outcome='INTERRUPTED'; break }
  }
  s.effects!.payments!.push({resolutionId:context.effectInstanceId,outcome,paidOperationIds:s.effects!.operations!.slice(before).filter(o=>o.outcome==='CONFIRMED').map(o=>o.id)})
  return outcome
 }
 if (donMinusIds?.length) throw new Error('INVALID_DON_MINUS_SELECTION')
 if (preflightCosts(s,cost,context)!=='PAID') return 'INITIAL_UNPAYABLE'
 const before=s.effects!.operations!.length,ids=plannedSubjects(s,cost,context)!
 let outcome:PaymentOutcome='PAID'
 for (const id of ids) if (!confirmRest(s,{instanceId:id,generation:s.instances[id].zoneGeneration},context)) outcome='INTERRUPTED'
 s.effects!.payments!.push({resolutionId:context.effectInstanceId,outcome,paidOperationIds:s.effects!.operations!.slice(before).filter(o=>o.outcome==='CONFIRMED').map(o=>o.id)})
 return outcome
}
