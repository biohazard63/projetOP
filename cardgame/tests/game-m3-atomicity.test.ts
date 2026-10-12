import test from 'node:test'
import assert from 'node:assert/strict'
import { consolidateDefinitions } from '../src/game/cards/adapter'
import { REVIEWED_CARDS } from '../src/game/cards/reviewedCards'
import { M0_RULESET } from '../src/game/rulesets/m0'
import { createGame, applyCommand, getLegalActions, projectState, restoreGame } from '../src/game/core/game'
import { assertGameInvariants } from '../src/game/core/invariants'
import type { CardInput } from '../src/game/cards/types'
import type { Command, GameInput, GameState } from '../src/game/core/types'
import { validateRegistry } from '../src/game/effects/contracts'
import { M3_ABILITY_CARDS, M3_ABILITY_REGISTRY } from '../src/game/cards/m3Abilities'

// Payment contract under test (docs/game/EFFECT_RESOLUTION_SPEC.md, "Paiement", CR 8-3-1-1, 8-3-1-3,
// 8-3-1-3-1, 8-3-1-7, 10-2-13-5): INITIAL_UNPAYABLE pays nothing; a regulatory interruption keeps the
// confirmed operations and does not run the body; a technical error refuses the transition and leaves
// the input state intact. A refused command never rolls back a payment confirmed by an earlier command.
function fixture(): GameInput {
  const cards: CardInput[] = Object.entries(REVIEWED_CARDS).map(([number, facts]) => ({ ...structuredClone(facts), number, printingKey: `${number}::standard`, extensions: [], databaseIds: [], life: facts.category === 'LEADER' ? 5 : null, lifeEvidence: facts.category === 'LEADER' ? [{ field: 'life', value: 5, source: 'https://en.onepiece-cardgame.com/cardlist/?series=569001', checkedAt: '2026-10-10', language: 'en' }] : [] }))
  const catalog = consolidateDefinitions(cards); assert.deepEqual(catalog.errors, [])
  const characters = cards.filter(c => c.category === 'CHARACTER')
  const deck = characters.slice(0, 12).map(c => ({ printingKey: c.printingKey, quantity: 4 }))
  deck.push({ printingKey: characters[12].printingKey, quantity: 2 })
  deck.unshift({ printingKey: 'ST01-001::standard', quantity: 1 })
  return { ...catalog, gameId: 'm2-game', seed: 77, scope: 'BASIC_TURNS', chooserId: 'alice', players: [{ id: 'alice', cards: structuredClone(deck), donCount: 10 }, { id: 'bob', cards: structuredClone(deck), donCount: 10 }], ruleset: structuredClone(M0_RULESET) }
}
function prepared(targetTurn = 3, input: GameInput = fixture()): GameState {
  let s = createGame(input)
  let r = applyCommand(s, { id: 'first', actorId: 'alice', expectedVersion: s.version, type: 'CHOOSE_FIRST', choice: 'FIRST' }); assert.ok(r.ok); s = r.state
  for (let n = 0; n < 2; n++) { r = applyCommand(s, { id: `keep-${n}`, actorId: s.decisionPlayerId!, expectedVersion: s.version, type: 'MULLIGAN', redraw: false }); assert.ok(r.ok); s = r.state }
  while (s.phase !== 'MAIN') { r = applyCommand(s, { id: `phase-${s.version}`, actorId: s.activePlayerId!, expectedVersion: s.version, type: 'ADVANCE_PHASE' }); assert.ok(r.ok); s = r.state }
  while (s.turn < targetTurn) {
    r = applyCommand(s, { id: `end-${s.version}`, actorId: s.activePlayerId!, expectedVersion: s.version, type: 'END_MAIN' }); assert.ok(r.ok); s = r.state
    for (let n = 0; n < 4; n++) { r = applyCommand(s, { id: `phase-${s.version}`, actorId: s.activePlayerId!, expectedVersion: s.version, type: 'ADVANCE_PHASE' }); assert.ok(r.ok); s = r.state }
  }
  return s
}
function counterFixture(number = 'OP06-017'): {s: GameState, cardId: string} {
  const input = fixture(), cards = structuredClone(M3_ABILITY_CARDS)
  const meteor = cards.find(c => c.number === number)!
  const catalog = consolidateDefinitions(cards); assert.deepEqual(catalog.errors, [])
  input.definitions.push(...catalog.definitions); input.printings.push(...catalog.printings)
  input.ruleset.allowedNumbers.push(...cards.map(c=>c.number))
  input.effectRegistry=validateRegistry(structuredClone(M3_ABILITY_REGISTRY))
  for(const p of input.players) {p.cards.find(e=>e.quantity===4)!.quantity--;p.cards.push({printingKey:meteor.printingKey,quantity:1})}
  let s=prepared(3,input)
  const owner=s.players[1]
  const cardId=owner.zones.deck.find(id=>s.instances[id].definitionId===catalog.definitions.find(d=>d.number===number)!.definitionId)!
  owner.zones.deck.splice(owner.zones.deck.indexOf(cardId),1);owner.zones.hand.push(cardId);s.instances[cardId].zone='hand';s.instances[cardId].zoneGeneration++
  s=send(s,'alice',{type:'DECLARE_ATTACK',attackerId:s.players[0].zones.leader[0],targetId:owner.zones.leader[0]})
  s=send(s,'bob',{type:'PASS_BLOCKER',battleId:s.battle!.id})
  return {s,cardId}
}
type Intent = Command extends infer C ? C extends Command ? Omit<C,'id'|'actorId'|'expectedVersion'> : never : never
function attempt(s:GameState,actorId:string,intent:Intent,id=`m3-${s.version}`) {return applyCommand(s,{...intent,actorId,id,expectedVersion:s.version})}
function send(s:GameState,actorId:string,intent:Intent) {const r=attempt(s,actorId,intent);assert.ok(r.ok,r.ok?'':r.error);return r.state}
function refused(s:GameState,actorId:string,intent:Intent,error:string) {
  const before=JSON.stringify(s), r=attempt(s,actorId,intent)
  assert.equal(r.ok,false); if (!r.ok) assert.equal(r.error,error)
  assert.equal(JSON.stringify(s),before,'a refused command leaves its input state intact')
}
// Same physical procedure as the M2.5 interrupted-payment fixture: one more DON!! from the DON!! deck into the cost area.
function addActiveDon(s:GameState,playerIndex:number):string {
  const p=s.players[playerIndex], id=p.zones.donDeck[0]
  p.zones.donDeck.splice(0,1);p.zones.cost.push(id);s.instances[id].zone='cost';s.instances[id].faceUp=true
  return id
}
const activeDons=(s:GameState)=>s.players[1].zones.cost.filter(id=>!s.instances[id].rested)

