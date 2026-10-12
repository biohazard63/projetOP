// Audit documentaire uniquement : lecture des données, aucune collecte ou import.
import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { observations, parseHistorical } from '../../../../cardgame/scripts/catalog/files'
import { identity, type Catalog } from '../../../../cardgame/scripts/catalog/core'
async function main() {
const root = process.cwd(); const output=path.resolve('../docs/game/evidence/m1_5a')
const hash=(s:string)=>createHash('sha256').update(s).digest('hex')
const inputs=await observations(); const master:Catalog=JSON.parse(await fs.readFile('data/onepiece/catalog/master-catalog.json','utf8'))
const patterns:[string,string,string,string][]=[
['ability.activated','Activées','activation.*principale|activate:.*main|\\[main\\]|\\[principale\\]','8-1-3-2'],
['ability.replacement','Remplacements','instead|à la place','8-1-3-4'],
['ability.conditional','Conditions explicites','\\bif\\b|si vous|si votre|s’il|s.il|tant que','8-3'],
['ability.restriction','Restrictions/protections','cannot|can.t|ne peut|ne peuvent|ne pourra|ne pourront|interdit','1-3-3;8-2'],
['ability.zone','Effets hors terrain','in your hand|from your trash|dans votre main|depuis votre défausse|under the rules|selon les règles','2-8;8-1-3-3'],
['timing.play','Jouée','on play|\\[jouée\\]','10-2-6'],
['timing.attack','En attaquant','when attacking|en attaquant','10-2-5'],
['timing.opponentAttack','Attaque adverse','opponent.s attack|attaque adverse|when attacked','7-1-1;10-2-16'],
['timing.block','En bloquant','on block|en bloquant|lors.*bloqu','10-2-15'],
['timing.ko','En cas de KO','on k\\.?o\\.?|en cas de ko','10-2-17'],
['timing.trigger','Déclenchement Vie','\\[trigger\\]|déclenchement','10-1-5'],
['timing.end','Fin de tour','end of your turn|end of your opponent.s turn|fin de votre tour|fin du tour adverse','6-6;10-2-7/8'],
['timing.phase','Frontières de phase','start of|beginning of|début de|refresh phase|phase de recharge|end phase|phase de fin','6'],
['timing.counter','Contre événement','\\[counter\\]|\\[contre\\]','10-2-4'],
['condition.color','Couleurs','red|green|blue|purple|yellow|black|rouge|vert|bleu|violet|jaune|noir|monocolor|unicolore','2-3'],
['condition.name','Noms','\\[[^\\]]+\\]|named|nommé','2-1'],
['condition.trait','Types/traits','\\{[^}]+\\}|type|trait','2-4'],
['condition.cost','Coût','cost|coût','2-7;4-9'],
['condition.baseCost','Coût de base','base cost|coût de base','4-9'],
['condition.power','Puissance','power|puissance','2-6;4-9'],
['condition.basePower','Puissance de base','base power|puissance de base','4-9'],
['condition.zoneCount','Nombre dans une zone','cards? in|cartes? dans|characters? on|personnages.*terrain|life cards|cartes.*vie','3;8-3'],
['condition.rested','État actif/épuisé','rested|active|épuisé|redressé','4-1/2'],
['condition.don','DON attachés/seuil','don!!\\s*[x×]|don!!.*given|don!!.*attach','8-3-2'],
['condition.turn','Tour actif/adverse','your turn|opponent.s turn|tour adverse|votre tour','8-3-2'],
['condition.leader','Identité Leader','leader','2-2;8-3'],
['condition.history','Historique d’action','first time|première fois|when you|lorsque vous|after you|après avoir','8-1;8-6'],
['operation.draw','Pioche','draw \\d|piochez|piocher','4-5'],
['operation.search','Recherche/consultation','look at|regardez|search|cherchez','8-4;11-3'],
['operation.reveal','Révélation','reveal|révélez|révéler','11-2'],
['operation.trash','Défausse','trash|discard|défausse','10-2-14'],
['operation.move','Déplacement','add.*hand|to.*deck|return|ajoutez|placez|retournez|renvoyez','3;4'],
['operation.order','Réorganisation','any order|ordre de votre choix|top or bottom|au-dessus ou au-dessous','3-1-7;11-3'],
['operation.modifyPower','Modification puissance','[+−–-]\\s*\\d+.*(?:power|puissance)|(?:power|puissance).*[+−–-]\\s*\\d+','4-9'],
['operation.modifyCost','Modification coût','(?:cost|coût).*[+−–-]\\s*\\d+|[+−–-]\\s*\\d+.*(?:cost|coût)','4-9'],
['operation.basePower','Fixer puissance de base','base power|puissance de base','4-9'],
['operation.don','Gestion DON','don!!','6-4/5;8-3'],
['operation.rest','Épuiser/redresser','rest|active|épuis|redress','4-1/2'],
['operation.ko','KO','k\\.?o\\.?|mettre ko|mettez ko','10-2-1'],
['operation.returnHand','Retour main','return.*hand|renvoy.*main|retour.*main','3;4'],
['operation.life','Vie','life|\\bvie\\b','3-10;7-1-4'],
['operation.face','Face visible/cachée','face.up|face.down|face visible|face cachée','3;11'],
['operation.play','Jouer depuis une zone','play this|play up|jouez|jouer','6-5;8-4'],
['operation.grant','Accorder/retirer capacité','gains? \\[|loses? \\[|gagn.*\\[|perd.*\\[','8-2'],
['operation.negate','Annulation','negate|annule|invalid|effets.*ignor','8-2'],
['keyword.blocker','Bloqueur','blocker|bloqueur','10-1-4'],
['keyword.rush','Initiative','rush|initiative','10-1-1/6'],
['keyword.double','Double attaque','double attack|double attaque','10-1-2'],
['keyword.banish','Bannissement','banish|bannissement','10-1-3'],
['keyword.unblockable','Imblocable','unblockable|imblocable','10-1-7'],
['duration.battle','Tout le combat','during this battle|pour tout le combat','7-1-5'],
['duration.turn','Tout le tour','during this turn|pour tout le tour|ce tour','6-6'],
['duration.next','Prochain tour/phase','next.*turn|next.*phase|prochain.*tour|prochain.*phase','6;8-1'],
['usage.once','Une fois par tour','once per turn|une fois par tour','10-2-13'],
['duration.while','Tant qu’une condition','while|as long as|tant que','8-1-3-3'],
['duration.leave','Jusqu’à sortie de zone','leaves? the field|quitt.*terrain','3-1-6'],
['choice.alternative','Choix/alternatives','choose one|either|following|following effects|choisissez|effets suivants| ou ','8-4'],
]
const allTexts=(v:Catalog['variants'][number])=>['effect','ability','trigger'].flatMap(f=>{const t=v.text[f as 'effect'];return [t.original,t.fr,...t.originals.map(c=>c.original)].filter(Boolean)}).join('\n')
const matrix=patterns.map(([id,label,pattern,rules])=>{const re=new RegExp(pattern,'iu');const variants=master.variants.filter(v=>re.test(allTexts(v)));return {id,label,pattern,rules,canonicalCount:new Set(variants.map(v=>v.number)).size,variantCount:variants.length,numbers:[...new Set(variants.map(v=>v.number))].sort(),variants:variants.map(v=>v.key),status:'HEURISTIC_NOT_CERTIFIED'}})
const rawIdentity=new Map<string,Set<string>>();const rawNumbers=new Set<string>(); const rawKeys=new Set<string>(); let invalid=0
for(const o of inputs.observations){try{const i=identity(o.raw); rawNumbers.add(i.number);rawKeys.add(i.key);const key=i.key;rawIdentity.set(key,new Set([...(rawIdentity.get(key)||[]),o.source.file]))}catch{invalid++}}
const textDifferences=[];const characteristicDifferences=[]
for(const c of master.cards){const vs=master.variants.filter(v=>v.number===c.number);for(const field of ['cost','power','counter','life','block'] as const){const values=[...new Set(vs.map(v=>JSON.stringify(v[field])))];if(values.length>1)characteristicDifferences.push({number:c.number,field,values})}
for(const field of ['effect','ability','trigger'] as const){for(const lang of ['fr','en','unknown']){const texts=new Set(vs.flatMap(v=>v.text[field].originals.filter(o=>o.language===lang).map(o=>o.original.replace(/\s+/g,' ').trim())).filter(Boolean));if(texts.size>1)textDifferences.push({number:c.number,field,language:lang,distinctTexts:texts.size,status:'REVIEW_REQUIRED_NOT_PROVEN_CONTRADICTION'})}}}
const discoveredNumbers=new Set<string>();const discoveredKeys=new Set<string>();const excluded=new Set(['node_modules','.next','.git']);const jsonFiles:any[]=[]
async function scan(dir:string){for(const e of await fs.readdir(dir,{withFileTypes:true})){if(excluded.has(e.name)||e.isSymbolicLink())continue;const file=path.join(dir,e.name);if(e.isDirectory()){await scan(file);continue}if(!file.endsWith('.json'))continue;const text=await fs.readFile(file,'utf8');try{const {value,repaired}=parseHistorical(text);const arrays=Array.isArray(value)?value:Array.isArray(value?.variants)?value.variants:Array.isArray(value?.cards)?value.cards:Array.isArray(value?.data?.cards)?value.data.cards:[];const cardRecords=arrays.filter((v:any)=>v&&typeof v==='object'&&(v.number||v.id||v.cardId)&&(v.effect!==undefined||v.text||v.power!==undefined||v.color!==undefined));for(const v of cardRecords){try{const i=v.key&&v.number?{number:v.number,key:v.key}:identity(v);discoveredNumbers.add(i.number);discoveredKeys.add(i.key)}catch{}}jsonFiles.push({path:path.relative(root,file),hash:hash(text),records:arrays.length,cardRecords:cardRecords.length,repaired,kind:file.includes('/generations/')?'derived_generation':file.endsWith('master-catalog.json')?'master':cardRecords.length?'card_data':'metadata_or_non_card'})}catch{jsonFiles.push({path:path.relative(root,file),hash:hash(text),kind:'unparseable'})}}}
await scan(root)
const protectedFiles:string[]=[]
async function protect(dir:string){for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())await protect(p);else protectedFiles.push(p)}}
for(const d of ['src/game','scripts/catalog','scripts/game','prisma','carteJson'])await protect(d)
protectedFiles.push('scripts/scrape-onepiece-fr.js','data/onepiece/catalog/master-catalog.json')
const protectedHashes=await Promise.all(protectedFiles.map(async p=>({path:p,hash:hash(await fs.readFile(p,'utf8'))})))
const selected=['OP17-015','OP17-005','OP17-020','OP17-001','OP17-019','OP12-102','OP10-082','OP10-078','OP10-116'].map(number=>({number,keys:master.variants.filter(v=>v.number===number).map(v=>v.key),fields:master.variants.filter(v=>v.number===number).map(v=>({key:v.key,cost:v.cost,power:v.power,sourcePaths:v.sources,textHashes:Object.fromEntries(['effect','trigger'].map(f=>[f,hash(JSON.stringify(v.text[f as 'effect']))]))}))}))
const report={date:'2026-10-11',scope:'LOCAL_FILES_ONLY_NO_DATABASE',inputs:{files:inputs.files,errors:inputs.errors,observations:inputs.observations.length,invalidIdentity:invalid,identityGroups:rawIdentity.size},coverage:{rawNumbers:rawNumbers.size,rawKeys:rawKeys.size,allJsonNumbers:discoveredNumbers.size,allJsonKeys:discoveredKeys.size,numbersOutsideMaster:[...discoveredNumbers].filter(n=>!master.cards.some(c=>c.number===n)),keysOutsideMaster:[...discoveredKeys].filter(k=>!master.variants.some(v=>v.key===k))},totals:{numbers:master.cards.length,variants:master.variants.length,groups:master.extensions.length,reprintedVariants:master.variants.filter(v=>v.extensions.length>1).length,mechanics:matrix.filter(m=>m.variantCount).length,leadersWithoutLife:master.variants.filter(v=>/leader/i.test(v.text.type.original)&&v.life===null).length,missingBlock:master.variants.filter(v=>v.block===null).length,effectAndTrigger:master.variants.filter(v=>v.text.effect.original&&v.text.trigger.original).length,multiParagraph:master.variants.filter(v=>/\n|\]\s*\[/.test(v.text.effect.original)).length,withoutEffectOrTrigger:master.variants.filter(v=>!allTexts(v).trim()).length},jsonFiles,characteristicDifferences,textDifferences,selected,masterHash:hash(await fs.readFile('data/onepiece/catalog/master-catalog.json','utf8'))}
await fs.writeFile(path.join(output,'inventory.json'),JSON.stringify(report,null,2)+'\n');await fs.writeFile(path.join(output,'mechanics.json'),JSON.stringify(matrix,null,2)+'\n');await fs.writeFile(path.join(output,'protected-hashes.json'),JSON.stringify(protectedHashes,null,2)+'\n');console.log(JSON.stringify({totals:report.totals,files:inputs.files.length,jsonFiles:jsonFiles.length,cardFiles:jsonFiles.filter(f=>f.cardRecords).length,rawObservations:inputs.observations.length,errors:inputs.errors,characteristicDifferences:characteristicDifferences.length,textDifferences:textDifferences.length},null,2))

}
main().catch(e=>{console.error(e);process.exitCode=1})
