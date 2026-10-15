'use client'
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, Scissors } from 'lucide-react'
import PackArt from './PackArt'
import { useCollectorPreferences } from '@/components/collector/Preferences'
import { useOpeningPresentation } from '@/components/collector/OpeningPresentation'
import { animationDuration } from '@/lib/boosters/presentation'
import styles from './TearOpening.module.css'

/**
 * V2 opening: the player tears the top of the packet along its seam by dragging across it (finger or mouse), or with the
 * button / Enter. A light burst follows, the torn strip flies away and the cards rise from the packet as a pile.
 * Presentation only: the opening is already confirmed by the server before this scene starts.
 */
export default function TearOpening({ imageUrl, setName, cardCount, onComplete, onTear, returnHref = '/boosters' }: { returnHref?: string; imageUrl: string | null; setName: string; cardCount: number; onComplete: () => void; onTear?: () => void }) {
  const { setCinematic } = useOpeningPresentation()
  useEffect(() => { setCinematic(true); return () => setCinematic(false) }, [setCinematic])
  const settings = useCollectorPreferences()
  const duration = animationDuration(settings.openingSpeed, settings.quickOpening)
  const [reduced, setReduced] = useState<boolean | null>(null)
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState<'ready' | 'burst' | 'rise'>('ready')
  const drag = useRef<{ x: number; width: number; from: number } | null>(null)
  const packRef = useRef<HTMLDivElement>(null)
  const complete = useRef(onComplete)
  useEffect(() => { complete.current = onComplete }, [onComplete])
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(media.matches)
    update(); media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  // Without animations (preference or system setting) the scene ends at once, as before.
  useEffect(() => {
    if (reduced === null) return
    if (reduced || !settings.animations) { const t = setTimeout(() => complete.current(), 0); return () => clearTimeout(t) }
  }, [reduced, settings.animations])
  useEffect(() => {
    if (phase === 'ready') return
    const burst = Math.min(520, duration * .18), rise = Math.max(900, duration * .55)
    const timers = phase === 'burst' ? [setTimeout(() => setPhase('rise'), burst)] : [setTimeout(() => complete.current(), rise)]
    return () => timers.forEach(clearTimeout)
  }, [phase, duration])
  const tear = () => { if (phase === 'ready') { setProgress(1); setPhase('burst'); onTear?.(); if (navigator.vibrate) try { navigator.vibrate(30) } catch { /* optional */ } } }
  const onDown = (e: PointerEvent) => { if (phase !== 'ready') return; drag.current = { x: e.clientX, width: packRef.current?.clientWidth ?? 240, from: progress }; (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId) }
  const onMove = (e: PointerEvent) => {
    const d = drag.current; if (!d) return
    const next = Math.min(1, Math.max(d.from, d.from + Math.abs(e.clientX - d.x) / (d.width * .95)))
    setProgress(next); if (next >= 1) { drag.current = null; tear() }
  }
  const onUp = () => { const d = drag.current; drag.current = null; if (d && progress >= .7) tear() }
  const cards = Math.min(6, Math.max(1, cardCount))
  return <div data-testid="pack-animation" className={styles.scene} data-phase={phase} data-reduced={settings.reducedEffects || undefined} aria-label="Cinématique d’ouverture"
    style={{ '--tear': progress, '--rise': `${Math.max(900, duration * .55)}ms` } as CSSProperties} onDragStart={e => e.preventDefault()}
    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tear() } }}>
    <Link href={returnHref} className={styles.back} aria-label="Retour aux boosters"><ChevronLeft size={22} /></Link>
    <div className={styles.rays} aria-hidden="true" /><div className={styles.halo} aria-hidden="true" />
    <div ref={packRef} className={styles.pack} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} role="button" tabIndex={0}
      aria-label={phase === 'ready' ? 'Glissez le long du haut du paquet pour le déchirer' : 'Paquet ouvert'} onClick={() => { if (progress < .05) tear() }}>
      <div className={styles.body}><PackArt src={imageUrl} alt={`Booster ${setName}`} eager /></div>
      <div className={styles.strip} aria-hidden="true"><PackArt src={imageUrl} alt="" eager /></div>
      <div className={styles.seam} aria-hidden="true"><i /></div>
      <div className={styles.cards} aria-hidden="true">{Array.from({ length: cards }, (_, i) => <span key={i} style={{ '--i': i } as CSSProperties}><Image src="/images/card-back.jpg" alt="" width={120} height={168} /></span>)}</div>
    </div>
    <div className={styles.flash} aria-hidden="true" />
    {!settings.reducedEffects && <div className={styles.sparks} aria-hidden="true">{Array.from({ length: 22 }, (_, i) => <i key={i} style={{ '--s': i } as CSSProperties} />)}</div>}
    <div className={styles.caption}>
      <p className="piece-eyebrow">{setName}</p>
      {phase === 'ready' ? <>
        <p className={styles.hint}><span className={styles.finger} aria-hidden="true" />Glissez le long du haut du paquet pour le déchirer</p>
        <div className={styles.actions}><button type="button" className="piece-button" onClick={tear}><Scissors size={16} />Déchirer le paquet</button><button type="button" className="piece-button secondary" onClick={() => complete.current()}>Passer l’animation</button></div>
      </> : <p aria-live="polite" className={styles.status}>{phase === 'burst' ? 'Le paquet s’ouvre…' : `${cardCount} cartes vous attendent`}</p>}
    </div>
  </div>
}