test('M3 atomicity: an initially unpayable declarative Counter is refused without paying anything', () => {
  const {s,cardId}=counterFixture()
  addActiveDon(s,1);assertGameInvariants(s)
  const dons=activeDons(s), battleId=s.battle!.id
  assert.equal(dons.length,3)
  const play=(paymentDonIds:string[])=>({type:'PLAY_COUNTER_EVENT' as const,cardId,battleId,paymentDonIds,donMinusIds:[],targetId:null})
  refused(s,'bob',play(dons.slice(0,1)),'COUNTER_EVENT_INITIAL_UNPAYABLE')
  refused(s,'bob',play(dons.slice(0,3)),'COUNTER_EVENT_INITIAL_UNPAYABLE')
  refused(s,'bob',play([dons[0],dons[0]]),'COUNTER_EVENT_INITIAL_UNPAYABLE')
  refused(s,'bob',play([s.players[0].zones.cost[0],dons[0]]),'COUNTER_EVENT_INITIAL_UNPAYABLE')
  const rested=structuredClone(s);rested.instances[dons[0]].rested=true
  refused(rested,'bob',play(dons.slice(0,2)),'COUNTER_EVENT_INITIAL_UNPAYABLE')
  assert.equal(s.instances[cardId].zone,'hand')
  assert.ok(dons.every(id=>!s.instances[id].rested))
})

test('M3 atomicity: an invalid Guard Point answer is refused while the confirmed payment and pending choice remain', () => {
  let {s,cardId}=counterFixture('ST01-014')
  const cost=activeDons(s)[0]
  s=send(s,'bob',{type:'PLAY_COUNTER_EVENT',cardId,battleId:s.battle!.id,paymentDonIds:[cost],donMinusIds:[],targetId:null})
  assert.equal(s.instances[cost].rested,true)
  const q=s.effects!.choice!, leader=s.players[1].zones.leader[0]
  assert.equal(q.actorId,'bob')
  refused(s,'bob',{type:'ANSWER_CHOICE',choiceId:q.id,tokens:['forged-token']},'INVALID_CHOICE_RESPONSE')
  refused(s,'bob',{type:'ANSWER_CHOICE',choiceId:'unknown-choice',tokens:[]},'INVALID_CHOICE_RESPONSE')
  refused(s,'bob',{type:'ANSWER_CHOICE',choiceId:q.id,tokens:[q.options[0].token,q.options[0].token]},'INVALID_CHOICE_RESPONSE')
  refused(s,'alice',{type:'ANSWER_CHOICE',choiceId:q.id,tokens:[q.options[0].token]},'ILLEGAL_ACTION')
  assert.equal(s.instances[cost].rested,true,'the payment confirmed by the earlier command is not rolled back')
  assert.equal(s.effects!.choice!.id,q.id,'the pending choice survives a refused answer')
  s=send(s,'bob',{type:'ANSWER_CHOICE',choiceId:q.id,tokens:[q.options.find(o=>o.presence.instanceId===leader)!.token]})
  assert.equal(s.battle!.counterModifiers.at(-1)!.amount,3000)
  assert.equal(s.effects!.choice,null)
})

