'use client'

import { Button } from '@/components/ui/button'
import { memo } from 'react'

interface MobileActionBarProps {
  selectedSet: string
  isLoading: boolean
  boosterLength: number
  onSelectBooster: () => void
  onOpenBooster: () => void
  onResetAndOpenNewBooster: () => void
  soundsEnabled: boolean
  onToggleSounds: () => void
}

const MobileActionBar = memo(function MobileActionBar({
  selectedSet,
  isLoading,
  boosterLength,
  onSelectBooster,
  onOpenBooster,
  onResetAndOpenNewBooster,
  soundsEnabled,
  onToggleSounds
}: MobileActionBarProps) {
  return (
    <div className="md:hidden fixed bottom-4 inset-x-4 z-40">
      <div className="rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 p-3 flex gap-3 shadow-2xl pb-[env(safe-area-inset-bottom)]">
        <Button
          onClick={onToggleSounds}
          aria-label="Activer le son des boosters"
          variant="outline"
          className={`px-4 rounded-xl transition-all ${soundsEnabled ? 'bg-emerald-600/20 border-emerald-400/40 text-emerald-200' : 'bg-white/10 border-white/10 text-white/80'}`}
          title="Activer le son des boosters"
        >
          {soundsEnabled ? 'Son: ON' : 'Son: OFF'}
        </Button>
        <Button 
          onClick={onSelectBooster}
          aria-label="Choisir un booster"
          className="flex-1 btn-crystal hover:brightness-110 text-white font-bold py-3 px-4 rounded-xl transition-all"
        >
          Choisir
        </Button>

        {boosterLength === 0 ? (
          <Button
            onClick={onOpenBooster}
            aria-label="Ouvrir le booster"
            disabled={!selectedSet || isLoading}
            className="flex-1 btn-gold btn-gold-glow hover:brightness-110 text-black font-bold py-3 px-4 rounded-xl transition-all"
          >
            {isLoading ? '...' : 'Ouvrir'}
          </Button>
        ) : (
          <Button
            onClick={onResetAndOpenNewBooster}
            aria-label="Ouvrir un nouveau booster"
            disabled={!selectedSet || isLoading}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all"
          >
            {isLoading ? '...' : 'Nouveau'}
          </Button>
        )}
      </div>
    </div>
  )
})

export default MobileActionBar
