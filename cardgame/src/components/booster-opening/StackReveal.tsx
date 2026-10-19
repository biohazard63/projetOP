'use client'
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useOpeningPresentation } from '@/components/collector/OpeningPresentation'
import { useCollectorPreferences } from '@/components/collector/Preferences'
import { LEGENDARY, advanceReveal, openingEffect, type RevealState } from '@/lib/boosters/presentation'
import type { OpeningResult } from '@/lib/boosters/types'
import styles from './StackReveal.module.css'
import { fanImageSizes, revealImageSizes, useCardPreload } from './useCardPreload'

const VARIANT = { alt: 'Alternative', parallel: 'Parallèle', special: 'Spéciale' } as const
const TIER: Record<string, string> = { ALT: 'Alternative', 'LEADER ALT': 'Leader alternatif', 'SP CARD': 'SP', WANTED: 'Wanted', TR: 'Treasure Rare', MANGA: 'Manga', 'CREW ALT': 'Équipage', 'SP SILVER': 'SP argent', 'SUPER LEADER': 'Super Leader', 'SP GOLD': 'SP or', 'MANGA GOLD': 'Manga or', 'MANGA RED': 'Manga red' }
// The last two cards (rare slot and hit slot) are turned one by one; the others are dealt at once in a fan.
const SUSPENSE_CARDS = 2
const SUSPENSE = new Set(['rare', 'super', 'secret', 'holographic', 'manga', 'legendary'])
const TILT = new Set(['holographic', 'secret', 'super', 'manga', 'legendary'])
const HINT: Record<string, string> = { manga: 'Des cases de manga se dessinent… touchez pour révéler', legendary: 'Une lumière légendaire s’échappe… touchez pour révéler' }
// Each collector tier has its own reveal on top of its level: an overlay (rings, coins, stars, speed lines, lightning…)
// and a stamp. The styles live in StackReveal.module.css under .fx[data-tier=…].
const STAMP: Record<string, string> = { ALT: '', 'LEADER ALT': 'LEADER', 'SP CARD': 'SP', WANTED: 'WANTED', TR: 'TREASURE', MANGA: 'ドン！', 'CREW ALT': '☠ ÉQUIPAGE', 'SP SILVER': 'SILVER', 'SUPER LEADER': '👑 SUPER LEADER', 'SP GOLD': 'GOLD', 'MANGA GOLD': 'ドドドド', 'MANGA RED': 'ゴゴゴゴ' }
// Title shown under the card once turned, in the tier's light.
const TITLE: Record<string, string> = { ALT: 'Alternative', 'LEADER ALT': 'Leader alternatif', 'SP CARD': 'Spéciale', WANTED: 'Avis de recherche', TR: 'Trésor', MANGA: 'Manga', 'CREW ALT': 'Équipage', 'SP SILVER': 'Légendaire · argent', 'SUPER LEADER': 'Super Leader', 'SP GOLD': 'Légendaire · or', 'MANGA GOLD': 'Légendaire · manga or', 'MANGA RED': 'Légendaire · manga red' }
// God Pack themes: the Demon pack in purple and blood red, the Manga pack in ink and gold.
const godTheme = (label: string | null | undefined) => /demon/i.test(label ?? '') ? 'demon' : /manga/i.test(label ?? '') ? 'manga' : 'gold'
const PANELS = new Set(['MANGA', 'SUPER LEADER', 'MANGA GOLD', 'MANGA RED'])
const VIBRATE: Record<string, number | number[]> = { rare: 20, manga: [40, 60, 40, 60, 120], legendary: [60, 80, 60, 80, 60, 80, 300] }

/**
 * V2 reveal: the cards wait in a pile. The top card glows with the colour of its rarity before it is turned (rare blue,
 * super rare gold, secret and alternative art rainbow); a tap or a swipe turns it, the next tap or a swipe throws it aside.
 * Alternative and secret cards tilt with the pointer, with a holographic sheen. Same contract as SingleCardReveal.
 * The first cards (all but the last two) are first dealt face up in a fan, in about a second.
 */
