import test from 'node:test'
import assert from 'node:assert/strict'
import { fullGameInput, leakedIds } from '../scripts/game/m3-full-game'
import { OFFICIAL_ABILITY_REGISTRY } from '../src/game/cards/officialAbilities'
import { M0_GIVE_DON_PROGRAMS } from '../src/game/cards/m0Programs'
import { createGame, applyCommand, getLegalActions, restoreGame } from '../src/game/core/game'
import { assertGameInvariants } from '../src/game/core/invariants'
import { evaluateCharacteristics } from '../src/game/effects/characteristics'
import type { Command, GameState, LegalAction } from '../src/game/core/types'

// M3-4 cross-set scenarios in a legal purple (ST-04/OP-01/OP-02/OP-04) vs red (ST-01/OP-01/OP-06/P) game.
// Fixture edits only reorder hidden zones before play (swap card positions, counts unchanged); every game
// action is a public command, each intermediate state is restored from JSON, and projections are checked.
type Intent = Command extends infer C ? C extends Command ? Omit<C,'id'|'actorId'|'expectedVersion'> : never : never
function attempt(s:GameState,actorId:string,intent:Intent,id=`m3-4-${s.version}`) {return applyCommand(s,{...intent,actorId,id,expectedVersion:s.version})}
function send(s:GameState,actorId:string,intent:Intent) {
  const r=attempt(s,actorId,intent);assert.ok(r.ok,r.ok?'':`${intent.type}:${r.error}`)
  const restored=restoreGame(JSON.stringify(r.state));assert.deepEqual(restored,r.state)
  for(const viewer of ['alice','bob']) assert.deepEqual(leakedIds(restored,viewer),[],`${viewer} after ${intent.type}`)
  return restored
}
const numberOf=(s:GameState,id:string)=>s.catalog.definitions.find(d=>d.definitionId===s.instances[id]?.definitionId)?.number
const of=<T extends LegalAction['type']>(s:GameState,actor:string,type:T)=>getLegalActions(s,actor).filter((a):a is Extract<LegalAction,{type:T}>=>a.type===type)
function opened(seed=77) {
  let s=createGame(fullGameInput(seed))
  s=send(s,'alice',{type:'CHOOSE_FIRST',choice:'FIRST'})
  for (let n=0;n<2;n++) s=send(s,s.decisionPlayerId!,{type:'MULLIGAN',redraw:false})
  return s
}
const toMain=(s:GameState)=>{while(s.phase!=='MAIN') s=send(s,s.activePlayerId!,{type:'ADVANCE_PHASE'});return s}
const passTurn=(s:GameState)=>toMain(send(s,s.activePlayerId!,{type:'END_MAIN'}))
// Swaps the first copy of `number` found in the player's deck with the card at `zone[index]` (hidden zones only).
function swapIn(s:GameState,player:number,number:string,zone:'hand'|'life',index=0) {
  const p=s.players[player], from=p.zones.deck.findIndex(id=>numberOf(s,id)===number); assert.ok(from>=0,number)
  const card=p.zones.deck[from], out=p.zones[zone][index]
  p.zones.deck[from]=out; p.zones[zone][index]=card
  s.instances[card].zone=zone; s.instances[card].zoneGeneration++; s.instances[out].zone='deck'; s.instances[out].zoneGeneration++
  assertGameInvariants(s); return card
}

