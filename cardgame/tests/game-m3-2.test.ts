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

// M3-2 searches with the real OP01-016 Nami ([On Play] look at 5, up to 1 {Straw Hat Crew} other than [Nami])
// and OP06-013 Luffy ([On Play] look at 3, up to 1 {FILM}), played with PLAY_CARD in a legal red deck.
// Rules: CR 1.2.1 §3-2-2 (deck secret), §4-8 (up to X: 0..X), §9-1-2/§9-2-1-2 (empty deck loses at once),
// FAQ OP01 (fewer than 5 cards: look at all of them). Fixture mutations only arrange the deck order.
function fixture(): GameInput {
  const cards: CardInput[] = Object.entries(REVIEWED_CARDS).map(([number, facts]) => ({ ...structuredClone(facts), number, printingKey: `${number}::standard`, extensions: [], databaseIds: [], life: facts.category === 'LEADER' ? 5 : null, lifeEvidence: facts.category === 'LEADER' ? [{ field: 'life', value: 5, source: 'https://en.onepiece-cardgame.com/cardlist/?series=569001', checkedAt: '2026-10-10', language: 'en' }] : [] }))
  const catalog = consolidateDefinitions(cards); assert.deepEqual(catalog.errors, [])
  const extra = consolidateDefinitions(M3_ABILITY_CARDS); assert.deepEqual(extra.errors, [])
  const characters = cards.filter(c => c.category === 'CHARACTER')
  const deck = characters.slice(0, 10).map(c => ({ printingKey: c.printingKey, quantity: 4 }))
  deck.push({ printingKey: characters[10].printingKey, quantity: 2 }, { printingKey: 'OP01-016::standard', quantity: 4 }, { printingKey: 'OP06-013::standard', quantity: 4 })
  deck.unshift({ printingKey: 'ST01-001::standard', quantity: 1 })
  const ruleset = structuredClone(M0_RULESET); ruleset.allowedNumbers.push(...M3_ABILITY_CARDS.map(c => c.number))
  return { definitions: [...catalog.definitions, ...extra.definitions], printings: [...catalog.printings, ...extra.printings], gameId: 'm3-search', seed: 77, scope: 'BASIC_TURNS', chooserId: 'alice',
    players: [{ id: 'alice', cards: structuredClone(deck), donCount: 10 }, { id: 'bob', cards: structuredClone(deck), donCount: 10 }], ruleset, effectRegistry: validateRegistry(structuredClone(M3_ABILITY_REGISTRY)) }
}
type Intent = Command extends infer C ? C extends Command ? Omit<C,'id'|'actorId'|'expectedVersion'> : never : never
function attempt(s:GameState,actorId:string,intent:Intent,id=`m3-2-${s.version}`) {return applyCommand(s,{...intent,actorId,id,expectedVersion:s.version})}
function send(s:GameState,actorId:string,intent:Intent) {const r=attempt(s,actorId,intent);assert.ok(r.ok,r.ok?'':r.error);return r.state}
function prepared(targetTurn = 3): GameState {
  let s = createGame(fixture())
  s = send(s, 'alice', { type: 'CHOOSE_FIRST', choice: 'FIRST' })
  for (let n = 0; n < 2; n++) s = send(s, s.decisionPlayerId!, { type: 'MULLIGAN', redraw: false })
  while (s.phase !== 'MAIN') s = send(s, s.activePlayerId!, { type: 'ADVANCE_PHASE' })
  while (s.turn < targetTurn) {
    s = send(s, s.activePlayerId!, { type: 'END_MAIN' })
    while (s.phase !== 'MAIN') s = send(s, s.activePlayerId!, { type: 'ADVANCE_PHASE' })
  }
  return s
}
const numberOf=(s:GameState,id:string)=>s.catalog.definitions.find(d=>d.definitionId===s.instances[id].definitionId)!.number
const traitsOf=(s:GameState,id:string)=>s.catalog.definitions.find(d=>d.definitionId===s.instances[id].definitionId)!.traits
function relocate(s:GameState,id:string,to:'hand'|'deck'|'trash',top=false) {
  const p=s.players.find(p=>p.id===s.instances[id].owner)!, from=s.instances[id].zone
  p.zones[from].splice(p.zones[from].indexOf(id),1); if (top) p.zones[to].unshift(id); else p.zones[to].push(id)
  s.instances[id].zone=to; s.instances[id].zoneGeneration++; s.instances[id].faceUp=to==='trash'
}
// Puts `count` copies of `number` from Alice's deck into her hand, then the given cards on top of her deck.
function arrange(s:GameState,number:string,count:number,top:(s:GameState,deck:string[])=>string[]) {
  const alice=s.players[0]
  const copies=alice.zones.deck.filter(id=>numberOf(s,id)===number).slice(0,count); assert.equal(copies.length,count)
  for(const id of copies) relocate(s,id,'hand')
  for(const id of [...top(s,alice.zones.deck)].reverse()) relocate(s,id,'deck',true)
  assertGameInvariants(s)
  return copies
}
const free=(s:GameState,n:number)=>s.players[0].zones.cost.filter(id=>!s.instances[id].rested).slice(0,n)
const play=(s:GameState,id:string,cost:number)=>send(s,'alice',{type:'PLAY_CARD',instanceId:id,donIds:free(s,cost),replaceId:null})
const answer=(s:GameState,tokens:string[])=>send(s,'alice',{type:'ANSWER_CHOICE',choiceId:s.effects!.choice!.id,tokens})
const rulesNameOf=(s:GameState,id:string)=>s.catalog.definitions.find(d=>d.definitionId===s.instances[id].definitionId)!.rulesName
const strawHat=(s:GameState,id:string)=>traitsOf(s,id).includes('Straw Hat Crew') && rulesNameOf(s,id)!=='Nami'
function hiddenFromBob(s:GameState,ids:string[]) {
  const view=JSON.stringify(projectState(s,'bob'))
  for(const id of ids) assert.equal(view.includes(id),false,`${id} must stay private`)
  assert.equal(getLegalActions(s,'bob').some(a=>a.type==='ANSWER_CHOICE'),false)
}

