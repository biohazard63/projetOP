'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef, useMemo } from 'react'
import Image from 'next/image'

interface BoosterPackAnimationProps {
  onComplete: () => void
  setCode: string
}

export default function BoosterPackAnimation({ onComplete, setCode }: Readonly<BoosterPackAnimationProps>) {
  const [isVisible, setIsVisible] = useState(true)
  const [showCards, setShowCards] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const cardIds = useMemo(() => {
    const makeId = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`)
    return Array.from({ length: 12 }, () => makeId())
  }, [])
  const timersRef = useRef<number[]>([])
  const didStartRef = useRef(false)

  useEffect(() => {
    // Vérification de la taille de l'écran
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
    // Initialiser l'audio
    audioRef.current = new Audio('/sounds/ouverture.mp3')
    audioRef.current.preload = 'auto'
    audioRef.current.volume = 0.5

    // Jouer le son au début de l'animation en gérant la promesse
    const audio = audioRef.current
    const playPromise = audio.play()
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          didStartRef.current = true
        })
        .catch((error: unknown) => {
          const errObj = error as { name?: unknown; message?: unknown }
          if (errObj?.name === 'AbortError') return
          if (typeof errObj?.message === 'string' && errObj.message.includes('interrupted by a new load request')) return
          console.error('Erreur lors de la lecture du son:', error)
        })
    }

    // Animation du booster qui s'ouvre
    const t1 = window.setTimeout(() => {
      setShowCards(true)
      // Une fois les cartes révélées, on déclenche onComplete
      const t2 = window.setTimeout(() => {
        setIsVisible(false)
        onComplete()
      }, 5000)
      timersRef.current.push(t2)
    }, 1500)
    timersRef.current.push(t1)

    return () => {
      // Annuler les timers
      for (const t of timersRef.current) {
        window.clearTimeout(t)
      }
      timersRef.current = []
      // Arrêter le son si le composant est démonté
      const audioEl = audioRef.current
      if (audioEl) {
        audioEl.pause()
        audioEl.currentTime = 0
      }
      didStartRef.current = false
    }
  }, [onComplete])

  // Calcul des positions des cartes en fonction de la taille de l'écran
  const getCardPosition = (index: number) => {
    if (isMobile) {
      // Sur mobile, les cartes sont disposées en 2 rangées de 6
      const row = Math.floor(index / 6)
      const col = index % 6
      return {
        x: (col - 2.5) * 40, // Espacement plus serré sur mobile
        y: row * 80 - 50 // Deux rangées sur mobile
      }
    } else {
      // Sur desktop, les cartes sont disposées en une seule rangée
      return {
        x: (index - 6) * 60,
        y: -100
      }
    }
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 z-50" aria-live="polite" aria-label="Animation d'ouverture du booster">
          {/* Animation du booster */}
          <motion.div
            initial={{ scale: 1, rotate: 0 }}
            animate={{ 
              scale: [1, 1.2, 0.8, 1.5],
              rotate: [0, 10, -10, 0],
              y: [0, -50, 0]
            }}
            transition={{ 
              duration: 1.5,
              ease: "easeInOut"
            }}
            className="relative w-48 h-72 md:w-64 md:h-96"
          >
            <Image
              src={`/images/booster/${setCode.toLowerCase()}.png`}
              alt={`Booster Pack ${setCode}`}
              fill
              sizes="(max-width: 768px) 12rem, 16rem"
              priority={false}
              className="object-contain"
            />
          </motion.div>

          {/* Animation des cartes qui sortent */}
          <AnimatePresence>
            {showCards && (
              <>
                {cardIds.map((id, index) => {
                  const position = getCardPosition(index)
                  return (
                    <motion.div
                      key={id}
                      initial={{ 
                        scale: 0,
                        x: 0,
                        y: 0,
                        opacity: 0
                      }}
                      animate={{ 
                        scale: 1,
                        x: position.x,
                        y: position.y,
                        opacity: 1
                      }}
                      exit={{ 
                        scale: 0,
                        opacity: 0
                      }}
                      transition={{ 
                        duration: 0.8,
                        delay: index * 0.25,
                        ease: "easeOut"
                      }}
                      className="absolute w-32 h-44 md:w-48 md:h-64" // Taille adaptative des cartes
                    >
                      <Image
                        src="/images/card-back.jpg"
                        alt="Carte"
                        fill
                        sizes="(max-width: 768px) 8rem, 12rem"
                        priority={false}
                        className="object-contain rounded-xl shadow-2xl"
                      />
                    </motion.div>
                  )
                })}
              </>
            )}
          </AnimatePresence>
        </div>
      )}
    </AnimatePresence>
  )
} 