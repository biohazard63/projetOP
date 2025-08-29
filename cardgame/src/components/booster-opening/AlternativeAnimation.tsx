'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
// Audio supprimé pour simplifier
import { ExtendedCardType } from '@/types/card'
import Image from 'next/image'
import { Sparkles } from 'lucide-react'

interface UltraRareAnimationProps {
  card: ExtendedCardType
  onComplete: () => void
  performanceMode?: boolean
}

export default function UltraRareAnimation({ card, onComplete, performanceMode = false }: Readonly<UltraRareAnimationProps>) {
  const [isVisible, setIsVisible] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const timersRef = useRef<number[]>([])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => {
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  useEffect(() => {
    // Durée rallongée pour une meilleure expérience
    const duration = performanceMode ? 2600 : 3100
    const tEnd = window.setTimeout(() => {
      setIsVisible(false)
      onComplete()
    }, duration)
    timersRef.current.push(tEnd)

    return () => {
      for (const t of timersRef.current) window.clearTimeout(t)
      timersRef.current = []
    }
  }, [onComplete, performanceMode])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') skip() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const skip = () => {
    for (const t of timersRef.current) window.clearTimeout(t)
    timersRef.current = []
    setIsVisible(false)
    onComplete()
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={skip}
        >
          {/* Conteneur principal centré */}
          <div 
            className="relative flex flex-col items-center justify-center w-full h-full"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%'
            }}
          >
            
            {/* Badge avec la vraie rareté */}
            <motion.div
              className="mb-4"
              initial={{ scale: 0, y: -20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ duration: 0.4, type: 'spring' }}
            >
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 rounded-full font-bold shadow-lg">
                <span className="text-lg tracking-wider">{card.rarity}</span>
              </div>
            </motion.div>

            {/* Carte avec effet simple */}
            <motion.div
              className="relative"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.3 }}
            >
              {/* Effet de brillance simple */}
              <motion.div
                className="absolute -inset-2 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-xl blur-md"
                animate={{
                  opacity: [0.3, 0.6, 0.3]
                }}
                transition={{
                  duration: 2.0,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              />

              {/* Image de la carte */}
              <div className={`relative z-10 ${isMobile ? 'w-[200px] h-[267px]' : 'w-[280px] h-[373px]'}`}>
                <Image
                  src={card.imageUrl}
                  alt={card.name}
                  fill
                  sizes="(max-width: 640px) 200px, 280px"
                  className="object-cover rounded-lg shadow-xl"
                  priority={false}
                />
              </div>

              {/* Étoile simple */}
              <motion.div
                className="absolute -top-4 -right-4"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <Sparkles className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} text-emerald-400`} />
              </motion.div>
            </motion.div>

            {/* Nom de la carte */}
            <motion.div
              className="mt-4 text-center"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.6 }}
            >
              <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-white drop-shadow-lg`}>
                {card.name}
              </h2>
              <p className={`${isMobile ? 'text-sm' : 'text-base'} text-emerald-300 mt-1`}>
                {card.type}
              </p>
            </motion.div>
          </div>

          {/* Bouton passer */}
          <button 
            onClick={skip} 
            className="absolute bottom-4 right-4 bg-white/20 hover:bg-white/30 text-white text-sm font-medium px-3 py-2 rounded-lg backdrop-blur-sm transition-colors"
          >
            Passer
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
} 