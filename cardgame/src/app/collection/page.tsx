'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRemote } from '@/hooks/useRemote'
import type { CatalogueCard, CollectorOverview } from '@/lib/collector/types'
import { PageHeading, LoadState, Progress } from '@/components/collector/Primitives'
import CatalogueGrid from '@/components/collector/CatalogueGrid'
export default function CollectionPage() {
  const catalogue=useRemote<CatalogueCard[]>('/api/cards')
  const owned=useRemote<{cards:CatalogueCard[]}>('/api/collection')
  const user=useRemote<{favorites:{cardId:string}[]}>('/api/user/cards')
  const overview=useRemote<CollectorOverview>('/api/collector')
  const [changes,setChanges]=useState<Record<string,boolean>>({})
  const quantities=new Map(owned.data?.cards.map(c=>[c.id,c]))
  const favorites=new Set(user.data?.favorites.map(c=>c.cardId))
  const cards=catalogue.data?.map(c=>({...c,quantity:quantities.get(c.id)?.quantity || 0,acquiredAt:quantities.get(c.id)?.acquiredAt,isFavorite:changes[c.id] ?? favorites.has(c.id)})) || []
  async function toggleFavorite(id:string) {
    const current=changes[id] ?? favorites.has(id)
    const response=await fetch('/api/user/favorites',{method:current?'DELETE':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cardId:id})})
    if (!response.ok) throw new Error('Favoris indisponibles')
    setChanges(old=>({...old,[id]:!current}))
  }
  const data=overview.data
  return <div className="piece-page"><PageHeading eyebrow="Chaque carte raconte une histoire" title="Votre classeur." description="Vos trésors, vos découvertes et les cartes qu’il vous reste à trouver."><Link href="/boosters" className="piece-button">Enrichir ma collection</Link></PageHeading>
    {data && <><div className="piece-stats">{[['Exemplaires',data.total],['Cartes uniques',data.unique],['À découvrir',data.catalogue-data.unique],['Variantes spéciales',`${data.ownedAlternatives} / ${data.alternatives}`]].map(([label,value])=><div className="piece-stat" key={label}><span className="piece-muted">{label}</span><strong>{value}</strong></div>)}</div><div className="piece-results"><span>Progression globale</span><span>{data.percentage}% du catalogue</span></div><Progress value={data.percentage} label="Progression globale de collection" /></>}
    <LoadState loading={catalogue.loading || owned.loading || user.loading} error={catalogue.error || owned.error || user.error || overview.error} retry={()=>{catalogue.retry();owned.retry();user.retry();overview.retry()}} />
    {catalogue.data && owned.data && user.data && <CatalogueGrid cards={cards} collection onFavorite={toggleFavorite} />}
    {data && <details className="piece-panel mt-8"><summary className="cursor-pointer text-sm text-amber-200">Progression par extension</summary><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 mt-6">{data.sets.filter(s=>s.total>0).map(s=><div key={s.code}><div className="piece-results !my-2"><Link href={`/boosters/${encodeURIComponent(s.code)}`}>{s.code}</Link><span>{s.unique} / {s.total} · {s.percentage}%</span></div><Progress value={s.percentage} label={`Collection ${s.code}`} /></div>)}</div></details>}
  </div>
}
