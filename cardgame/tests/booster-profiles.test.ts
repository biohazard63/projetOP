import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateBooster, drawIdentity, validatePools, metadataVariant, type DrawCard } from '../src/lib/boosters/generator'
import { rulesSchema, resolveRules, normalizeRarity, BoosterError, type BoosterRules } from '../src/lib/boosters/rules'
import { proposeProfile, expandProfile } from '../src/lib/boosters/profile-proposal'
const card=(id:string,rarity='SR',alt=false):DrawCard=>({id,code:id,setCode:'OP-999995',rarity,isAltArt:alt,isParallel:false,isSpecial:false})
const slot=(rarity:string,variant:'standard'|'alt'|'special'='standard')=>({choices:[{rarity,variant,weight:1}]})
const managed=(profiles:{label:string;weight:number;slots:ReturnType<typeof slot>[]}[]):BoosterRules=>rulesSchema.parse({version:1,label:'Test managed profiles',source:'Synthetic non-official fixture',selection:'number',variantPolicy:'metadata',slots:profiles[0].slots,packProfiles:profiles})
function rng(seed:number){return()=>{seed=(1664525*seed+1013904223)>>>0;return seed/0x100000000}}
const code=(value:string)=>(e:unknown)=>e instanceof BoosterError&&e.code===value

