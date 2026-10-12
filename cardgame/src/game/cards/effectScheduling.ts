import { prototypeCards, PROTOTYPE_REGISTRY } from './effectPrototype'
import type { EffectDefinition, EffectRegistry } from '../effects/contracts'
import type { CardInput } from './types'
const revision='m15d-2026-10-11'
const binding=(n:string)=>`${n}@${revision}`
function onKO(number:string,maximumPower:number,powerBasis:'CURRENT'|'BASE'):EffectDefinition {
 return {id:`${number}.onko`,revision,dslVersion:'1.2.0',source:{kind:'CARD_DEFINITION',definitionId:binding(number),zone:'characters'},timing:'ON_KO',condition:{kind:'ALWAYS'},cost:{kind:'NONE'},usage:{kind:'UNLIMITED'},program:[
 {kind:'CHOICE',choiceType:'SELECT',selector:{kind:'OPPONENT_CHARACTER',maximumPower,powerBasis},optional:true,min:0,max:1,bind:'target',visibility:'PUBLIC'},
 {kind:'OPERATION',operation:{primitive:'koCharacter',version:'1.0.0',player:'OPPONENT',audience:'PUBLIC',subjectBinding:'target'}},
 ]}
}
export const SCHEDULING_REGISTRY:EffectRegistry={...structuredClone(PROTOTYPE_REGISTRY),version:'1.2.0',dslVersion:'1.2.0',definitions:[...PROTOTYPE_REGISTRY.definitions.map(d=>({...structuredClone(d),dslVersion:'1.2.0' as const})),onKO('OP01-007',4000,'CURRENT'),onKO('OP04-003',5000,'BASE')],leaderReplacements:[{id:'OP05-001.protect',definitionId:binding('OP05-001'),minimumAttachedDon:1,minimumPower:5000,amount:-1000,usage:'ONCE_PER_TURN'}]}
// Regulatory laboratory only; catalogue and users' identifiers are untouched.
export function schedulingCards():CardInput[] {
 const cards=prototypeCards(), base=structuredClone(cards.find(c=>c.number==='ST01-007')!)
 const specs=[{number:'OP01-007',name:'Caribou',cost:3,power:4000,attribute:'SPECIAL',traits:['Supernovas','Caribou Pirates'],series:'569101',block:'1',text:'[On K.O.] K.O. up to 1 of your opponent’s Characters with 4000 power or less.',fr:'En cas de KO : mettre KO zéro ou un Personnage adverse de puissance actuelle au plus 4000.'},
 {number:'OP04-003',name:'Usopp',cost:4,power:5000,attribute:'WISDOM',traits:['Alabasta','Straw Hat Crew'],series:'569104',block:'1',text:'[On K.O.] K.O. up to 1 of your opponent’s Characters with a base power of 5000 or less.',fr:'En cas de KO : mettre KO zéro ou un Personnage adverse de puissance de base au plus 5000.'},
 {number:'OP05-001',name:'Sabo',cost:null,power:5000,attribute:'SPECIAL',traits:['Revolutionary Army'],series:'569105',block:'2',text:'[DON!! x1] [Opponent’s Turn] [Once Per Turn] If your Character with 5000 power or more would be K.O.’d, you may give that Character −1000 power during this turn instead.',fr:'Avec au moins un DON attaché, pendant le tour adverse et une fois par tour : remplacer le KO d’un Personnage propre de puissance au moins 5000 par une réduction de 1000 pendant ce tour.'}]
 for (const spec of specs) {
 const leader=spec.number==='OP05-001'
 cards.push({...structuredClone(base),number:spec.number,printingKey:`${spec.number}::standard`,nameFr:spec.name,rulesName:spec.name,category:leader?'LEADER':'CHARACTER',colors:leader?['RED','BLACK']:['RED'],attributes:[spec.attribute],traits:spec.traits,cost:spec.cost,power:spec.power,counter:leader?null:1000,life:leader?4:null,block:spec.block,extensions:[spec.number.slice(0,2)+'-'+spec.number.slice(2,4)],lifeEvidence:leader?[{field:'life',value:4,source:`https://en.onepiece-cardgame.com/cardlist/?series=${spec.series}`,checkedAt:'2026-10-11',language:'en'}]:[],review:{...structuredClone(base.review!),revision,references:[{source:`https://en.onepiece-cardgame.com/cardlist/?series=${spec.series}`,checkedAt:'2026-10-11',language:'en',detail:'Printed characteristics and complete effect verified'}, {source:leader?'https://en.onepiece-cardgame.com/pdf/qa_op05.pdf?20240405=':spec.number==='OP04-003'?'https://en.onepiece-cardgame.com/pdf/qa_op04.pdf?20240405=':'https://en.onepiece-cardgame.com/rules/errata_card/',checkedAt:'2026-10-11',language:'en',detail:'FAQ/errata checked; Sabo multiple-victim case deliberately not executable'}],effectOriginal:spec.text,effectFr:spec.fr,effects:[{kind:'declarative',abilityIds:[leader?'OP05-001.protect':`${spec.number}.onko`]}]}})
 }
 return cards
}
