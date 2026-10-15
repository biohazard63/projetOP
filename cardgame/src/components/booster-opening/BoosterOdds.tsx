import type { BoosterCatalogItem } from '@/lib/boosters/types'

const variants: Record<string,string> = {standard:'standard',alt:'alternative',parallel:'parallèle',special:'spéciale',any:'toutes variantes'}
const tiers: Record<string,string> = {ALT:'Alternative','SP CARD':'SP',TR:'Treasure Rare',MANGA:'Manga','MANGA RED':'Manga red'}
// Rare outcomes read better as "1 in N" than as a tiny percentage.
const odds = (share:number) => share > 0 && share < .2 ? ` · 1 sur ${Math.round(1/share)}` : ''
export function BoosterOdds({rules,warnings}:{rules:NonNullable<BoosterCatalogItem['rules']>;warnings:string[]}) {
  const profiles = rules.packProfiles
  const total = profiles?.reduce((sum,p)=>sum+p.weight,0) || 1
  return <details className="mt-5 text-xs leading-5 text-slate-400">
    <summary className="cursor-pointer text-slate-300">Composition et probabilités</summary>
    <p className="my-2">{rules.source}. Ces taux ne sont pas présentés comme des taux officiels.</p>
    {profiles ? <><p>Une composition complète est sélectionnée par booster. Chaque numéro ne peut sortir qu’une fois.</p>
      <ul className="mt-2 space-y-2">{profiles.map(profile=><li key={profile.label}>
        <span className="font-semibold text-slate-200">{profile.label} : {(100*profile.weight/total).toFixed(2)} % des boosters</span>
        <span className="block">{Object.entries(profile.slots.reduce<Record<string,number>>((counts,slot)=>{
          const choice=slot.choices[0];const label=`${choice.rarity} ${variants[choice.variant]}`;counts[label]=(counts[label]||0)+1;return counts
        },{})).map(([label,count])=>`${count} ${label}`).join(' · ')}</span>
      </li>)}</ul>
      <p className="mt-2">Les taux de variantes sont configurés ; ajouter une illustration ne multiplie pas le poids de son numéro.</p>
    </> : <><ol className="list-inside list-decimal">{rules.slots.map((slot,i)=><li key={i}>{slot.label && <b className="text-slate-200">{slot.label} : </b>}{slot.choices.map(choice=>{const share=choice.weight/slot.choices.reduce((sum,item)=>sum+item.weight,0);return `${tiers[choice.rarity] ?? choice.rarity}${choice.variant!=='any'?` (${variants[choice.variant]})`:''} ${(100*share).toFixed(1)} %${odds(share)}`}).join(' · ')}</li>)}</ol>
      {rules.specialPacks.map(pack=><p key={pack.label}>{pack.label} : {(pack.probability*100).toFixed(1)} % des packs ; composition spéciale remplaçant les slots ci-dessus.</p>)}</>}
    {rules.label.startsWith('Booster réaliste') && <p className="mt-2">Les boosters sont tirés de displays virtuelles de 24 : chaque display contient exactement 2 alternatives, 7 SR et 8 Leaders ; SEC, SP, Treasure Rare et Manga y sont placés selon leur taux. Acheter à l’unité vous fait avancer dans votre display en cours.</p>}
    {warnings.map(warning=><p key={warning} className="mt-2">{warning}</p>)}
  </details>
}
