'use client'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { useOpeningPresentation } from '@/components/collector/OpeningPresentation'
import { useCollectorPreferences } from '@/components/collector/Preferences'
import { advanceReveal, openingEffect, type RevealState } from '@/lib/boosters/presentation'
import type { OpeningResult } from '@/lib/boosters/types'
import styles from './SingleCardReveal.module.css'
import { revealImageSizes, useCardPreload } from './useCardPreload'
export default function SingleCardReveal({ opening, revealed, onReveal, onComplete }: { opening: OpeningResult; revealed: number; onReveal: (count: number) => void; onComplete: () => void }) {
  const prefs = useCollectorPreferences()
  const { setCinematic } = useOpeningPresentation()
  const [state, setState] = useState<RevealState>({ index: Math.min(revealed, opening.cards.length - 1), faceUp: false, complete: false })
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const noClick = useRef(false)
  const card = opening.cards[state.index]
  useCardPreload(opening.cards, state.index)
  useEffect(() => { setCinematic(true); return () => setCinematic(false) }, [setCinematic])
  function next() {
    const nextState = advanceReveal(state, opening.cards.length)
    if (!state.faceUp) onReveal(state.index + 1)
    if (nextState.complete) onComplete()
    else setState(nextState)
  }
  if (!card) return null
  return <section className={styles.scene} data-testid="single-card-reveal" data-effect={state.faceUp ? openingEffect(card) : 'common'} data-animations={prefs.animations && !prefs.reducedEffects ? 'on' : 'off'} style={{ '--reveal-duration': prefs.quickOpening ? '150ms' : prefs.openingSpeed === 'slow' ? '850ms' : prefs.openingSpeed === 'fast' ? '300ms' : '550ms' } as React.CSSProperties}>
    <div className={styles.toolbar}><Link className="piece-button secondary !p-2 min-w-11" href={`/boosters?set=${encodeURIComponent(opening.setCode)}`} aria-label="Retour aux boosters"><ChevronLeft size={20} /></Link><span aria-live="polite">{state.index + 1} / {opening.cards.length}</span><button type="button" className="piece-button secondary" onClick={onComplete}>Tout révéler</button></div>
    <div className={styles.stage} onPointerDown={e => { swipe.current = { x: e.clientX, y: e.clientY }; noClick.current = false }} onPointerCancel={() => { swipe.current = null }} onPointerUp={e => { const start = swipe.current; swipe.current = null; if (start && Math.abs(e.clientX - start.x) > 55 && Math.abs(e.clientY - start.y) < 40) { noClick.current = true; next() } }}>
      {state.faceUp && prefs.animations && !prefs.reducedEffects && openingEffect(card) !== 'common' && <div className={styles.particles} aria-hidden="true">{Array.from({length: openingEffect(card) === 'uncommon' ? 4 : 10}, (_, i) => <i key={`${state.index}-${i}`} style={{ '--particle': i } as React.CSSProperties} />)}</div>}
      <div className={styles.stack} aria-hidden="true" />
      <button key={`${opening.id}-${state.index}`} type="button" className={styles.card} data-face-up={state.faceUp} aria-label={state.faceUp ? `Carte suivante après ${card.name}` : `Révéler la carte ${state.index + 1}`} onClick={() => { if (noClick.current) { noClick.current = false; return } next() }}>
        <Image draggable={false} src={state.faceUp ? card.imageUrl || '/images/card-back.jpg' : '/images/card-back.jpg'} alt={state.faceUp ? card.name : 'Dos de carte'} width={300} height={420} sizes={revealImageSizes} priority onError={e => { if (!e.currentTarget.dataset.fallback) { e.currentTarget.dataset.fallback = 'true'; e.currentTarget.srcset = ''; e.currentTarget.src = '/images/card-back.jpg' } }} />
      </button>
    </div>
    <div className={styles.caption} aria-live="polite">{state.faceUp ? <><h3>{card.name}</h3><p>{card.rarity}{card.drawVariant && card.drawVariant !== 'standard' ? ` · ${ { alt: 'Alternative', parallel: 'Parallèle', special: 'Spéciale' }[card.drawVariant] }` : ''}</p><p>{card.isNew ? 'Nouvelle carte !' : card.isDuplicate ? `Doublon · ${card.quantityBefore} déjà possédée(s)` : 'Carte de votre historique'}</p></> : <p>Touchez la carte pour la révéler</p>}</div>
    <button type="button" className="piece-button" onClick={next}>{!state.faceUp ? 'Révéler la carte' : state.index + 1 === opening.cards.length ? 'Voir le résultat' : 'Carte suivante'}</button>
  </section>
}
