import test from 'node:test'
import assert from 'node:assert/strict'
import { consolidateDefinitions } from '../src/game/cards/adapter'
import { REVIEWED_CARDS } from '../src/game/cards/reviewedCards'
import { OFFICIAL_ABILITY_CARDS, OFFICIAL_ABILITY_REGISTRY } from '../src/game/cards/officialAbilities'
import { M0_RULESET } from '../src/game/rulesets/m0'
import { createGame, applyCommand, getLegalActions, projectState, restoreGame } from '../src/game/core/game'
import type { CardInput } from '../src/game/cards/types'
import type { Command, GameInput, GameState } from '../src/game/core/types'
import { validateRegistry } from '../src/game/effects/contracts'
import { M3_ABILITY_CARDS, M3_ABILITY_REGISTRY } from '../src/game/cards/m3Abilities'
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


function counterFixture(number = 'OP06-017') {
  const input = fixture(), cards = structuredClone(M3_ABILITY_CARDS)
  const meteor = cards.find(c => c.number === number)!
  const catalog = consolidateDefinitions(cards); assert.deepEqual(catalog.errors, [])
  input.definitions.push(...catalog.definitions); input.printings.push(...catalog.printings)
  input.ruleset.allowedNumbers.push(...cards.map(c=>c.number))
  input.effectRegistry=validateRegistry(structuredClone(M3_ABILITY_REGISTRY))
  for(const p of input.players) {p.cards.find(e=>e.quantity===4)!.quantity--;p.cards.push({printingKey:meteor.printingKey,quantity:1})}
  let s=prepared(3,input), owner=s.players[1]
  const cardId=owner.zones.deck.find(id=>s.instances[id].definitionId===catalog.definitions.find(d=>d.number===number)!.definitionId)!
  owner.zones.deck.splice(owner.zones.deck.indexOf(cardId),1);owner.zones.hand.push(cardId);s.instances[cardId].zone='hand';s.instances[cardId].zoneGeneration++
  s=send(s,'alice',{type:'DECLARE_ATTACK',attackerId:s.players[0].zones.leader[0],targetId:owner.zones.leader[0]})
  s=send(s,'bob',{type:'PASS_BLOCKER',battleId:s.battle!.id})
  return {s,cardId}
}
type Intent = Command extends infer C ? C extends Command ? Omit<C,'id'|'actorId'|'expectedVersion'> : never : never
function send(s:GameState,actorId:string,intent:Intent) {const r=applyCommand(s,{...intent,actorId,id:`m3-${s.version}`,expectedVersion:s.version});assert.ok(r.ok,r.ok?'':r.error);return r.state}

test('M3: declarative Meteor Counter suspends after payment and resumes without a second credit',()=>{
  let {s,cardId}=counterFixture()
  const lifeBefore=s.players[1].zones.life.length
  const cmd={type:'PLAY_COUNTER_EVENT' as const,cardId,battleId:s.battle!.id,paymentDonIds:s.players[1].zones.cost.slice(0,2),donMinusIds:[],targetId:null,lifePayment:true}
  s=send(s,'bob',cmd)
  assert.equal(s.instances[cardId].zone,'trash');assert.equal(s.players[1].zones.life.length,lifeBefore-1)
  assert.ok(s.effects!.choice);assert.equal(getLegalActions(s,'alice').length,0)
  const snapshot=JSON.stringify(s);assert.deepEqual(restoreGame(snapshot),s)
  const q=s.effects!.choice!, leader=s.players[1].zones.leader[0]
  const answer={type:'ANSWER_CHOICE' as const,choiceId:q.id,tokens:[q.options.find(o=>o.presence.instanceId===leader)!.token]}
  s=send(restoreGame(snapshot),'bob',answer)
  assert.equal(s.effects!.powerModifiers!.at(-1)!.amount,3000)
  assert.equal(s.players[1].zones.life.length,lifeBefore-1)
  assert.equal(s.effects!.choice,null)
  const replay=applyCommand(s,{...answer,actorId:'bob',id:`m3-${s.version-1}`,expectedVersion:s.version-1})
  assert.ok(replay.ok&&replay.replayed);assert.deepEqual(replay.state,s)
  assert.ok(!JSON.stringify(projectState(s,'alice')).includes(s.players[1].zones.hand.at(-1)!))
})

