'use client'

import { motion } from 'framer-motion'
import { ExtendedCardType } from '@/types/card'
import { X, Heart } from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

interface CardDetailsModalProps {
  card: ExtendedCardType
  onClose: () => void
  getRarityColor: (rarity: string) => string
  getRarityGlow: (rarity: string) => string
}

export default function CardDetailsModal({ 
  card, 
  onClose,
  getRarityColor,
  getRarityGlow
}: CardDetailsModalProps) {
  const [isFavorite, setIsFavorite] = useState(false)
  const [lastClickTime, setLastClickTime] = useState(0)

  const handleClick = () => {
    const currentTime = new Date().getTime()
    const timeDiff = currentTime - lastClickTime
    
    if (timeDiff < 300) { // Double-clic détecté (moins de 300ms entre les clics)
      onClose()
    }
    
    setLastClickTime(currentTime)
  }

  useEffect(() => {
    // Vérifier si la carte est dans les favoris
    const checkFavorite = async () => {
      try {
        const response = await fetch(`/api/user/favorites/${card.id}`)
        const data = await response.json()
        setIsFavorite(data.isFavorite)
      } catch (error) {
        console.error('Erreur lors de la vérification des favoris:', error)
      }
    }
    checkFavorite()
  }, [card.id])

  const toggleFavorite = async () => {
    try {
      const response = await fetch('/api/user/favorites', {
        method: isFavorite ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cardId: card.id }),
      })

      const data = await response.json()
      
      if (data.success) {
        setIsFavorite(!isFavorite)
        toast.success(isFavorite ? 'Carte retirée des favoris' : 'Carte ajoutée aux favoris')
      } else {
        toast.error('Erreur lors de la modification des favoris')
      }
    } catch (error) {
      console.error('Erreur lors de la modification des favoris:', error)
      toast.error('Erreur lors de la modification des favoris')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center z-50 p-4 overflow-y-auto"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClick} />
      
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="relative bg-gray-900 rounded-xl overflow-hidden shadow-2xl max-w-2xl w-full my-8"
      >
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <button 
            onClick={toggleFavorite}
            className={`p-2 rounded-full transition-colors ${
              isFavorite 
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400' 
                : 'bg-gray-800/50 hover:bg-gray-700/50 text-gray-300'
            }`}
          >
            <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
          <button 
            onClick={onClose}
            className="p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="flex flex-col md:flex-row max-h-[80vh] overflow-y-auto">
          <div className="w-full md:w-1/2 p-6 flex items-center justify-center">
            <div className={`relative rounded-lg overflow-hidden ${getRarityGlow(card.rarity)}`}>
              <img 
                src={card.imageUrl} 
                alt={card.name} 
                className="w-full h-auto"
              />
            </div>
          </div>
          
          <div className="w-full md:w-1/2 p-6">
            <h2 className="text-2xl font-bold mb-2">{card.name}</h2>
            {card.counter && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-400 mb-1">Contre</h3>
                <p className="text-sm">{card.counter}</p>
              </div>
            )}
            {card.effect && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-400 mb-1">Effet</h3>
                <p className="text-sm">{card.effect}</p>
              </div>
            )}
            {card.trigger && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-400 mb-1">Trigger</h3>
                <p className="text-sm">{card.trigger}</p>
              </div>
            )}
          
            <div className="mt-auto pt-4 border-t border-gray-800">
              <p className="text-xs text-gray-500">
                ID: {card.id}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
} 