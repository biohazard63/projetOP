'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'

interface BoosterPackAnimationProps {
  onComplete: () => void
  setCode: string
}

export default function BoosterPackAnimation({ onComplete, setCode }: BoosterPackAnimationProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [showCards, setShowCards] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isMobile, setIsMobile] = useState(false)

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
    audioRef.current.volume = 0.5

    // Jouer le son au début de l'animation
    audioRef.current.play().catch(error => {
      console.error('Erreur lors de la lecture du son:', error)
    })

    // Animation du booster qui s'ouvre
    const timer = setTimeout(() => {
      setShowCards(true)
      // Une fois les cartes révélées, on déclenche onComplete
      setTimeout(() => {
        setIsVisible(false)
        onComplete()
      }, 5000)
    }, 1500)

    return () => {
      clearTimeout(timer)
      // Arrêter le son si le composant est démonté
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
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
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 z-50">
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
              className="object-contain"
            />
          </motion.div>

          {/* Animation des cartes qui sortent */}
          <AnimatePresence>
            {showCards && (
              <>
                {[...Array(12)].map((_, index) => {
                  const position = getCardPosition(index)
                  return (
                    <motion.div
                      key={index}
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