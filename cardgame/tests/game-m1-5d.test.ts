import test from 'node:test'
import assert from 'node:assert/strict'
import { validateRegistry } from '../src/game/effects/contracts'
import { PROTOTYPE_REGISTRY, prototypeCards } from '../src/game/cards/effectPrototype'
const modern = () => ({ ...structuredClone(PROTOTYPE_REGISTRY), version: '1.2.0', dslVersion: '1.2.0', definitions: PROTOTYPE_REGISTRY.definitions.map(d => ({ ...structuredClone(d), dslVersion: '1.2.0' })) })
test('M15D accepts versioned existing definitions and ON_KO', () => {
  const r = modern(); const d = { ...r.definitions[2], timing: 'ON_KO' }; assert.equal(validateRegistry({ ...r, definitions: [d] }).version, '1.2.0')
})
test('M15D preserves old registry and refuses legacy ON_KO', () => {
  assert.deepEqual(validateRegistry(PROTOTYPE_REGISTRY), PROTOTYPE_REGISTRY)
  const r = structuredClone(PROTOTYPE_REGISTRY); assert.throws(() => validateRegistry({ ...r, definitions: [{ ...r.definitions[0], timing: 'ON_KO' }] }))
})
test('M15D rejects unknown primitives and incompatible versions', () => {
  assert.throws(() => validateRegistry({ ...modern(), version: '2.0.0' }))
  assert.throws(() => validateRegistry({ ...modern(), definitions: [{ ...modern().definitions[0], program: [{ kind: 'OPERATION', operation: { primitive: 'unknown' } }] }] }), /UNKNOWN_EFFECT_PRIMITIVE/)
})

import { nextTriggers, completeScheduledTrigger } from '../src/game/effects/scheduler'
import type { SchedulerState, ScheduledTrigger } from '../src/game/effects/contracts'
const trigger = (id: string, actor: string): ScheduledTrigger => ({ id, definitionId: id, revision: '1', controllerId: actor, source: { kind: 'SYNTHETIC', extension: 'TEST-FUTURE-SET' }, causeId: 'cause', timing: 'ON_PLAY', status: 'PENDING', activatedOnField: false })
test('M15D scheduler retains initial B before cascade C and active player first', () => {
 const q: SchedulerState = { batches: [{ id: 'initial', activePlayerId: 'alice', triggers: [trigger('B', 'bob'), trigger('A', 'alice')] }, { id: 'cascade', activePlayerId: 'alice', triggers: [trigger('C', 'alice')] }], history: [], orderChoice: null, resolvingId: null }
 assert.deepEqual(nextTriggers(q).map(t => t.id), ['A']); q.batches[0].triggers[1].status = 'RESOLVING'; q.resolvingId = 'A'; completeScheduledTrigger(q)
 assert.deepEqual(nextTriggers(q).map(t => t.id), ['B']); q.batches[0].triggers[0].status = 'RESOLVING'; q.resolvingId = 'B'; completeScheduledTrigger(q)
 assert.deepEqual(nextTriggers(q).map(t => t.id), ['C']); assert.deepEqual(JSON.parse(JSON.stringify(q)), q)
})

import { writeFileSync } from 'node:fs'
import { createGame, applyCommand, getLegalActions, restoreGame, projectState, assertGameInvariants, evaluateCharacteristics, type GameState, type Command } from '../src/game/core'
import { consolidateDefinitions } from '../src/game/cards/adapter'
import { REVIEWED_CARDS } from '../src/game/cards/reviewedCards'
import { SCHEDULING_REGISTRY, schedulingCards } from '../src/game/cards/effectScheduling'
import { type EffectRegistry } from '../src/game/effects/contracts'
import { M0_RULESET } from '../src/game/rulesets/m0'
import type { CardInput } from '../src/game/cards/types'