test('M3-2: Nami with zero candidates offers an empty selection, reveals nothing and puts the 5 cards at the bottom', () => {
  let s=prepared()
  const [nami]=arrange(s,'OP01-016',1,(s,deck)=>deck.filter(id=>!strawHat(s,id)).slice(0,5))
  const top=s.players[0].zones.deck.slice(0,5), handBefore=s.players[0].zones.hand.length
  s=play(s,nami,1)
  const q=s.effects!.choice!
  assert.equal(q.choiceType,'SELECT');assert.equal(q.options.length,0);assert.equal(q.min,0);assert.equal(q.max,0)
  hiddenFromBob(s,top)
  const revealed=s.events.filter(e=>e.type==='CARD_REVEALED').length
  s=answer(s,[])
  assert.equal(s.effects!.choice!.choiceType,'ORDER');assert.equal(s.effects!.choice!.options.length,5)
  hiddenFromBob(s,top)
  s=answer(s,[...s.effects!.choice!.options].reverse().map(o=>o.token))
  assert.deepEqual(s.players[0].zones.deck.slice(-5),[...top].reverse(),'the rest goes to the bottom in the chosen order')
  assert.equal(s.players[0].zones.hand.length,handBefore-1)
  assert.equal(s.events.filter(e=>e.type==='CARD_REVEALED').length,revealed,'nothing is revealed')
  assert.equal(s.effects!.choice,null);assert.equal(s.effects!.continuation,null)
  assertGameInvariants(s)
})

