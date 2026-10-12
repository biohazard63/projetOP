import test from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fullGameInput } from '../scripts/game/m3-full-game'
import { CERTIFICATIONS as ALL_CERTIFICATIONS, CERTIFICATION_BLOCKERS, CERTIFIED_PLAY_TEST, BLOCKER_TEST, M5_CERTIFIED_TEST, certificationErrors, certificationOf, effectiveStatus } from '../src/game/cards/certification'
import { M5_REVISION } from '../src/game/cards/m5Catalog'
// The M4 batch only (the M5 batch is played by tests/game-m5-certification.test.ts on the M5 catalogue).
const CERTIFICATIONS = ALL_CERTIFICATIONS.filter(c => !c.definitionId.endsWith(`@${M5_REVISION}`))
import { M3_FULL_REGISTRY } from '../src/game/cards/m3PurpleDeck'
import { createGame, applyCommand, getLegalActions } from '../src/game/core/game'
import { assertGameInvariants } from '../src/game/core/invariants'
import { evaluateCharacteristics } from '../src/game/effects/characteristics'
import type { Command, GameState } from '../src/game/core/types'

// M4-C1/C2: certification per revision. Fixtures only reorder hidden zones; every action is a public command.
type Intent = Command extends infer C ? C extends Command ? Omit<C,'id'|'actorId'|'expectedVersion'> : never : never
function send(s:GameState,actorId:string,intent:Intent) {const r=applyCommand(s,{...intent,actorId,id:`c-${s.version}`,expectedVersion:s.version});assert.ok(r.ok,r.ok?'':`${intent.type}:${r.error}`);return r.state}
const numberOf=(s:GameState,id:string)=>s.catalog.definitions.find(d=>d.definitionId===s.instances[id]?.definitionId)?.number
const definitionOf=(s:GameState,id:string)=>s.catalog.definitions.find(d=>d.definitionId===s.instances[id]?.definitionId)!
// A second legal red deck holding every red card certified in C2 (12 numbers x4 + ST01-014 x2).
const RED_CERTIFIED_DECK=[{printingKey:'ST01-001::standard',quantity:1},...['ST01-003','ST01-006','ST01-007','ST01-008','ST01-009','ST01-010','OP01-010','OP01-012','OP01-018','OP01-023','P-012','P-016'].map(n=>({printingKey:`${n}::standard`,quantity:4})),{printingKey:'ST01-014::standard',quantity:2}]
function opened(seed=77) {
  const input=fullGameInput(seed); input.players[1].cards=structuredClone(RED_CERTIFIED_DECK)
  let s=createGame(input); s=send(s,'alice',{type:'CHOOSE_FIRST',choice:'FIRST'})
  for (let n=0;n<2;n++) s=send(s,s.decisionPlayerId!,{type:'MULLIGAN',redraw:false})
  return s
}
const toMain=(s:GameState)=>{while(s.phase!=='MAIN') s=send(s,s.activePlayerId!,{type:'ADVANCE_PHASE'});return s}
const passTurn=(s:GameState)=>toMain(send(s,s.activePlayerId!,{type:'END_MAIN'}))
function swapIn(s:GameState,player:number,number:string) {
  const p=s.players[player], from=p.zones.deck.findIndex(id=>numberOf(s,id)===number); assert.ok(from>=0,number)
  const card=p.zones.deck[from], out=p.zones.hand[0]
  p.zones.deck[from]=out; p.zones.hand[0]=card
  s.instances[card].zone='hand'; s.instances[card].zoneGeneration++; s.instances[out].zone='deck'; s.instances[out].zoneGeneration++
  assertGameInvariants(s); return card
}
const catalog=fullGameInput()

test('M4-C1: every certification binds one exact revision, re-checked sources, executable abilities and tests', () => {
  for (const c of CERTIFICATIONS) assert.deepEqual(certificationErrors(c, catalog.definitions.find(d=>d.definitionId===c.definitionId), M3_FULL_REGISTRY), [], c.definitionId)
  assert.equal(new Set(CERTIFICATIONS.map(c=>c.definitionId)).size, CERTIFICATIONS.length)
})

test('M4-C1: every test title cited by a certification exists in the repository suites', () => {
  const sources=readdirSync(__dirname).filter(f=>f.endsWith('.test.ts')).map(f=>readFileSync(join(__dirname,f),'utf8')).join('\n')
  const titles=new Set([...ALL_CERTIFICATIONS.flatMap(c=>[...c.tests,...c.abilities.flatMap(a=>a.tests)])])
  const constants: Record<string,string>={CERTIFIED_PLAY_TEST,BLOCKER_TEST,M5_CERTIFIED_TEST}
  for (const title of titles) assert.ok(sources.includes(`'${title}'`) || Object.entries(constants).some(([name,value])=>value===title&&sources.includes(`test(${name}`)), title)
})

test('M4-C1: PLAYABLE_VERIFIED comes only from a certification, never from review metadata, a clone or a deck', () => {
  for (const d of catalog.definitions) {
    const certified=!!certificationOf(d.definitionId)
    assert.equal(effectiveStatus(d)==='PLAYABLE_VERIFIED', certified, d.definitionId)
  }
  const historic=catalog.definitions.filter(d=>d.review.playabilityStatus==='PLAYABLE_VERIFIED')
  for (const d of historic) assert.equal(effectiveStatus(d), certificationOf(d.definitionId) ? 'PLAYABLE_VERIFIED' : 'DATA_VALID_EFFECT_PENDING', `${d.definitionId}: laboratory status is not a certification`)
  for (const number of ['ST04-001','ST04-016','OP06-017','ST01-001','ST01-007','ST01-014','P-015']) assert.equal(effectiveStatus(catalog.definitions.find(d=>d.number===number)!)==='PLAYABLE_VERIFIED', false, `${number} is not certified in C2`)
  assert.equal(CERTIFICATION_BLOCKERS.find(b=>b.definitionId==='P-015@m0-2026-10-10')?.reason, 'DATA_CONFLICT')
  assert.ok(catalog.definitions.some(d=>d.number==='P-015'&&d.attributes.includes('STRIKE')), 'the m0 revision is kept unchanged; the conflict blocks certification')
})

