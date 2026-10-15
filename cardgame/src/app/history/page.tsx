'use client'
import '../home/home.css'
import '../decks/decks.css'
import './history.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, PackageOpen, RefreshCw, Sparkles } from 'lucide-react'
import { useMobileLayout } from '@/hooks/useMobileLayout'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import PackArt from '@/components/booster-opening/PackArt'
import { getBoosterArtwork } from '@/lib/boosters/artwork'
import { boosterTitle } from '@/lib/boosters/catalogPresentation'
import { openingEffect } from '@/lib/boosters/presentation'
import { readApi, useRemote } from '@/hooks/useRemote'
import type { HistoryPage, HistoryRow, CatalogueCard } from '@/lib/collector/types'
import type { OpeningResult } from '@/lib/boosters/types'
import { LoadState, EmptyState } from '@/components/collector/Primitives'
import CardTile from '@/components/collector/CardTile'
import CardDetail from '@/components/collector/CardDetail'
import { OceanBackdrop, useReveal } from '@/components/home/fx'

const day = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

/** V2 history: openings as a timeline grouped by day, each one replayable as a receipt (no new credit). */
export default function HistoryPage() {
  useReveal()
  const mobile = useMobileLayout()
  const router = useRouter()
  const origin = useRef<HTMLButtonElement | null>(null)
  const params = useSearchParams()
  const requestedOpening = params.get('opening')
  const [cursor, setCursor] = useState<string | null>(null)
  const [rows, setRows] = useState<HistoryRow[]>([])
  const history = useRemote<HistoryPage>(`/api/booster/history${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`)
  const [selected, setSelected] = useState<string | null>(params.get('opening'))
  useEffect(() => setSelected(requestedOpening), [requestedOpening])
  function selectOpening(id: string | null) {
    setSelected(id); const query = new URLSearchParams(params.toString()); if (id) query.set('opening', id); else query.delete('opening'); router.replace(`/history${query.size ? '?' + query.toString() : ''}`, { scroll: false })
  }
  const result = useRemote<{ opening: OpeningResult }>(selected ? `/api/booster/openings/${encodeURIComponent(selected)}` : null)
  // Only the quantities are needed here (light endpoint), not a second copy of every card.
  const collection = useRemote<{ cards: { id: string; quantity: number }[] }>('/api/collection?fields=quantities')
  const quantities = useMemo(() => new Map(collection.data?.cards.map(c => [c.id, c.quantity])), [collection.data])
  const [detail, setDetail] = useState<CatalogueCard | null>(null)
  const [moreError, setMoreError] = useState('')
  const [setFilter, setSetFilter] = useState('')
  useEffect(() => { if (history.data) setRows(old => cursor ? [...old, ...history.data!.openings.filter(row => !old.some(r => r.id === row.id))] : history.data!.openings) }, [history.data, cursor])
  const opening = result.data?.opening
  async function refresh() { setMoreError(''); try { const fresh = await readApi<HistoryPage>('/api/booster/history'); setRows(fresh.openings); setCursor(null); history.retry() } catch { setMoreError('Historique indisponible') } }
  const visible = rows.filter(row => !setFilter || row.setCode === setFilter)
  const groups = useMemo(() => { const out: { day: string; rows: HistoryRow[] }[] = []; for (const r of visible) { const d = day(r.openedAt); if (out.at(-1)?.day === d) out.at(-1)!.rows.push(r); else out.push({ day: d, rows: [r] }) } return out }, [visible])
  const cardsOpened = rows.reduce((n, r) => n + r.cardCount, 0)
  const receiptCards = opening?.cards.map(card => ({ ...card, quantity: quantities.get(card.id) || 0 })) ?? []
  const resultContent = <><LoadState loading={result.loading} error={result.error} retry={result.retry} />{opening && <section className="hs-receipt">
    <div className="hs-receipt-head"><div className="hs-receipt-pack"><PackArt src={getBoosterArtwork(opening.setCode, null)} alt={`Booster ${opening.setCode}`} /></div>
      <div><p className="fx-kicker">{opening.setCode}</p><h2>{boosterTitle({ code: opening.setCode, name: opening.setName })}</h2><p className="hs-muted">{new Date(opening.openedAt).toLocaleString('fr-FR')}</p>
        <div className="hs-chips"><span>{opening.cards.length} cartes</span>{opening.creditedAt ? <span className="ok">{opening.newCardsCount} nouvelles</span> : <span>Ouverture ancienne : attribution non vérifiable</span>}{opening.specialPack && <span className="gold">{opening.specialPack}</span>}</div></div></div>
    <p className="hs-readonly">Résultat enregistré · consultation sans nouvelle attribution</p>
    <div className="piece-card-grid hs-cards">{receiptCards.map((card, i) => <div key={`${opening.id}-${i}`} className="hs-card" data-effect={openingEffect(card)}><CardTile card={card} isNew={Boolean(card.isNew)} onClick={() => setDetail(card)} /><p className="hs-card-note">{card.isDuplicate === null ? 'Historique ancien' : card.isDuplicate ? 'Doublon' : 'Nouvelle acquisition'}</p></div>)}</div>
  </section>}</>
  return <div className="piece-page piece-history-page hs-page">
    <div className="fx-home hs">
      <OceanBackdrop />
      <header className="hs-head">
        <div><p className="fx-kicker">Les souvenirs du voyage</p><h1>Vos découvertes.</h1><p className="hs-muted">Chaque ouverture est enregistrée. Retrouvez vos trésors à tout moment.</p></div>
        <div className="hs-head-side">
          {rows.length > 0 && <div className="dk-head-stats"><div><strong>{rows.length}{history.data?.nextCursor ? '+' : ''}</strong><span>ouvertures</span></div><div><strong>{cardsOpened}</strong><span>cartes</span></div></div>}
          <button type="button" className="dk-btn hs-refresh" onClick={() => void refresh()} disabled={history.loading}><RefreshCw size={15} />Actualiser</button>
          <Link href="/boosters" className="fx-btn"><PackageOpen size={18} />Ouvrir un booster</Link>
        </div>
      </header>
      <LoadState loading={history.loading} error={history.error || moreError} retry={history.retry} />
      {rows.length > 0 && <label className="hs-filter">Extension de l’ouverture<select value={setFilter} onChange={e => setSetFilter(e.target.value)}><option value="">Toutes les extensions</option>{[...new Set(rows.map(row => row.setCode))].map(code => <option key={code} value={code}>{code} · {boosterTitle({ code, name: code })}</option>)}</select></label>}
      <div className={`hs-layout${selected && !mobile ? ' with-receipt' : ''}`}>
        <div className="hs-timeline">{groups.map(g => <section key={g.day} className="hs-day" data-reveal>
          <h3><span />{g.day}</h3>
          <div className="hs-rows">{g.rows.map(row => <button key={row.id} type="button" className={`hs-row${selected === row.id ? ' on' : ''}`} onClick={event => { origin.current = event.currentTarget; selectOpening(row.id) }} aria-pressed={selected === row.id}>
            <span className="hs-row-pack"><PackArt src={getBoosterArtwork(row.setCode, null)} alt={`Booster ${row.setCode}`} /></span>
            <span className="hs-row-text"><strong>{boosterTitle({ code: row.setCode, name: row.setName })}</strong><small>{new Date(row.openedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · {row.setCode} · {row.cardCount} cartes{!row.creditedAt ? ' · ancienne' : ''}</small></span>
            <span className="hs-row-go">Revoir <ChevronRight size={16} /></span>
          </button>)}</div>
        </section>)}
          {history.data?.nextCursor && <button type="button" className="dk-btn hs-more" onClick={() => setCursor(history.data!.nextCursor)} disabled={history.loading}>Ouvertures précédentes</button>}
        </div>
        {!mobile && selected && <section className="hs-receipt-panel">{resultContent}</section>}
      </div>
      {!history.loading && !rows.length && !history.error && <EmptyState title="Votre première découverte vous attend" description="L’historique affichera vos prochaines ouvertures."><Link href="/boosters" className="fx-btn"><Sparkles size={16} />Explorer les boosters</Link></EmptyState>}
    </div>
    {mobile ? <Dialog open={Boolean(selected)} onOpenChange={open => { if (!open) selectOpening(null) }}><DialogContent className="piece-modal piece-history-result hs-modal" onEscapeKeyDown={event => { if (detail) { event.preventDefault(); setDetail(null) } }} onInteractOutside={event => { if (detail) event.preventDefault() }} onCloseAutoFocus={event => { if (origin.current) { event.preventDefault(); origin.current.focus() } }}><DialogTitle>Résultat de l’ouverture</DialogTitle><DialogDescription>Vos cartes déjà enregistrées, sans nouvelle attribution.</DialogDescription>{resultContent}<CardDetail card={detail} cards={receiptCards} onClose={() => setDetail(null)} /></DialogContent></Dialog>
      : <CardDetail card={detail} cards={receiptCards} onClose={() => setDetail(null)} />}
  </div>
}