test('M3-2: Nami excludes Nami, may choose zero cards, and a choice above the maximum is refused', () => {
  let s=prepared()
  const [nami]=arrange(s,'OP01-016',1,(s,deck)=>[...deck.filter(id=>strawHat(s,id)).slice(0,2),deck.find(id=>numberOf(s,id)==='ST01-007')!,deck.find(id=>numberOf(s,id)==='OP01-016')!,...deck.filter(id=>!traitsOf(s,id).includes('Straw Hat Crew')).slice(0,1)])
  const top=s.players[0].zones.deck.slice(0,5)
  s=play(s,nami,1)
  const q=s.effects!.choice!
  assert.deepEqual(q.options.map(o=>o.presence.instanceId),top.slice(0,2),'two Straw Hat Crew candidates; ST01-007 and OP01-016, both named Nami, are excluded')
  assert.equal(q.max,1)
  const before=JSON.stringify(s), tooMany=attempt(s,'alice',{type:'ANSWER_CHOICE',choiceId:q.id,tokens:q.options.map(o=>o.token)})
  assert.equal(tooMany.ok,false);assert.equal(JSON.stringify(s),before)
  s=answer(s,[])
  assert.equal(s.effects!.choice!.options.length,5,'declining keeps all five looked-at cards for the bottom')
  s=answer(s,s.effects!.choice!.options.map(o=>o.token))
  assert.deepEqual(s.players[0].zones.deck.slice(-5),top)
  assertGameInvariants(s)
})

test('M3-2: two successive Nami searches each look at the current top 5 and keep both remainders at the bottom', () => {
  let s=prepared()
  const namis=arrange(s,'OP01-016',2,(s,deck)=>[...deck.filter(id=>!strawHat(s,id)).slice(0,4),...deck.filter(id=>strawHat(s,id)).slice(0,2),...deck.filter(id=>!strawHat(s,id)).slice(4,8)])
  const deck0=s.players[0].zones.deck.slice(0,10)
  assert.ok(free(s,2).length===2)
  s=play(s,namis[0],1)
  assert.deepEqual(s.effects!.choice!.options.map(o=>o.presence.instanceId),[deck0[4]])
  s=answer(s,s.effects!.choice!.options.map(o=>o.token))
  assert.equal(s.instances[deck0[4]].zone,'hand')
  s=answer(s,s.effects!.choice!.options.map(o=>o.token))
  assert.deepEqual(s.players[0].zones.deck.slice(0,5),deck0.slice(5,10),'the second search sees the next five cards')
  s=play(restoreGame(JSON.stringify(s)),namis[1],1)
  assert.deepEqual(s.effects!.choice!.options.map(o=>o.presence.instanceId),[deck0[5]])
  s=answer(s,s.effects!.choice!.options.map(o=>o.token))
  s=answer(s,s.effects!.choice!.options.map(o=>o.token))
  assert.deepEqual(s.players[0].zones.deck.slice(-8),[...deck0.slice(0,4),...deck0.slice(6,10)])
  assert.equal(s.events.filter(e=>e.type==='CARD_REVEALED'&&e.revealedCard?.definitionId===s.instances[deck0[5]].definitionId).length>=1,true)
  assertGameInvariants(s)
})

test('M3-2: a search on a deck shorter than its amount looks at every remaining card (FAQ OP01-016)', () => {
  let s=prepared()
  const [nami]=arrange(s,'OP01-016',1,(s,deck)=>[deck.find(id=>strawHat(s,id))!,deck.find(id=>!strawHat(s,id))!])
  const alice=s.players[0], keep=alice.zones.deck.slice(0,3)
  for(const id of alice.zones.deck.slice(3)) relocate(s,id,'trash')
  assertGameInvariants(s)
  s=play(s,nami,1)
  assert.deepEqual(s.effects!.choice!.options.map(o=>o.presence.instanceId),[keep[0]])
  s=answer(s,[])
  assert.deepEqual(s.effects!.choice!.options.map(o=>o.presence.instanceId),keep,'all three cards are looked at')
  s=answer(s,s.effects!.choice!.options.map(o=>o.token))
  assert.deepEqual(s.players[0].zones.deck,keep);assert.equal(s.result,null)
})

