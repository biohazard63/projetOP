'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight, FastForward, PackageOpen, Sparkles } from 'lucide-react'
import { openingEffect } from '@/lib/boosters/presentation'
import type { OpeningCard, OpeningResult } from '@/lib/boosters/types'
import StackReveal from './StackReveal'
import styles from './BatchOpening.module.css'

// Highest first: the recap shows the best pulls on top.
const RANK = ['MANGA RED', 'MANGA', 'TR', 'SP CARD', 'ALT', 'SEC', 'SR', 'L', 'R', 'UC', 'C']
const LABEL: Record<string, string> = { 'MANGA RED': 'Manga red', MANGA: 'Manga', TR: 'Treasure Rare', 'SP CARD': 'SP', ALT: 'Alternative' }
const tierOf = (card: OpeningCard) => card.drawTier ?? card.rarity.toUpperCase()
const rankOf = (card: OpeningCard) => { const i = RANK.indexOf(tierOf(card)); return i < 0 ? RANK.length : i }
const isHit = (card: OpeningCard) => rankOf(card) <= RANK.indexOf('SR')

/**
 * Several boosters opened at once: each pack is revealed like a single one (fan, then the last two cards), one after
 * the other; "Passer au récapitulatif" skips to the summary of every card, best pulls first, duplicates grouped.
 */
export default function BatchOpening({ openings, onCard, onDetail, onAgain, againLabel, busy, onSummary }: { openings: OpeningResult[]; onSummary: () => void; onCard: (card: OpeningCard) => void; onDetail: (card: OpeningCard) => void; onAgain: () => void; againLabel: string; busy: boolean }) {
  const [index, setIndex] = useState(0)
  const done = index >= openings.length
  const summaryRef = useRef<HTMLElement | null>(null)
  useEffect(() => { if (!done) return; onSummary(); summaryRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }) }, [done, onSummary])
  const summary = useMemo(() => {
    const grouped = new Map<string, { card: OpeningCard; count: number; isNew: boolean }>()
    for (const card of openings.flatMap(o => o.cards)) {
      const entry = grouped.get(card.id)
      if (entry) { entry.count++; entry.isNew ||= Boolean(card.isNew); if (rankOf(card) < rankOf(entry.card)) entry.card = card }
      else grouped.set(card.id, { card, count: 1, isNew: Boolean(card.isNew) })
    }
    return [...grouped.values()].sort((a, b) => rankOf(a.card) - rankOf(b.card) || Number(b.isNew) - Number(a.isNew) || a.card.name.localeCompare(b.card.name))
  }, [openings])
  if (!done) {
    const opening = openings[index]
    return <section className={styles.run} aria-label={`Booster ${index + 1} sur ${openings.length}`}>
      <div className={styles.runBar}>
        <span className={styles.packs} aria-hidden="true">{openings.map((o, i) => <i key={o.id} data-state={i < index ? 'done' : i === index ? 'current' : 'next'} data-hit={i < index && o.cards.some(isHit) ? 'true' : undefined} />)}</span>
        <b aria-live="polite">Booster {index + 1} / {openings.length}</b>
        <button type="button" className="piece-button secondary" onClick={() => setIndex(openings.length)}><FastForward size={16} />Passer au récapitulatif</button>
      </div>
      <StackReveal key={opening.id} opening={opening} revealed={0} onReveal={count => { const card = opening.cards[count - 1]; if (card && count > opening.cards.length - 2) onCard(card) }} onComplete={() => setIndex(i => i + 1)} />
    </section>
  }
  const cards = openings.reduce((n, o) => n + o.cards.length, 0), fresh = summary.filter(s => s.isNew).length
  const hits = summary.filter(s => isHit(s.card)), rest = summary.filter(s => !isHit(s.card))
  const tile = ({ card, count, isNew }: (typeof summary)[number]) => <button key={card.id} type="button" className={styles.tile} data-effect={openingEffect(card)} onClick={() => onDetail(card)} aria-label={`Détails de ${card.name}`}>
    <Image src={card.imageUrl || '/images/card-back.jpg'} alt={card.name} width={200} height={280} sizes="(max-width:640px) 30vw, 150px" />
    {count > 1 && <span className={styles.count}>×{count}</span>}
    {isNew && <span className={styles.new}>Nouvelle</span>}
    <span className={styles.tier}>{LABEL[tierOf(card)] ?? card.rarity}</span>
  </button>
  return <section ref={summaryRef} className={styles.summary} aria-labelledby="batch-title">
    <header className={styles.head}>
      <p className="fx-kicker">{openings[0].setCode} · {openings.length} boosters</p>
      <h2 id="batch-title">Votre butin</h2>
      <div className={styles.stats}><div><strong>{cards}</strong><span>cartes</span></div><div><strong>{fresh}</strong><span>nouvelles</span></div><div><strong>{hits.length}</strong><span>SR et mieux</span></div></div>
    </header>
    {hits.length > 0 && <><h3 className={styles.section}><Sparkles size={18} />Meilleurs tirages</h3><div className={`${styles.grid} ${styles.hits}`}>{hits.map(tile)}</div></>}
    <h3 className={styles.section}>Toutes les autres cartes <small>{rest.length} cartes différentes</small></h3>
    <div className={styles.grid}>{rest.map(tile)}</div>
    <div className={styles.actions}>
      <button type="button" className="piece-button" disabled={busy} onClick={onAgain}><PackageOpen size={18} />{againLabel}</button>
      <Link href="/collection" className="piece-button secondary">Voir ma collection <ChevronRight size={16} /></Link>
    </div>
  </section>
}