export default function StackReveal({ opening, revealed, onReveal, onComplete }: { opening: OpeningResult; revealed: number; onReveal: (count: number) => void; onComplete: () => void }) {
  const prefs = useCollectorPreferences()
  const { setCinematic } = useOpeningPresentation()
  // A God Pack replaces the booster: its own cinematic first, then every card turned one by one, then a recap.
  const godCards = opening.cards.filter(c => c.godPack), isGodPack = godCards.length > 0
  const fanCount = !isGodPack && opening.cards.length > SUSPENSE_CARDS ? opening.cards.length - SUSPENSE_CARDS : 0
  const [godIntro, setGodIntro] = useState(isGodPack && revealed === 0), [godRecap, setGodRecap] = useState(false)
  const [fan, setFan] = useState(revealed < fanCount)
  // The deal starts once the fan images are decoded (or after 2.5 s), otherwise it would play on empty frames.
  const [loaded, setLoaded] = useState(0), [dealReady, setDealReady] = useState(false)
  const [zoom, setZoom] = useState<number | null>(null)
  useEffect(() => {
    if (zoom === null) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setZoom(null); if (e.key === 'ArrowRight') setZoom(z => z === null ? z : Math.min(fanCount - 1, z + 1)); if (e.key === 'ArrowLeft') setZoom(z => z === null ? z : Math.max(0, z - 1)) }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [zoom, fanCount])
  useEffect(() => { if (!fan) return; const t = setTimeout(() => setDealReady(true), 2500); return () => clearTimeout(t) }, [fan])
  useEffect(() => { if (loaded >= fanCount) setDealReady(true) }, [loaded, fanCount])
  const [state, setState] = useState<RevealState>({ index: Math.min(Math.max(revealed, fanCount), opening.cards.length - 1), faceUp: false, complete: false })
  const [throwing, setThrowing] = useState<0 | -1 | 1>(0)
  const [drag, setDrag] = useState(0)
  const [tilt, setTilt] = useState({ x: 0, y: 0, mx: 50, my: 50 })
  const gesture = useRef<{ x: number; y: number; moved: boolean } | null>(null), lastUp = useRef(0)
  const card = opening.cards[state.index]
  const effect = card ? openingEffect(card) : 'common'
  const tone = card?.drawTier ? LEGENDARY[card.drawTier] : undefined, inGodPack = Boolean(card?.godPack)
  const tier = card?.drawTier && card.drawTier in STAMP ? card.drawTier : undefined
  const motion = prefs.animations && !prefs.reducedEffects
  const speed = prefs.quickOpening ? 150 : prefs.openingSpeed === 'slow' ? 850 : prefs.openingSpeed === 'fast' ? 300 : 550
  useCardPreload(opening.cards, state.index)
  useEffect(() => { setCinematic(true); return () => setCinematic(false) }, [setCinematic])

  function next(direction: -1 | 1 = 1) {
    if (throwing) return
    if (!state.faceUp) { onReveal(state.index + 1); setState(advanceReveal(state, opening.cards.length)); if (SUSPENSE.has(effect) && navigator.vibrate) try { navigator.vibrate(VIBRATE[effect] ?? [30, 40, 60]) } catch { /* optional */ } return }
    const after = advanceReveal(state, opening.cards.length)
    if (after.complete) { if (isGodPack && !godRecap) { setGodRecap(true); return } onComplete(); return }
    if (!motion) { setState(after); return }
    setThrowing(direction); setTilt({ x: 0, y: 0, mx: 50, my: 50 })
    setTimeout(() => { setThrowing(0); setDrag(0); setState(after) }, Math.min(360, speed * .7))
  }
  const onDown = (e: PointerEvent) => { gesture.current = { x: e.clientX, y: e.clientY, moved: false }; (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId) }
  const onMove = (e: PointerEvent) => {
    const g = gesture.current, box = (e.currentTarget as HTMLElement).getBoundingClientRect()
    if (g) { const dx = e.clientX - g.x; if (Math.abs(dx) > 8) g.moved = true; if (g.moved) setDrag(dx); return }
    if (state.faceUp && TILT.has(effect) && e.pointerType === 'mouse') {
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
  if (fan) {
    const dealt = opening.cards.slice(0, fanCount), fresh = dealt.filter(c => c.isNew).length
    const go = () => { onReveal(fanCount); setFan(false) }
    return <section className={styles.scene} data-testid="single-card-reveal" data-phase="fan" data-ready={dealReady || undefined} data-animations={motion ? 'on' : 'off'} style={{ '--reveal': `${speed}ms`, '--n': fanCount } as CSSProperties}>
      <div className={styles.toolbar}>
        <Link className="piece-button secondary !p-2 min-w-11" href={`/boosters?set=${encodeURIComponent(opening.setCode)}`} aria-label="Retour aux boosters"><ChevronLeft size={20} /></Link>
        <span aria-live="polite">{fanCount} / {opening.cards.length}</span>
        <button type="button" className="piece-button secondary" onClick={onComplete}>Tout révéler</button>
      </div>
      <div className={styles.fan} aria-label={`${fanCount} premières cartes`}>
        {dealt.map((c, i) => <button type="button" aria-label={`Agrandir ${c.name}`} onClick={() => setZoom(i)} key={`${opening.id}-${i}`} className={styles.fanCard} data-effect={openingEffect(c)} style={{ '--i': i, '--a': `${(i - (fanCount - 1) / 2) * 4.5}deg`, '--y': `${(i - (fanCount - 1) / 2) ** 2 * 1.6}px` } as CSSProperties}>
          <span className={styles.fanInner}>
            <span className={styles.fanBack}><Image draggable={false} src="/images/card-back.jpg" alt="" width={180} height={252} sizes="140px" priority /></span>
            <span className={styles.fanFront}><Image draggable={false} src={c.imageUrl || '/images/card-back.jpg'} alt={c.name} width={180} height={252} sizes={fanImageSizes} priority onLoad={() => setLoaded(n => n + 1)} onError={() => setLoaded(n => n + 1)} /></span>
          </span>
          {c.isNew && <span className={styles.fanNew}>Nouvelle</span>}
        </button>)}
      </div>
      {zoom !== null && dealt[zoom] && <div className={styles.zoom} role="dialog" aria-modal="true" aria-label={dealt[zoom].name} onClick={() => setZoom(null)}>
        <button type="button" className={styles.zoomClose} aria-label="Fermer" onClick={() => setZoom(null)}><X size={22} /></button>
        <button type="button" className={styles.zoomNav} data-side="left" aria-label="Carte précédente" disabled={zoom === 0} onClick={e => { e.stopPropagation(); setZoom(zoom - 1) }}><ChevronLeft size={26} /></button>
        <figure onClick={e => e.stopPropagation()} data-effect={openingEffect(dealt[zoom])}>
          <Image key={zoom} src={dealt[zoom].imageUrl || '/images/card-back.jpg'} alt={dealt[zoom].name} width={600} height={838} sizes="(max-width:640px) 86vw, 420px" />
          <figcaption><b>{dealt[zoom].name}</b><span>{dealt[zoom].rarity}{dealt[zoom].isNew ? ' · Nouvelle !' : dealt[zoom].isDuplicate ? ' · Doublon' : ''}</span><small>{zoom + 1} / {fanCount}</small></figcaption>
        </figure>
        <button type="button" className={styles.zoomNav} data-side="right" aria-label="Carte suivante" disabled={zoom === fanCount - 1} onClick={e => { e.stopPropagation(); setZoom(zoom + 1) }}><ChevronRight size={26} /></button>
      </div>}
      <div className={styles.caption} aria-live="polite"><h3>{fanCount} cartes révélées</h3>
        <p className={styles.badges}>{fresh > 0 ? <span className={styles.new}>{fresh} nouvelle{fresh > 1 ? 's' : ''}</span> : <span className={styles.dup}>Aucune nouvelle carte</span>}</p>
        <p className={styles.prompt}>Il reste {opening.cards.length - fanCount} cartes, dont la carte coup de chance…</p></div>
      <button type="button" className={`piece-button ${styles.next}`} onClick={go}>Découvrir les {opening.cards.length - fanCount} dernières cartes</button>
    </section>
  }
  const theme = godTheme(opening.godPack)
  const confetti = motion && <div className={styles.godConfetti} aria-hidden="true">{Array.from({ length: 28 }, (_, i) => <i key={i} style={{ '--k': i } as CSSProperties} />)}</div>
  if (godRecap) return <section className={styles.scene} data-testid="god-pack-recap" data-god="recap" data-pack={theme} data-animations={motion ? 'on' : 'off'} style={{ '--reveal': `${speed}ms` } as CSSProperties}>
    <div className={styles.godRays} aria-hidden="true" />{confetti}
    <div className={styles.caption}><p className={styles.godKicker}>Récapitulatif exceptionnel</p><h3 className={styles.godTitle}>{opening.godPack ?? 'God Pack'}</h3>
      <p className={styles.badges}><span className={styles.new}>{godCards.filter(c => c.isNew).length} nouvelle(s)</span><span className={styles.dup}>{godCards.length} cartes collector</span></p></div>
    <div className={styles.godGrid}>{godCards.map((c, i) => <figure key={`${opening.id}-god-${i}`} data-effect={openingEffect(c)} data-tone={c.drawTier ? LEGENDARY[c.drawTier] : undefined} style={{ '--i': i } as CSSProperties}>
      <Image src={c.imageUrl || '/images/card-back.jpg'} alt={c.name} width={180} height={252} sizes="(max-width:640px) 30vw, 150px" /><figcaption>{c.name}{c.isNew ? ' · Nouvelle !' : ''}</figcaption></figure>)}</div>
    <button type="button" className={`piece-button ${styles.next}`} onClick={onComplete}>Voir le résultat</button>
  </section>
  if (godIntro) return <section className={styles.scene} data-testid="god-pack-intro" data-god="intro" data-pack={theme} data-animations={motion ? 'on' : 'off'} style={{ '--reveal': `${speed}ms`, '--n': godCards.length } as CSSProperties}>
    <div className={styles.godRays} aria-hidden="true" />
    {motion && <div className={styles.godFlash} aria-hidden="true" />}
    {motion && <div className={styles.godRings} aria-hidden="true">{[0, 1, 2, 3].map(i => <i key={i} style={{ '--k': i } as CSSProperties} />)}</div>}
    {confetti}
    {motion && <div className={styles.burst} aria-hidden="true">{Array.from({ length: 40 }, (_, i) => <i key={i} style={{ '--b': i } as CSSProperties} />)}</div>}
    <div className={styles.godFan} aria-hidden="true">{godCards.map((c, i) => <span key={i} style={{ '--i': i } as CSSProperties} />)}</div>
    <div className={styles.godIntro}><p className={styles.godKicker}>Incroyable !</p><h3 className={styles.godTitle}>GOD PACK</h3><p className={styles.godLabel}>{opening.godPack}</p>
      <p className={styles.prompt}>Ce booster est un paquet exceptionnel de {godCards.length} cartes collector.</p></div>
    <button type="button" className={`piece-button ${styles.next}`} onClick={() => setGodIntro(false)}>Révéler le God Pack</button>
  </section>
  const remaining = opening.cards.length - state.index - 1
  const style = { '--reveal': `${speed}ms`, '--drag': `${drag}px`, '--rx': `${tilt.x}deg`, '--ry': `${tilt.y}deg`, '--mx': `${tilt.mx}%`, '--my': `${tilt.my}%` } as CSSProperties
  return <section className={styles.scene} data-testid="single-card-reveal" data-effect={state.faceUp ? effect : 'common'} data-hint={!state.faceUp && SUSPENSE.has(effect) ? effect : undefined} data-tone={tone} data-god={inGodPack ? 'card' : undefined} data-pack={inGodPack ? theme : undefined} data-tier={state.faceUp ? tier : undefined}
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
      {state.faceUp && motion && tier && <div key={`fx-${state.index}`} className={styles.fx} data-tier={tier} aria-hidden="true">{Array.from({ length: 16 }, (_, i) => <i key={i} style={{ '--k': i } as CSSProperties} />)}{STAMP[tier] && <b>{STAMP[tier]}</b>}</div>}
      {state.faceUp && motion && tier && PANELS.has(tier) && <div data-tier={tier} className={styles.panels} aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <i key={`${state.index}-${i}`} style={{ '--k': i } as CSSProperties} />)}</div>}
      {state.faceUp && motion && (tier || effect === 'legendary') && <div key={`rays-${state.index}`} className={styles.rays} aria-hidden="true" />}
      {state.faceUp && motion && tier && <div key={`flash-${state.index}`} className={styles.flash} aria-hidden="true" />}
      {state.faceUp && motion && SUSPENSE.has(effect) && <div className={styles.burst} aria-hidden="true">{Array.from({ length: tier ? 36 : effect === 'rare' ? 8 : 18 }, (_, i) => <i key={`${state.index}-${i}`} style={{ '--b': i } as CSSProperties} />)}</div>}
    </div>
    <div className={styles.caption} aria-live="polite">{state.faceUp ? <>
      <h3>{card.name}</h3>
      <p className={styles.badges}><span className={styles.rarity} data-effect={effect}>{card.rarity}{card.drawTier && TIER[card.drawTier] ? ` · ${TIER[card.drawTier]}` : !card.drawTier && card.drawVariant && card.drawVariant !== 'standard' ? ` · ${VARIANT[card.drawVariant as keyof typeof VARIANT] ?? card.drawVariant}` : ''}</span>
        {card.isNew ? <span className={styles.new}>Nouvelle !</span> : card.isDuplicate ? <span className={styles.dup}>Doublon · {card.quantityBefore} déjà possédée(s)</span> : null}</p>
      {state.faceUp && tier && <p className={styles.legend} data-tone={tone}>{TITLE[tier]}</p>}
      {state.faceUp && inGodPack && <p className={styles.godCount}>God Pack · carte {state.index + 1} / {opening.cards.length}</p>}
    </> : <p className={styles.prompt}>{HINT[effect] ?? (SUSPENSE.has(effect) ? 'Quelque chose brille… touchez pour révéler' : 'Touchez ou glissez la carte pour la révéler')}</p>}</div>
    <button type="button" className={`piece-button ${styles.next}`} onClick={() => next(1)}>{!state.faceUp ? 'Révéler la carte' : state.index + 1 === opening.cards.length ? 'Voir le résultat' : 'Carte suivante'}</button>
  </section>
}
