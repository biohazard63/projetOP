'use client'
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { useOpeningPresentation } from '@/components/collector/OpeningPresentation'
import { useCollectorPreferences } from '@/components/collector/Preferences'
import { advanceReveal, openingEffect, type RevealState } from '@/lib/boosters/presentation'
import type { OpeningResult } from '@/lib/boosters/types'
import styles from './StackReveal.module.css'
import { revealImageSizes, useCardPreload } from './useCardPreload'

const VARIANT = { alt: 'Alternative', parallel: 'Parallèle', special: 'Spéciale' } as const
const SUSPENSE = new Set(['rare', 'super', 'secret', 'holographic'])

/**
 * V2 reveal: the cards wait in a pile. The top card glows with the colour of its rarity before it is turned (rare blue,
 * super rare gold, secret and alternative art rainbow); a tap or a swipe turns it, the next tap or a swipe throws it aside.
 * Alternative and secret cards tilt with the pointer, with a holographic sheen. Same contract as SingleCardReveal.
 */
export default function StackReveal({ opening, revealed, onReveal, onComplete }: { opening: OpeningResult; revealed: number; onReveal: (count: number) => void; onComplete: () => void }) {
  const prefs = useCollectorPreferences()
  const { setCinematic } = useOpeningPresentation()
  const [state, setState] = useState<RevealState>({ index: Math.min(revealed, opening.cards.length - 1), faceUp: false, complete: false })
  const [throwing, setThrowing] = useState<0 | -1 | 1>(0)
  const [drag, setDrag] = useState(0)
  const [tilt, setTilt] = useState({ x: 0, y: 0, mx: 50, my: 50 })
  const gesture = useRef<{ x: number; y: number; moved: boolean } | null>(null), lastUp = useRef(0)
  const card = opening.cards[state.index]
  const effect = card ? openingEffect(card) : 'common'
  const motion = prefs.animations && !prefs.reducedEffects
  const speed = prefs.quickOpening ? 150 : prefs.openingSpeed === 'slow' ? 850 : prefs.openingSpeed === 'fast' ? 300 : 550
  useCardPreload(opening.cards, state.index)
  useEffect(() => { setCinematic(true); return () => setCinematic(false) }, [setCinematic])

  function next(direction: -1 | 1 = 1) {
    if (throwing) return
    if (!state.faceUp) { onReveal(state.index + 1); setState(advanceReveal(state, opening.cards.length)); if (SUSPENSE.has(effect) && navigator.vibrate) try { navigator.vibrate(effect === 'rare' ? 20 : [30, 40, 60]) } catch { /* optional */ } return }
    const after = advanceReveal(state, opening.cards.length)
    if (after.complete) { onComplete(); return }
    if (!motion) { setState(after); return }
    setThrowing(direction); setTilt({ x: 0, y: 0, mx: 50, my: 50 })
    setTimeout(() => { setThrowing(0); setDrag(0); setState(after) }, Math.min(360, speed * .7))
  }
  const onDown = (e: PointerEvent) => { gesture.current = { x: e.clientX, y: e.clientY, moved: false }; (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId) }
  const onMove = (e: PointerEvent) => {
    const g = gesture.current, box = (e.currentTarget as HTMLElement).getBoundingClientRect()
    if (g) { const dx = e.clientX - g.x; if (Math.abs(dx) > 8) g.moved = true; if (g.moved) setDrag(dx); return }
    if (state.faceUp && (effect === 'holographic' || effect === 'secret' || effect === 'super') && e.pointerType === 'mouse') {
      const px = (e.clientX - box.left) / box.width, py = (e.clientY - box.top) / box.height
      setTilt({ x: (py - .5) * -14, y: (px - .5) * 18, mx: px * 100, my: py * 100 })
    }
  }
  const onUp = (e: PointerEvent) => {
    const g = gesture.current; gesture.current = null
    if (!g) return
    lastUp.current = Date.now()
    const dx = e.clientX - g.x
    if (g.moved && Math.abs(dx) > 70) next(dx < 0 ? -1 : 1)
    else if (!g.moved) next(1)
    setDrag(0)
  }
  if (!card) return null
  const remaining = opening.cards.length - state.index - 1
  const style = { '--reveal': `${speed}ms`, '--drag': `${drag}px`, '--rx': `${tilt.x}deg`, '--ry': `${tilt.y}deg`, '--mx': `${tilt.mx}%`, '--my': `${tilt.my}%` } as CSSProperties
  return <section className={styles.scene} data-testid="single-card-reveal" data-effect={state.faceUp ? effect : 'common'} data-hint={!state.faceUp && SUSPENSE.has(effect) ? effect : undefined}
    data-animations={motion ? 'on' : 'off'} style={style}>
    <div className={styles.toolbar}>
      <Link className="piece-button secondary !p-2 min-w-11" href={`/boosters?set=${encodeURIComponent(opening.setCode)}`} aria-label="Retour aux boosters"><ChevronLeft size={20} /></Link>
      <div className={styles.dots} aria-hidden="true">{opening.cards.map((c, i) => <i key={i} data-done={i < state.index || (i === state.index && state.faceUp)} data-current={i === state.index} data-effect={i < state.index || (i === state.index && state.faceUp) ? openingEffect(c) : undefined} />)}</div>
      <span aria-live="polite">{state.index + 1} / {opening.cards.length}</span>
      <button type="button" className="piece-button secondary" onClick={onComplete}>Tout révéler</button>
    </div>
    <div className={styles.stage}>
      <div className={styles.aura} aria-hidden="true" />
      {Array.from({ length: Math.min(4, remaining) }, (_, i) => <div key={i} className={styles.pile} style={{ '--p': i + 1 } as CSSProperties} aria-hidden="true" />)}
      <button key={`${opening.id}-${state.index}`} type="button" className={styles.card} data-face-up={state.faceUp} data-throw={throwing || undefined}
        aria-label={state.faceUp ? `Carte suivante après ${card.name}` : `Révéler la carte ${state.index + 1}`}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { gesture.current = null; setDrag(0) }} onPointerLeave={() => setTilt({ x: 0, y: 0, mx: 50, my: 50 })}
        onClick={() => { if (Date.now() - lastUp.current > 400) next(1) }} // programmatic or assistive click (pointer taps are handled on release)
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(1) } }}>
        <span className={styles.inner}>
          <span className={styles.back}><Image draggable={false} src="/images/card-back.jpg" alt="Dos de carte" width={300} height={420} sizes={revealImageSizes} priority /></span>
          <span className={styles.front}>
            <Image draggable={false} src={card.imageUrl || '/images/card-back.jpg'} alt={state.faceUp ? card.name : ''} width={300} height={420} sizes={revealImageSizes} priority
              onError={e => { if (!e.currentTarget.dataset.fallback) { e.currentTarget.dataset.fallback = 'true'; e.currentTarget.srcset = ''; e.currentTarget.src = '/images/card-back.jpg' } }} />
            <span className={styles.sheen} aria-hidden="true" />
          </span>
        </span>
      </button>
      {state.faceUp && motion && SUSPENSE.has(effect) && <div className={styles.burst} aria-hidden="true">{Array.from({ length: effect === 'rare' ? 8 : 18 }, (_, i) => <i key={`${state.index}-${i}`} style={{ '--b': i } as CSSProperties} />)}</div>}
    </div>
    <div className={styles.caption} aria-live="polite">{state.faceUp ? <>
      <h3>{card.name}</h3>
      <p className={styles.badges}><span className={styles.rarity} data-effect={effect}>{card.rarity}{card.drawVariant && card.drawVariant !== 'standard' ? ` · ${VARIANT[card.drawVariant as keyof typeof VARIANT] ?? card.drawVariant}` : ''}</span>
        {card.isNew ? <span className={styles.new}>Nouvelle !</span> : card.isDuplicate ? <span className={styles.dup}>Doublon · {card.quantityBefore} déjà possédée(s)</span> : null}</p>
    </> : <p className={styles.prompt}>{SUSPENSE.has(effect) ? 'Quelque chose brille… touchez pour révéler' : 'Touchez ou glissez la carte pour la révéler'}</p>}</div>
    <button type="button" className={`piece-button ${styles.next}`} onClick={() => next(1)}>{!state.faceUp ? 'Révéler la carte' : state.index + 1 === opening.cards.length ? 'Voir le résultat' : 'Carte suivante'}</button>
  </section>
}
