'use client'

import { memo, useMemo } from 'react'

interface ProgressIndicatorProps {
  booster: Array<{ id: string; rarity: string }>
  currentCardIndex: number
}

const ProgressIndicator = memo(function ProgressIndicator({
  booster,
  currentCardIndex
}: ProgressIndicatorProps) {
  // Mémoisation des couleurs par rareté
  const rarityColorMap = useMemo(() => ({
    'C': 'bg-white/20',
    'UC': 'bg-green-400',
    'U': 'bg-green-400',
    'R': 'bg-blue-400',
    'SR': 'bg-purple-500',
    'L': 'bg-rose-500',
    'SEC': 'bg-amber-400',
    'SP CARD': 'bg-emerald-400',
    'TR': 'bg-cyan-400',
    'P': 'bg-pink-400'
  }), [])

  // Mémoisation des segments de progression
  const progressSegments = useMemo(() => {
    return Array.from({ length: 12 }).map((_, i) => {
      const card = booster[i]
      const isRevealed = i <= currentCardIndex
      const rarity = card?.rarity ?? 'C'
      const colorClass = isRevealed ? (rarityColorMap[rarity as keyof typeof rarityColorMap] || 'bg-white/40') : 'bg-white/10'
      
      return (
        <div key={`seg-${i}`} className="h-2 rounded-sm overflow-hidden">
          <div className={`h-full w-full rounded-sm ${colorClass}`} />
        </div>
      )
    })
  }, [booster, currentCardIndex, rarityColorMap])

  if (booster.length === 0) return null

  return (
    <div className="sticky top-16 z-30 w-[95%] md:w-[90%] mx-auto mb-6">
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl px-3 py-2 shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/80 text-sm font-medium">Progression</span>
          <span className="text-white text-sm font-bold">{Math.max(0, currentCardIndex + 1)} / {booster.length}</span>
        </div>
        <div className="grid grid-cols-12 gap-1">
          {progressSegments}
        </div>
      </div>
    </div>
  )
})

export default ProgressIndicator
