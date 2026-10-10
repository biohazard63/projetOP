import 'dotenv/config'
import { PrismaClient, Prisma } from '@prisma/client'
import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { isBoosterProduct } from '../../src/lib/boosters/products'
import { expandProfile, proposeProfile } from '../../src/lib/boosters/profile-proposal'
import { generateBooster, validatePools, drawIdentity, metadataVariant } from '../../src/lib/boosters/generator'
import { getSimulationBoosterId } from '../../src/lib/boosters/service'
import { normalizeRarity, normalizeSetCode } from '../../src/lib/boosters/rules'

async function main() {
 const args=process.argv.slice(2);const apply=args.includes('--apply-test')
 const fileIndex=args.indexOf('--file');const file=fileIndex<0?'../docs/boosters/proposed-profiles.json':args[fileIndex+1]
 if(!file)throw new Error('Chemin de proposition requis')
 const runsIndex=args.indexOf('--runs');const runs=runsIndex<0?200:Number(args[runsIndex+1])
 const allowed=new Set(['--apply-test','--runs','--file',...(runsIndex<0?[]:[args[runsIndex+1]]),...(fileIndex<0?[]:[file])])
 if(args.some(a=>!allowed.has(a))||!Number.isInteger(runs)||runs<1||runs>10000)throw new Error('Arguments : --runs 1..10000, --file chemin, ou --apply-test')
 const url=new URL(process.env.DATABASE_URL||'')
 const local=['localhost','127.0.0.1'].includes(url.hostname)&&url.port==='5432'&&url.pathname==='/cardgame'
 const isolated=url.hostname==='127.0.0.1'&&url.port==='55432'&&url.pathname==='/op_boosters_test'
 if((!local&&!isolated)||(url.searchParams.get('schema')||'public')!=='public'||(apply&&!isolated))throw new Error('Production interdite ; application des règles uniquement dans op_boosters_test isolée')
 const db=new PrismaClient()
 try {
  if(apply){
   const document=JSON.parse(await fs.readFile(file,'utf8')) as {sets:{status:string;proposal:unknown;code:string}[]}
   const candidates=document.sets.filter(s=>s.status==='PASS').sort((a,b)=>normalizeSetCode(a.code).localeCompare(normalizeSetCode(b.code)))
   if(!candidates.length)throw new Error('Aucun profil validé dans la prévisualisation')
   const result=await db.$transaction(async tx=>{
    const before=await playerHash(tx)
    const applied=[]
    for(const item of candidates){
     await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`set-rules:${normalizeSetCode(item.code)}`}, 0))`
     const rules=expandProfile(item.proposal)
     if (!item.proposal || typeof item.proposal!=='object' || !('setCode' in item.proposal) || item.proposal.setCode!==item.code) throw new Error('Code de proposition incohérent')
     const cards=await tx.card.findMany({where:{setCode:item.code}})
     const booster=await tx.booster.findUnique({where:{id:getSimulationBoosterId(item.code)},include:{cards:true}})
     if(booster&&booster.price!==0)throw new Error('Droit payant non configuré')
     if(booster?.cards.some(link=>!cards.some(c=>c.id===link.cardId)))throw new Error('Lien BoosterCard hors extension')
     const weights=booster?.cards.length?new Map(booster.cards.map(c=>[c.cardId,c.probability])):undefined
     validatePools(weights?cards.filter(c=>weights.has(c.id)):cards,item.code,rules,weights)
     const existing=await tx.setRules.findUnique({where:{code:item.code}})
     if(!existing)throw new Error('SetRules manquant dans la base de test ; préparer une fixture avant application')
     await tx.setRules.update({where:{code:item.code},data:{boosterRules:JSON.parse(JSON.stringify(rules)) as Prisma.InputJsonValue}})
     applied.push(item.code)
    }
    if(before!==await playerHash(tx))throw new Error('Données joueurs modifiées : annulation')
    return {status:'PASS',target:'isolated-test',applied,playerDataPreserved:true}
   },{timeout:60000})
   console.log(JSON.stringify(result,null,2));return
  }
  const snapshot=await db.$transaction(async tx=>{
   await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY')
   return {sets:await tx.cardSet.findMany({orderBy:{code:'asc'}}),cards:await tx.card.findMany({orderBy:{id:'asc'}}),boosters:await tx.booster.findMany({include:{cards:true}})}
  },{timeout:30000})
  let seed=20261010;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/0x100000000}
  const sets=[]
  for(const set of snapshot.sets.filter(s=>isBoosterProduct(s.code))){
   const cards=snapshot.cards.filter(c=>c.setCode===set.code)
   let proposal
   try { proposal=proposeProfile(set.code,cards) } catch {
    sets.push({code:set.code,status:'BLOCKED',error:'Aucune variante exploitable ou catalogue à revoir',proposal:null,simulations:0})
    continue
   }
   const rules=expandProfile(proposal)
   const booster=snapshot.boosters.find(b=>b.id===getSimulationBoosterId(set.code))
   const weights=booster?.cards.length?new Map(booster.cards.map(c=>[c.cardId,c.probability])):undefined
   const pool=weights?cards.filter(c=>weights.has(c.id)):cards
   const total=proposal.outcomes.reduce((n,p)=>n+p.weight,0)
   const expected=proposal.outcomes.map(p=>({label:p.label,rarity:p.rarity,variant:p.variant,percent:100*p.weight/total}))
   const eligible=new Set<string>()
   for(const card of pool)if((weights?.get(card.id)??1)>0&&rules.packProfiles!.some(p=>p.slots.some(s=>s.choices[0].rarity===normalizeRarity(card.rarity)&&s.choices[0].variant===metadataVariant(card))))eligible.add(card.id)
   let status='PASS',error:string|null=null;const observed:Record<string,number>={}
   try{
    if(booster&&booster.price!==0)throw new Error('Booster payant non pris en charge')
    if(booster?.cards.some(link=>!cards.some(c=>c.id===link.cardId)))throw new Error('Lien BoosterCard hors extension')
    validatePools(pool,set.code,rules,weights)
    for(let i=0;i<runs;i++){
     const draw=generateBooster(pool,set.code,rules,random,weights)
     if(draw.cards.length!==12||new Set(draw.cards.map(drawIdentity)).size!==12)throw new Error('Nombre de cartes ou unicité invalide')
     observed[draw.profile!]=(observed[draw.profile!]||0)+1
    }
   }catch(e){status='BLOCKED';error=e instanceof Error?e.message:'Validation impossible'}
   sets.push({code:set.code,status,error,proposal,expectedBonusPercent:expected,simulations:status==='PASS'?runs:0,observedProfiles:observed,
    cardsInCatalogue:cards.length,cardsEligible:eligible.size,cardsOutsideProfile:cards.length-eligible.size})
   console.log(JSON.stringify({code:set.code,status,error,simulations:status==='PASS'?runs:0}))
  }
  const report={status:'proposal',productionModified:false,readOnly:true,seed:20261010,runsPerSet:runs,
   notice:'Les taux proposés sont internes, non officiels ; aucun profil en base n’a été modifié. Les flags de variantes hérités restent à vérifier, notamment PRB.',sets}
  await fs.writeFile(file,JSON.stringify(report,null,2)+'\n')
  console.log(JSON.stringify({report:file,ready:sets.filter(s=>s.status==='PASS').length,blocked:sets.filter(s=>s.status==='BLOCKED').length,productionModified:false}))
 }finally{await db.$disconnect()}
}
async function playerHash(tx:Prisma.TransactionClient){
 const data=await Promise.all([tx.userCard.findMany({orderBy:{id:'asc'}}),tx.deck.findMany({orderBy:{id:'asc'}}),tx.deckCard.findMany({orderBy:{id:'asc'}}),tx.boosterOpening.findMany({orderBy:{id:'asc'}}),tx.boosterOpeningCard.findMany({orderBy:{id:'asc'}})])
 return createHash('sha256').update(JSON.stringify(data)).digest('hex')
}
void main().catch(e=>{console.error(e instanceof Error&&e.message.startsWith('Production interdite')?e.message:'Préparation des profils interrompue : vérifier les arguments, le catalogue et la base locale.');process.exitCode=1})
