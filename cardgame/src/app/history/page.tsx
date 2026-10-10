'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useMobileLayout } from '@/hooks/useMobileLayout'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import BoosterArtwork from '@/components/booster-opening/BoosterArtwork'
import { getBoosterArtwork } from '@/lib/boosters/artwork'
import { readApi, useRemote } from '@/hooks/useRemote'
import type { HistoryPage, HistoryRow, CatalogueCard } from '@/lib/collector/types'
import type { OpeningResult } from '@/lib/boosters/types'
import { PageHeading, LoadState, EmptyState, SectionHeading } from '@/components/collector/Primitives'
import CardTile from '@/components/collector/CardTile'
import CardDetail from '@/components/collector/CardDetail'
export default function HistoryPage() {
  const mobile=useMobileLayout()
  const router=useRouter()
  const origin=useRef<HTMLButtonElement|null>(null)
  const params=useSearchParams()
  const requestedOpening=params.get('opening')
  const [cursor,setCursor]=useState<string|null>(null)
  const [rows,setRows]=useState<HistoryRow[]>([])
  const history=useRemote<HistoryPage>(`/api/booster/history${cursor?`?cursor=${encodeURIComponent(cursor)}`:''}`)
  const [selected,setSelected]=useState<string|null>(params.get('opening'))
  useEffect(()=>setSelected(requestedOpening),[requestedOpening])
  function selectOpening(id:string|null) {
    setSelected(id);const query=new URLSearchParams(params.toString());if(id)query.set('opening',id);else query.delete('opening');router.replace(`/history${query.size?'?'+query.toString():''}`,{scroll:false})
  }
  const result=useRemote<{opening:OpeningResult}>(selected?`/api/booster/openings/${encodeURIComponent(selected)}`:null)
  const collection=useRemote<{cards:CatalogueCard[]}>('/api/collection')
  const [detail,setDetail]=useState<CatalogueCard|null>(null)
  const [moreError,setMoreError]=useState('')
  const [setFilter,setSetFilter]=useState('')
  useEffect(()=>{if(history.data)setRows(old=>cursor?[...old,...history.data!.openings.filter(row=>!old.some(r=>r.id===row.id))]:history.data!.openings)},[history.data,cursor])
  const opening=result.data?.opening
  async function refresh(){setMoreError('');try{const fresh=await readApi<HistoryPage>('/api/booster/history');setRows(fresh.openings);setCursor(null);history.retry()}catch{setMoreError('Historique indisponible')}}
  const resultContent = <><LoadState loading={result.loading} error={result.error} retry={result.retry} />{opening&&<section className="piece-history-receipt"><SectionHeading title={`${opening.setCode} · ${opening.setName}`} /><p className="piece-muted mb-6">{new Date(opening.openedAt).toLocaleString('fr-FR')} · {opening.creditedAt?`${opening.cards.length} cartes ajoutées lors de l’ouverture · ${opening.newCardsCount} nouvelles cartes.`:'Ouverture ancienne : attribution non vérifiable.'}</p><p className="piece-history-readonly">Résultat enregistré · consultation sans nouvelle attribution</p><div className="piece-card-grid">{opening.cards.map((card,i)=>{const visible={...card,quantity:collection.data?.cards.find(c=>c.id===card.id)?.quantity || 0};return <div key={`${opening.id}-${i}`}><CardTile card={visible} isNew={Boolean(card.isNew)} onClick={()=>setDetail(visible)} /><p className="piece-muted !text-xs mt-2">{card.isDuplicate===null?'Historique ancien':card.isDuplicate?'Doublon':'Nouvelle acquisition'}</p></div>})}</div></section>}</>
  return <div className="piece-page piece-history-page"><PageHeading eyebrow="Les souvenirs du voyage" title="Vos découvertes." description="Chaque ouverture est enregistrée. Retrouvez vos trésors à tout moment."><button className="piece-button secondary" onClick={()=>void refresh()} disabled={history.loading}>Actualiser</button><Link href="/boosters" className="piece-button">Ouvrir un booster</Link></PageHeading><LoadState loading={history.loading} error={history.error || moreError} retry={history.retry} />
  <label className="piece-field max-w-xs mb-5">Extension de l’ouverture<select value={setFilter} onChange={e=>setSetFilter(e.target.value)}><option value="">Toutes les extensions</option>{[...new Set(rows.map(row=>row.setCode))].map(code=><option key={code}>{code}</option>)}</select></label><div className="piece-history-list">{rows.filter(row=>!setFilter || row.setCode===setFilter).map(row=><button key={row.id} className="piece-history-row text-left" onClick={event=>{origin.current=event.currentTarget;selectOpening(row.id)}} aria-pressed={selected===row.id}><div className="piece-history-art"><BoosterArtwork src={getBoosterArtwork(row.setCode,null)} alt={`Booster ${row.setCode}`} /></div><div className="flex-1"><strong>{row.setName}</strong><p>{new Date(row.openedAt).toLocaleString('fr-FR')} · {row.setCode} · {row.cardCount} cartes</p></div><span className="text-xs text-amber-200">Revoir →</span></button>)}</div>{history.data?.nextCursor&&<button className="piece-button secondary mt-5" onClick={()=>setCursor(history.data!.nextCursor)} disabled={history.loading}>Ouvertures précédentes</button>}
  {!history.loading&&!rows.length&&!history.error&&<EmptyState title="Votre première découverte vous attend" description="L’historique affichera vos prochaines ouvertures."><Link href="/boosters" className="piece-button">Explorer les boosters</Link></EmptyState>}
  {mobile?<Dialog open={Boolean(selected)} onOpenChange={open=>{if(!open)selectOpening(null)}}><DialogContent className="piece-modal piece-history-result" onEscapeKeyDown={event=>{if(detail){event.preventDefault();setDetail(null)}}} onInteractOutside={event=>{if(detail)event.preventDefault()}} onCloseAutoFocus={event=>{if(origin.current){event.preventDefault();origin.current.focus()}}}><DialogTitle>Résultat de l’ouverture</DialogTitle><DialogDescription>Vos cartes déjà enregistrées, sans nouvelle attribution.</DialogDescription>{resultContent}<CardDetail card={detail} cards={collection.data?.cards} onClose={()=>setDetail(null)} /></DialogContent></Dialog>:selected&&<section className="piece-panel mt-8">{resultContent}</section>}
  {!mobile&&<CardDetail card={detail} cards={collection.data?.cards} onClose={()=>setDetail(null)} />}</div>
}
