'use client'
import type { CollectorOverview } from '@/lib/collector/types'
import { useEffect, useState } from 'react'

// Cosmetic pirate ranks from the share of the catalogue owned (presentation only).
export const RANKS = [{ at: 0, name: 'Mousse' }, { at: 10, name: 'Matelot' }, { at: 25, name: 'Pirate' }, { at: 45, name: 'Officier' }, { at: 65, name: 'Capitaine' }, { at: 85, name: 'Empereur' }, { at: 100, name: 'Roi des pirates' }]
export function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setValue(target); return }
    let frame = 0; const start = performance.now()
    const tick = (now: number) => { const t = Math.min(1, (now - start) / duration); setValue(Math.round(target * (1 - Math.pow(1 - t, 3)))); if (t < 1) frame = requestAnimationFrame(tick) }
    frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame)
  }, [target, duration])
  return value
}
export function Counter({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  const shown = useCountUp(value)
  return <div className={`cx-counter${accent ? ' accent' : ''}`}><strong>{shown.toLocaleString('fr-FR')}</strong><span>{label}</span></div>
}
export function Ring({ value, size = 140, stroke = 12 }: { value: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r
  const [drawn, setDrawn] = useState(0)
  useEffect(() => { const t = requestAnimationFrame(() => setDrawn(value)); return () => cancelAnimationFrame(t) }, [value])
  return <svg className="cx-ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
    <defs><linearGradient id={`cx-ring-${size}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffe08a" /><stop offset=".55" stopColor="#f0a93a" /><stop offset="1" stopColor="#ff7be5" /></linearGradient></defs>
    <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity=".12" strokeWidth={stroke} />
    <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#cx-ring-${size})`} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - drawn / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)' }} />
  </svg>
}

/** Current pirate rank, the next one and how many unique cards are still needed to reach it. */
export function rankOf(percentage: number, catalogue: number, unique: number) {
  const index = RANKS.findLastIndex(r => percentage >= r.at), rank = RANKS[index], next = RANKS[index + 1]
  return { rank, next, toNext: next ? Math.max(0, Math.ceil(catalogue * next.at / 100) - unique) : 0 }
}

/** Cosmetic achievements derived from the player's existing statistics (no new rule, no stored state). */
export function badgesOf(stats: CollectorOverview) {
  return [
    { name: 'Premier booster', hint: 'Ouvrir un booster', done: stats.openings >= 1 },
    { name: 'Habitué des boosters', hint: '10 boosters ouverts', done: stats.openings >= 10 },
    { name: 'Grand explorateur', hint: '50 boosters ouverts', done: stats.openings >= 50 },
    { name: 'Stratège', hint: 'Créer un deck', done: stats.decks >= 1 },
    { name: 'Amiral de flotte', hint: '10 decks créés', done: stats.decks >= 10 },
    { name: 'Collectionneur', hint: '25 % du catalogue', done: stats.percentage >= 25 },
    { name: 'Archiviste', hint: '50 % du catalogue', done: stats.percentage >= 50 },
    { name: 'Chasseur d’alternatives', hint: '100 variantes spéciales', done: stats.ownedAlternatives >= 100 },
  ]
}

/** Cosmetic bounty in berries, from the collection (presentation only, nothing is stored or spent). */
export function bountyOf(stats: CollectorOverview) {
  return stats.unique * 10_000 + stats.ownedAlternatives * 50_000 + stats.openings * 25_000 + stats.decks * 100_000
}