test('M3-2: taking the last card of the deck makes its owner lose at once, even before the rest is ordered (CR 9-1-2, 9-2-1-2)', () => {
  let s=prepared()
  const [nami]=arrange(s,'OP01-016',1,(s,deck)=>[deck.find(id=>strawHat(s,id))!])
  const alice=s.players[0], last=alice.zones.deck[0]
  for(const id of alice.zones.deck.slice(1)) relocate(s,id,'trash')
  s=play(s,nami,1)
  assert.equal(s.result,null,'one card remains while it is being looked at')
  s=answer(s,s.effects!.choice!.options.map(o=>o.token))
  assert.equal(s.instances[last].zone,'hand')
  assert.deepEqual(s.result,{reason:'EMPTY_DECK',loserIds:['alice'],winnerId:'bob'})
  assert.equal(getLegalActions(s,'alice').length,0);assert.equal(getLegalActions(s,'bob').length,0)
  assertGameInvariants(s);assert.deepEqual(restoreGame(JSON.stringify(s)),s)
})

test('M3-2: OP06-013 FILM search keeps the deck private, restores from JSON at both stages and replays idempotently', () => {
  let s=prepared()
  const [luffy]=arrange(s,'OP06-013',1,(s,deck)=>[deck.find(id=>!traitsOf(s,id).includes('FILM'))!,deck.find(id=>traitsOf(s,id).includes('FILM'))!,deck.find(id=>!traitsOf(s,id).includes('FILM'))!])
  const top=s.players[0].zones.deck.slice(0,3), rng=structuredClone(s.random)
  s=play(s,luffy,2)
  const select=s.effects!.choice!
  assert.equal(select.visibility,'PRIVATE');assert.deepEqual(select.options.map(o=>o.presence.instanceId),[top[1]])
  hiddenFromBob(s,top)
  const snapshot=JSON.stringify(s), cmd={id:'film-select',actorId:'alice',expectedVersion:s.version,type:'ANSWER_CHOICE' as const,choiceId:select.id,tokens:[select.options[0].token]}
  const a=applyCommand(restoreGame(snapshot),cmd), b=applyCommand(restoreGame(snapshot),cmd)
  assert.ok(a.ok&&b.ok);if(!a.ok||!b.ok) return
  assert.deepEqual(a.state,b.state)
  const replay=applyCommand(a.state,cmd);assert.ok(replay.ok&&replay.replayed);assert.deepEqual(replay.state,a.state)
  s=a.state
  hiddenFromBob(s,[top[0],top[2]])
  assert.ok(s.events.some(e=>e.type==='CARD_REVEALED'&&e.revealedCard?.definitionId===s.instances[top[1]].definitionId),'the chosen card is revealed')
  const forged=attempt(s,'alice',{type:'ANSWER_CHOICE',choiceId:s.effects!.choice!.id,tokens:[s.effects!.choice!.options[0].token]})
  assert.equal(forged.ok,false,'the ORDER step needs every remaining card')
  s=send(restoreGame(JSON.stringify(s)),'alice',{type:'ANSWER_CHOICE',choiceId:s.effects!.choice!.id,tokens:s.effects!.choice!.options.map(o=>o.token)})
  assert.deepEqual(s.players[0].zones.deck.slice(-2),[top[0],top[2]])
  assert.deepEqual(s.random,rng,'a bottom-in-any-order search does not shuffle and consumes no randomness')
  assertGameInvariants(s)
})

test('M3-2: a rule-imposed shuffle (mulligan, CR 5-2-1-6-1) consumes the serialized PRNG deterministically', () => {
  const run=()=>{let s=createGame(fixture());s=send(s,'alice',{type:'CHOOSE_FIRST',choice:'FIRST'});const before=s.random.draws;s=send(s,'alice',{type:'MULLIGAN',redraw:true});return {s,before}}
  const one=run(), two=run()
  assert.ok(one.s.random.draws>one.before,'the redraw reshuffles with the game PRNG')
  assert.deepEqual(one.s.players[0].zones.hand,two.s.players[0].zones.hand)
  assert.deepEqual(restoreGame(JSON.stringify(one.s)),one.s)
  assert.equal(JSON.stringify(projectState(one.s,'bob')).includes(one.s.players[0].zones.hand[0]),false)
})
