import { test } from 'node:test'
import assert from 'node:assert/strict'
import { collectionStats } from '../src/lib/collector/stats'
import { cardEffect } from '../src/lib/collector/effects'
import { additionError, deckAnalytics } from '../src/lib/collector/decks'
import { validateDeck } from '../src/lib/deckValidation'
import type { CatalogueCard } from '../src/lib/collector/types'
const card=(id:string, patch:Partial<CatalogueCard>={}):CatalogueCard=>({id,code:id,name:id,type:'CHARACTER',color:'RED',cost:2,power:2000,counter:null,rarity:'C',imageUrl:'/images/card-back.jpg',set:'OP-TEST',setCode:'OP-TEST',effect:null,trigger:null,ability:null,attribute:null,family:null,isAltArt:false,isParallel:false,isSpecial:false,...patch})
test('collector distinguishes copies, unique catalogue IDs and collected alternative versions',()=>{
  const stats=collectionStats([card('one'),card('one_p1',{isAltArt:true}),card('two')],[{cardId:'one',quantity:6},{cardId:'one_p1',quantity:2},{cardId:'two',quantity:0},{cardId:'unknown',quantity:9}],[{code:'OP-TEST',name:'Test'}])
  assert.equal(stats.total,8);assert.equal(stats.unique,2);assert.equal(stats.catalogue,3);assert.equal(stats.percentage,66.7);assert.equal(stats.ownedAlternatives,1)
  assert.equal(stats.sets[0].copies,8);assert.equal(stats.sets[0].unique,2)
})
test('empty and uncollected catalogues return zero progression without fictional figures',()=>{
  assert.deepEqual(collectionStats([],[],[]),{total:0,unique:0,catalogue:0,percentage:0,alternatives:0,ownedAlternatives:0,sets:[]})
  assert.equal(collectionStats([card('a')],[],[{code:'OP-EMPTY',name:'Empty'}]).sets[0].percentage,0)
})
test('visual effects use real variant metadata before configurable rarity names',()=>{
  assert.equal(cardEffect(card('a',{rarity:'C',isAltArt:true})),'holographic')
  assert.equal(cardEffect(card('a',{rarity:'C',isParallel:true})),'holographic')
  assert.equal(cardEffect(card('a',{rarity:'R'})),'rare')
  assert.equal(cardEffect(card('a',{rarity:'SEC'})),'secret')
  assert.equal(cardEffect(card('a',{rarity:'CUSTOM'}),{CUSTOM:'super'}),'super')
  assert.equal(cardEffect(card('a',{rarity:'UNRECOGNIZED'})),'common')
})
test('deck UI blocks unowned copies, incompatible colors, missing leader and copies across variants',()=>{
  const leader={...card('leader',{type:'LEADER',color:'Rouge/Bleu'}),quantity:1}
  const red=card('OP01-001')
  assert.ok(additionError(red,[],2)?.includes('leader'))
  assert.ok(additionError(red,[leader],0)?.includes('exemplaires'))
  assert.equal(additionError(red,[leader],1),null)
  assert.ok(additionError(card('green',{color:'GREEN'}),[leader],1)?.includes('couleur'))
  assert.ok(additionError(card('OP01-001_p1',{isAltArt:true}),[leader,{...red,quantity:4}],1)?.includes('variantes'))
  assert.ok(additionError(leader,[leader],2)?.includes('leader'))
})
test('deck analytics count quantities and exclude the leader from costs/types/colors',()=>{
  const stats=deckAnalytics([{...card('leader',{type:'LEADER',cost:0}),quantity:1},{...card('a',{cost:2}),quantity:4},{...card('b',{cost:12,color:'RED/BLUE',type:'EVENT'}),quantity:2}])
  assert.equal(stats.count,6);assert.equal(stats.costs[2],4);assert.equal(stats.costs[10],2);assert.deepEqual(stats.types,{CHARACTER:4,EVENT:2});assert.deepEqual(stats.colors,{RED:6,BLUE:2})
})
test('client deck rules reuse the server validator for a complete 1 plus 50 deck',()=>{
  const entries=[{...card('leader',{type:'LEADER'}),quantity:1},...Array.from({length:13},(_,i)=>({...card(`char-${i}`),quantity:i===12?2:4}))]
  assert.equal(validateDeck(entries,entries),null)
  assert.ok(validateDeck(entries.slice(0,-1),entries)?.includes('50'))
})