type Intent = Command extends infer C ? C extends Command ? Omit<C, 'id' | 'actorId' | 'expectedVersion'> : never : never
function envelope(s: GameState, intent: Intent, actor = s.decisionPlayerId ?? s.activePlayerId!): Command { return { ...intent, actorId: actor, id: `c-${s.version}`, expectedVersion: s.version } }
function accept(s: GameState, intent: Intent, actor?: string) { const r = applyCommand(s, envelope(s, intent, actor)); if (!r.ok) assert.fail(r.error); assertGameInvariants(r.state); return r.state }
function reject(s: GameState, raw: unknown, error?: string) { const before = JSON.stringify(s), r = applyCommand(s, raw); assert.equal(r.ok, false); if (!r.ok && error) assert.equal(r.error, error); assert.equal(JSON.stringify(s), before) }
function input(registry: EffectRegistry = structuredClone(SCHEDULING_REGISTRY), seed = 16, sabo = false) {
  const bundle = registry.version === '1.1.0' ? prototypeCards() : schedulingCards()
  const extra: CardInput[] = Object.entries(REVIEWED_CARDS).filter(([n, f]) => !bundle.some(c => c.number === n) && f.review.effects.length === 0).map(([number, facts]) => ({ ...structuredClone(facts), number, printingKey: `${number}::standard`, databaseIds: [], extensions: [], life: null, lifeEvidence: [] }))
  const cards = [...bundle, ...extra], catalog = consolidateDefinitions(cards); assert.deepEqual(catalog.errors, [])
  const main = cards.filter(c => c.category !== 'LEADER'), quantities = main.map((c, i) => ({ printingKey: c.printingKey, quantity: i < 12 ? 4 : 2 }))
  // 13 distinct main numbers: 12*4 + 2 = 50. Retain only the first 13.
  const deck = [{ printingKey: 'ST01-001::standard', quantity: 1 }, ...quantities.slice(0, 13)]
  return { ...catalog, gameId: 'real-fx', seed, scope: 'BASIC_TURNS' as const, chooserId: 'alice', ruleset: { ...structuredClone(M0_RULESET), allowedNumbers: cards.map(c => c.number) },
    players: [{ id: 'alice', cards: deck, donCount: 10 }, { id: 'bob', cards: sabo ? [{printingKey:'OP05-001::standard',quantity:1},...deck.slice(1)] : deck, donCount: 10 }] as [{ id: string; cards: typeof deck; donCount: number }, { id: string; cards: typeof deck; donCount: number }], effectRegistry: registry }
}
function game(registry?: EffectRegistry, seed?: number, sabo = false) {
  let s = createGame(input(registry, seed, sabo)); s = accept(s, { type: 'CHOOSE_FIRST', choice: 'FIRST' }); s = accept(s, { type: 'MULLIGAN', redraw: false }); s = accept(s, { type: 'MULLIGAN', redraw: false })
  while (s.phase !== 'MAIN') s = accept(s, { type: 'ADVANCE_PHASE' }); return s
}
function nextTurn(s: GameState) { s = accept(s, { type: 'END_MAIN' }); s = accept(s, { type: 'ADVANCE_PHASE' }); while (s.phase !== 'MAIN') s = accept(s, { type: 'ADVANCE_PHASE' }); return s }
function start(s: GameState, number: string, source?: string) { const action = getLegalActions(s, s.activePlayerId!).find(a => a.type === 'START_EFFECT' && a.effectId.startsWith(number + '.') && (!source || a.effectId.includes(source))); assert.ok(action && action.type === 'START_EFFECT'); return accept(s, { type: 'START_EFFECT', effectId: action.effectId }) }
function answer(s: GameState, ids: string[]) { const c = s.effects!.choice!; const tokens = ids.map(id => { const o = c.options.find(o => o.presence.instanceId === id); assert.ok(o); return o.token }); return accept(s, { type: 'ANSWER_CHOICE', choiceId: c.id, tokens }, c.actorId) }
function find(s: GameState, number: string, owner = 'alice') { return Object.values(s.instances).find(i => i.owner === owner && i.definitionId?.startsWith(number + '@') && i.zone === 'hand')?.id }
function playableGame(number: string) {
  for (let seed = 1; seed < 60; seed++) { let s = game(undefined, seed); s = nextTurn(nextTurn(s)); if (find(s, number)) return s }
  assert.fail('fixture seed with requested card not found')
}
function play(s: GameState, number: string) { const id = find(s, number); assert.ok(id); const action = getLegalActions(s, s.activePlayerId!).find(a => a.type === 'PLAY_CARD' && a.instanceId === id); assert.ok(action && action.type === 'PLAY_CARD'); return accept(s, { type: 'PLAY_CARD', instanceId: id, donIds: action.eligibleDonIds.slice(0, action.cost), replaceId: null }) }