test('M3-4: red OP06-009 Shuraiya blocks purple Kaido, copies its Leader power On Block, and ST01-014 Guard Point saves it', () => {
  let s=opened()
  const shuraiya=swapIn(s,1,'OP06-009','hand',0), guard=swapIn(s,1,'ST01-014','hand',1)
  s=toMain(s); s=passTurn(passTurn(passTurn(s)))
  assert.equal(s.turn,4); assert.equal(s.activePlayerId,'bob')
  s=send(s,'bob',{type:'PLAY_CARD',instanceId:shuraiya,donIds:s.players[1].zones.cost.slice(0,3),replaceId:null})
  s=passTurn(s)
  const alice=s.players[0], kaido=alice.zones.leader[0]
  s=send(s,'alice',{type:'ATTACH_DON',donIds:alice.zones.cost.slice(0,2),targetId:kaido})
  assert.equal(evaluateCharacteristics(s,kaido).power.current,7000)
  s=send(s,'alice',{type:'DECLARE_ATTACK',attackerId:kaido,targetId:s.players[1].zones.leader[0]})
  const block=of(s,'bob','ACTIVATE_BLOCKER')[0]; assert.ok(block?.blockerIds.includes(shuraiya))
  s=send(s,'bob',{type:'ACTIVATE_BLOCKER',blockerId:shuraiya,battleId:s.battle!.id})
  assert.equal(s.battle!.target.instanceId,shuraiya)
  assert.equal(evaluateCharacteristics(s,shuraiya).power.base,7000,'On Block: base power becomes the opponent Leader power (FAQ OP06-009: copied when activated)')
  assert.equal(s.battle!.step,'COUNTER')
  s=send(s,'bob',{type:'PLAY_COUNTER_EVENT',cardId:guard,battleId:s.battle!.id,paymentDonIds:s.players[1].zones.cost.filter(id=>!s.instances[id].rested).slice(0,1),donMinusIds:[],targetId:null})
  const q=s.effects!.choice!
  s=send(s,'bob',{type:'ANSWER_CHOICE',choiceId:q.id,tokens:[q.options.find(o=>o.presence.instanceId===shuraiya)!.token]})
  s=send(s,'bob',{type:'PASS_COUNTER',battleId:s.battle!.id})
  s=send(s,'alice',{type:'RESOLVE_BATTLE',battleId:s.battle!.id})
  assert.equal(s.battle,null); assert.equal(s.instances[shuraiya].zone,'characters','7000 against 7000 + 3000: the blocker survives')
  assert.equal(s.instances[shuraiya].rested,true); assert.equal(s.players[1].zones.life.length,5)
})

test('M3-4: purple damage reveals the red OP06-013 [Trigger], whose private search is answered across JSON restores before Life damage resumes', () => {
  let s=opened()
  const luffy=swapIn(s,1,'OP06-013','life',0)
  s=passTurn(passTurn(toMain(s)))
  assert.equal(s.turn,3)
  s=send(s,'alice',{type:'DECLARE_ATTACK',attackerId:s.players[0].zones.leader[0],targetId:s.players[1].zones.leader[0]})
  s=send(s,'bob',{type:'PASS_BLOCKER',battleId:s.battle!.id})
  s=send(s,'bob',{type:'PASS_COUNTER',battleId:s.battle!.id})
  s=send(s,'alice',{type:'RESOLVE_BATTLE',battleId:s.battle!.id})
  const prompt=of(s,'bob','ANSWER_TRIGGER')[0]; assert.ok(prompt); assert.equal(of(s,'alice','ANSWER_TRIGGER').length,0)
  s=send(s,'bob',{type:'ANSWER_TRIGGER',choiceId:prompt.choiceId,activate:true})
  assert.ok(s.events.some(e=>e.type==='TRIGGER_ACTIVATED'&&e.publicInstanceId===luffy))
  const select=s.effects!.choice!; assert.equal(select.visibility,'PRIVATE'); assert.equal(select.actorId,'bob')
  assert.equal(of(s,'alice','ANSWER_CHOICE').length,0); assert.equal(of(s,'alice','CONTINUE_LIFE_DAMAGE').length,0,'Life damage waits for the deferred choice')
  s=send(s,'bob',{type:'ANSWER_CHOICE',choiceId:select.id,tokens:select.options.slice(0,1).map(o=>o.token)})
  const order=s.effects!.choice!
  s=send(s,'bob',{type:'ANSWER_CHOICE',choiceId:order.id,tokens:order.options.map(o=>o.token)})
  assert.equal(s.battle!.step,'LIFE_CONTINUE')
  s=send(s,'alice',{type:'CONTINUE_LIFE_DAMAGE',battleId:s.battle!.id})
  assert.equal(s.battle,null); assert.equal(s.players[1].zones.life.length,4); assert.equal(s.instances[luffy].zone,'trash')
})

