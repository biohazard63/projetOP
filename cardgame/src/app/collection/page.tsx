'use client'
import './collection.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { readApi, useRemote } from '@/hooks/useRemote'
import type { CatalogueCard, CollectorOverview } from '@/lib/collector/types'
import { LoadState } from '@/components/collector/Primitives'
import CatalogueGrid from '@/components/collector/CatalogueGrid'
import { compareCodes } from '@/lib/boosters/catalogPresentation'
import { Counter, RANKS, Ring } from '@/components/collector/Progression'

// The light catalogue (no rules texts) is kept for the session: coming back to the binder shows it at once, then refreshes.
let catalogueCache: CatalogueCard[] | null = null
function useCatalogue() {
  const [data, setData] = useState<CatalogueCard[] | null>(catalogueCache)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    readApi<CatalogueCard[]>('/api/cards?fields=grid', controller.signal).then(cards => { catalogueCache = cards; setData(cards) })
      .catch(e => { if (!controller.signal.aborted && !catalogueCache) setError(e instanceof Error ? e.message : 'Chargement indisponible') })
    return () => controller.abort()
  }, [revision])
  return { data, error, loading: !data && !error, retry: () => { setError(''); setRevision(n => n + 1) } }
}

export default function CollectionPage() {
  const catalogue = useCatalogue()
  const owned = useRemote<{ cards: { id: string; quantity: number; acquiredAt: string }[] }>('/api/collection?fields=quantities')
  const user = useRemote<{ favorites: { cardId: string }[] }>('/api/user/cards')
  const overview = useRemote<CollectorOverview>('/api/collector')
  const [changes, setChanges] = useState<Record<string, boolean>>({})
  const router = useRouter(), pathname = usePathname(), parameters = useSearchParams()
  const activeSet = parameters.get('set') || ''
  const quantities = useMemo(() => new Map(owned.data?.cards.map(c => [c.id, c])), [owned.data])
  const favorites = useMemo(() => new Set(user.data?.favorites.map(c => c.cardId)), [user.data])
  const cards = useMemo(() => catalogue.data?.map(c => ({ ...c, quantity: quantities.get(c.id)?.quantity || 0, acquiredAt: quantities.get(c.id)?.acquiredAt, isFavorite: changes[c.id] ?? favorites.has(c.id) })) || [], [catalogue.data, quantities, favorites, changes])
  async function toggleFavorite(id: string) {
    const current = changes[id] ?? favorites.has(id)
    const response = await fetch('/api/user/favorites', { method: current ? 'DELETE' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cardId: id }) })
    if (!response.ok) throw new Error('Favoris indisponibles')
    setChanges(old => ({ ...old, [id]: !current }))
  }
  const data = overview.data
  const rankIndex = data ? RANKS.findLastIndex(r => data.percentage >= r.at) : 0
  const rank = RANKS[rankIndex], nextRank = RANKS[rankIndex + 1]
  const toNext = data && nextRank ? Math.max(0, Math.ceil(data.catalogue * nextRank.at / 100) - data.unique) : 0
  const sets = useMemo(() => (data?.sets ?? []).filter(s => s.total > 0).slice().sort((a, b) => compareCodes(a.code, b.code)), [data])
  const chips = useRef<HTMLDivElement>(null)
  function pickSet(code: string) {
    const params = new URLSearchParams(parameters.toString())
    if (activeSet === code) params.delete('set'); else params.set('set', code)
    router.replace(`${pathname}${params.size ? `?${params}` : ''}`, { scroll: false })
  }
  return <div className="piece-page cx-page">
    <section className="cx-hero" aria-label="Progression de la collection">
      <div className="cx-hero-ring">
        <Ring value={data?.percentage ?? 0} />
        <div className="cx-hero-ring-label"><strong>{data ? `${data.percentage}%` : '…'}</strong><span>du catalogue</span></div>
      </div>
      <div className="cx-hero-main">
        <p className="cx-eyebrow">Chaque carte raconte une histoire</p>
        <h1>Votre classeur.</h1>
        <p className="cx-rank"><Sparkles size={16} /> Rang : <b>{rank.name}</b>{nextRank && data ? <span> · encore {toNext.toLocaleString('fr-FR')} cartes pour devenir <b>{nextRank.name}</b></span> : null}</p>
        {data ? <div className="cx-counters">
          <Counter label="Exemplaires" value={data.total} />
          <Counter label="Cartes uniques" value={data.unique} accent />
          <Counter label="À découvrir" value={data.catalogue - data.unique} />
          <Counter label={`Variantes spéciales / ${data.alternatives.toLocaleString('fr-FR')}`} value={data.ownedAlternatives} />
        </div> : <div className="cx-counters skeleton" aria-hidden="true">{Array.from({ length: 4 }, (_, i) => <div key={i} className="cx-counter" />)}</div>}
      </div>
      <Link href="/boosters" className="cx-cta">Enrichir ma collection</Link>
    </section>
    {sets.length > 0 && <div className="cx-sets" ref={chips} role="group" aria-label="Filtrer par extension">
      {sets.map(s => <button key={s.code} type="button" aria-pressed={activeSet === s.code} className={`cx-set${activeSet === s.code ? ' on' : ''}${s.percentage >= 100 ? ' done' : ''}`} onClick={() => pickSet(s.code)} title={`${s.code} · ${s.unique} / ${s.total}`}>
        <span className="cx-set-ring" style={{ '--p': s.percentage } as React.CSSProperties} />
        <span className="cx-set-text"><b>{s.code}</b><small>{s.percentage}%</small></span>
      </button>)}
    </div>}
    <LoadState loading={catalogue.loading || owned.loading} error={catalogue.error || owned.error} retry={() => { catalogue.retry(); owned.retry(); user.retry(); overview.retry() }} />
    {catalogue.data && owned.data && <CatalogueGrid cards={cards} collection onFavorite={toggleFavorite} />}
  </div>
}