function field(s: GameState, number: string, owner = 'alice') { return Object.values(s.instances).find(i => i.owner === owner && i.definitionId?.startsWith(number + '@') && i.zone === 'characters')!.id }
// Start from a conserved legal mid-game scenario: no fabricated instances. Cards
// are moved from the fixture's private deck into existing public zones.
function scenario(sabo = false) {
 const s = game(undefined,undefined,sabo); s.turn = 11; s.players[0].turns = 6; s.players[1].turns = 5
 for (const p of s.players) {
  for (const number of ['OP01-007', 'OP04-003']) {
   const id = p.zones.deck.find(id => s.instances[id].definitionId?.startsWith(number + '@'))!
   assert.ok(id); p.zones.deck.splice(p.zones.deck.indexOf(id),1); p.zones.characters.push(id); Object.assign(s.instances[id], { zone: 'characters', zoneGeneration: s.instances[id].zoneGeneration+1, faceUp: true, playedOnTurn: 9 })
  }
  while (p.zones.donDeck.length) { const id = p.zones.donDeck.shift()!; p.zones.cost.push(id); Object.assign(s.instances[id], { zone: 'cost', zoneGeneration: 1, faceUp: true }) }
 }
 const id = s.players[0].zones.deck.find(id => s.instances[id].definitionId?.startsWith('OP06-007@'))!
 assert.ok(id); s.players[0].zones.deck.splice(s.players[0].zones.deck.indexOf(id),1); s.players[0].zones.hand.push(id); Object.assign(s.instances[id],{ zone: 'hand', zoneGeneration: s.instances[id].zoneGeneration+1 })
 assertGameInvariants(s); return s
}
test('M15D real Caribou ON_KO cascades after Shanks across series', () => {
 let s = scenario(); const bob = field(s,'OP01-007','bob'), alice = field(s,'OP01-007')
 s = play(s,'OP06-007'); s = answer(s,[bob]); assert.equal(s.effects!.active!.definitionId,'OP01-007.onko'); assert.equal(s.instances[bob].zone,'trash')
 s = answer(restoreGame(JSON.stringify(s)),[alice]); assert.equal(s.effects!.active!.definitionId,'OP01-007.onko'); s=answer(s,[])
 assert.equal(s.instances[alice].zone,'trash'); assert.equal(s.effects!.choice,null); assert.equal(s.effects!.scheduler!.history.filter(t=>t.timing==='ON_KO' && t.status==='RESOLVED').length,2); assertGameInvariants(s)
})
test('M15D real ON_PLAY plus future fixture requires ordering, never registry sorting',()=> {
 const registry = structuredClone(SCHEDULING_REGISTRY), d=registry.definitions.find(d=>d.id==='OP06-007.ko')!; registry.definitions.push({...structuredClone(d),id:'TEST-FUTURE-SET.second'})
 let s=scenario(); s.effects!.registry=registry; s=play(s,'OP06-007')
 assert.ok(s.effects!.scheduler!.orderChoice); const q=s.effects!.scheduler!.orderChoice!
 const r=applyCommand(s,envelope(s,{type:'ANSWER_CHOICE',choiceId:q.id,tokens:[q.options[1].token]},q.actorId)); assert.ok(r.ok); assert.equal(r.state.effects!.active!.definitionId,'TEST-FUTURE-SET.second')
})

import { preflightCosts, payCosts } from '../src/game/effects/operations'
import type { EffectContext } from '../src/game/effects/contracts'
function context(s:GameState):EffectContext { const i=s.instances[s.players[0].zones.leader[0]];return {controllerId:'alice',source:{kind:'CARD',definitionId:i.definitionId!,presence:{instanceId:i.id,generation:i.zoneGeneration}},effectInstanceId:'test-payment',turnId:s.turn,windowId:'main'} }
test('M15D composite cost initially impossible pays nothing',()=>{
 const s=scenario(),before=JSON.stringify(s); const cost={kind:'SEQUENCE' as const,parts:[{kind:'REST_SOURCE' as const},{kind:'REST_DON' as const,amount:11}]}
 assert.equal(preflightCosts(s,cost,context(s)),'INITIAL_UNPAYABLE');assert.equal(payCosts(s,cost,context(s)),'INITIAL_UNPAYABLE');assert.equal(JSON.stringify(s),before)
})
test('M15D interrupted composite payment retains paid operation and skips remainder',()=>{
 const s=scenario();s.effects!.registry.restrictions.push({id:'synthetic-rest-limit',playerId:'alice',prohibited:'REST',afterRestedDon:1})
 const cost={kind:'SEQUENCE' as const,parts:[{kind:'REST_DON' as const,amount:1},{kind:'REST_SOURCE' as const}]}
 assert.equal(preflightCosts(s,cost,context(s)),'PAID'); assert.equal(payCosts(s,cost,context(s)),'INTERRUPTED');assert.equal(s.instances[s.players[0].zones.cost[0]].rested,true);assert.equal(s.instances[s.players[0].zones.leader[0]].rested,false)
 assert.deepEqual(s.effects!.operations!.filter(o=>o.resolutionId==='test-payment').map(o=>o.outcome),['CONFIRMED','PREVENTED']); assert.equal(s.effects!.payments!.at(-1)!.paidOperationIds.length,1)
})
function saboScenario() {
 const s=scenario(true),p=s.players[1],old=s.instances[p.zones.leader[0]]
 const id=p.zones.cost.shift()!;p.zones.attached.push(id);Object.assign(s.instances[id],{zone:'attached',zoneGeneration:2,attachedTo:old.id});assertGameInvariants(s);return s
}
test('M15D real Sabo replacement prevents Usopp ON_KO',()=>{
 let s=saboScenario(),usopp=field(s,'OP04-003','bob');s=play(s,'OP06-007');s=answer(s,[usopp]);assert.equal(s.effects!.choice!.actorId,'bob');s=answer(restoreGame(JSON.stringify(s)),[usopp])
 assert.equal(s.instances[usopp].zone,'characters');assert.equal(evaluateCharacteristics(s,usopp).power.current,4000);assert.equal(s.effects!.cardEvents!.filter(e=>e.type==='CARD_KO').length,0);assert.equal(s.effects!.scheduler!.history.filter(t=>t.timing==='ON_KO').length,0)
})
test('M15D real Sabo decline permits Usopp ON_KO and leaves usage free',()=>{
 let s=saboScenario(),usopp=field(s,'OP04-003','bob');s=play(s,'OP06-007');s=answer(s,[usopp]);s=answer(s,[]);assert.equal(s.effects!.active!.definitionId,'OP04-003.onko');assert.equal(Object.keys(s.effects!.usage).filter(k=>k.includes('OP05-001')).length,0)
 s=answer(s,[field(s,'OP01-007')]);assert.equal(s.effects!.active!.definitionId,'OP01-007.onko');s=answer(s,[]);assert.equal(s.effects!.choice,null)
})