test('M3 atomicity: repeated resume from one snapshot and a replayed answer apply the effect once', () => {
  let {s,cardId}=counterFixture()
  const lifeBefore=s.players[1].zones.life.length
  s=send(s,'bob',{type:'PLAY_COUNTER_EVENT',cardId,battleId:s.battle!.id,paymentDonIds:activeDons(s).slice(0,2),donMinusIds:[],targetId:null,lifePayment:true})
  assert.equal(s.instances[cardId].zone,'trash')
  assert.equal(s.players[1].zones.life.length,lifeBefore-1)
  const modifiersBefore=s.effects!.powerModifiers!.length
  const snapshot=JSON.stringify(s), first=restoreGame(snapshot), second=restoreGame(snapshot)
  assert.deepEqual(first,second)
  const q=first.effects!.choice!, leader=first.players[1].zones.leader[0]
  const answer={type:'ANSWER_CHOICE' as const,choiceId:q.id,tokens:[q.options.find(o=>o.presence.instanceId===leader)!.token]}
  const resumed=send(first,'bob',answer)
  assert.deepEqual(send(second,'bob',answer),resumed,'two resumes of the same snapshot are deterministic')
  assert.equal(resumed.effects!.powerModifiers!.length,modifiersBefore+1)
  assert.equal(resumed.players[1].zones.life.length,lifeBefore-1,'the optional Life cost is paid once')
  const replay=applyCommand(resumed,{...answer,actorId:'bob',id:`m3-${first.version}`,expectedVersion:first.version})
  assert.ok(replay.ok&&replay.replayed);assert.deepEqual(replay.state,resumed)
  assert.equal(attempt(resumed,'bob',answer,'answer-again').ok,false,'a consumed choice cannot be answered again')
  assert.deepEqual(restoreGame(JSON.stringify(resumed)),resumed)
})

test('M3 atomicity: optional costs the program does not offer are refused without paying', () => {
  const meteor=counterFixture(), guard=counterFixture('ST01-014')
  addActiveDon(meteor.s,1);addActiveDon(guard.s,1)
  const md=activeDons(meteor.s), gd=activeDons(guard.s)
  const base=(f:{s:GameState,cardId:string})=>({type:'PLAY_COUNTER_EVENT' as const,cardId:f.cardId,battleId:f.s.battle!.id,targetId:null})
  refused(guard.s,'bob',{...base(guard),paymentDonIds:gd.slice(0,1),donMinusIds:[],lifePayment:true},'COUNTER_EVENT_LIFE_COST_UNAVAILABLE')
  refused(guard.s,'bob',{...base(guard),paymentDonIds:gd.slice(0,1),donMinusIds:[gd[1]]},'INVALID_COUNTER_EVENT_EFFECT_CHOICE')
  refused(meteor.s,'bob',{...base(meteor),paymentDonIds:md.slice(0,2),donMinusIds:[md[2]]},'INVALID_COUNTER_EVENT_EFFECT_CHOICE')
  refused(meteor.s,'bob',{...base(meteor),paymentDonIds:md.slice(0,2),donMinusIds:[md[2]],lifePayment:true},'INVALID_COUNTER_EVENT_EFFECT_CHOICE')
})

test('M3 atomicity: declining the optional Guard Point target keeps the paid cost and creates no bonus', () => {
  let {s,cardId}=counterFixture('ST01-014')
  const cost=activeDons(s)[0]
  s=send(s,'bob',{type:'PLAY_COUNTER_EVENT',cardId,battleId:s.battle!.id,paymentDonIds:[cost],donMinusIds:[],targetId:null})
  const before=s.battle!.counterModifiers.length
  s=send(s,'bob',{type:'ANSWER_CHOICE',choiceId:s.effects!.choice!.id,tokens:[]})
  assert.equal(s.battle!.counterModifiers.length,before,'no power bonus is created')
  assert.equal(s.instances[cost].rested,true,'the printed cost stays paid after the decline')
  assert.equal(s.instances[cardId].zone,'trash')
  assert.equal(s.effects!.choice,null)
})

