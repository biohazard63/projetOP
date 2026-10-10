'use client'
import { useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import BoosterArtwork from './BoosterArtwork'
import type { BoosterCatalogItem } from '@/lib/boosters/types'
import styles from './BoosterCarousel.module.css'

export default function BoosterCarousel({ sets, selectedCode, onSelect }: { sets: BoosterCatalogItem[]; selectedCode: string; onSelect: (index: number) => void }) {
  const track = useRef<HTMLDivElement>(null)
  const dragging = useRef<{ x: number; scroll: number; pointer: number } | null>(null)
  const selecting = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suppressed = useRef(false)
  const callback = useRef(onSelect)
  callback.current = onSelect
  const current = Math.max(0, sets.findIndex(s => s.code === selectedCode))
  useEffect(() => {
    const element = track.current
    const slide = element?.children[current] as HTMLElement | undefined
    if (element && slide && !dragging.current) {
      const left = slide.offsetLeft - (element.clientWidth - slide.offsetWidth) / 2
      if (Math.abs(element.scrollLeft - left) > 2) element.scrollTo({ left, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
    }
  }, [selectedCode, current, sets])
  useEffect(() => () => { if (selecting.current) clearTimeout(selecting.current) }, [])
  function settle() {
    if (selecting.current) clearTimeout(selecting.current)
    selecting.current = setTimeout(() => {
      if (!track.current || dragging.current) return
      const center = track.current.scrollLeft + track.current.clientWidth / 2
      let nearest = 0, distance = Infinity
      Array.from(track.current.children).forEach((node, index) => {
        const el = node as HTMLElement
        const delta = Math.abs(el.offsetLeft + el.offsetWidth / 2 - center)
        if (delta < distance) { nearest = index; distance = delta }
      })
      if (nearest !== current) callback.current(nearest)
    }, 160)
  }
  return <div className={styles.carousel}>
    <div ref={track} className={styles.track} role="region" aria-roledescription="carrousel" aria-label="Illustrations des boosters" tabIndex={0}
      onScroll={settle} onTouchEnd={settle} onKeyDown={e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); onSelect((current + (e.key === 'ArrowRight' ? 1 : -1) + sets.length) % sets.length) } }}
      onPointerDown={e => { suppressed.current = false; if (e.pointerType !== 'mouse' || e.button !== 0) return; dragging.current = { x: e.clientX, scroll: e.currentTarget.scrollLeft, pointer: e.pointerId }; suppressed.current = false }}
      onPointerMove={e => { const start = dragging.current; if (!start) return; if (Math.abs(e.clientX - start.x) > 6) { suppressed.current = true; e.currentTarget.setPointerCapture(start.pointer); e.currentTarget.style.scrollSnapType = 'none'; e.currentTarget.scrollLeft = start.scroll + start.x - e.clientX } }}
      onPointerUp={e => { dragging.current = null; e.currentTarget.style.scrollSnapType = ''; if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); settle() }}
      onPointerCancel={e => { dragging.current = null; e.currentTarget.style.scrollSnapType = ''; settle() }} onDragStart={e => e.preventDefault()}>
      {sets.map((set, index) => <button type="button" key={set.code} className={styles.slide} aria-pressed={index === current} aria-label={`Sélectionner ${set.code}`} onClick={() => { if (!suppressed.current) onSelect(index); suppressed.current = false }}>
        <BoosterArtwork key={`${set.code}-${index === current}`} testId={index === current ? 'selected-booster-artwork' : undefined} src={set.imageUrl} alt={`Booster ${set.code} · ${set.name}`} />
      </button>)}
    </div>
    <button className={`piece-carousel-arrow prev ${styles.arrow}`} disabled={sets.length < 2} aria-label="Extension précédente" onClick={() => onSelect((current - 1 + sets.length) % sets.length)}><ChevronLeft /></button>
    <button className={`piece-carousel-arrow next ${styles.arrow}`} disabled={sets.length < 2} aria-label="Extension suivante" onClick={() => onSelect((current + 1) % sets.length)}><ChevronRight /></button>
    <p className={styles.position} aria-live="polite">{current + 1} / {sets.length}</p>
  </div>
}
