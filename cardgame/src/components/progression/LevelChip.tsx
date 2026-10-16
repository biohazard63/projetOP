'use client'
import Link from 'next/link'
import type { CSSProperties } from 'react'
import { useProgress } from './ProgressProvider'

/** Account level of the top bar: the level in a ring filled up to the next level. */
export function LevelChip() {
  const { progress } = useProgress()
  if (!progress) return null
  const a = progress.account
  return <Link href="/profile#progression" className="piece-level" style={{ '--p': `${Math.round(a.progress * 100)}%` } as CSSProperties}
    aria-label={`Niveau ${a.level}, ${a.title} : ${a.xp - a.from} sur ${a.to - a.from} XP vers le niveau suivant`} title={`${a.title} · ${(a.xp - a.from).toLocaleString('fr-FR')} / ${(a.to - a.from).toLocaleString('fr-FR')} XP`}>
    <span className="piece-level-ring"><b>{a.level}</b></span>
  </Link>
}