test('M15D interrupted activation commits payment and skips body via applyCommand',()=>{
 const s=scenario(),r=s.effects!.registry,d=r.definitions.find(d=>d.id==='ST01-001.attach')!
 d.cost={kind:'SEQUENCE',parts:[{kind:'REST_DON',amount:1},{kind:'REST_SOURCE'}]};r.restrictions.push({id:'test-interruption',playerId:'alice',prohibited:'REST',afterRestedDon:1})
 const a=getLegalActions(s,'alice').find(a=>a.type==='START_EFFECT' && a.effectId.startsWith('ST01-001'))!;assert.equal(a.type,'START_EFFECT');if(a.type!=='START_EFFECT')assert.fail()
 const result=applyCommand(s,envelope(s,{type:'START_EFFECT',effectId:a.effectId}));assert.ok(result.ok)
 assert.equal(result.state.effects!.payments!.at(-1)!.outcome,'INTERRUPTED');assert.equal(result.state.effects!.choice,null);assert.equal(result.state.effects!.events.length,0)
 assert.ok(!getLegalActions(result.state,'alice').some(a=>a.type==='START_EFFECT' && a.effectId.startsWith('ST01-001')))
})
test('M15D order choice recovery is private and duplicate answers are idempotent',()=>{
 const s=scenario(),r=s.effects!.registry,d=r.definitions.find(d=>d.id==='OP06-007.ko')!;r.definitions.push({...structuredClone(d),id:'TEST-FUTURE-SET.second'})
 const pending=play(s,'OP06-007'),q=pending.effects!.scheduler!.orderChoice!
 const publicView=JSON.stringify(projectState(pending,'bob'));for(const option of q.options)assert.ok(!publicView.includes(option.token));assert.ok(!publicView.includes('scheduler'));reject(pending,envelope(pending,{type:'END_MAIN'}),'ILLEGAL_ACTION')
 reject(pending,envelope(pending,{type:'ANSWER_CHOICE',choiceId:q.id,tokens:[q.options[0].token]},'bob'),'ILLEGAL_ACTION');reject(pending,envelope(pending,{type:'ANSWER_CHOICE',choiceId:q.id,tokens:['forged']},'alice'),'INVALID_CHOICE_RESPONSE')
 const command=envelope(pending,{type:'ANSWER_CHOICE',choiceId:q.id,tokens:[q.options[1].token]},'alice');const result=applyCommand(restoreGame(JSON.stringify(pending)),command);assert.ok(result.ok);const replay=applyCommand(result.state,command);assert.ok(replay.ok && replay.replayed);assert.deepEqual(replay.state,result.state)
})
test('M15D forged ON_KO capture and ordering save are rejected',()=>{
 let s=scenario();s=play(s,'OP06-007');s=answer(s,[field(s,'OP01-007','bob')]);const raw=structuredClone(s);raw.effects!.scheduler!.batches[0].triggers[0].expectedTrashGeneration=999;assert.throws(()=>restoreGame(JSON.stringify(raw)))
})
test('M15D explicit simultaneous replacement and KO batch refusals preserve state',()=>{
 let s=saboScenario(),r=s.effects!.registry;r.leaderReplacements!.push({...r.leaderReplacements![0],id:'TEST-FUTURE-SET.other-protection'});s=play(s,'OP06-007');const c=s.effects!.choice!;reject(s,envelope(s,{type:'ANSWER_CHOICE',choiceId:c.id,tokens:[c.options.find(o=>o.presence.instanceId===field(s,'OP04-003','bob'))!.token]}),'REPLACEMENT_ORDER_NOT_IMPLEMENTED')
 const other=scenario(),d=other.effects!.registry.definitions.find(d=>d.id==='OP06-007.ko')!;if(d.program[0].kind!=='CHOICE')assert.fail();d.program[0].max=2;const pending=play(other,'OP06-007'),q=pending.effects!.choice!;reject(pending,envelope(pending,{type:'ANSWER_CHOICE',choiceId:q.id,tokens:q.options.slice(0,2).map(o=>o.token)}),'KO_BATCH_NOT_IMPLEMENTED')
})
test('M15D Sabo requires DON and opponent turn and consumes only accepted usage',()=>{
 let s=scenario(true),u=field(s,'OP04-003','bob');s=answer(play(s,'OP06-007'),[u]);assert.equal(s.effects!.active!.definitionId,'OP04-003.onko')
 s=saboScenario();u=field(s,'OP04-003','bob');s=answer(play(s,'OP06-007'),[u]);s=answer(s,[u]);assert.equal(Object.keys(s.effects!.usage).filter(k=>k.includes('OP05-001')).length,1)
})

