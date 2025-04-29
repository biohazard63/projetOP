'use client'

import { motion } from 'framer-motion'
import { ExtendedCardType } from '@/types/card'
import { Sparkles } from 'lucide-react'

interface AltArtEffectProps {
  card: ExtendedCardType
}

export default function AltArtEffect({ card }: AltArtEffectProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 pointer-events-none z-50"
    >
      {/* Fond lumineux cyan */}
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
        className="absolute inset-0 bg-gradient-conic from-cyan-400 via-blue-500 to-cyan-400 blur-3xl"
      />

      {/* Anneaux énergétiques */}
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: '100px',
            height: '100px',
            border: '2px solid rgba(6, 182, 212, 0.5)',
            borderRadius: '50%',
            transform: `rotate(${45 * i}deg)`
          }}
        >
          <motion.div
            className="absolute inset-0"
            animate={{
              rotate: [0, 360],
              scale: [1, 2, 1],
              opacity: [0.8, 0]
            }}
            transition={{
              duration: 3,
              delay: i * 0.4,
              repeat: Infinity,
              ease: "linear"
            }}
            style={{
              border: '2px solid rgba(6, 182, 212, 0.5)',
              borderRadius: '50%'
            }}
          />
        </motion.div>
      ))}

      {/* Étincelles flottantes */}
      {Array.from({ length: 35 }).map((_, i) => (
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
          <Sparkles className="w-6 h-6 text-cyan-400" />
        </motion.div>
      ))}

      {/* Texte ALTERNATIVE animé */}
      <motion.div
        className="absolute top-4 left-1/2 transform -translate-x-1/2 text-center z-50"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <motion.h2
          className="text-4xl md:text-6xl font-bold"
          animate={{
            scale: [1, 1.1, 1],
            filter: [
              'brightness(1) blur(0px)',
              'brightness(1.3) blur(3px)',
              'brightness(1) blur(0px)'
            ]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse"
          }}
        >
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400">
            ALTERNATIVE !
          </span>
        </motion.h2>
      </motion.div>

      {/* Vagues d'énergie */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute inset-0 overflow-hidden opacity-30"
          style={{
            transform: `rotate(${120 * i}deg)`
          }}
        >
          <motion.div
            className="absolute w-[200%] h-[200%] top-[-50%] left-[-50%]"
            animate={{
              y: ['0%', '100%']
            }}
            transition={{
              duration: 4,
              delay: i * 0.5,
              repeat: Infinity,
              ease: "linear"
            }}
            style={{
              background: 'linear-gradient(0deg, transparent 0%, cyan 50%, transparent 100%)',
              backgroundSize: '100% 200%'
            }}
          />
        </motion.div>
      ))}

      {/* Lignes d'énergie */}
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={`line-${i}`}
          className="absolute top-1/2 left-1/2 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
          style={{
            width: '100%',
            transformOrigin: 'center',
            transform: `rotate(${(360 / 12) * i}deg)`
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 0.5, 0],
            scale: [0, 1, 0]
          }}
          transition={{
            duration: 2,
            delay: i * 0.1,
            repeat: Infinity
          }}
        />
      ))}

      {/* Effet de pulsation */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[600px] aspect-square"
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{
          background: 'radial-gradient(circle, rgba(6,182,212,0.3) 0%, rgba(6,182,212,0) 70%)'
        }}
      />
    </motion.div>
  )
} 