'use client'

import { Button } from '@/components/ui/button'
import { Package, Sparkles } from 'lucide-react'
import { memo } from 'react'

interface BoosterControlsProps {
  selectedSet: string
  isLoading: boolean
  boosterLength: number
  performanceMode: boolean

  onSelectBooster: () => void
  onTogglePerformanceMode: () => void
  onOpenBooster: () => void
  onResetAndOpenNewBooster: () => void
}

const BoosterControls = memo(function BoosterControls({
  selectedSet,
  isLoading,
  boosterLength,
  performanceMode,

  onSelectBooster,
  onTogglePerformanceMode,
  onOpenBooster,
  onResetAndOpenNewBooster
}: BoosterControlsProps) {
  return (
    <div className="hidden md:flex flex-row justify-center items-center gap-4 mb-8">
      <Button 
        onClick={onSelectBooster}
        aria-label="Choisir un booster"
        className="w-full sm:w-auto btn-crystal hover:brightness-110 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105"
      >
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          <span>Choisir un booster</span>
        </div>
      </Button>

      {/* Bouton mode performance */}
      <Button
        onClick={onTogglePerformanceMode}
        aria-label={performanceMode ? "Désactiver le mode performance" : "Activer le mode performance"}
        className={`w-auto px-4 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 ${
          performanceMode 
            ? 'bg-green-600 hover:bg-green-700 text-white' 
            : 'bg-amber-600 hover:bg-amber-700 text-white'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{performanceMode ? "⚡" : "🌿"}</span>
          <span className="text-sm font-medium">{performanceMode ? "Normal" : "Éco"}</span>
        </div>
      </Button>

      {boosterLength === 0 ? (
        <Button 
          onClick={onOpenBooster}
          aria-label="Ouvrir le booster"
          disabled={!selectedSet || isLoading}
          className="w-full sm:w-auto btn-gold btn-gold-glow hover:brightness-110 text-black font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin"></div>
              <span>Chargement...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <span>Ouvrir le booster</span>
            </div>
          )}
        </Button>
      ) : (
        <Button 
          onClick={onResetAndOpenNewBooster}
          aria-label="Ouvrir un nouveau booster"
          disabled={!selectedSet || isLoading}
          className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin"></div>
              <span>Chargement...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <span>Nouveau booster</span>
            </div>
          )}
        </Button>
      )}
    </div>
  )
})

export default BoosterControls