test('M15D normal play payment and movement use common operations',()=>{
 const s=play(scenario(),'OP06-007'),ops=s.effects!.operations!;assert.equal(ops.filter(o=>o.type==='REST' && o.intent==='COST').length,10);assert.ok(ops.some(o=>o.type==='MOVE_CARD' && o.from==='hand' && o.to==='characters'))
})
test('M15D Sunny rest and power gain are confirmed operations',()=>{
 const s=scenario(),p=s.players[0],id=p.zones.deck.find(id=>s.instances[id].definitionId?.startsWith('ST01-017@'))!;assert.ok(id);p.zones.deck.splice(p.zones.deck.indexOf(id),1);p.zones.stage.push(id);Object.assign(s.instances[id],{zone:'stage',faceUp:true,zoneGeneration:s.instances[id].zoneGeneration+1})
 let pending=start(s,'ST01-017');assert.ok(pending.effects!.operations!.some(o=>o.type==='REST'));pending=answer(pending,[p.zones.leader[0]]);assert.ok(pending.effects!.operations!.some(o=>o.type==='ADD_POWER' && o.amount===1000));assert.equal(evaluateCharacteristics(pending,p.zones.leader[0]).power.current,6000)
})

test('M15D both controllers pending from one KO resolve active player first',()=>{
 const s=scenario(),r=s.effects!.registry
 for(const [index,p] of s.players.entries()) { const leader=s.instances[p.zones.leader[0]];r.definitions.push({id:`TEST-FUTURE-SET.observer-${index}`,revision:'1',dslVersion:'1.2.0',source:{kind:'CARD_DEFINITION',definitionId:leader.definitionId!,zone:'leader'},timing:'ON_CHARACTER_KO',condition:{kind:'ALWAYS'},cost:{kind:'NONE'},usage:{kind:'UNLIMITED'},program:[{kind:'CHOICE',choiceType:'SELECT',selector:{kind:'OWN_FIELD'},optional:true,min:0,max:1,bind:'target',visibility:'PRIVATE'},{kind:'OPERATION',operation:{primitive:'addPower',version:'1.0.0',player:'CONTROLLER',audience:'PUBLIC',subjectBinding:'target',amount:1000,duration:'THIS_TURN'}}]}) }
 // Two independently registered leader definitions apply to both controllers.
 let state=play(s,'OP06-007');state=answer(state,[field(state,'OP01-007','bob')]);assert.ok(state.effects!.scheduler!.orderChoice);assert.equal(state.effects!.scheduler!.orderChoice!.actorId,'alice')
 const q=state.effects!.scheduler!.orderChoice!;state=accept(state,{type:'ANSWER_CHOICE',choiceId:q.id,tokens:[q.options[0].token]},'alice');assert.equal(state.effects!.choice!.actorId,'alice')
})

