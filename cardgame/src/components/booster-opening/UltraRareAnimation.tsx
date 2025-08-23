'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useAudio } from '@/hooks/useAudio'
import { ExtendedCardType } from '@/types/card'
import Image from 'next/image'
import { Sparkles, Star } from 'lucide-react'

interface UltraRareAnimationProps {
  card: ExtendedCardType
  onComplete: () => void
}

export default function UltraRareAnimation({ card, onComplete }: Readonly<UltraRareAnimationProps>) {
  const [isVisible, setIsVisible] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const { playUltraRareSound } = useAudio()
  const hasPlayedSound = useRef(false)
  const reduceMotionRef = useRef(false)
  const timersRef = useRef<number[]>([])
  const [showPulse, setShowPulse] = useState(false)

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
    try {
      reduceMotionRef.current = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
    } catch { /* no-op */ }

    if (!hasPlayedSound.current) {
      playUltraRareSound()
      hasPlayedSound.current = true
    }

    if (reduceMotionRef.current) {
      setIsVisible(false)
      onComplete()
      return
    }

    const tPulse = window.setTimeout(() => setShowPulse(true), 200)
    const tEnd = window.setTimeout(() => {
      setIsVisible(false)
      onComplete()
    }, 2600)
    timersRef.current.push(tPulse, tEnd)

    return () => {
      for (const t of timersRef.current) window.clearTimeout(t)
      timersRef.current = []
    }
  }, [onComplete, playUltraRareSound])

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

  const particleIds = useMemo(() => {
    const len = isMobile ? 15 : 20
    const makeId = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`)
    return Array.from({ length: len }, () => makeId())
  }, [isMobile])

  const textParticleKeys = useMemo(() => ['p0','p1','p2','p3','p4','p5','p6','p7'], [])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 overflow-hidden bg-black/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={skip}
        >
          {/* Effet de fond dynamique */}
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/15 via-amber-500/15 to-orange-500/15" />

          {/* Particules dorées */}
          {particleIds.map((id, i) => (
            <motion.div
              key={id}
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
              <Star className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-yellow-400`} />
            </motion.div>
          ))}

          {/* Carte principale avec conteneur */}
          <motion.div
            className={`absolute ${isMobile ? 'top-1/3' : 'top-1/2'} ${isMobile ? 'left-1/3' : 'left-1/2'} transform -translate-x-1/2 -translate-y-1/2`}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 15
            }}
          >
             {/* Texte "ULTRA RARE" */}
             <motion.div
                className="absolute z-50   transform -translate-x-1/2"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <div className="relative">
                  {/* Effet de brillance derrière le texte */}
                  <motion.div
                    className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full blur-lg"
                    animate={{
                      opacity: [0.5, 0.8, 0.5],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                  
                  {/* Texte principal */}
                  <motion.div
                    className="relative bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-6 py-3 rounded-full font-bold shadow-lg"
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
                      ease: "easeInOut"
                    }}
                  >
                    <span className={`${isMobile ? 'text-sm' : 'text-lg'} tracking-wider`}>
                      UR!
                    </span>
                  </motion.div>

                  {/* Effet de particules autour du texte */}
                  {textParticleKeys.map((key, i) => (
                    <motion.div
                      key={key}
                      className="absolute w-1 h-1 bg-yellow-400 rounded-full"
                      initial={{
                        x: '50%',
                        y: '50%',
                        scale: 0
                      }}
                      animate={{
                        x: `${Math.cos(i * (Math.PI / 4)) * 30}px`,
                        y: `${Math.sin(i * (Math.PI / 4)) * 30}px`,
                        scale: [0, 1, 0],
                        opacity: [0, 1, 0]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.1
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            <div className="relative">
              {/* Effet de brillance autour de la carte */}
              <motion.div
                className={`absolute ${isMobile ? '-inset-2' : '-inset-4'} bg-gradient-to-r from-yellow-400 to-amber-500 rounded-xl blur-xl`}
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
                className={`absolute ${isMobile ? '-inset-4' : '-inset-8'} bg-gradient-to-r from-yellow-400/30 to-amber-500/30 rounded-xl blur-2xl`}
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

              {/* Anneau lumineux pulsant + flash */}
              {showPulse && (
                <>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: [0, 0.85, 0], scale: [0.8, 1.35, 1.6] }}
                    transition={{ duration: 0.9, ease: 'easeOut' }}
                    className="absolute inset-0 rounded-xl pointer-events-none"
                    style={{ boxShadow: '0 0 0 2px rgba(250,204,21,.55), 0 0 70px rgba(250,204,21,.35) inset' }}
                  />
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.6, 0] }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 bg-white/40 mix-blend-overlay"
                  />
                </>
              )}
              
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
                <div className={`${isMobile ? 'w-[220px] h-[294px]' : 'w-[340px] h-[454px]'} relative`}>
                  <Image
                    src={card.imageUrl}
                    alt={card.name}
                    fill
                    sizes="(max-width: 640px) 220px, (max-width: 1024px) 300px, 340px"
                    className="object-cover rounded-lg shadow-2xl"
                    priority={false}
                  />
                </div>
              </motion.div>

              {/* Effet décoratif */}
              <motion.div
                className="absolute -top-8 left-[10%] transform -translate-x-1/2"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Sparkles className={`${isMobile ? 'w-8 h-8' : 'w-12 h-12'} text-yellow-400`} />
              </motion.div>

             

              {/* Nom de la carte */}
              <motion.div
                className={`absolute ${isMobile ? '-bottom-12' : '-bottom-16'} left-1/2 transform -translate-x-1/2 text-center`}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <h2 className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-white drop-shadow-lg`}>{card.name}</h2>
                <p className={`${isMobile ? 'text-sm' : 'text-lg'} text-yellow-400 mt-1`}>{card.type}</p>
              </motion.div>
            </div>
          </motion.div>

          {/* Bouton passer */}
          <button onClick={skip} className="absolute bottom-6 right-6 bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-3 py-1.5 rounded-lg border border-white/20 backdrop-blur-md">
            Passer
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
} 