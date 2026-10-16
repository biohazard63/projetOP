'use client'
import type { CSSProperties } from 'react'
import Image from 'next/image'
import { Crown, Lock, Sparkles, Trophy } from 'lucide-react'
import { useProgress } from './ProgressProvider'
import { levelReward } from '@/lib/progression/config'
import type { ProgressView } from '@/lib/progression/service'

const CATEGORY: Record<string, string> = { openings: 'Ouvertures', collection: 'Collection', battles: 'Combats', loyalty: 'Fidélité' }
type Badge = ProgressView['badges'][number]

// Illustrated medals (public/images/badges/<badge>-<rank>.webp, from scripts/badges/extract-badge-art.ts).
const ART = new Set(['collectionneur'])

/** A medal coloured by rank (bronze → légende) with the level number; the illustrated medal when the badge has one. */
export function Medal({ badge, size = 54 }: { badge: Pick<Badge, 'rank' | 'label' | 'level'> & { id?: string }; size?: number }) {
  const numeral = badge.label.split(' ')[1] ?? ''
  if (badge.id && ART.has(badge.id)) return <span className={`pg-art${badge.level ? '' : ' locked'}`} style={{ '--s': `${size * 1.5}px` } as CSSProperties} aria-hidden="true">
    <Image src={`/images/badges/${badge.id}-${badge.rank ?? 'bronze'}.webp`} alt="" width={320} height={320} sizes={`${Math.round(size * 1.5)}px`} />
    {badge.level ? numeral && <b>{numeral}</b> : <Lock size={size * .3} />}
  </span>
  return <span className="pg-medal" data-rank={badge.rank ?? 'none'} style={{ '--s': `${size}px` } as CSSProperties} aria-hidden="true">
    {badge.level ? (badge.rank === 'legend' ? <Crown size={size * .42} /> : <b>{numeral}</b>) : <Lock size={size * .34} />}
  </span>
}

function BadgeCard({ b }: { b: Badge }) {
  const span = b.next !== null ? b.next - b.from : 1, done = b.next !== null ? Math.min(1, Math.max(0, (b.value - b.from) / span)) : 1
  return <li className={`pg-badge${b.level ? '' : ' locked'}`}>
    <Medal badge={b} />
    <div className="pg-badge-body">
      <b>{b.name}</b><span className="pg-badge-rank">{b.label}</span>
      <div className="pg-bar" aria-hidden="true"><i style={{ width: `${done * 100}%` }} /></div>
      <small>{b.max ? `Légende atteinte · titre « ${b.legendTitle} »` : `${b.value.toLocaleString('fr-FR')} / ${b.next!.toLocaleString('fr-FR')} ${b.unit} · ${b.nextLabel} +${b.nextReward!.toLocaleString('fr-FR')} ฿`}</small>
    </div>
  </li>
}

/** Account level, tiered badges by category and secret badges (profile). */
export default function ProgressionPanel() {
  const { progress } = useProgress()
  if (!progress) return <section id="progression" className="pf-section pg-panel" aria-busy="true"><h2><Trophy size={20} /> Progression</h2><p className="pg-muted">Chargement de votre progression…</p></section>
  const a = progress.account, next = a.level + 1
  const unlockedSecrets = progress.secrets.filter(s => s.unlocked).length
  return <section id="progression" className="pf-section pg-panel" data-reveal>
    <h2><Trophy size={20} /> Progression</h2>
    <div className="pg-account">
      <span className="pg-account-ring" style={{ '--p': `${a.progress * 100}%` } as CSSProperties}><b>{a.level}</b><small>niveau</small></span>
      <div className="pg-account-text">
        <p className="pg-account-title">{a.title}</p>
        <div className="pg-bar big" aria-label={`${a.xp - a.from} sur ${a.to - a.from} XP`}><i style={{ width: `${a.progress * 100}%` }} /></div>
        <small>{a.level >= 100 ? 'Niveau maximum atteint' : `${(a.xp - a.from).toLocaleString('fr-FR')} / ${(a.to - a.from).toLocaleString('fr-FR')} XP · niveau ${next} : +${levelReward(next).toLocaleString('fr-FR')} ฿${next % 10 === 0 ? ' (une display !)' : ''}`}</small>
        {a.titles.length > 0 && <p className="pg-titles">{a.titles.map(t => <span key={t}><Sparkles size={12} /> {t}</span>)}</p>}
      </div>
    </div>
    {Object.entries(CATEGORY).map(([id, label]) => <div key={id} className="pg-group">
      <h3>{label}</h3>
      <ul className="pg-badges">{progress.badges.filter(b => b.category === id).map(b => <BadgeCard key={b.id} b={b} />)}</ul>
    </div>)}
    <div className="pg-group">
      <h3>Badges secrets <small>{unlockedSecrets} / {progress.secrets.length}</small></h3>
      <ul className="pg-secrets">{progress.secrets.map(s => <li key={s.id} className={s.unlocked ? 'on' : ''} title={s.unlocked ? s.hint : 'Continuez à jouer pour le découvrir'}>
        <span>{s.unlocked ? <Sparkles size={18} /> : <Lock size={16} />}</span><b>{s.name}</b>{s.unlocked && <small>{s.hint}</small>}</li>)}</ul>
    </div>
  </section>
}