import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
function emitTrace(name:string,initial:GameState,final:GameState) {
 const commands=final.commands.slice(initial.commands.length),replay=commands.reduce((s,c)=>{const r=applyCommand(s,c);assert.ok(r.ok);return r.state},restoreGame(JSON.stringify(initial)))
 assert.deepEqual(replay,final)
 if(process.env.M15D_TRACE_DIR) { mkdirSync(process.env.M15D_TRACE_DIR,{recursive:true});writeFileSync(join(process.env.M15D_TRACE_DIR,`${name}.json`),JSON.stringify({kind:'AUTHORITATIVE_TEST_FIXTURE_ONLY',initialState:initial,commands,expectedState:final,operations:final.effects!.operations,triggerHistory:final.effects!.scheduler!.history,publicProjection:projectState(final,null)},null,2)+'\n') }
}
test('M15D reproducible real KO confirmed, cascade and saved recovery traces',()=>{
 const initial=scenario();let s=play(initial,'OP06-007');s=answer(s,[field(s,'OP01-007','bob')]);const pending=restoreGame(JSON.stringify(s));s=answer(pending,[field(s,'OP01-007')]);s=answer(restoreGame(JSON.stringify(s)),[]);emitTrace('ko-cascade-recovery',initial,s)
 const other=scenario();let end=answer(play(other,'OP06-007'),[field(other,'OP04-003','bob')]);end=answer(end,[]);emitTrace('ko-confirmed',other,end)
})
test('M15D reproducible real prevented KO trace',()=>{const initial=saboScenario();let s=answer(play(initial,'OP06-007'),[field(initial,'OP04-003','bob')]);s=answer(restoreGame(JSON.stringify(s)),[field(s,'OP04-003','bob')]);emitTrace('ko-prevented',initial,s)})
test('M15D simultaneous abilities finish before generated cascade trace',()=>{
 const initial=scenario(),r=initial.effects!.registry,d=r.definitions.find(d=>d.id==='OP06-007.ko')!;r.definitions.push({...structuredClone(d),id:'TEST-FUTURE-SET.second'})
 let s=play(initial,'OP06-007'),q=s.effects!.scheduler!.orderChoice!;s=accept(restoreGame(JSON.stringify(s)),{type:'ANSWER_CHOICE',choiceId:q.id,tokens:[q.options[0].token]},'alice');s=answer(s,[field(s,'OP01-007','bob')])
 assert.equal(s.effects!.active!.definitionId,'TEST-FUTURE-SET.second');s=answer(s,[]);assert.equal(s.effects!.active!.definitionId,'OP01-007.onko');s=answer(s,[]);emitTrace('simultaneous-before-cascade',initial,s)
})
test('M15D future new card definition registers and resolves after JSON restore',()=>{
 const i=input(),r=i.effectRegistry,original=i.definitions.find(d=>d.number==='ST01-007')!,future=structuredClone(original)
 future.number='OP99-999';future.definitionId='OP99-999@TEST-FUTURE-SET';future.review.revision='TEST-FUTURE-SET';future.review.effects=[{kind:'declarative',abilityIds:['TEST-FUTURE-SET.onplay']}]
 i.definitions.push(future);const printing=structuredClone(i.printings.find(p=>p.printingKey==='ST01-007::standard')!);printing.definitionId=future.definitionId;printing.printingKey='OP99-999::fixture';i.printings.push(printing);i.ruleset.allowedNumbers.push(future.number)
 for(const p of i.players)p.cards=p.cards.map(c=>c.printingKey==='ST01-007::standard'?{...c,printingKey:printing.printingKey}:c)
 const program=structuredClone(r.definitions.find(d=>d.id==='ST01-007.attach')!);program.id='TEST-FUTURE-SET.onplay';program.timing='ON_PLAY';program.usage={kind:'UNLIMITED'};program.source={kind:'CARD_DEFINITION',definitionId:future.definitionId,zone:'characters'};r.definitions.push(program)
 let s=createGame(i);s=accept(s,{type:'CHOOSE_FIRST',choice:'FIRST'});s=accept(s,{type:'MULLIGAN',redraw:false});s=accept(s,{type:'MULLIGAN',redraw:false});while(s.phase!=='MAIN')s=accept(s,{type:'ADVANCE_PHASE'});s=nextTurn(nextTurn(s));const initial=structuredClone(s);s=play(s,future.number);assert.equal(s.effects!.active!.definitionId,program.id);s=answer(restoreGame(JSON.stringify(s)),[]);emitTrace('future-set',initial,s);assertGameInvariants(s)
})
test('M15D older saves retain pinned engine and definitions',()=>{
 const old=game(structuredClone(PROTOTYPE_REGISTRY));assert.equal(old.effects!.engineVersion,'m1.5c-1');assert.deepEqual(restoreGame(JSON.stringify(old)),old)
})
test('M15D order save rejects forged options, actor and version',()=>{
 const s=scenario(),d=s.effects!.registry.definitions.find(d=>d.id==='OP06-007.ko')!;s.effects!.registry.definitions.push({...structuredClone(d),id:'TEST-FUTURE-SET.second'});const pending=play(s,'OP06-007')
 for(const key of ['actor','version','token']) { const raw=structuredClone(pending),q=raw.effects!.scheduler!.orderChoice!;if(key==='actor')q.actorId='bob';if(key==='version')q.expectedVersion=999;if(key==='token')q.options[1].token=q.options[0].token;assert.throws(()=>restoreGame(JSON.stringify(raw))) }
})
test('M15D private replacement and payment logs absent from opponent projection',()=>{
 const s=saboScenario(),pending=answer(play(s,'OP06-007'),[field(s,'OP04-003','bob')]),q=pending.effects!.choice!,view=JSON.stringify(projectState(pending,'alice'))
 for(const option of q.options)assert.ok(!view.includes(option.token));for(const name of ['operations','payments','registry','interception','scheduler'])assert.ok(!view.includes(`"${name}"`));for(const id of [...pending.players[1].zones.hand,...pending.players[1].zones.life,...pending.players[1].zones.deck])assert.ok(!view.includes(JSON.stringify(id)))
})
test('M15D determinism and conservation across repeated real cascade runs',()=>{
 const run=()=>{let s=scenario();s=answer(play(s,'OP06-007'),[field(s,'OP01-007','bob')]);s=answer(s,[field(s,'OP01-007')]);s=answer(s,[]);return s};assert.deepEqual(run(),run());assert.equal(Object.keys(run().instances).length,122)
})

