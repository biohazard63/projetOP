import test from 'node:test'
import assert from 'node:assert/strict'
import { fullGameInput } from '../scripts/game/m3-full-game'
import { createGame, applyCommand, getLegalActions, projectState, restoreGame } from '../src/game/core/game'
import { assertGameInvariants } from '../src/game/core/invariants'
import { createSecureSeed, MAX_SEED } from '../src/lib/engine/seed'
import type { Command, GameState } from '../src/game/core/types'

// M4-I1: concession (CR 1.2.1 §1-2-3, §1-2-4) and server seed.
type Intent = Command extends infer C ? C extends Command ? Omit<C,'id'|'actorId'|'expectedVersion'> : never : never
const attempt=(s:GameState,actorId:string,intent:Intent,id=`e-${s.version}`)=>applyCommand(s,{...intent,actorId,id,expectedVersion:s.version} as Command)
function send(s:GameState,actorId:string,intent:Intent) {const r=attempt(s,actorId,intent);assert.ok(r.ok,r.ok?'':`${intent.type}:${r.error}`);return r.state}
function opened() { let s=createGame(fullGameInput(77)); s=send(s,'alice',{type:'CHOOSE_FIRST',choice:'FIRST'}); for (let n=0;n<2;n++) s=send(s,s.decisionPlayerId!,{type:'MULLIGAN',redraw:false}); return s }
const toMain=(s:GameState)=>{while(s.phase!=='MAIN') s=send(s,s.activePlayerId!,{type:'ADVANCE_PHASE'});return s}
function conceded(s:GameState,loser:string) {
  const t=send(s,loser,{type:'CONCEDE'}), winner=loser==='alice'?'bob':'alice'
  assert.deepEqual(t.result,{reason:'CONCESSION',loserIds:[loser],winnerId:winner})
  assert.equal(t.events.at(-1)!.type,'GAME_ENDED'); assert.equal(t.events.at(-1)!.actorId,loser)
  for (const p of ['alice','bob']) assert.deepEqual(getLegalActions(t,p),[])
  assert.equal(attempt(t,winner,{type:'END_MAIN'}).ok,false); assert.equal(attempt(t,winner,{type:'CONCEDE'}).ok,false,'a finished game cannot be conceded again')
  assertGameInvariants(t); assert.deepEqual(restoreGame(JSON.stringify(t)),t)
  assert.deepEqual(projectState(t,winner).result,t.result)
  return t
}

test('M4-I1: CONCEDE ends the game at once for the conceding player, in any window, and is idempotent', () => {
  const choose=createGame(fullGameInput(77))
  conceded(choose,'bob')
  const mulligan=send(choose,'alice',{type:'CHOOSE_FIRST',choice:'FIRST'})
  conceded(mulligan,'bob')
  let s=toMain(opened())
  conceded(s,'alice')
  conceded(s,'bob')
  s=send(s,'alice',{type:'END_MAIN'}); s=toMain(s); s=send(s,'bob',{type:'END_MAIN'}); s=toMain(s)
  s=send(s,'alice',{type:'DECLARE_ATTACK',attackerId:s.players[0].zones.leader[0],targetId:s.players[1].zones.leader[0]})
  const inBattle=conceded(s,'bob')
  assert.ok(inBattle.battle,'the pending battle is simply abandoned')
  const cmd={id:'concede-once',actorId:'bob',expectedVersion:s.version,type:'CONCEDE'} as Command
  const first=applyCommand(s,cmd); assert.ok(first.ok); if(!first.ok) return
  const replay=applyCommand(first.state,cmd); assert.ok(replay.ok&&replay.replayed); assert.deepEqual(replay.state,first.state)
})

test('M4-I1: CONCEDE is never a listed legal action and is refused outside a playing scope or with extra fields', () => {
  const s=toMain(opened())
  for (const p of ['alice','bob']) assert.equal(getLegalActions(s,p).some(a=>(a.type as string)==='CONCEDE'),false)
  assert.equal(applyCommand(s,{id:'x',actorId:'alice',expectedVersion:s.version,type:'CONCEDE',winnerId:'alice'} as unknown as Command).ok,false)
  assert.equal(applyCommand(s,{id:'x',actorId:'mallory',expectedVersion:s.version,type:'CONCEDE'} as Command).ok,false)
  const vanilla=[{printingKey:'ST01-001::standard',quantity:1},...['ST01-003','ST01-008','ST01-009','ST01-010','OP01-010','OP01-012','OP01-018','OP01-023','P-012','P-016','ST01-006','ST01-007'].map(n=>({printingKey:`${n}::standard`,quantity:4})),{printingKey:'P-015::standard',quantity:2}]
  const setup=createGame({...fullGameInput(77),scope:'SETUP_ONLY',effectRegistry:undefined,players:[{id:'alice',cards:vanilla,donCount:10},{id:'bob',cards:structuredClone(vanilla),donCount:10}]})
  assert.equal(attempt(setup,'alice',{type:'CONCEDE'}).ok,false)
})

test('M4-I1: server seeds come from a CSPRNG within the engine range and are not reproduced', () => {
  const seeds=Array.from({length:64},()=>createSecureSeed())
  assert.ok(seeds.every(seed=>Number.isSafeInteger(seed)&&seed>=1&&seed<=MAX_SEED))
  assert.ok(new Set(seeds).size>=63)
  const s=createGame(fullGameInput(seeds[0]))
  for (const viewer of ['alice','bob']) { const view=JSON.stringify(projectState(s,viewer)); assert.equal(view.includes('"random"'),false); assert.equal(view.includes(String(seeds[0])),false,'the seed never reaches a projection') }
})
