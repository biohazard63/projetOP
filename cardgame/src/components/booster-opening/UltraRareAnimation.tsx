'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ExtendedCardType } from '@/types/card'
import { Sparkles, Crown, Star } from 'lucide-react'
import { useEffect } from 'react'

interface UltraRareAnimationProps {
  card: ExtendedCardType
  onComplete: () => void
}

export default function UltraRareAnimation({ card, onComplete }: UltraRareAnimationProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete()
    }, 2500) // 2 secondes

    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 overflow-hidden bg-black/80"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Effet de fond dynamique */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 via-amber-500/20 to-orange-500/20"
          animate={{
            backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'linear'
          }}
        />

        {/* Particules dorées */}
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              scale: 0,
              opacity: 0
            }}
            animate={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              scale: [0, 1, 0],
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.1
            }}
          >
            <Star className="w-4 h-4 text-yellow-400" />
          </motion.div>
        ))}

        {/* Carte principale avec conteneur */}
        <motion.div
          className="absolute top-1/3 left-[45%] transform -translate-x-1/2 -translate-y-1/2"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 15
          }}
        >
          <div className="relative">
            {/* Effet de brillance autour de la carte */}
            <motion.div
              className="absolute -inset-4 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-xl blur-xl"
              animate={{
                opacity: [0.5, 0.8, 0.5],
                scale: [1, 1.1, 1]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />

            {/* Effet de halo */}
            <motion.div
              className="absolute -inset-8 bg-gradient-to-r from-yellow-400/30 to-amber-500/30 rounded-xl blur-2xl"
              animate={{
                opacity: [0.3, 0.5, 0.3],
                scale: [1, 1.2, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />
            
            {/* Image de la carte avec effet de brillance */}
            <motion.div
              className="relative z-10"
              animate={{
                boxShadow: [
                  '0 0 20px rgba(234, 179, 8, 0.5)',
                  '0 0 40px rgba(234, 179, 8, 0.8)',
                  '0 0 20px rgba(234, 179, 8, 0.5)'
                ]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            >
              <img
                src={card.imageUrl}
                alt={card.name}
                className="w-64 h-96 object-cover rounded-lg shadow-2xl"
              />
            </motion.div>

            {/* Effet de couronne */}
            <motion.div
              className="absolute -top-8 left-1/2 transform -translate-x-1/2"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Crown className="w-12 h-12 text-yellow-400" />
            </motion.div>

            {/* Texte "ULTRA RARE" */}
            <motion.div
              className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-4 py-2 rounded-full font-bold text-lg shadow-lg"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              ULTRA RARE !
            </motion.div>

            {/* Nom de la carte */}
            <motion.div
              className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 text-center"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <h2 className="text-2xl font-bold text-white drop-shadow-lg">{card.name}</h2>
              <p className="text-lg text-yellow-400 mt-1">{card.type}</p>
            </motion.div>
          </div>
        </motion.div>

        {/* Effet de flash initial */}
        <motion.div
          className="absolute inset-0 bg-white"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        />
      </motion.div>
    </AnimatePresence>
  )
} 