test('M3-4: Kaido trashing a Life card with [Trigger] is not damage: no Trigger window opens and the Life count drops by one', () => {
  let s=opened()
  const guard=swapIn(s,1,'ST01-014','life',0)
  s=toMain(s); while(!(s.activePlayerId==='alice'&&s.players[0].zones.cost.length>=7)) s=passTurn(s)
  const kaido=of(s,'alice','START_EFFECT').find(a=>a.effectId.startsWith('ST04-001.'))!
  s=send(s,'alice',{type:'START_EFFECT',effectId:kaido.effectId,donMinusIds:kaido.donMinus!.eligibleDonIds.slice(0,7)})
  const q=of(s,'alice','ANSWER_CHOICE')[0]
  s=send(s,'alice',{type:'ANSWER_CHOICE',choiceId:q.choiceId,tokens:[q.options[0].token]})
  assert.equal(s.instances[guard].zone,'trash'); assert.equal(s.battle,null)
  assert.equal(s.events.some(e=>e.type==='TRIGGER_ACTIVATED'),false); assert.equal(of(s,'bob','ANSWER_TRIGGER').length,0)
  assert.equal(s.players[1].zones.life.length,4)
})

test('M3-4: a MOVE_DON prohibition refuses Blast Breath DON!! -1 like Kaido DON!! -7, while the printed Counter stays playable without it', () => {
  let s=opened()
  const blast=swapIn(s,0,'ST04-016','hand',0)
  s=passTurn(passTurn(passTurn(toMain(s))))
  assert.equal(s.activePlayerId,'bob')
  s=send(s,'bob',{type:'DECLARE_ATTACK',attackerId:s.players[1].zones.leader[0],targetId:s.players[0].zones.leader[0]})
  s=send(s,'alice',{type:'PASS_BLOCKER',battleId:s.battle!.id})
  s.effects!.registry.restrictions.push({id:'no-don-move',playerId:'alice',prohibited:'MOVE_DON'})
  const don=s.players[0].zones.cost.find(id=>!s.instances[id].rested)!
  const before=JSON.stringify(s), refused=attempt(s,'alice',{type:'PLAY_COUNTER_EVENT',cardId:blast,battleId:s.battle!.id,paymentDonIds:[don],donMinusIds:[don],targetId:null})
  assert.equal(refused.ok,false); if(!refused.ok) assert.equal(refused.error,'COUNTER_EVENT_DON_MINUS_UNAVAILABLE'); assert.equal(JSON.stringify(s),before)
  const played=attempt(s,'alice',{type:'PLAY_COUNTER_EVENT',cardId:blast,battleId:s.battle!.id,paymentDonIds:[don],donMinusIds:[],targetId:null})
  assert.ok(played.ok); if(!played.ok) return
  assert.equal(played.state.instances[blast].zone,'trash'); assert.equal(played.state.battle!.counterModifiers.length,0,'without DON!! -1 the effect does not apply')
})

test('M3-4: the red ST01-001 Leader ability is executable in the M3 game and a 1.3.0 registry without its program is refused', () => {
  let s=opened()
  const karoo=swapIn(s,1,'ST01-003','hand',0)
  s=passTurn(toMain(s))
  assert.equal(s.activePlayerId,'bob')
  s=send(s,'bob',{type:'PLAY_CARD',instanceId:karoo,donIds:s.players[1].zones.cost.slice(0,1),replaceId:null})
  const start=of(s,'bob','START_EFFECT').find(a=>a.effectId.startsWith('ST01-001.'))
  assert.ok(start,'[Activate: Main] is offered')
  s=send(s,'bob',{type:'START_EFFECT',effectId:start.effectId})
  const dons=s.effects!.choice!
  s=send(s,'bob',{type:'ANSWER_CHOICE',choiceId:dons.id,tokens:[dons.options[0].token]})
  const target=s.effects!.choice!, leader=s.players[1].zones.leader[0]
  s=send(s,'bob',{type:'ANSWER_CHOICE',choiceId:target.id,tokens:[target.options.find(o=>o.presence.instanceId===leader)!.token]})
  const given=s.players[1].zones.attached.find(id=>s.instances[id].attachedTo===leader)!
  assert.ok(given); assert.equal(s.instances[given].rested,true,'the given DON!! stays rested')
  assert.equal(of(s,'bob','START_EFFECT').some(a=>a.effectId.startsWith('ST01-001.')),false,'[Once Per Turn]')
  const input=fullGameInput()
  input.effectRegistry!.definitions=input.effectRegistry!.definitions.filter(d=>!M0_GIVE_DON_PROGRAMS.some(p=>p.id===d.id))
  assert.ok(OFFICIAL_ABILITY_REGISTRY.definitions.some(d=>d.id==='ST01-001.activate-main-give-rested-don'),'the shared programs are part of the official registry')
  assert.throws(()=>createGame(input),/UNSUPPORTED_SETUP_EFFECT/,'an ability without an executable program is refused, never ignored')
})
