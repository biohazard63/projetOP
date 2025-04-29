'use client'

import { motion } from 'framer-motion'
import { ExtendedCardType } from '@/types/card'
import { Star } from 'lucide-react'

interface RareCardEffectProps {
  card: ExtendedCardType
}

export default function RareCardEffect({ card }: RareCardEffectProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 pointer-events-none z-50"
    >
      {/* Fond lumineux */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ 
          opacity: [0, 0.8, 0.4],
          scale: [0.8, 1.2, 1]
        }}
        transition={{ 
          duration: 2,
          repeat: Infinity,
          repeatType: "reverse"
        }}
        className="absolute inset-0 bg-gradient-conic from-purple-600 via-pink-600 to-purple-600 blur-3xl"
      />

      {/* Cercles concentriques */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-purple-500"
          initial={{ width: '100px', height: '100px', opacity: 0 }}
          animate={{
            width: ['100px', '800px'],
            height: ['100px', '800px'],
            opacity: [0.8, 0],
            scale: [1, 1.5]
          }}
          transition={{
            duration: 3,
            delay: i * 0.4,
            repeat: Infinity,
            ease: "easeOut"
          }}
        />
      ))}

      {/* Étoiles flottantes */}
      {Array.from({ length: 30 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          initial={{ 
            x: '50%',
            y: '50%',
            scale: 0
          }}
          animate={{ 
            x: `${Math.random() * 100}%`,
            y: `${Math.random() * 100}%`,
            scale: [0, 1, 0],
            rotate: [0, 360]
          }}
          transition={{ 
            duration: 2 + Math.random() * 2,
            repeat: Infinity,
            repeatType: "reverse",
            delay: Math.random() * 2
          }}
        >
          <Star className="w-6 h-6 text-purple-400" />
        </motion.div>
      ))}

      {/* Texte animé */}
      <motion.div
        className="absolute top-4 left-1/2 transform -translate-x-1/2 text-center z-50"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <motion.h2
          className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600"
          animate={{
            scale: [1, 1.1, 1],
            filter: [
              'brightness(1) blur(0px)',
              'brightness(1.2) blur(2px)',
              'brightness(1) blur(0px)'
            ]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse"
          }}
        >
          CARTE RARE !
        </motion.h2>
      </motion.div>

      {/* Effet de brillance radiale */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[600px] aspect-square"
        initial={{ opacity: 0 }}
        animate={{ 
          opacity: [0, 0.5, 0],
          rotate: [0, 360]
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "linear"
        }}
        style={{
          background: 'radial-gradient(circle, rgba(168,85,247,0.4) 0%, rgba(168,85,247,0) 70%)'
        }}
      />
    </motion.div>
  )
} 