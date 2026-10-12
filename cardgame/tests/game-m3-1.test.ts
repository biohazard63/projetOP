import test from 'node:test'
import assert from 'node:assert/strict'
import { consolidateDefinitions } from '../src/game/cards/adapter'
import { REVIEWED_CARDS } from '../src/game/cards/reviewedCards'
import { OFFICIAL_ABILITY_CARDS } from '../src/game/cards/officialAbilities'
import { M0_RULESET } from '../src/game/rulesets/m0'
import { createGame, applyCommand, projectState, restoreGame } from '../src/game/core/game'
import { assertGameInvariants } from '../src/game/core/invariants'
import type { CardInput } from '../src/game/cards/types'
import type { Command, GameInput, GameState } from '../src/game/core/types'
import { validateRegistry } from '../src/game/effects/contracts'
import { M3_ABILITY_CARDS, M3_ABILITY_REGISTRY } from '../src/game/cards/m3Abilities'

// M3-1 runtime tests for ST03-017 Love-Love Mellow and ST04-016 Blast Breath (declarative Counter path).
// Texts, errata (2022-09-26, "Up to 1") and FAQ checked on en.onepiece-cardgame.com on 2026-10-12.
// No reviewed blue or purple Leader exists yet, so these cards cannot enter a legal deck: the fixture keeps a
// legal red deck and retypes the red carrier in hand after createGame (same technique as game-m2a Blast Breath).
// These are runtime-isolated tests, not playability evidence; they certify nothing.
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
function counterFixture(number: string): {s: GameState, cardId: string} {
  const input = fixture(), cards = structuredClone(M3_ABILITY_CARDS)
  const catalog = consolidateDefinitions(cards); assert.deepEqual(catalog.errors, [])
  input.definitions.push(...catalog.definitions); input.printings.push(...catalog.printings)
  input.ruleset.allowedNumbers.push(...cards.map(c=>c.number))
  input.effectRegistry=validateRegistry(structuredClone(M3_ABILITY_REGISTRY))
  for(const p of input.players) {p.cards.find(e=>e.quantity===4)!.quantity--;p.cards.push({printingKey:'OP06-017::standard',quantity:1})}
  let s=prepared(3,input)
  const owner=s.players[1], carrier=catalog.definitions.find(d=>d.number==='OP06-017')!
  const cardId=owner.zones.deck.find(id=>s.instances[id].definitionId===carrier.definitionId)!
  owner.zones.deck.splice(owner.zones.deck.indexOf(cardId),1);owner.zones.hand.push(cardId);s.instances[cardId].zone='hand';s.instances[cardId].zoneGeneration++
  const target=catalog.definitions.find(d=>d.number===number)!
  s.instances[cardId].definitionId=target.definitionId;s.instances[cardId].printingKey=catalog.printings.find(p=>p.definitionId===target.definitionId)!.printingKey
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
const activeDons=(s:GameState)=>s.players[1].zones.cost.filter(id=>!s.instances[id].rested)
// Keeps the Event plus `others` cards in Bob's hand; the surplus goes to the bottom of his deck.
function setHand(s:GameState,cardId:string,others:number) {
  const p=s.players[1]
  for(const id of p.zones.hand.filter(id=>id!==cardId).slice(others)) {p.zones.hand.splice(p.zones.hand.indexOf(id),1);p.zones.deck.push(id);s.instances[id].zone='deck';s.instances[id].zoneGeneration++}
  assert.equal(p.zones.hand.length,others+1);assertGameInvariants(s)
}
function playMellow(s:GameState,cardId:string) {
  s=send(s,'bob',{type:'PLAY_COUNTER_EVENT',cardId,battleId:s.battle!.id,paymentDonIds:activeDons(s).slice(0,2),donMinusIds:[],targetId:null})
  assert.equal(s.instances[cardId].zone,'trash')
  return s
}
const leaderAnswer=(s:GameState)=>{const q=s.effects!.choice!;return {type:'ANSWER_CHOICE' as const,choiceId:q.id,tokens:[q.options.find(o=>o.presence.instanceId===s.players[1].zones.leader[0])!.token]}}

test('M3-1: Love-Love Mellow draws when the hand holds 3 cards once the Event is trashed (FAQ ST03-017)', () => {
  let {s,cardId}=counterFixture('ST03-017')
  setHand(s,cardId,3)
  const deckBefore=s.players[1].zones.deck.length
  s=playMellow(s,cardId)
  assert.equal(s.players[1].zones.hand.length,3,'the trashed Event no longer counts in hand')
  s=send(s,'bob',leaderAnswer(s))
  const leader=s.players[1].zones.leader[0]
  assert.deepEqual(s.battle!.counterModifiers.at(-1),{target:{instanceId:leader,generation:s.instances[leader].zoneGeneration},amount:4000})
  assert.equal(s.players[1].zones.hand.length,4);assert.equal(s.players[1].zones.deck.length,deckBefore-1)
  assert.equal(s.effects!.choice,null);assert.equal(s.effects!.continuation,null)
  const drawn=s.players[1].zones.hand.at(-1)!
  assert.equal(JSON.stringify(projectState(s,'alice')).includes(drawn),false,'the opponent projection hides the drawn card')
  assert.ok(JSON.stringify(projectState(s,'bob')).includes(drawn))
  assertGameInvariants(s)
})

test('M3-1: Love-Love Mellow does not draw when 4 cards remain in hand after the Event is trashed', () => {
  let {s,cardId}=counterFixture('ST03-017')
  setHand(s,cardId,4)
  const deckBefore=s.players[1].zones.deck.length
  s=playMellow(s,cardId)
  s=send(s,'bob',leaderAnswer(s))
  assert.equal(s.battle!.counterModifiers.at(-1)!.amount,4000,'the power step does not depend on the draw condition')
  assert.equal(s.players[1].zones.hand.length,4);assert.equal(s.players[1].zones.deck.length,deckBefore)
  assertGameInvariants(s)
})

test('M3-1: Love-Love Mellow resumes once from JSON and a repeated answer neither redraws nor rebuffs', () => {
  let {s,cardId}=counterFixture('ST03-017')
  setHand(s,cardId,3)
  s=playMellow(s,cardId)
  const pending=JSON.stringify(projectState(s,'alice'))
  for(const id of s.players[1].zones.hand) assert.equal(pending.includes(id),false,'no hidden hand card leaks while the choice is pending')
  const snapshot=JSON.stringify(s), first=restoreGame(snapshot), second=restoreGame(snapshot)
  assert.deepEqual(first,s)
  const answer=leaderAnswer(first)
  const resumed=send(first,'bob',answer)
  assert.deepEqual(send(second,'bob',answer),resumed)
  const replay=applyCommand(resumed,{...answer,actorId:'bob',id:`m3-${first.version}`,expectedVersion:first.version})
  assert.ok(replay.ok&&replay.replayed);assert.deepEqual(replay.state,resumed)
  assert.equal(attempt(resumed,'bob',answer,'answer-again').ok,false)
  assert.equal(resumed.battle!.counterModifiers.filter(m=>m.amount===4000).length,1)
  assert.equal(resumed.players[1].zones.hand.length,4,'exactly one card drawn')
  assert.deepEqual(restoreGame(JSON.stringify(resumed)),resumed)
})

test('M3-1: Blast Breath with DON!! -1 returns one DON!! and grants +4000 during this battle', () => {
  let {s,cardId}=counterFixture('ST04-016')
  const [paid,returned]=activeDons(s), operations=s.effects!.operations!.length
  s=send(s,'bob',{type:'PLAY_COUNTER_EVENT',cardId,battleId:s.battle!.id,paymentDonIds:[paid],donMinusIds:[returned],targetId:null})
  assert.equal(s.instances[paid].rested,true,'printed cost paid')
  assert.equal(s.instances[returned].zone,'donDeck','DON!! -1 returned the chosen DON!!')
  assert.ok(s.players[1].zones.donDeck.includes(returned))
  assert.deepEqual(s.effects!.operations!.slice(operations).map(o=>[o.type,o.intent,o.outcome]),[['REST','COST','CONFIRMED'],['MOVE_CARD','RULE','CONFIRMED'],['MOVE_CARD','COST','CONFIRMED']])
  assert.equal(s.instances[cardId].zone,'trash')
  s=send(restoreGame(JSON.stringify(s)),'bob',leaderAnswer(s))
  const leader=s.players[1].zones.leader[0]
  assert.deepEqual(s.battle!.counterModifiers.at(-1),{target:{instanceId:leader,generation:s.instances[leader].zoneGeneration},amount:4000})
  assert.equal(s.effects!.choice,null)
  assertGameInvariants(s)
})

test('M3-1: Blast Breath without DON!! -1 is activated but its effect does not apply (FAQ ST04-016)', () => {
  let {s,cardId}=counterFixture('ST04-016')
  const [paid]=activeDons(s), donDeck=s.players[1].zones.donDeck.length
  s=send(s,'bob',{type:'PLAY_COUNTER_EVENT',cardId,battleId:s.battle!.id,paymentDonIds:[paid],donMinusIds:[],targetId:null})
  assert.equal(s.instances[cardId].zone,'trash');assert.equal(s.instances[paid].rested,true)
  assert.equal(s.players[1].zones.donDeck.length,donDeck)
  assert.equal(s.effects!.choice,null);assert.equal(s.effects!.continuation,null)
  assert.equal(s.battle!.counterModifiers.length,0)
  assertGameInvariants(s)
})

test('M3-1: Blast Breath refuses a DON!! -1 that is not one of the player\'s field DON!!', () => {
  const {s,cardId}=counterFixture('ST04-016')
  const [paid,other]=activeDons(s), battleId=s.battle!.id
  const play=(donMinusIds:string[])=>({type:'PLAY_COUNTER_EVENT' as const,cardId,battleId,paymentDonIds:[paid],donMinusIds,targetId:null})
  refused(s,'bob',play([s.players[1].zones.donDeck[0]]),'INVALID_COUNTER_EVENT_EFFECT_CHOICE')
  refused(s,'bob',play([s.players[0].zones.cost[0]]),'INVALID_COUNTER_EVENT_EFFECT_CHOICE')
  refused(s,'bob',play([s.players[1].zones.hand[0]]),'INVALID_COUNTER_EVENT_EFFECT_CHOICE')
  refused(s,'bob',play([other,paid]),'INVALID_COUNTER_EVENT_EFFECT_CHOICE')
  refused(s,'bob',{...play([other]),lifePayment:true},'INVALID_COUNTER_EVENT_EFFECT_CHOICE')
})

const historic=new Map(OFFICIAL_ABILITY_CARDS.map(card=>[card.number,card]))
const abilityIds=(card:CardInput)=>(card.review?.effects ?? []).flatMap(effect=>effect.kind==='declarative'?effect.abilityIds:[]).sort()

test('M3-1: no card introduced by M3 is declared PLAYABLE_VERIFIED', () => {
  for(const card of M3_ABILITY_CARDS.filter(card=>!historic.has(card.number))) assert.notEqual(card.review?.playabilityStatus,'PLAYABLE_VERIFIED',card.number)
})

test('M3-1: a cloned card whose abilities changed in M3 does not keep an inherited PLAYABLE_VERIFIED', () => {
  let changed=0
  for(const card of M3_ABILITY_CARDS.filter(card=>historic.has(card.number))) {
    const before=historic.get(card.number)!
    if (JSON.stringify(abilityIds(card))===JSON.stringify(abilityIds(before)) && JSON.stringify(card.review?.counterEvent)===JSON.stringify(before.review?.counterEvent)) {
      assert.equal(card.review!.revision,before.review!.revision,`${card.number}: an unchanged profile keeps its historic revision`)
      continue
    }
    changed++
    assert.notEqual(card.review?.playabilityStatus,'PLAYABLE_VERIFIED',`${card.number} inherits a certification that predates its M3 abilities`)
    assert.notEqual(card.review!.revision,before.review!.revision,`${card.number} needs its own M3 revision`)
  }
  assert.deepEqual(M3_ABILITY_CARDS.filter(card=>historic.has(card.number)&&card.review!.revision==='m3-2026-10-12').map(c=>c.number).sort(),['OP06-017','ST04-016'])
  assert.equal(changed,2)
})

test('M3-1: M3 revisions get distinct definitionIds and every M3 program points at an M3 catalog definition', () => {
  const official=consolidateDefinitions(OFFICIAL_ABILITY_CARDS), m3=consolidateDefinitions(M3_ABILITY_CARDS)
  assert.deepEqual(official.errors,[]);assert.deepEqual(m3.errors,[])
  const ids=new Set(m3.definitions.map(d=>d.definitionId))
  const reviewedIds=new Set(Object.keys(REVIEWED_CARDS).map(number=>`${number}@${REVIEWED_CARDS[number].review.revision}`))
  for(const number of ['OP06-017','ST04-016']) {
    assert.ok(ids.has(`${number}@m3-2026-10-12`));assert.equal(ids.has(`${number}@official-2026-10-11`),false)
    assert.ok(official.definitions.some(d=>d.definitionId===`${number}@official-2026-10-11`),'the historic definition is unchanged')
  }
  assert.equal(OFFICIAL_ABILITY_CARDS.find(c=>c.number==='OP06-017')!.review!.playabilityStatus,'PLAYABLE_VERIFIED','historic laboratory status is preserved, not rewritten')
  const registry=validateRegistry(structuredClone(M3_ABILITY_REGISTRY))
  for(const d of registry.definitions) if (d.source.kind==='CARD_DEFINITION') assert.ok(ids.has(d.source.definitionId)||reviewedIds.has(d.source.definitionId),`${d.id} -> ${d.source.definitionId}`)
  assert.equal(registry.definitions.some(d=>d.source.kind==='CARD_DEFINITION'&&d.source.definitionId.includes('@official-2026-10-11')&&['OP06-017','ST04-016'].includes(d.source.definitionId.split('@')[0])),false)
  const meteor=m3.definitions.find(d=>d.number==='OP06-017')!
  assert.deepEqual(registry.definitions.filter(d=>d.source.kind==='CARD_DEFINITION'&&d.source.definitionId===meteor.definitionId).map(d=>d.timing).sort(),['COUNTER','MAIN'],'Meteor keeps its [Main] program and gains the declarative [Counter] on the M3 revision')
})

// CR 1.2.1 §4-10-2: a following clause resolves even if the preceding "then" clause could not (here: 0 targets chosen).
test('M3-1: Love-Love Mellow still draws when its optional target is declined (CR 4-10-2)', () => {
  let {s,cardId}=counterFixture('ST03-017')
  setHand(s,cardId,3)
  s=playMellow(s,cardId)
  s=send(s,'bob',{type:'ANSWER_CHOICE',choiceId:s.effects!.choice!.id,tokens:[]})
  assert.equal(s.battle!.counterModifiers.length,0)
  assert.equal(s.players[1].zones.hand.length,4,'the draw clause is independent of the declined power clause')
  assertGameInvariants(s)
})

test('M3-1: Meteor-Strike of Love without its optional Life cost is activated but its effect does not apply', () => {
  const input=fixture(), cards=structuredClone(M3_ABILITY_CARDS), catalog=consolidateDefinitions(cards)
  input.definitions.push(...catalog.definitions);input.printings.push(...catalog.printings);input.ruleset.allowedNumbers.push(...cards.map(c=>c.number))
  input.effectRegistry=validateRegistry(structuredClone(M3_ABILITY_REGISTRY))
  for(const p of input.players) {p.cards.find(e=>e.quantity===4)!.quantity--;p.cards.push({printingKey:'OP06-017::standard',quantity:1})}
  let s=prepared(3,input)
  const bob=s.players[1], cardId=bob.zones.deck.find(id=>s.catalog.definitions.find(d=>d.definitionId===s.instances[id].definitionId)?.number==='OP06-017')!
  bob.zones.deck.splice(bob.zones.deck.indexOf(cardId),1);bob.zones.hand.push(cardId);s.instances[cardId].zone='hand';s.instances[cardId].zoneGeneration++
  s=send(s,'alice',{type:'DECLARE_ATTACK',attackerId:s.players[0].zones.leader[0],targetId:bob.zones.leader[0]})
  s=send(s,'bob',{type:'PASS_BLOCKER',battleId:s.battle!.id})
  assert.equal(s.instances[cardId].definitionId,'OP06-017@m3-2026-10-12')
  const life=s.players[1].zones.life.length, dons=activeDons(s).slice(0,2)
  s=send(s,'bob',{type:'PLAY_COUNTER_EVENT',cardId,battleId:s.battle!.id,paymentDonIds:dons,donMinusIds:[],targetId:null})
  assert.equal(s.instances[cardId].zone,'trash');assert.ok(dons.every(id=>s.instances[id].rested))
  assert.equal(s.players[1].zones.life.length,life);assert.equal(s.effects!.choice,null)
  assert.equal(s.effects!.powerModifiers!.length,0);assert.equal(s.battle!.counterModifiers.length,0)
})

test('M3-1: Guard Point [Trigger] from real Life damage gives +1000 during this turn and stays private until revealed', () => {
  const input=fixture(), cards=structuredClone(M3_ABILITY_CARDS), catalog=consolidateDefinitions(cards)
  input.definitions.push(...catalog.definitions);input.printings.push(...catalog.printings);input.ruleset.allowedNumbers.push(...cards.map(c=>c.number))
  input.effectRegistry=validateRegistry(structuredClone(M3_ABILITY_REGISTRY))
  for(const p of input.players) {p.cards.find(e=>e.quantity===4)!.quantity--;p.cards.push({printingKey:'ST01-014::standard',quantity:1})}
  let s=prepared(3,input)
  const bob=s.players[1], guard=Object.keys(s.instances).find(id=>s.instances[id].owner==='bob'&&s.catalog.definitions.find(d=>d.definitionId===s.instances[id].definitionId)?.number==='ST01-014')!
  const zone=s.instances[guard].zone
  if (zone!=='life') {
    bob.zones[zone].splice(bob.zones[zone].indexOf(guard),1)
    const displaced=bob.zones.life.shift()!;bob.zones[zone].push(displaced);s.instances[displaced].zone=zone;s.instances[displaced].zoneGeneration++;s.instances[displaced].faceUp=false
  } else bob.zones.life.splice(bob.zones.life.indexOf(guard),1)
  bob.zones.life.unshift(guard);s.instances[guard].zone='life';s.instances[guard].zoneGeneration++;s.instances[guard].faceUp=false
  assertGameInvariants(s)
  s=send(s,'alice',{type:'DECLARE_ATTACK',attackerId:s.players[0].zones.leader[0],targetId:bob.zones.leader[0]})
  s=send(s,'bob',{type:'PASS_BLOCKER',battleId:s.battle!.id})
  s=send(s,'bob',{type:'PASS_COUNTER',battleId:s.battle!.id})
  s=send(s,'alice',{type:'RESOLVE_BATTLE',battleId:s.battle!.id})
  assert.equal(s.battle!.step,'LIFE_TRIGGER')
  assert.equal(JSON.stringify(projectState(s,'alice')).includes(guard),false,'the Life card stays hidden before activation')
  const prompt=s.battle!.pendingLifeTrigger!
  s=send(restoreGame(JSON.stringify(s)),'bob',{type:'ANSWER_TRIGGER',choiceId:prompt.id,activate:true})
  assert.equal(s.instances[guard].zone,'temporary')
  const leader=s.players[1].zones.leader[0], q=s.effects!.choice!
  s=send(s,'bob',{type:'ANSWER_CHOICE',choiceId:q.id,tokens:[q.options.find(o=>o.presence.instanceId===leader)!.token]})
  const bonus=s.effects!.powerModifiers!.at(-1)!
  assert.equal(bonus.amount,1000);assert.equal(bonus.subject.instanceId,leader);assert.equal(bonus.turnId,s.turn)
  assert.equal(s.instances[guard].zone,'trash')
  s=send(s,'alice',{type:'CONTINUE_LIFE_DAMAGE',battleId:s.battle!.id})
  assert.equal(s.battle,null);assert.equal(s.players[1].zones.life.length,4)
  assertGameInvariants(s);assert.deepEqual(restoreGame(JSON.stringify(s)),s)
})
