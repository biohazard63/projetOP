'use client'
import '../home/home.css'
import './decks.css'
import { useState, type CSSProperties } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Layers, Pencil, Plus, Swords, Trash2, Zap } from 'lucide-react'
import { useRemote } from '@/hooks/useRemote'
import type { CollectorDeck } from '@/lib/collector/types'
import { deckAnalytics } from '@/lib/collector/decks'
import { normalizeCardColors } from '@/lib/cardColors'
import { EmptyState, LoadState } from '@/components/collector/Primitives'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { OceanBackdrop, Tilt, useReveal } from '@/components/home/fx'

const COLOR_LABEL: Record<string, string> = { RED: 'Rouge', GREEN: 'Vert', BLUE: 'Bleu', PURPLE: 'Violet', BLACK: 'Noir', YELLOW: 'Jaune' }

/** V2 decks: each crew as a card with its Leader art, colours, cost curve and completion out of 50. Same actions as before. */
export default function DecksPage() {
  useReveal()
  const decks = useRemote<{ decks: CollectorDeck[] }>('/api/decks')
  const [remove, setRemove] = useState<CollectorDeck | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  async function action(id: string, method: 'DELETE' | 'POST') {
    if (busy) return
    setBusy(true); setError(''); setNotice('')
    try { const response = await fetch(`/api/decks/${encodeURIComponent(id)}${method === 'POST' ? '/activate' : ''}`, { method }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Action impossible'); setNotice(method === 'DELETE' ? 'Deck supprimé.' : 'Deck actif mis à jour.'); setRemove(null); decks.retry() }
    catch (e) { setError(e instanceof Error ? e.message : 'Action impossible') } finally { setBusy(false) }
  }
  const list = decks.data?.decks ?? []
  const complete = list.filter(d => deckAnalytics(d.cards).count === 50).length
  return <div className="piece-page dk-page">
    <div className="fx-home dk">
      <OceanBackdrop />
      <header className="dk-head">
        <div><p className="fx-kicker">Prêts à prendre le large</p><h1>Vos équipages.</h1><p className="dk-lead">Retrouvez vos decks, affinez vos stratégies et choisissez votre leader.</p></div>
        <div className="dk-head-side">
          {decks.data && <div className="dk-head-stats"><div><strong>{list.length}</strong><span>decks</span></div><div><strong>{complete}</strong><span>complets</span></div></div>}
          <Link href="/deck-builder" className="fx-btn"><Plus size={18} />Créer un deck</Link>
        </div>
      </header>
      <LoadState loading={decks.loading} error={decks.error} retry={decks.retry} />
      {error && <p className="dk-alert" role="alert">{error}</p>}
      {notice && <p className="dk-alert ok" role="status">{notice}</p>}
      <div className="dk-grid">
        <Link href="/deck-builder" className="dk-new" data-reveal><span><Plus size={30} /></span><b>Nouveau deck</b><small>Composez un équipage à partir de votre collection</small></Link>
        {list.map(deck => {
          const leader = deck.cards.find(c => c.type.toUpperCase() === 'LEADER'), stats = deckAnalytics(deck.cards)
          const colors = leader ? normalizeCardColors(leader.color) : Object.keys(stats.colors)
          const peak = Math.max(1, ...stats.costs)
          return <Tilt key={deck.id} max={5} className="dk-card">
            <article data-reveal>
              <div className="dk-cover">
                {leader ? <Image src={leader.imageUrl} alt={leader.name} fill sizes="(max-width:640px) 90vw, 380px" /> : <span className="dk-cover-empty"><Layers size={34} /></span>}
                <div className="dk-colors">{colors.map(c => <i key={c} className={`dk-dot ${c.toLowerCase()}`} title={COLOR_LABEL[c] ?? c} />)}</div>
                <span className="dk-leader">{leader?.name || 'Leader non sélectionné'}</span>
              </div>
              <div className="dk-body">
                <h2>{deck.name}</h2>
                <div className="dk-count"><div className="dk-count-bar"><i style={{ width: `${Math.min(100, stats.count / 50 * 100)}%` }} className={stats.count === 50 ? 'full' : ''} /></div><span>{stats.count} / 50 cartes · {deck.cards.length} entrées uniques</span></div>
                <div className="dk-curve" aria-label="Courbe de coût">{stats.costs.map((n, cost) => <div key={cost} title={`Coût ${cost === 10 ? '10+' : cost} : ${n} carte(s)`}><i style={{ '--h': `${n / peak * 100}%` } as CSSProperties} /><small>{cost === 10 ? '10+' : cost}</small></div>)}</div>
                <div className="dk-actions">
                  <Link href={`/deck-builder?deckId=${encodeURIComponent(deck.id)}`} className="fx-btn small"><Pencil size={14} />Modifier</Link>
                  <button type="button" className="dk-btn" disabled={busy} onClick={() => void action(deck.id, 'POST')}><Zap size={14} />Activer</button>
                  <button type="button" className="dk-btn danger" disabled={busy} onClick={() => setRemove(deck)} aria-label="Supprimer"><Trash2 size={14} /></button>
                </div>
                <Link href={`/game?deckId=${encodeURIComponent(deck.id)}`} className="dk-legacy"><Swords size={13} />Ouvrir le jeu existant →</Link>
              </div>
            </article>
          </Tilt>
        })}
      </div>
      {decks.data && !list.length && <EmptyState title="Un équipage à composer" description="Vos premiers compagnons sont dans votre collection."><Link href="/deck-builder" className="fx-btn">Créer mon premier deck</Link></EmptyState>}
    </div>
    <Dialog open={Boolean(remove)} onOpenChange={open => { if (!open && !busy) setRemove(null) }}><DialogContent className="piece-modal !max-w-md"><DialogTitle>Supprimer {remove?.name} ?</DialogTitle><DialogDescription>Le deck et ses versions seront supprimés. Les cartes de votre collection seront conservées.</DialogDescription><div className="piece-actions"><button className="piece-button secondary" disabled={busy} onClick={() => setRemove(null)}>Annuler</button><button className="piece-button danger" disabled={busy} onClick={() => remove && void action(remove.id, 'DELETE')}>{busy ? 'Suppression…' : 'Supprimer le deck'}</button></div>{error && <p role="alert" className="text-rose-300">{error}</p>}</DialogContent></Dialog>
  </div>
}
