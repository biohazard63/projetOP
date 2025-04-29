'use client'

import { motion } from 'framer-motion'
import { ExtendedCardType } from '@/types/card'
import { Crown } from 'lucide-react'

interface UltraRareEffectProps {
  card: ExtendedCardType
}

export default function UltraRareEffect({ card }: UltraRareEffectProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 pointer-events-none z-50"
    >
      {/* Fond lumineux doré */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ 
          opacity: [0, 0.9, 0.5],
          scale: [0.8, 1.2, 1]
        }}
        transition={{ 
          duration: 2,
          repeat: Infinity,
          repeatType: "reverse"
        }}
        className="absolute inset-0 bg-gradient-conic from-yellow-400 via-amber-500 to-yellow-400 blur-3xl"
      />

      {/* Cercles dorés concentriques */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-yellow-400"
          initial={{ width: '100px', height: '100px', opacity: 0 }}
          animate={{
            width: ['100px', '1000px'],
            height: ['100px', '1000px'],
            opacity: [0.8, 0],
            scale: [1, 1.5]
          }}
          transition={{
            duration: 4,
            delay: i * 0.3,
            repeat: Infinity,
            ease: "easeOut"
          }}
        />
      ))}

      {/* Couronnes flottantes */}
      {Array.from({ length: 40 }).map((_, i) => (
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
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            repeatType: "reverse",
            delay: Math.random() * 2
          }}
        >
          <Crown className="w-8 h-8 text-yellow-400" />
        </motion.div>
      ))}

      {/* Texte ULTRA RARE animé */}
      <motion.div
        className="absolute top-4 left-1/2 transform -translate-x-1/2 text-center z-50"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <motion.h2
          className="text-5xl md:text-7xl font-bold"
          animate={{
            scale: [1, 1.2, 1],
            filter: [
              'brightness(1) blur(0px)',
              'brightness(1.5) blur(4px)',
              'brightness(1) blur(0px)'
            ]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse"
          }}
        >
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400">
            ULTRA RARE !
          </span>
        </motion.h2>
      </motion.div>

      {/* Effet de rayons dorés */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[800px] aspect-square"
        initial={{ opacity: 0 }}
        animate={{ 
          opacity: [0, 0.7, 0],
          rotate: [0, 360]
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "linear"
        }}
        style={{
          background: 'radial-gradient(circle, rgba(251,191,36,0.6) 0%, rgba(251,191,36,0) 70%)'
        }}
      />

      {/* Vagues dorées */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute inset-0 overflow-hidden"
          style={{
            transform: `rotate(${120 * i}deg)`
          }}
        >
          <motion.div
            className="absolute w-[200%] h-[200%] top-[-50%] left-[-50%]"
            initial={{ backgroundPosition: '0% 0%' }}
            animate={{ backgroundPosition: ['0% 0%', '100% 100%'] }}
            transition={{
              duration: 3,
              delay: i * 0.5,
              repeat: Infinity,
              ease: "linear"
            }}
            style={{
              background: 'linear-gradient(45deg, rgba(251,191,36,0.3) 0%, rgba(251,191,36,0) 80%)',
              backgroundSize: '200% 200%'
            }}
          />
        </motion.div>
      ))}

      {/* Éclats de lumière */}
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={`spark-${i}`}
          className="absolute w-1 h-12 bg-gradient-to-t from-transparent via-yellow-400 to-transparent"
          initial={{
            top: '50%',
            left: '50%',
            scale: 0,
            rotate: `${(360 / 20) * i}deg`,
            transformOrigin: '0 0'
          }}
          animate={{
            scale: [0, 1.5, 0],
            opacity: [0, 0.8, 0]
          }}
          transition={{
            duration: 2,
            delay: i * 0.1,
            repeat: Infinity,
            repeatType: "reverse"
          }}
        />
      ))}
    </motion.div>
  )
} 