test('complete profile probabilities control alternatives independently of catalogue size',()=>{
 const rules=managed([{label:'standard',weight:80,slots:[slot('SR')]},{label:'ALT',weight:20,slots:[slot('SR','alt')]}])
 const initial=[card('OP99-001'),card('OP99-001_p1','SR',true),card('OP99-002'),card('OP99-002_p1','SR',true)]
 for(const cards of [initial,[...initial,...Array.from({length:10},(_,i)=>card(`OP99-001_p${i+2}`,'SR',true))]]){
  let hits=0;const random=rng(2026)
  for(let i=0;i<20000;i++){const draw=generateBooster(cards,'OP-999995',rules,random);if(draw.profile==='ALT')hits++;assert.equal(draw.specialPack,null)}
  assert.ok(Math.abs(hits/20000-.2)<.012)
 }
})
test('five illustrations of a number do not make it five times more likely',()=>{
 const rules=managed([{label:'ALT',weight:1,slots:[slot('SR','alt')]}])
 const cards=[...Array.from({length:5},(_,i)=>card(`OP99-001_p${i+1}`,'SR',true)),card('OP99-002_p1','SR',true)]
 let first=0;const random=rng(7)
 for(let i=0;i<20000;i++)if(drawIdentity(generateBooster(cards,'OP-999995',rules,random).cards[0])==='OP99-001')first++
 assert.ok(Math.abs(first/20000-.5)<.015)
})
test('explicit card weights define max number weight then relative art weights',()=>{
 const rules=managed([{label:'ALT',weight:1,slots:[slot('SR','alt')]}])
 const cards=[card('OP99-001_p1','SR',true),card('OP99-001_p2','SR',true),card('OP99-002_p1','SR',true)]
 const weights=new Map([[cards[0].id,1],[cards[1].id,3],[cards[2].id,1]])
 let number=0,secondArt=0;const random=rng(44)
 for(let i=0;i<20000;i++){const c=generateBooster(cards,'OP-999995',rules,random,weights).cards[0];if(drawIdentity(c)==='OP99-001')number++;if(c.id===cards[1].id)secondArt++}
 assert.ok(Math.abs(number/20000-.75)<.015);assert.ok(Math.abs(secondArt/20000-.5625)<.015)
})
test('all complete compositions are feasible before any RNG is called',()=>{
 const rules=managed([{label:'normal',weight:99,slots:[slot('SR'),slot('SR')]},{label:'invalid rare',weight:1,slots:[slot('SR','alt'),slot('SR','alt')]}])
 let calls=0
 assert.throws(()=>generateBooster([card('one'),card('two'),card('one_p1','SR',true)],'OP-999995',rules,()=>{calls++;return .5}),code('INSUFFICIENT_UNIQUE_CARDS'))
 assert.equal(calls,0)
})
test('complete profiles cannot hide independent rarity choices or wildcard variants',()=>{
 const valid=managed([{label:'normal',weight:1,slots:[slot('SR')]}])
 for(const patch of [{selection:'card'},{variantPolicy:'legacy'},{specialPacks:[{label:'mix',probability:.1,slots:[slot('SR')]}]}])assert.throws(()=>rulesSchema.parse({...valid,...patch}))
 for(const choice of [{rarity:'*',variant:'standard',weight:1},{rarity:'SR',variant:'any',weight:1}])assert.throws(()=>rulesSchema.parse({...valid,slots:[{choices:[choice]}],packProfiles:[{label:'bad',weight:1,slots:[{choices:[choice]}]}]}))
 assert.throws(()=>rulesSchema.parse({...valid,packProfiles:[...valid.packProfiles!,...valid.packProfiles!]}))
})
test('managed classification uses flags instead of assuming every _p suffix is ALT',()=>{
 const reprint=card('OP99-001_p1');assert.equal(metadataVariant(reprint),'standard')
 const standard=managed([{label:'standard',weight:1,slots:[slot('SR')]}])
 assert.equal(generateBooster([reprint],'OP-999995',standard,()=>.5).cards[0].id,reprint.id)
 const alt=managed([{label:'ALT',weight:1,slots:[slot('SR','alt')]}])
 assert.throws(()=>validatePools([reprint],'OP-999995',alt),code('INCOMPLETE_SET'))
 for(const rarity of ['SP SR','R SP','SR SP','SPCARD'])assert.equal(normalizeRarity(rarity),'SP CARD')
 assert.equal(metadataVariant({...reprint,rarity:'R SP',isAltArt:true}),'special')
})
test('managed overlapping variant pools never block a valid prevalidated composition',()=>{
 const cards=[card('OP99-001'),card('OP99-002'),card('OP99-001_p1','SR',true)]
 const rules=managed([{label:'mixed',weight:1,slots:[slot('SR'),slot('SR','alt')]}])
 for(let seed=0;seed<500;seed++){const draw=generateBooster(cards,'OP-999995',rules,rng(seed));assert.equal(new Set(draw.cards.map(drawIdentity)).size,2);assert.equal(draw.cards[0].id,'OP99-002')}
})
test('EB proposals contain no UC and show unavailable bonus pools explicitly',()=>{
 const setCode='EB-999995';const cards=[...Array.from({length:10},(_,i)=>({...card(`c-${i}`,'C'),setCode})),...Array.from({length:5},(_,i)=>({...card(`r-${i}`,'R'),setCode})),...['SR','SEC','L'].map(rarity=>({...card(`s-${rarity}`,rarity),setCode})),{...card('a-SR','SR',true),setCode}]
 const proposal=proposeProfile(setCode,cards);const rules=expandProfile(proposal)
 assert.ok(!rules.packProfiles!.some(p=>p.slots.some(s=>s.choices[0].rarity==='UC')))
 assert.ok(proposal.omittedBonusPools.includes('SP CARD/special'))
 assert.equal(proposal.outcomes.filter(p=>p.variant==='alt').reduce((n,p)=>n+p.weight,0),20)
 validatePools(cards,setCode,rules)
 const copy=structuredClone(proposal);copy.outcomes[0].weight=Infinity;assert.throws(()=>expandProfile(copy))
})
test('JSON storage and resolution retain the exact managed profile weights',()=>{
 const rules=managed([{label:'SR',weight:75,slots:[slot('SR')]},{label:'ALT',weight:25,slots:[slot('SR','alt')]}])
 const resolved=resolveRules(JSON.parse(JSON.stringify(rules)))
 assert.deepEqual(resolved.rules,rules);assert.deepEqual(resolved.warnings,[])
 assert.throws(()=>resolveRules({commonCount:6,uncommonCount:3,rareCount:2,superRareCount:1,packProfiles:[]}),code('INVALID_RULES'))
 assert.throws(()=>resolveRules({commonCount:6,uncommonCount:3,rareCount:2,superRareCount:1,selection:'number'}),code('INVALID_RULES'))
})

test('low-frequency special outcomes keep explicit 0.8% and 0.2% pack weights',()=>{
 const rules=managed([{label:'SR',weight:99,slots:[slot('SR')]},{label:'SP',weight:.8,slots:[slot('SP CARD','special')]},{label:'TR',weight:.2,slots:[slot('TR','alt')]}])
 const cards=[card('sr','SR'),card('special','SP CARD'),card('treasure','TR',true)]
 const counts:Record<string,number>={};const random=rng(1717)
 for(let i=0;i<50000;i++){const d=generateBooster(cards,'OP-999995',rules,random);counts[d.profile!]=(counts[d.profile!]||0)+1}
 assert.ok(Math.abs(counts.SP/50000-.008)<.0015)
 assert.ok(Math.abs(counts.TR/50000-.002)<.001)
})
