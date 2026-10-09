'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRemote } from '@/hooks/useRemote'
import type { CollectorDeck } from '@/lib/collector/types'
import { deckAnalytics } from '@/lib/collector/decks'
import { PageHeading, EmptyState, LoadState } from '@/components/collector/Primitives'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
export default function DecksPage() {
  const decks=useRemote<{decks:CollectorDeck[]}>('/api/decks')
  const [remove,setRemove]=useState<CollectorDeck|null>(null)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  async function action(id:string,method:'DELETE'|'POST') {
    if(busy)return
    setBusy(true);setError('');setNotice('')
    try{const response=await fetch(`/api/decks/${encodeURIComponent(id)}${method==='POST'?'/activate':''}`,{method});const data=await response.json();if(!response.ok)throw new Error(data.error || 'Action impossible');setNotice(method==='DELETE'?'Deck supprimé.':'Deck actif mis à jour.');setRemove(null);decks.retry()}catch(e){setError(e instanceof Error?e.message:'Action impossible')}finally{setBusy(false)}
  }
  return <div className="piece-page"><PageHeading eyebrow="Prêts à prendre le large" title="Vos équipages." description="Retrouvez vos decks, affinez vos stratégies et choisissez votre leader."><Link href="/deck-builder" className="piece-button">+ Créer un deck</Link></PageHeading><LoadState loading={decks.loading} error={decks.error} retry={decks.retry} />{error&&<p className="piece-error" role="alert">{error}</p>}{notice&&<p className="piece-panel text-emerald-300 mb-6" role="status">{notice}</p>}
  <div className="piece-deck-grid">{decks.data?.decks.map(deck=>{const leader=deck.cards.find(c=>c.type.toUpperCase()==='LEADER');return <article className="piece-panel" key={deck.id}><div className="piece-deck-cover">{leader&&<Image src={leader.imageUrl} alt={leader.name} fill sizes="(max-width:640px) 90vw, 400px" />}<span>{leader?.name || 'Leader non sélectionné'}</span></div><h2>{deck.name}</h2><p className="piece-muted mt-2">{deckAnalytics(deck.cards).count} cartes · {deck.cards.length} entrées uniques</p><div className="piece-actions mt-5"><Link href={`/deck-builder?deckId=${encodeURIComponent(deck.id)}`} className="piece-button">Modifier</Link><button className="piece-button secondary" disabled={busy} onClick={()=>void action(deck.id,'POST')}>Activer</button><button className="piece-button ghost" disabled={busy} onClick={()=>setRemove(deck)}>Supprimer</button><Link href={`/game?deckId=${encodeURIComponent(deck.id)}`} className="piece-muted text-xs">Ouvrir le jeu existant →</Link></div></article>})}</div>
  {decks.data&&!decks.data.decks.length&&<EmptyState title="Un équipage à composer" description="Vos premiers compagnons sont dans votre collection."><Link href="/deck-builder" className="piece-button">Créer mon premier deck</Link></EmptyState>}
  <Dialog open={Boolean(remove)} onOpenChange={open=>{if(!open&&!busy)setRemove(null)}}><DialogContent className="piece-modal !max-w-md"><DialogTitle>Supprimer {remove?.name} ?</DialogTitle><DialogDescription>Le deck et ses versions seront supprimés. Les cartes de votre collection seront conservées.</DialogDescription><div className="piece-actions"><button className="piece-button secondary" disabled={busy} onClick={()=>setRemove(null)}>Annuler</button><button className="piece-button danger" disabled={busy} onClick={()=>remove&&void action(remove.id,'DELETE')}>{busy?'Suppression…':'Supprimer le deck'}</button></div>{error&&<p role="alert" className="text-rose-300">{error}</p>}</DialogContent></Dialog>
  </div>
}
