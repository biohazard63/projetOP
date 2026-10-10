'use client'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import BoosterCarousel from '@/components/booster-opening/BoosterCarousel'
import { useRemote } from '@/hooks/useRemote'
import type { BoosterCatalogItem } from '@/lib/boosters/types'
import type { CollectorOverview } from '@/lib/collector/types'
import { PageHeading, LoadState, EmptyState, Progress, SectionHeading } from '@/components/collector/Primitives'
import SetTile from '@/components/collector/SetTile'
import { extensionFamily, extensionFamilies } from '@/lib/collector/extension-family'
import { isBoosterProduct } from '@/lib/boosters/products'
export default function BoostersPage() {
  const { data: session } = useSession()
  const parameters=useSearchParams()
  const router=useRouter()
  const catalogue = useRemote<{sets:BoosterCatalogItem[]}>('/api/booster')
  const gallery=parameters.get('view')==='extensions'
  const products=catalogue.data?.sets.filter(s=>gallery || isBoosterProduct(s.code)) || []
  const overview = useRemote<CollectorOverview>(session?.user?.id ? '/api/collector' : null)
  const [query,setQuery]=useState('')
  const [onlyAvailable,setOnlyAvailable]=useState(false)
  const [family,setFamily]=useState('Toutes')
  const [selectedCode,setSelectedCode]=useState(parameters.get('set') || '')
  const families=extensionFamilies(products.map(s=>s.code))
  useEffect(()=>{ const code=parameters.get('set'); if(code) setSelectedCode(code) },[parameters])
  function select(index:number) {
    const code=sets[index]?.code; if(!code) return
    setSelectedCode(code)
    const params=new URLSearchParams(parameters.toString()); params.set('set',code)
    router.replace(`/boosters?${params.toString()}`,{scroll:false})
  }
  const sets = products.filter(s=>(family==='Toutes' || extensionFamily(s.code)===family) && (!onlyAvailable || s.available) && `${s.code} ${s.name}`.toLowerCase().includes(query.toLowerCase()))
  const current=Math.max(0,sets.findIndex(s=>s.code===selectedCode))
  const selected=sets[current]
  const progress=overview.data?.sets.find(s=>s.code===selected?.code)
  return <div className="piece-page piece-boosters-page"><PageHeading eyebrow="Boosters One Piece TCG" title={gallery?'Explorez les extensions.':'Choisir une extension.'} description="Retrouvez vos cartes manquantes et découvrez votre prochain trésor."><Link className="piece-button secondary" href="/opening-demo">Démo d’ouverture</Link></PageHeading>
    <div className="piece-family-tabs" role="group" aria-label="Familles d’extensions">{['Toutes',...families].map(value=><button key={value} type="button" aria-pressed={family===value} onClick={()=>setFamily(value)}>{value}</button>)}</div>
    <div className="piece-toolbar"><label className="piece-field search">Rechercher une extension<input type="search" placeholder="OP-01, nom de l’extension…" value={query} onChange={e=>setQuery(e.target.value)} /></label><label className="piece-checkbox"><input type="checkbox" checked={onlyAvailable} onChange={e=>setOnlyAvailable(e.target.checked)} />Disponibles à l’ouverture</label><span className="piece-muted">Simulation gratuite</span></div>
    <LoadState loading={catalogue.loading} error={catalogue.error || overview.error} retry={()=>{catalogue.retry();overview.retry()}} />
    {!gallery && selected && <section className="piece-carousel" aria-label="Sélection d’un booster"><div className="piece-carousel-background"><Image src="/images/ocean-bg.png" alt="" fill sizes="900px" /></div><div className="piece-carousel-tabs" role="group" aria-label="Extensions disponibles">{sets.map((set,i)=><button key={set.code} aria-pressed={current===i} onClick={()=>select(i)}>{set.code}</button>)}</div><BoosterCarousel sets={sets} selectedCode={selected?.code || ""} onSelect={select} /><div className="piece-carousel-info"><p className="piece-eyebrow !mb-2">{selected.code}</p><h2>{selected.name}</h2><p className="piece-muted">{selected.description || ''}</p><div className="piece-carousel-counts"><div><strong>{selected.cardCount}</strong><span>Cartes au catalogue</span></div><div><strong>{selected.packSize ?? '—'}</strong><span>Cartes par booster</span></div><Link href={`/boosters/${encodeURIComponent(selected.code)}`} className="piece-button secondary">Voir toutes les cartes</Link></div>{progress&&<div className="mx-auto max-w-sm mb-5"><p className="piece-muted !text-xs mb-2">{progress.unique} / {progress.total} cartes possédées · {progress.percentage}%</p><Progress value={progress.percentage} label={`Progression ${selected.code}`} /></div>}{selected.available ? <Link href={session?.user?`/booster-opening?set=${encodeURIComponent(selected.code)}`:'/login'} className="piece-button !px-12">Ouvrir ce booster</Link> : <p className="piece-muted !text-amber-200" role="status">{selected.error}</p>}</div></section>}
    <SectionHeading title={gallery ? "Extensions du catalogue" : "Autres extensions"} />
    <div className={`piece-set-grid ${gallery ? '' : 'piece-booster-alternatives'}`}>{sets.map(set=><SetTile key={set.code} set={set} authenticated={Boolean(session?.user)} progress={overview.data?.sets.find(p=>p.code===set.code)} />)}</div>
    {catalogue.data && !sets.length && <EmptyState title="Aucune extension trouvée" description="Essayez une autre recherche." />}
  </div>
}