test('M15D review regression: interrupted PLAY_CARD retains paid DON and does not play',()=>{
 const s=scenario();s.effects!.registry.restrictions.push({id:'test-interrupted-play',playerId:'alice',prohibited:'REST',afterRestedDon:1});const id=find(s,'OP06-007')!,cmd=envelope(s,{type:'PLAY_CARD',instanceId:id,donIds:s.players[0].zones.cost.slice(0,10),replaceId:null})
 const r=applyCommand(s,cmd);assert.ok(r.ok);assert.equal(r.state.instances[id].zone,'hand');assert.equal(r.state.players[0].zones.cost.filter(id=>r.state.instances[id].rested).length,1);assert.equal(r.state.effects!.payments!.at(-1)!.outcome,'INTERRUPTED');assert.ok(!r.state.events.some(e=>e.type==='CARD_PLAYED'));assertGameInvariants(r.state);assert.deepEqual(restoreGame(JSON.stringify(r.state)),r.state)
})
test('M15D review regression: automatic once per turn survives KO cascades',()=>{
 const s=scenario(),r=s.effects!.registry,leader=s.instances[s.players[0].zones.leader[0]]
 r.definitions.push({id:'TEST-FUTURE-SET.once',revision:'1',dslVersion:'1.2.0',source:{kind:'CARD_DEFINITION',definitionId:leader.definitionId!,zone:'leader'},timing:'ON_CHARACTER_KO',condition:{kind:'ALWAYS'},cost:{kind:'NONE'},usage:{kind:'ONCE_PER_TURN'},program:[{kind:'CHOICE',choiceType:'SELECT',selector:{kind:'OWN_FIELD'},min:0,max:1,optional:true,bind:'target',visibility:'PRIVATE'},{kind:'OPERATION',operation:{primitive:'addPower',version:'1.0.0',player:'CONTROLLER',audience:'PUBLIC',subjectBinding:'target',amount:1,duration:'THIS_TURN'}}]})
 let state=answer(play(s,'OP06-007'),[field(s,'OP01-007','bob')]);let cascade=false
 for(let n=0;n<30 && (state.effects!.choice || state.effects!.scheduler!.orderChoice);n++) {
  const order=state.effects!.scheduler!.orderChoice
  if(order)state=accept(state,{type:'ANSWER_CHOICE',choiceId:order.id,tokens:[order.options[0].token]},order.actorId)
  else if(state.effects!.active!.definitionId==='OP01-007.onko' && !cascade){state=answer(state,[field(state,'OP01-007')]);cascade=true}else state=answer(state,[])
 }
 const resolved=state.effects!.scheduler!.history.filter(t=>t.definitionId==='TEST-FUTURE-SET.once' && t.status==='RESOLVED');assert.equal(resolved.filter(t=>t.controllerId==='alice').length,1);assert.equal(resolved.filter(t=>t.controllerId==='bob').length,1)
})
test('M15D review regression: fabricated cause, batch actor, pending history and missing suspension rejected',()=>{
 const s=scenario(),d=s.effects!.registry.definitions.find(d=>d.id==='OP06-007.ko')!;s.effects!.registry.definitions.push({...structuredClone(d),id:'TEST-FUTURE-SET.second'});const pending=play(s,'OP06-007')
 for(const mutation of ['cause','actor','history','suspension']){const raw=structuredClone(pending),q=raw.effects!.scheduler!;if(mutation==='cause')q.batches[0].triggers[0].causeId='invented';if(mutation==='actor')q.batches[0].activePlayerId='nobody';if(mutation==='history')q.history.push({...structuredClone(q.batches[0].triggers[0]),id:`${raw.gameId}:fx:trigger:${raw.effects!.nextId++}`});if(mutation==='suspension')q.orderChoice=null;assert.throws(()=>restoreGame(JSON.stringify(raw)),mutation)}
})