test(CERTIFIED_PLAY_TEST, () => {
  const characters=CERTIFICATIONS.map(c=>catalog.definitions.find(d=>d.definitionId===c.definitionId)!).filter(d=>d.category==='CHARACTER')
  assert.equal(characters.length, CERTIFICATIONS.length)
  for (const d of characters) {
    const owner=d.colors.includes('PURPLE') ? 0 : 1, ownerId=owner===0?'alice':'bob', foeId=owner===0?'bob':'alice'
    // Play it for its printed cost on the owner's first turn with enough DON!!.
    let s=opened(); const card=swapIn(s,owner,d.number); s=toMain(s)
    while (!(s.activePlayerId===ownerId && s.players[owner].zones.cost.filter(id=>!s.instances[id].rested).length>=d.cost! && s.players[owner].turns>1)) s=passTurn(s)
    const play=getLegalActions(s,ownerId).find(a=>a.type==='PLAY_CARD'&&a.instanceId===card)
    assert.ok(play&&play.type==='PLAY_CARD'&&play.cost===d.cost, `${d.number} costs ${d.cost}`)
    s=send(s,ownerId,{type:'PLAY_CARD',instanceId:card,donIds:play.eligibleDonIds.slice(0,d.cost!),replaceId:null})
    assert.equal(s.instances[card].zone,'characters'); assert.equal(evaluateCharacteristics(s,card).power.current,d.power)
    // Next own turn it attacks with its printed power.
    s=passTurn(passTurn(s))
    s=send(s,ownerId,{type:'DECLARE_ATTACK',attackerId:card,targetId:s.players[1-owner].zones.leader[0]})
    assert.equal(evaluateCharacteristics(s,card).power.current,d.power,`${d.number} attacks with ${d.power}`)
    s=send(s,foeId,{type:'PASS_BLOCKER',battleId:s.battle!.id}); s=send(s,foeId,{type:'PASS_COUNTER',battleId:s.battle!.id}); s=send(s,ownerId,{type:'RESOLVE_BATTLE',battleId:s.battle!.id})
    while (s.battle) s=send(s, s.battle.step==='LIFE_TRIGGER'?foeId:ownerId, s.battle.step==='LIFE_TRIGGER'?{type:'ANSWER_TRIGGER',choiceId:s.battle.pendingLifeTrigger!.id,activate:false}:{type:'CONTINUE_LIFE_DAMAGE',battleId:s.battle.id})
    assert.equal(s.players[1-owner].zones.life.length, d.power!>=5000?4:5, `${d.number} vs a 5000 Leader`)
    // Its printed Counter value defends from hand.
    if (d.counter!==null) {
      let t=opened(); const counter=swapIn(t,owner,d.number); t=toMain(t)
      while (!(t.activePlayerId===foeId && t.players[1-owner].turns>1)) t=passTurn(t)
      t=send(t,foeId,{type:'DECLARE_ATTACK',attackerId:t.players[1-owner].zones.leader[0],targetId:t.players[owner].zones.leader[0]})
      t=send(t,ownerId,{type:'PASS_BLOCKER',battleId:t.battle!.id})
      t=send(t,ownerId,{type:'PLAY_COUNTER_CHARACTER',cardId:counter,targetId:t.players[owner].zones.leader[0],battleId:t.battle!.id})
      assert.equal(t.battle!.counterModifiers.at(-1)!.amount,d.counter,`${d.number} counters +${d.counter}`)
      assert.equal(t.instances[counter].zone,'trash')
    }
  }
})

test(BLOCKER_TEST, () => {
  for (const [number, owner] of [['ST01-006',1],['ST04-011',0]] as const) {
    const ownerId=owner===0?'alice':'bob', foeId=owner===0?'bob':'alice'
    let s=opened(); const card=swapIn(s,owner,number); s=toMain(s)
    while (!(s.activePlayerId===ownerId && s.players[owner].zones.cost.filter(id=>!s.instances[id].rested).length>=definitionOf(s,card).cost! && s.players[owner].turns>=1)) s=passTurn(s)
    s=send(s,ownerId,{type:'PLAY_CARD',instanceId:card,donIds:s.players[owner].zones.cost.filter(id=>!s.instances[id].rested).slice(0,definitionOf(s,card).cost!),replaceId:null})
    s=passTurn(s); while (s.players[1-owner].turns<2 || s.activePlayerId!==foeId) s=passTurn(s)
    const leader=s.players[owner].zones.leader[0]
    s=send(s,foeId,{type:'DECLARE_ATTACK',attackerId:s.players[1-owner].zones.leader[0],targetId:leader})
    const block=getLegalActions(s,ownerId).find(a=>a.type==='ACTIVATE_BLOCKER')
    assert.ok(block&&block.type==='ACTIVATE_BLOCKER'&&block.blockerIds.includes(card),number)
    s=send(s,ownerId,{type:'ACTIVATE_BLOCKER',blockerId:card,battleId:s.battle!.id})
    assert.equal(s.battle!.target.instanceId,card); assert.equal(s.instances[card].rested,true)
    assert.ok(s.events.some(e=>e.type==='BLOCKER_ACTIVATED'&&e.publicInstanceId===card))
  }
})
