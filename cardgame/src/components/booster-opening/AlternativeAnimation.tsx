'use client'

import { motion } from 'framer-motion'
import { ExtendedCardType } from '@/types/card'
import { Sparkles } from 'lucide-react'

interface AlternativeAnimationProps {
  card: ExtendedCardType
  onComplete: () => void
}

export default function AlternativeAnimation({ card, onComplete }: AlternativeAnimationProps) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="relative w-full max-w-md p-8 rounded-lg shadow-2xl overflow-hidden"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.5 }}
      >
        {/* Effet de fond Alternative */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-tr from-green-400 to-blue-500 opacity-30"
          animate={{
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />

        {/* Contenu principal */}
        <div className="relative z-10 text-center">
          <motion.div
            className="text-4xl font-bold mb-4"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            CARTE ALTERNATIVE !
          </motion.div>

          <motion.div
            className="text-xl mb-6"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {card.name}
          </motion.div>

          <motion.div
            className="flex justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.6 }}
          >
            <Sparkles className="w-12 h-12 text-yellow-400" />
          </motion.div>
        </div>

        {/* Bouton pour fermer */}
        <motion.button
          className="absolute top-4 right-4 text-white hover:text-yellow-400 transition-colors"
          onClick={onComplete}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          ✕
        </motion.button>
      </motion.div>
    </motion.div>
  )
} 