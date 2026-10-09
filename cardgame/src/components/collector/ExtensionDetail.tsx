'use client'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRemote } from '@/hooks/useRemote'
import type { BoosterCatalogItem } from '@/lib/boosters/types'
import type { CatalogueCard, CollectorOverview } from '@/lib/collector/types'
import BoosterArtwork from '@/components/booster-opening/BoosterArtwork'
import CatalogueGrid from './CatalogueGrid'
import { EmptyState, LoadState, PageHeading, Progress, SectionHeading } from './Primitives'
export default function ExtensionDetail({code}:{code:string}) {
  const {data:session}=useSession()
  const catalogue=useRemote<{sets:BoosterCatalogItem[]}>('/api/booster')
  const cards=useRemote<CatalogueCard[]>('/api/cards')
  const owned=useRemote<{cards:CatalogueCard[]}>(session?.user?.id ? '/api/collection' : null)
  const overview=useRemote<CollectorOverview>(session?.user?.id ? '/api/collector' : null)
  const set=catalogue.data?.sets.find(s=>s.code.toUpperCase().replace(/[\s-]/g,'')===code.toUpperCase().replace(/[\s-]/g,''))
  const progress=overview.data?.sets.find(s=>s.code===set?.code)
  const quantities=new Map(owned.data?.cards.map(c=>[c.id,c.quantity || 0]))
  const pool=cards.data?.filter(c=>c.setCode===set?.code).map(c=>({...c,quantity:quantities.get(c.id)||0}))||[]
  const rarities=[...new Set(pool.map(c=>c.rarity))]
  return <div className="piece-page"><Link href="/boosters" className="piece-muted">← Toutes les extensions</Link><LoadState loading={catalogue.loading || cards.loading || owned.loading} error={catalogue.error || cards.error || owned.error || overview.error} retry={()=>{catalogue.retry();cards.retry();owned.retry();overview.retry()}} />
    {set ? <><section className="piece-panel piece-extension-hero mt-6"><BoosterArtwork src={set.imageUrl} alt={set.name} /><div><PageHeading eyebrow={set.code} title={set.name} description={set.description || 'Découvrez les cartes de cette extension et complétez votre équipage.'} />
    <p className="piece-muted">{set.cardCount} cartes au catalogue{set.packSize ? ` · ${set.packSize} cartes par booster` : ''}</p>{progress && <><p className="piece-muted my-3">{progress.unique} cartes uniques possédées · {progress.total-progress.unique} manquantes · {progress.percentage}%</p><Progress value={progress.percentage} label={`Progression ${set.code}`} /><p className="piece-muted my-3">Variantes spéciales : {progress.ownedAlternatives} / {progress.alternatives}</p></>}
    <div className="piece-actions mt-6">{set.available ? <Link href={session?.user ? `/booster-opening?set=${encodeURIComponent(set.code)}` : '/login'} className="piece-button">Ouvrir ce booster</Link> : <p className="piece-error" role="status">{set.error}</p>}<Link href="/collection" className="piece-button secondary">Mon classeur</Link></div></div></section>
    <div className="piece-actions mt-6">{rarities.map(r=><span key={r} className="piece-panel !p-3 text-xs">{r} <strong className="ml-2 text-amber-200">{pool.filter(c=>c.rarity===r).length}</strong></span>)}</div>
    <SectionHeading title="Les cartes de l’extension" />{pool.length ? <CatalogueGrid cards={pool} authenticated={Boolean(session?.user)} /> : <EmptyState title="Catalogue encore vide" description="Aucune carte de cette extension n’est disponible dans la base actuelle." />}</> : catalogue.data && <EmptyState title="Extension introuvable" description="Cette extension n’appartient pas au catalogue." />}
  </div>
}