test('M3: Guard Point Counter offers an optional target and keeps the battle modifier after JSON restore', () => {
  let {s,cardId}=counterFixture('ST01-014')
  const cost=s.players[1].zones.cost.find(id=>!s.instances[id].rested)!
  s=send(s,'bob',{type:'PLAY_COUNTER_EVENT',cardId,battleId:s.battle!.id,paymentDonIds:[cost],donMinusIds:[],targetId:null})
  assert.equal(s.instances[cost].rested,true)
  const q=s.effects!.choice!, leader=s.players[1].zones.leader[0]
  assert.equal(q.actorId,'bob')
  const forged=applyCommand(s,{type:'ANSWER_CHOICE',id:'forged',actorId:'alice',expectedVersion:s.version,choiceId:q.id,tokens:[q.options[0].token]})
  assert.equal(forged.ok,false)
  s=send(restoreGame(JSON.stringify(s)),'bob',{type:'ANSWER_CHOICE',choiceId:q.id,tokens:[q.options.find(o=>o.presence.instanceId===leader)!.token]})
  assert.deepEqual(s.battle!.counterModifiers.at(-1),{target:{instanceId:leader,generation:s.instances[leader].zoneGeneration},amount:3000})
  assert.equal(s.effects!.choice,null)
})

test('M3: Guard Point can decline its optional target without creating a power bonus', () => {
  let {s,cardId}=counterFixture('ST01-014')
  const cost=s.players[1].zones.cost.find(id=>!s.instances[id].rested)!
  s=send(s,'bob',{type:'PLAY_COUNTER_EVENT',cardId,battleId:s.battle!.id,paymentDonIds:[cost],donMinusIds:[],targetId:null})
  const before=s.battle!.counterModifiers.length
  s=send(s,'bob',{type:'ANSWER_CHOICE',choiceId:s.effects!.choice!.id,tokens:[]})
  assert.equal(s.battle!.counterModifiers.length,before)
  assert.equal(s.instances[cardId].zone,'trash')
})

test('M3: official OP01-016 Nami excludes every Nami and resolves a private search after restoration', () => {
  const input=fixture(), catalog=consolidateDefinitions(M3_ABILITY_CARDS)
  assert.deepEqual(catalog.errors,[])
  input.definitions.push(...catalog.definitions);input.printings.push(...catalog.printings)
  input.ruleset.allowedNumbers.push(...M3_ABILITY_CARDS.map(c=>c.number))
  input.effectRegistry=structuredClone(M3_ABILITY_REGISTRY)
  for(const player of input.players) {player.cards.find(entry=>entry.quantity===4)!.quantity-=2;player.cards.push({printingKey:'OP01-016::standard',quantity:2})}
  let s=prepared(3,input), alice=s.players[0]
  const nami=alice.zones.deck.find(id=>s.instances[id].definitionId==='OP01-016@m3-2026-10-12')!
  alice.zones.deck.splice(alice.zones.deck.indexOf(nami),1);alice.zones.hand.push(nami);s.instances[nami].zone='hand';s.instances[nami].zoneGeneration++
  const eligible=alice.zones.deck.find(id=>s.catalog.definitions.find(d=>d.definitionId===s.instances[id].definitionId)?.traits.includes('Straw Hat Crew'))!
  const anotherNami=alice.zones.deck.find(id=>s.instances[id].definitionId==='OP01-016@m3-2026-10-12')!
  assert.ok(anotherNami)
  alice.zones.deck.splice(alice.zones.deck.indexOf(eligible),1);alice.zones.deck.unshift(eligible)
  alice.zones.deck.splice(alice.zones.deck.indexOf(anotherNami),1);alice.zones.deck.unshift(anotherNami)
  s=send(s,'alice',{type:'PLAY_CARD',instanceId:nami,donIds:alice.zones.cost.filter(id=>!s.instances[id].rested).slice(0,1),replaceId:null})
  const q=s.effects!.choice!
  assert.equal(q.visibility,'PRIVATE')
  assert.ok(q.options.some(o=>o.presence.instanceId===eligible))
  assert.equal(q.options.some(o=>o.presence.instanceId===anotherNami),false)
  assert.equal(JSON.stringify(projectState(s,'bob')).includes(eligible),false)
  const invalid=applyCommand(s,{id:'m3-search-forged',actorId:'bob',expectedVersion:s.version,type:'ANSWER_CHOICE',choiceId:q.id,tokens:[q.options[0].token]})
  assert.equal(invalid.ok,false)
  s=send(restoreGame(JSON.stringify(s)),'alice',{type:'ANSWER_CHOICE',choiceId:q.id,tokens:[q.options.find(o=>o.presence.instanceId===eligible)!.token]})
  const order=s.effects!.choice!
  s=send(restoreGame(JSON.stringify(s)),'alice',{type:'ANSWER_CHOICE',choiceId:order.id,tokens:order.options.map(o=>o.token)})
  assert.equal(s.instances[eligible].zone,'hand')
  assert.ok(s.events.some(e=>e.type==='CARD_REVEALED'&&e.revealedCard?.printingKey===s.instances[eligible].printingKey))
  assert.equal(s.effects!.choice,null)
})
