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
            initial={{ scale: 1, rotate: 0, y: 0 }}
            animate={{ 
              scale: [1, 1.12],
              rotate: [0, 3],
              y: [0, -22]
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
              animate={showTear ? { x: [0, -2], y: [0, -1], rotate: [0, -1.5] } : {}}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
            {/* Halo revisité: grande image du booster (presque la taille du halo) */}
            <motion.div
              className="absolute pointer-events-none"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: [0, 0.55, 0.45], scale: [0.9, 1.12, 1.06] }}
              transition={{ duration: 1.6, ease: 'easeOut' }}
              style={{
                inset: '-12%',
                WebkitMaskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 85%)',
                maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 85%)',
                filter: 'blur(6px) saturate(1.05)'
              }}
            >
              <Image
                src={`/images/booster/${setCode.toLowerCase()}.png`}
                alt={`Booster Pack ${setCode} Halo`}
                fill
                sizes="(max-width: 768px) 18rem, 22rem"
                priority={false}
                className="object-contain"
                style={{ opacity: 0.55 }}
              />
            </motion.div>
            {/* Léger glow doré sous-jacent, très subtil */}
            <div
              className="absolute pointer-events-none"
              style={{
                inset: '-10%',
                background: 'radial-gradient(160px 110px at 50% 60%, rgba(255,215,0,.18), transparent 80%)',
                filter: 'blur(10px)'
              }}
            />
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
                        scale: [0, position.scale * 1.05, position.scale],
                        x: position.x,
                        y: position.y,
                        opacity: [0, 1],
                        rotate: position.rotate
                      }}
                      exit={{ 
                        scale: 0,
                        opacity: 0
                      }}
                      transition={{ 
                        duration: 0.75,
                        delay: index * 0.12 + (Math.random() * 0.06),
                        ease: "easeOut",
                        times: [0, 0.6, 1]
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
                {/* Particules dorées améliorées */}
                {Array.from({ length: 20 }).map((_, i) => (
                  <div 
                    key={`gp-${i}`} 
                    className="gold-particle" 
                    style={{ 
                      left: `${40 + (i%8)*2.5}%`, 
                      animationDelay: `${i * 0.06}s`,
                      width: `${6 + (i % 3) * 2}px`,
                      height: `${6 + (i % 3) * 2}px`,
                      background: i % 3 === 0 ? '#facc15' : i % 3 === 1 ? '#fbbf24' : '#f59e0b'
                    }} 
                  />
                ))}
              </>
            )}
          </AnimatePresence>

          {/* Flash directionnel amélioré */}
          {showFlash && (
            <>
              <motion.div
                className="absolute inset-0 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.9, 0.3, 0] }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                style={{
                  background: 'radial-gradient(250px 150px at 60% 40%, rgba(255,255,255,.9), rgba(255,255,255,0.6) 30%, rgba(255,255,255,0) 70%)'
                }}
              />
              <motion.div
                className="absolute inset-0 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.6, 0] }}
                transition={{ duration: 0.3, ease: 'easeOut', delay: 0.1 }}
                style={{
                  background: 'radial-gradient(180px 100px at 50% 50%, rgba(255,215,0,.8), rgba(255,165,0,.4) 40%, transparent 70%)'
                }}
              />
            </>
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
