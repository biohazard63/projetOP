'use client'

import { motion } from 'framer-motion'
import { ExtendedCardType } from '@/types/card'
import { X } from 'lucide-react'

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
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="relative bg-gray-900 rounded-xl overflow-hidden shadow-2xl max-w-2xl w-full"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-black/50 rounded-full p-1 text-white hover:bg-black/70 transition-colors"
        >
          <X size={20} />
        </button>
        
        <div className="flex flex-col md:flex-row">
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
            
            <div className="flex gap-2 mb-4">
              <span className={`px-2 py-1 rounded text-xs font-bold ${getRarityColor(card.rarity)}`}>
                {card.rarity}
              </span>
              {card.isAltArt && (
                <span className="px-2 py-1 rounded text-xs font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                  ALT
                </span>
              )}
              {card.isParallel && (
                <span className="px-2 py-1 rounded text-xs font-bold bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                  PAR
                </span>
              )}
            </div>
            
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-400 mb-1">Type</h3>
              <p>{card.type}</p>
            </div>
            
            {card.description && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-400 mb-1">Description</h3>
                <p className="text-sm">{card.description}</p>
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