test('M3 atomicity: an invalid declarative Counter declaration is refused without state change', () => {
  const {s,cardId}=counterFixture()
  const dons=activeDons(s).slice(0,2)
  refused(s,'bob',{type:'PLAY_COUNTER_EVENT',cardId,battleId:'unknown-battle',paymentDonIds:dons,donMinusIds:[],targetId:null},'INVALID_BATTLE_RESOLUTION')
  refused(s,'bob',{type:'PLAY_COUNTER_EVENT',cardId,battleId:s.battle!.id,paymentDonIds:dons,donMinusIds:[],targetId:s.players[1].zones.leader[0]},'INVALID_COUNTER_EVENT_EFFECT_CHOICE')
  assert.ok(dons.every(id=>!s.instances[id].rested))
  assert.equal(s.effects!.choice,null)
})

// Observation of the current declarative path when a REST restriction prevents the second DON!! of the
// printed cost. The first assertions follow the documented payment contract; the last ones record current
// behaviour that differs from PLAY_CARD (no payment record, no public event) and is pending validation.
test('M3 atomicity: observed behaviour of an interrupted declarative Counter payment', () => {
  const {s,cardId}=counterFixture()
  const bob=s.players[1], dons=activeDons(s).slice(0,2)
  assert.equal(dons.length,2)
  s.effects!.registry.restrictions.push({id:'interrupt-after-one-payment',playerId:'bob',prohibited:'REST',afterRestedDon:bob.zones.cost.length-activeDons(s).length+1})
  const operations=s.effects!.operations!.length, payments=s.effects!.payments!.length, events=s.events.length
  const command={type:'PLAY_COUNTER_EVENT' as const,cardId,battleId:s.battle!.id,paymentDonIds:dons,donMinusIds:[],targetId:null}
  const r=attempt(s,'bob',command,'interrupted-counter')
  assert.ok(r.ok,r.ok?'':r.error)
  if (!r.ok) return
  const t=r.state
  assert.deepEqual(dons.map(id=>t.instances[id].rested),[true,false],'the confirmed DON!! stays rested')
  assert.deepEqual(t.effects!.operations!.slice(operations).map(o=>[o.type,o.intent,o.outcome]),[['REST','COST','CONFIRMED'],['REST','COST','PREVENTED']])
  assert.equal(t.instances[cardId].zone,'hand','the Event is not activated')
  assert.equal(t.effects!.choice,null);assert.equal(t.effects!.continuation,null)
  assert.equal(t.battle!.step,'COUNTER');assert.equal(t.battle!.counterModifiers.length,0)
  assert.ok(getLegalActions(t,'bob').some(a=>a.type==='PASS_COUNTER'))
  assertGameInvariants(t)
  const snapshot=JSON.stringify(t), replay=applyCommand(t,{...command,actorId:'bob',id:'interrupted-counter',expectedVersion:s.version})
  assert.ok(replay.ok&&replay.replayed);assert.equal(JSON.stringify(replay.state),snapshot)
  assert.deepEqual(restoreGame(snapshot),t)
  // Traceability aligned on PLAY_CARD (decision 2026-10-12): one INTERRUPTED record keyed by the battle, no public event.
  const confirmed=t.effects!.operations!.slice(operations).filter(o=>o.outcome==='CONFIRMED').map(o=>o.id)
  assert.deepEqual(t.effects!.payments!.slice(payments),[{resolutionId:s.battle!.id,outcome:'INTERRUPTED',paidOperationIds:confirmed}])
  assert.equal(t.events.length,events,'no public event is emitted for the interrupted Counter')
  for(const viewer of ['alice','bob']) assert.equal(JSON.stringify(projectState(t,viewer)).includes('INTERRUPTED'),false,'payment records stay out of projections')
})

test('M3 atomicity: a paid declarative Counter records its printed cost as PAID next to the ability cost', () => {
  let {s,cardId}=counterFixture()
  const dons=activeDons(s).slice(0,2), operations=s.effects!.operations!.length, payments=s.effects!.payments!.length, battleId=s.battle!.id
  s=send(s,'bob',{type:'PLAY_COUNTER_EVENT',cardId,battleId,paymentDonIds:dons,donMinusIds:[],targetId:null,lifePayment:true})
  const rests=s.effects!.operations!.slice(operations).filter(o=>o.type==='REST'&&o.intent==='COST')
  assert.deepEqual(rests.map(o=>[o.resolutionId,o.outcome]),[[battleId,'CONFIRMED'],[battleId,'CONFIRMED']])
  const records=s.effects!.payments!.slice(payments)
  assert.deepEqual(records[0],{resolutionId:battleId,outcome:'PAID',paidOperationIds:rests.map(o=>o.id)})
  assert.equal(records.length,2,'printed cost record, then the ability cost record of begin()')
  assert.equal(records[1].resolutionId,s.effects!.active!.id);assert.equal(records[1].outcome,'PAID')
  assert.deepEqual(restoreGame(JSON.stringify(s)),s)
})