test('M15D Usopp uses base power when target current power exceeds threshold',()=>{
 const s=play(scenario(),'OP06-007'),target=field(s,'OP01-007'),p=s.players[0]
 for(let n=0;n<3;n++){const id=p.zones.cost.shift()!;p.zones.attached.push(id);Object.assign(s.instances[id],{zone:'attached',zoneGeneration:s.instances[id].zoneGeneration+1,attachedTo:target})}
 assert.equal(evaluateCharacteristics(s,target).power.current,7000);assert.equal(evaluateCharacteristics(s,target).power.base,4000)
 let state=answer(s,[field(s,'OP04-003','bob')]);assert.ok(state.effects!.choice!.options.some(o=>o.presence.instanceId===target));state=answer(state,[target]);assert.equal(state.instances[target].zone,'trash');state=answer(state,[]);assertGameInvariants(state)
})
test('M15D pending ordinary automatic source KO before activation is invalidated',()=>{
 const s=scenario(),r=s.effects!.registry,d=structuredClone(r.definitions.find(d=>d.id==='OP06-007.ko')!);d.id='TEST-FUTURE-SET.observe';d.timing='ON_CHARACTER_KO';d.source={kind:'CARD_DEFINITION',definitionId:s.instances[field(s,'OP01-007')].definitionId!,zone:'characters'};r.definitions.push(d)
 let state=answer(play(s,'OP06-007'),[field(s,'OP01-007','bob')]);assert.equal(state.effects!.active!.definitionId,d.id);state=answer(state,[]);const order=state.effects!.scheduler!.orderChoice!;const invalid=order.options.find(o=>state.effects!.scheduler!.batches.flatMap(b=>b.triggers).some(t=>t.id===o.triggerId && t.definitionId===d.id))!;state=accept(state,{type:'ANSWER_CHOICE',choiceId:order.id,tokens:[invalid.token]},order.actorId);assert.equal(state.effects!.active!.definitionId,'OP01-007.onko');state=answer(state,[])
 assert.ok(state.effects!.scheduler!.history.some(t=>t.definitionId===d.id && t.controllerId==='bob' && t.status==='INVALIDATED'));assertGameInvariants(state)
})
test('M15D new field presence resets activation limit without reusing old generation',()=>{
 const s=scenario(),p=s.players[0],nami=p.zones.deck.find(id=>s.instances[id].definitionId?.startsWith('ST01-007@'))!;p.zones.deck.splice(p.zones.deck.indexOf(nami),1);p.zones.characters.push(nami);Object.assign(s.instances[nami],{zone:'characters',faceUp:true,zoneGeneration:s.instances[nami].zoneGeneration+1})
 let state=answer(start(s,'ST01-007',nami),[]);const old=state.instances[nami].zoneGeneration
 // Fixture establishes a new legal presence; this is not a new user-facing move command.
 state.players[0].zones.characters.splice(state.players[0].zones.characters.indexOf(nami),1);state.players[0].zones.trash.push(nami);state.instances[nami].zone='trash';state.instances[nami].zoneGeneration++
 state.players[0].zones.trash.splice(state.players[0].zones.trash.indexOf(nami),1);state.players[0].zones.characters.push(nami);state.instances[nami].zone='characters';state.instances[nami].zoneGeneration++
 const action=getLegalActions(state,'alice').find(a=>a.type==='START_EFFECT' && a.effectId.includes(nami));assert.ok(action && action.type==='START_EFFECT');assert.ok(action.effectId.endsWith(`:${old+2}`));state=answer(start(state,'ST01-007',nami),[]);assert.equal(Object.keys(state.effects!.usage).filter(k=>k.includes('ST01-007')).length,2);assertGameInvariants(state)
})
test('M15D Sabo cannot replace a second eligible victim after accepting once',()=>{
 const s=saboScenario(),p=s.players[1],second=p.zones.deck.find(id=>s.instances[id].definitionId?.startsWith('OP04-003@'))!;p.zones.deck.splice(p.zones.deck.indexOf(second),1);p.zones.characters.push(second);Object.assign(s.instances[second],{zone:'characters',faceUp:true,zoneGeneration:s.instances[second].zoneGeneration+1})
 const d=s.effects!.registry.definitions.find(d=>d.id==='OP06-007.ko')!,extra=structuredClone(d.program);for(const step of extra)if(step.kind==='CHOICE')step.bind='target2';else if(step.kind==='OPERATION'&&step.operation.primitive==='koCharacter')step.operation.subjectBinding='target2';d.program.push(...extra)
 let state=answer(play(s,'OP06-007'),[field(s,'OP04-003','bob')]);state=answer(state,[field(state,'OP04-003','bob')]);state=answer(state,[second]);assert.equal(state.instances[second].zone,'trash');assert.equal(state.effects!.active!.definitionId,'OP04-003.onko');assert.ok(!state.effects!.continuation!.interception)
})
test('M15D Sabo own-turn protection is unavailable',()=>{
 const s=saboScenario();s.turn=12;s.activePlayerId='bob';s.players[1].turns=6
 const d=structuredClone(s.effects!.registry.definitions.find(d=>d.id==='OP06-007.ko')!);d.id='TEST-FUTURE-SET.mainKO';d.timing='MAIN';d.source={kind:'CARD_DEFINITION',definitionId:s.instances[s.players[1].zones.leader[0]].definitionId!,zone:'leader'};s.effects!.registry.definitions.push(d)
 let state=start(s,'TEST-FUTURE-SET');state=answer(state,[field(state,'OP04-003')]);state=answer(state,[field(state,'OP04-003','bob')]);assert.equal(state.instances[field(s,'OP04-003','bob')].zone,'trash');assert.equal(state.effects!.active!.definitionId,'OP04-003.onko');assert.ok(!state.effects!.continuation!.interception)
})
