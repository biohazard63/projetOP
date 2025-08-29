'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef, useMemo } from 'react'
import Image from 'next/image'

interface BoosterPackAnimationProps {
  onComplete: () => void
  setCode: string
  performanceMode?: boolean
}

export default function BoosterPackAnimation({ onComplete, setCode, performanceMode = false }: Readonly<BoosterPackAnimationProps>) {
  const [isVisible, setIsVisible] = useState(true)
  const [showCards, setShowCards] = useState(false)
  const [showTear, setShowTear] = useState(false)
  const [showPulse, setShowPulse] = useState(false)
  const [showFlash, setShowFlash] = useState(false)
  // Audio supprimé pour simplifier
  const [isMobile, setIsMobile] = useState(false)
  const reduceMotionRef = useRef(false)
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
    // Préférence utilisateur: réduire les animations
    try {
      reduceMotionRef.current = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
    } catch { /* no-op */ }

    if (reduceMotionRef.current) {
      // Pas d'animation: on termine immédiatement
      setIsVisible(false)
      onComplete()
      return
    }

    // Audio supprimé pour simplifier

    // Timeline mobile-first: déchirure -> cartes -> fin
    const tTear = window.setTimeout(() => {
      setShowTear(true)
      setShowPulse(true)
      setShowFlash(true)
      const tFlash = window.setTimeout(() => setShowFlash(false), 250) // Rallongé
      timersRef.current.push(tFlash)
    }, 1200) // Rallongé
    const tCards = window.setTimeout(() => setShowCards(true), 2200) // Rallongé
    // Durées et délais pour une sortie plus progressive (plus long)
    const perCardDelay = 0.3 // s - Rallongé
    const perCardDuration = 0.9 // s - Rallongé
    const extraTail = 1.5 // s de marge après la dernière carte - Rallongé
    const endMs = 2200 + ((cardIds.length - 1) * perCardDelay + perCardDuration + extraTail) * 1000
    const tEnd = window.setTimeout(() => {
      setIsVisible(false)
      onComplete()
    }, endMs)
    timersRef.current.push(tTear, tCards, tEnd)

    return () => {
      // Annuler les timers
      for (const t of timersRef.current) {
        window.clearTimeout(t)
      }
      timersRef.current = []
      // Audio supprimé pour simplifier
      didStartRef.current = false
    }
  }, [onComplete, isMobile])

  // Permettre de passer l'animation (tap/clic/Echap)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        skip()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const skip = () => {
    // stop timers
    for (const t of timersRef.current) window.clearTimeout(t)
    timersRef.current = []
    // finish
    setIsVisible(false)
    onComplete()
    // Audio supprimé pour simplifier
  }

  // Calcul des positions des cartes en fonction de la taille de l'écran
  const getCardPosition = (index: number) => {
    // Disposition en éventail (arc) centrée sur le pack
    const total = cardIds.length
    const i = index - (total - 1) / 2
    const radius = isMobile ? 110 : 150
    const spread = isMobile ? Math.PI / 1.6 : Math.PI / 1.8
    const angle = (i / ((total - 1) / 2)) * (spread / 2)
    const x = Math.sin(angle) * radius
    const y = -Math.cos(angle) * (radius * 0.6)
    const rotate = (angle * 180) / Math.PI * 0.35 // légère inclinaison
    const depthScale = 1 - Math.abs(i) * 0.03
    const zIndex = 100 - Math.abs(Math.round(i))
    return { x, y, rotate, scale: depthScale, zIndex }
  }

  return (
    <AnimatePresence >
      {isVisible && (
        <div className="fixed  inset-0 flex items-center justify-center bg-black/75 z-[9999]" aria-live="polite" aria-label="Animation d'ouverture du booster" onClick={skip} >
          {/* Animation du booster */}
          <motion.div
            initial={{ scale: 1, rotate: 0 }}
            animate={{ 
              scale: [1, 1.1],
              rotate: [0, 4],
              y: [0, -24]
            }}
            transition={{ 
              duration: 3.2,
              ease: "easeInOut"
            }}
            className="relative w-48 h-72 md:w-64 md:h-96 will-change-transform"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Micro-secousse à la déchirure */}
            <motion.div
              className="absolute inset-0"
              animate={showTear ? { x: [0, -2], y: [0, -1], rotate: [0, -1.2] } : {}}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
            {/* Halo doré */}
            <div className="absolute -inset-6 pointer-events-none" style={{ background: 'radial-gradient(120px 80px at 50% 60%, rgba(255,215,0,.45), transparent 70%)', filter: 'blur(6px)' }} />
            <Image
              src={`/images/booster/${setCode.toLowerCase()}.png`}
              alt={`Booster Pack ${setCode}`}
              fill
              sizes="(max-width: 768px) 12rem, 16rem"
              priority={false}
              className="object-contain"
            />
            {/* Effet déchirure */}
            {showTear && (
              <>
                <div className="tear-left" />
                <div className="tear-right" />
              </>
            )}
            {/* Pulse lumineux (anneau) */}
            {showPulse && (
              <>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: [0, 0.9], scale: [0.8, 1.35] }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  className="absolute inset-0 rounded-2xl pointer-events-none"
                  style={{ boxShadow: '0 0 0 2px rgba(250,204,21,.45), 0 0 60px rgba(250,204,21,.35) inset' }}
                />
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.8] }}
                  transition={{ duration: 0.25 }}
                  className="absolute inset-0 bg-white/50 mix-blend-overlay"
                />
              </>
            )}
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
                        opacity: 0,
                        rotate: 0
                      }}
                      animate={{ 
                        scale: position.scale,
                        x: position.x,
                        y: position.y,
                        opacity: 1,
                        rotate: position.rotate
                      }}
                      exit={{ 
                        scale: 0,
                        opacity: 0
                      }}
                      transition={{ 
                        duration: 0.7,
                        delay: index * 0.18 + (Math.random() * 0.06),
                        ease: "easeOut"
                      }}
                      className="absolute w-32 h-44 md:w-48 md:h-64 will-change-transform"
                      style={{ zIndex: position.zIndex, boxShadow: '0 10px 24px rgba(0,0,0,0.35)' }}
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
                {/* Particules dorées */}
                {Array.from({ length: 14 }).map((_, i) => (
                  <div key={`gp-${i}`} className="gold-particle" style={{ left: `${45 + (i%6)*3}%`, animationDelay: `${i * 0.08}s` }} />
                ))}
              </>
            )}
          </AnimatePresence>

          {/* Flash directionnel court */}
          {showFlash && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.9, 0] }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              style={{
                background: 'radial-gradient(200px 120px at 60% 40%, rgba(255,255,255,.8), rgba(255,255,255,0) 70%)'
              }}
            />
          )}

          {/* Bouton Passer */}
          <button onClick={skip} className="absolute bottom-6 right-6 bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-3 py-1.5 rounded-lg border border-white/20 backdrop-blur-md">
            Passer
          </button>
        </div>
      )}
    </AnimatePresence>
  )
} 