'use client'
import './boosters.css'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type WheelEvent } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, PackageOpen, ArrowUpRight } from 'lucide-react'
import { useRemote } from '@/hooks/useRemote'
import type { BoosterCatalogItem } from '@/lib/boosters/types'
import type { CollectorOverview } from '@/lib/collector/types'
import { PageHeading, LoadState, EmptyState, Progress, SectionHeading } from '@/components/collector/Primitives'
import SetTile from '@/components/collector/SetTile'
import PackArt from '@/components/booster-opening/PackArt'
import { extensionFamily, extensionFamilies } from '@/lib/collector/extension-family'
import { isBoosterProduct } from '@/lib/boosters/products'
import { boosterTitle, compareCodes } from '@/lib/boosters/catalogPresentation'

// Presentation only: the catalogue, availability, opening and credits are unchanged (server /api/booster, /booster-opening).
export default function BoostersPage() {
  const { data: session } = useSession()
  const parameters = useSearchParams()
  const router = useRouter()
  const catalogue = useRemote<{ sets: BoosterCatalogItem[] }>('/api/booster')
  const gallery = parameters.get('view') === 'extensions'
  const products = useMemo(() => (catalogue.data?.sets.filter(s => gallery || isBoosterProduct(s.code)) ?? []).slice().sort((a, b) => compareCodes(a.code, b.code)), [catalogue.data, gallery])
  const overview = useRemote<CollectorOverview>(session?.user?.id ? '/api/collector' : null)
  const [query, setQuery] = useState('')
  const [onlyAvailable, setOnlyAvailable] = useState(false)
  const [family, setFamily] = useState('Toutes')
  const [selectedCode, setSelectedCode] = useState(parameters.get('set') || '')
  const families = extensionFamilies(products.map(s => s.code))
  useEffect(() => { const code = parameters.get('set'); if (code) setSelectedCode(code) }, [parameters])
  const sets = products.filter(s => (family === 'Toutes' || extensionFamily(s.code) === family) && (!onlyAvailable || s.available)
    && `${s.code} ${s.name} ${boosterTitle(s)}`.toLowerCase().includes(query.toLowerCase()))
  const current = Math.max(0, sets.findIndex(s => s.code === selectedCode))
  const selected = sets[current]
  const progress = overview.data?.sets.find(s => s.code === selected?.code)
  function select(index: number) {
    const code = sets[Math.min(sets.length - 1, Math.max(0, index))]?.code; if (!code) return
    setSelectedCode(code)
    const params = new URLSearchParams(parameters.toString()); params.set('set', code)
    router.replace(`/boosters?${params.toString()}`, { scroll: false })
  }

  // Coverflow: follows the thumb or the mouse while dragged, snaps to the nearest packet (a quick flick carries further);
  // also the wheel, the arrow keys, the arrows on screen or a click on a side packet.
  const [drag, setDrag] = useState(0)
  const gesture = useRef<{ x: number; y: number; t: number; moved: boolean; horizontal: boolean | null } | null>(null)
  const swiped = useRef(false), step = useRef(170), wheel = useRef({ acc: 0, at: 0 }), stage = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const measure = () => { const w = stage.current?.clientWidth ?? 900; step.current = Math.max(105, Math.min(210, w / 5.4)) }
    measure(); window.addEventListener('resize', measure); return () => window.removeEventListener('resize', measure)
  }, [catalogue.data])
  const onPointerDown = (e: PointerEvent) => { gesture.current = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false, horizontal: null }; swiped.current = false }
  const onPointerMove = (e: PointerEvent) => {
    const g = gesture.current; if (!g) return
    const dx = e.clientX - g.x, dy = e.clientY - g.y
    if (g.horizontal === null && Math.hypot(dx, dy) > 8) { g.horizontal = Math.abs(dx) > Math.abs(dy); if (g.horizontal) (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId) }
    if (g.horizontal) { g.moved = true; setDrag(dx) }
  }
  const onPointerEnd = (e: PointerEvent) => {
    const g = gesture.current; gesture.current = null
    if (!g?.moved) { setDrag(0); return }
    const dx = e.clientX - g.x, speed = dx / Math.max(1, performance.now() - g.t)
    const shift = Math.round(-dx / step.current) + (Math.abs(speed) > .6 ? -Math.sign(speed) * Math.min(3, Math.round(Math.abs(speed) * 2)) : 0)
    swiped.current = true; setDrag(0); select(current + shift)
  }
  const onWheel = (e: WheelEvent) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return // vertical wheel keeps scrolling the page
    const now = performance.now(), w = wheel.current
    if (now - w.at > 250) w.acc = 0
    w.acc += e.deltaX; w.at = now
    if (Math.abs(w.acc) > 60) { select(current + Math.sign(w.acc)); w.acc = 0 }
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); select(current + 1) } else if (e.key === 'ArrowLeft') { e.preventDefault(); select(current - 1) }
  }
  const openHref = (code: string) => session?.user ? `/booster-opening?set=${encodeURIComponent(code)}` : '/login'

  return <div className="piece-page piece-boosters-page boosters-v2">
    <PageHeading eyebrow="Boosters One Piece TCG" title={gallery ? 'Explorez les extensions.' : 'Choisir une extension.'} description="Retrouvez vos cartes manquantes et découvrez votre prochain trésor."><Link className="piece-button secondary" href="/opening-demo">Démo d’ouverture</Link></PageHeading>
    <div className="bx-toolbar">
      <div className="bx-families" role="group" aria-label="Familles d’extensions">{['Toutes', ...families].map(value => <button key={value} type="button" aria-pressed={family === value} onClick={() => setFamily(value)}>{value}<span>{value === 'Toutes' ? products.length : products.filter(s => extensionFamily(s.code) === value).length}</span></button>)}</div>
      <label className="bx-search"><span>Rechercher une extension</span><input type="search" placeholder="OP-01, Romance Dawn…" value={query} onChange={e => setQuery(e.target.value)} /></label>
      <label className="bx-available"><input type="checkbox" checked={onlyAvailable} onChange={e => setOnlyAvailable(e.target.checked)} />Disponibles à l’ouverture</label>
    </div>
    <LoadState loading={catalogue.loading} error={catalogue.error || overview.error} retry={() => { catalogue.retry(); overview.retry() }} />
    {!gallery && selected && <section className="bx-showcase" aria-label="Sélection d’un booster">
      <div ref={stage} className="bx-stage" role="region" aria-roledescription="carrousel" aria-label="Illustrations des boosters" tabIndex={0} onKeyDown={onKey} onWheel={onWheel}>
        <div className={`bx-track${drag ? ' dragging' : ''}`} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd}>
          {sets.map((set, i) => {
            const offset = i - current + drag / step.current, distance = Math.abs(offset)
            const style = { transform: `translateX(calc(-50% + ${offset * step.current}px)) scale(${Math.max(.5, 1 - distance * .17)}) rotateY(${Math.max(-42, Math.min(42, -offset * 18))}deg)`,
              zIndex: 100 - Math.round(distance * 10), opacity: distance > 3.4 ? 0 : 1 - Math.max(0, distance - 2) * .5 } as CSSProperties
            return <button key={set.code} type="button" style={style} tabIndex={distance > 3.4 ? -1 : 0} aria-pressed={i === current} aria-label={`Sélectionner ${set.code} · ${boosterTitle(set)}`}
              className={`bx-slide${i === current ? ' piece-carousel-active selected' : ''}${set.available ? '' : ' unavailable'}`}
              onClick={() => { if (swiped.current) { swiped.current = false; return } select(i) }}>
              <PackArt src={set.imageUrl} alt={`Booster ${set.code} · ${boosterTitle(set)}`} testId={i === current ? 'selected-booster-artwork' : undefined} eager={distance < 2.5} />
              <span className="bx-slide-code">{set.code}</span>
              <span className="bx-slide-name">{boosterTitle(set)}</span>
            </button>
          })}
        </div>
        <button type="button" className="bx-arrow prev" aria-label="Extension précédente" disabled={current === 0} onClick={() => select(current - 1)}><ChevronLeft /></button>
        <button type="button" className="bx-arrow next" aria-label="Extension suivante" disabled={current >= sets.length - 1} onClick={() => select(current + 1)}><ChevronRight /></button>
        <p className="bx-position" aria-live="polite">{current + 1} / {sets.length}</p>
      </div>
      <div className="bx-details">
        <div className="bx-details-main">
          <p className="bx-details-code">{selected.code}<span className={`bx-pill ${selected.available ? 'ok' : 'off'}`}>{selected.available ? 'Disponible' : 'Indisponible'}</span></p>
          <h2>{boosterTitle(selected)}</h2>
          {selected.description && <p className="piece-muted bx-description">{selected.description}</p>}
          <div className="bx-stats"><div><strong>{selected.cardCount}</strong><span>Cartes au catalogue</span></div><div><strong>{selected.packSize ?? '—'}</strong><span>Cartes par booster</span></div>
            {progress && <div><strong>{progress.percentage}%</strong><span>{progress.unique} / {progress.total} possédées</span></div>}</div>
          {progress && <Progress value={progress.percentage} label={`Progression ${selected.code}`} />}
        </div>
        <div className="bx-details-actions">
          {selected.available ? <Link href={openHref(selected.code)} className="piece-button bx-open"><PackageOpen size={18} />Ouvrir ce booster</Link> : <p className="bx-unavailable" role="status">{selected.error}</p>}
          <Link href={`/boosters/${encodeURIComponent(selected.code)}`} className="piece-button secondary">Voir toutes les cartes <ArrowUpRight size={14} /></Link>
        </div>
      </div>
    </section>}
    <SectionHeading title={gallery ? 'Extensions du catalogue' : 'Toutes les extensions'} />
    {gallery ? <div className="piece-set-grid">{sets.map(set => <SetTile key={set.code} set={set} authenticated={Boolean(session?.user)} progress={overview.data?.sets.find(p => p.code === set.code)} />)}</div>
      : <ul className="bx-grid">{sets.map((set, i) => { const p = overview.data?.sets.find(x => x.code === set.code); return <li key={set.code}>
        <button type="button" className={`bx-tile${i === current ? ' selected' : ''}${set.available ? '' : ' unavailable'}`} onClick={() => { select(i); stage.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }} aria-label={`Afficher ${set.code} · ${boosterTitle(set)}`}>
          <PackArt src={set.imageUrl} alt="" />
          <span className="bx-tile-code">{set.code}</span>
          <span className="bx-tile-name">{boosterTitle(set)}</span>
          {p ? <span className="bx-tile-progress"><i style={{ width: `${p.percentage}%` }} /></span> : null}
        </button></li> })}</ul>}
    {catalogue.data && !sets.length && <EmptyState title="Aucune extension trouvée" description="Essayez une autre recherche." />}
  </div>
}
