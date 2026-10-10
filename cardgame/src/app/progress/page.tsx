'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRemote } from '@/hooks/useRemote'
import type { CollectorOverview } from '@/lib/collector/types'
import { extensionFamily, extensionFamilies } from '@/lib/collector/extension-family'
import { getBoosterArtwork } from '@/lib/boosters/artwork'
import BoosterArtwork from '@/components/booster-opening/BoosterArtwork'
import { PageHeading, LoadState, Progress, EmptyState } from '@/components/collector/Primitives'
export default function ProgressPage() {
  const overview=useRemote<CollectorOverview>('/api/collector')
  const [family,setFamily]=useState('Toutes')
  const [query,setQuery]=useState('')
  const [missing,setMissing]=useState(false)
  const rows=overview.data?.sets.filter(set=>set.total>0 && (family==='Toutes' || extensionFamily(set.code)===family) && `${set.code} ${set.name}`.toLowerCase().includes(query.toLowerCase()) && (!missing || set.unique<set.total)) || []
  return <div className="piece-page piece-progress-page"><PageHeading eyebrow="Votre carte du Grand Line" title="Chaque extension, un trésor." description="La progression compte les cartes uniques. Les exemplaires supplémentaires ne remplissent pas de nouvelles cases."/><LoadState loading={overview.loading} error={overview.error} retry={overview.retry}/><div className="piece-family-tabs" role="group" aria-label="Familles de progression">{['Toutes',...extensionFamilies(overview.data?.sets.map(set=>set.code) || [])].map(value=><button key={value} aria-pressed={family===value} onClick={()=>setFamily(value)}>{value}</button>)}</div><div className="piece-toolbar"><label className="piece-field search">Rechercher une extension<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Code ou nom…"/></label><label className="piece-checkbox"><input type="checkbox" checked={missing} onChange={e=>setMissing(e.target.checked)}/>Extensions à compléter</label></div><div className="piece-progress-list">{rows.map(set=><section key={set.code} className="piece-panel piece-progress-entry"><div className="piece-progress-art"><BoosterArtwork src={getBoosterArtwork(set.code,null)} alt={`Extension ${set.code}`}/></div><div><p className="piece-eyebrow">{set.code}</p><h2>{set.name}</h2><p className="piece-muted">{set.unique} / {set.total} cartes uniques · {set.total-set.unique} manquantes</p><Progress value={set.percentage} label={`Progression ${set.code}`}/><p className="piece-muted">{set.percentage}% · {set.copies} exemplaires</p>{set.alternatives>0&&<p className="piece-muted">Variantes spéciales : {set.ownedAlternatives} / {set.alternatives}</p>}<div className="piece-actions"><Link className="piece-button secondary" href={`/collection?set=${encodeURIComponent(set.code)}&ownership=missing`}>Voir les cartes manquantes</Link><Link className="piece-button ghost" href={`/boosters/${encodeURIComponent(set.code)}`}>Détail de l’extension</Link></div></div></section>)}</div>{overview.data&&!rows.length&&<EmptyState title="Aucune extension à cet horizon" description="Adaptez la famille ou la recherche pour retrouver votre progression."/>}</div>
}
