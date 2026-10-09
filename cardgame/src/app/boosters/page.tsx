'use client'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRemote } from '@/hooks/useRemote'
import type { BoosterCatalogItem } from '@/lib/boosters/types'
import type { CollectorOverview } from '@/lib/collector/types'
import { PageHeading, LoadState, EmptyState, Progress, SectionHeading } from '@/components/collector/Primitives'
import SetTile from '@/components/collector/SetTile'
import BoosterArtwork from '@/components/booster-opening/BoosterArtwork'
export default function BoostersPage() {
  const { data: session } = useSession()
  const parameters=useSearchParams()
  const catalogue = useRemote<{sets:BoosterCatalogItem[]}>('/api/booster')
  const overview = useRemote<CollectorOverview>(session?.user?.id ? '/api/collector' : null)
  const [query,setQuery]=useState('')
  const [onlyAvailable,setOnlyAvailable]=useState(false)
  const [index,setIndex]=useState(0)
  const sets = catalogue.data?.sets.filter(s=>(!onlyAvailable || s.available) && `${s.code} ${s.name}`.toLowerCase().includes(query.toLowerCase())) || []
  useEffect(()=>setIndex(0),[query,onlyAvailable])
  const current=Math.min(index,Math.max(0,sets.length-1))
  const selected=sets[current]
  const progress=overview.data?.sets.find(s=>s.code===selected?.code)
  const previous=sets[(current-1+sets.length)%sets.length]
  const next=sets[(current+1)%sets.length]
  const gallery=parameters.get('view')==='extensions'
  return <div className="piece-page"><PageHeading eyebrow="Boosters One Piece TCG" title={gallery?'Explorez les extensions.':'Choisir une extension.'} description="Retrouvez vos cartes manquantes et découvrez votre prochain trésor."><Link className="piece-button secondary" href="/opening-demo">Démo d’ouverture</Link></PageHeading>
    <LoadState loading={catalogue.loading} error={catalogue.error || overview.error} retry={()=>{catalogue.retry();overview.retry()}} />
    {!gallery && selected && <section className="piece-carousel" aria-label="Sélection d’un booster"><div className="piece-carousel-background"><Image src="/images/ocean-bg.png" alt="" fill sizes="900px" /></div><div className="piece-carousel-tabs" role="group" aria-label="Extensions disponibles">{sets.map((set,i)=><button key={set.code} aria-pressed={current===i} onClick={()=>setIndex(i)}>{set.code}</button>)}</div><div className="piece-carousel-packs"><button className="piece-carousel-arrow prev" aria-label="Extension précédente" disabled={sets.length<2} onClick={()=>setIndex((current-1+sets.length)%sets.length)}><ChevronLeft size={21} /></button>{sets.length>1 && <button className="piece-carousel-side" aria-label={`Sélectionner ${previous.code}`} onClick={()=>setIndex((current-1+sets.length)%sets.length)}><BoosterArtwork key={previous.code} src={previous.imageUrl} alt={previous.name} /></button>}<div className="piece-carousel-active" key={selected.code}><BoosterArtwork testId="selected-booster-artwork" src={selected.imageUrl} alt={`Booster ${selected.code} · ${selected.name}`} /></div>{sets.length>1 && <button className="piece-carousel-side" aria-label={`Sélectionner ${next.code}`} onClick={()=>setIndex((current+1)%sets.length)}><BoosterArtwork key={next.code} src={next.imageUrl} alt={next.name} /></button>}<button className="piece-carousel-arrow next" aria-label="Extension suivante" disabled={sets.length<2} onClick={()=>setIndex((current+1)%sets.length)}><ChevronRight size={21} /></button></div><div className="piece-carousel-info"><p className="piece-eyebrow !mb-2">{selected.code}</p><h2>{selected.name}</h2><p className="piece-muted">{selected.description || 'De nouvelles cartes pour compléter votre équipage.'}</p><div className="piece-carousel-counts"><div><strong>{selected.cardCount}</strong><span>Cartes au catalogue</span></div><div><strong>{selected.packSize ?? '—'}</strong><span>Cartes par booster</span></div><Link href={`/boosters/${encodeURIComponent(selected.code)}`} className="piece-button secondary">Voir toutes les cartes</Link></div>{progress&&<div className="mx-auto max-w-sm mb-5"><p className="piece-muted !text-xs mb-2">{progress.unique} / {progress.total} cartes possédées · {progress.percentage}%</p><Progress value={progress.percentage} label={`Progression ${selected.code}`} /></div>}{selected.available ? <Link href={session?.user?`/booster-opening?set=${encodeURIComponent(selected.code)}`:'/login'} className="piece-button !px-12">Ouvrir ce booster</Link> : <p className="piece-muted !text-amber-200" role="status">{selected.error}</p>}</div></section>}
    <SectionHeading title="Toutes les extensions" /><div className="piece-toolbar"><label className="piece-field search">Rechercher une extension<input type="search" placeholder="OP-01, nom de l’extension…" value={query} onChange={e=>setQuery(e.target.value)} /></label><label className="piece-checkbox"><input type="checkbox" checked={onlyAvailable} onChange={e=>setOnlyAvailable(e.target.checked)} />Disponibles à l’ouverture</label><span className="piece-muted">Simulation gratuite</span></div>
    <div className="piece-set-grid">{sets.map(set=><SetTile key={set.code} set={set} authenticated={Boolean(session?.user)} progress={overview.data?.sets.find(p=>p.code===set.code)} />)}</div>
    {catalogue.data && !sets.length && <EmptyState title="Aucune extension trouvée" description="Essayez une autre recherche." />}
  </div>
}
