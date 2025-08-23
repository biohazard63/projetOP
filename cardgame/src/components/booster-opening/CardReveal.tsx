'use client'

import { motion, useMotionValue, useTransform } from 'framer-motion'
import type { TargetAndTransition } from 'framer-motion'
import { useState, useEffect, useCallback } from 'react'
import { ExtendedCardType } from '@/types/card'
import Image from 'next/image'
import type { PanInfo } from 'framer-motion'

type DragDirection = 'left' | 'right' | null

interface CardRevealProps {
  card: ExtendedCardType
  isNewCard?: boolean
  onComplete?: () => void
  onCardClick?: (card: ExtendedCardType) => void
  onDragStart?: () => void
  onDrag?: (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void
  onDragEnd?: (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void
  position?: number
  isMobile?: boolean
}

export default function CardReveal({ 
  card, 
  isNewCard = false, 
  // onComplete,
  onCardClick,
  onDragStart,
  onDrag,
  onDragEnd,
  position,
  isMobile = false
}: Readonly<CardRevealProps>) {
  const [isRevealed, setIsRevealed] = useState(false)
  const [dragDirection, setDragDirection] = useState<DragDirection>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [shimmer, setShimmer] = useState(false)

  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-30, 30])
  const opacity = useTransform(x, [-200, 0, 200], [0.5, 1, 0.5])

  // Nouvelle logique de détection des raretés + garde par position
  const rarityRankMap: Record<string, number> = { C: 1, UC: 2, U: 2, R: 3, SR: 4, L: 5, SEC: 6, 'SP CARD': 7, TR: 8, P: 9 }
  const rank = rarityRankMap[card.rarity] ?? 0
  const isHighRarity = rank >= 4 // SR et plus

  const hasP1 = card.id.endsWith('_p1')
  const hasP2 = card.id.endsWith('_p2')
  const hasP3Plus = /_p[3-9]/.test(card.id)

  const isUltraRareRaw = (
    (card.rarity === 'SR' && hasP1) ||
    (hasP3Plus && isHighRarity) ||
    ['SEC', 'SP CARD', 'TR', 'P', 'L'].includes(card.rarity)
  )
  const isAlternativeRaw = hasP1 && isHighRarity && !isUltraRareRaw
  const isRareRaw = (hasP2 && isHighRarity) ||
                   (card.rarity === 'SR' && !hasP1 && !hasP3Plus)

  // Autoriser les highlights uniquement si position >= 10 ou si la rareté n'est pas C/UC
  const highlightAllowed = (position ?? 1) >= 10 || (card.rarity !== 'C' && card.rarity !== 'UC')
  const isUltraRare = highlightAllowed && isUltraRareRaw
  const isAlternative = highlightAllowed && isAlternativeRaw
  const isRare = highlightAllowed && isRareRaw

  // Variantes d'apparition selon la rareté
  const revealVariant = isUltraRare ? 'secret' : isRare || isAlternative ? 'rare' : 'common'
  type RevealKey = 'common' | 'rare' | 'secret'
  const appearanceTargets: Record<RevealKey, TargetAndTransition> = {
    common: { opacity: [0, 1], y: [20, 0], scale: [0.96, 1], transition: { duration: 0.35 } },
    rare: {
      opacity: [0, 1], y: [24, 0], scale: [0.95, 1],
      transition: { duration: 0.5 }
    },
    secret: {
      opacity: [0, 1], y: [28, 0], scale: [0.94, 1],
      boxShadow: ['0 0 0 rgba(0,0,0,0)', '0 0 50px rgba(250,204,21,.45)', '0 0 0 rgba(0,0,0,0)'],
      transition: { duration: 0.6 }
    }
  }

  useEffect(() => {
    setIsRevealed(false)
    const t1 = window.setTimeout(() => {
      setIsRevealed(true)
    }, 420)
    // Sécurité: si pour une raison quelconque le 1er timer est annulé, forcer après 1.2s
    const t2 = window.setTimeout(() => {
      setIsRevealed(true)
    }, 1200)
    return () => { window.clearTimeout(t1); window.clearTimeout(t2) }
  }, [card.id])

  // Déclenche le shimmer quand la carte se révèle
  useEffect(() => {
    if (!isRevealed) return
    setShimmer(true)
    const to = window.setTimeout(() => setShimmer(false), 700)
    return () => window.clearTimeout(to)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRevealed])

  // Pas d'effet: on anime directement via la prop animate

  const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false)
    const threshold = isMobile ? 60 : 100
    
    console.log('CardReveal - Fin du glissement:', {
      offsetX: info.offset.x,
      threshold,
      isDragging
    })
    
    // Si le swipe est suffisamment important, on navigue
    if (Math.abs(info.offset.x) > threshold) {
      if (info.offset.x > threshold) {
        // Swipe vers la droite -> carte précédente
        console.log('CardReveal - Swipe vers la droite détecté')
        onDragEnd?.(event, info)
      } else if (info.offset.x < -threshold) {
        // Swipe vers la gauche -> carte suivante
        console.log('CardReveal - Swipe vers la gauche détecté')
        onDragEnd?.(event, info)
      }
    } else {
      // Si le swipe est trop petit, on considère que c'est un clic
      console.log('CardReveal - Swipe insuffisant, considéré comme un clic')
      onCardClick?.(card)
      x.set(0)
    }
  }, [onDragEnd, onCardClick, card, isDragging, isMobile, x])
  
  const handleDragStart = useCallback(() => {
    console.log('CardReveal - Début du glissement')
    setIsDragging(true)
    setDragDirection(null)
    onDragStart?.()
  }, [onDragStart])
  
  const handleDrag = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    console.log('CardReveal - Glissement en cours:', {
      offsetX: info.offset.x,
      isDragging
    })

    if (info.offset.x > 0) {
      setDragDirection('right')
    } else if (info.offset.x < 0) {
      setDragDirection('left')
    }

    onDrag?.(event, info)
  }, [isDragging, onDrag])

  return (
    <div className="relative flex items-center justify-center min-h-[360px] sm:min-h-[420px] md:min-h-[500px]">
    

      {/* Carte */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={isMobile ? 0.9 : 0.7}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        dragMomentum={false}
        dragDirectionLock
        style={{ 
          x, 
          rotate, 
          opacity,
          transformStyle: 'preserve-3d',
          rotateY: isRevealed ? 180 : 0,
          cursor: isDragging ? 'grabbing' : 'pointer',
          touchAction: 'pan-y pinch-zoom',
          marginBottom: '2rem'
        }}
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={appearanceTargets[revealVariant]}
        className="relative aspect-[3/4] w-[220px] sm:w-[260px] md:w-[300px] lg:w-[340px] xl:w-[380px]"
        onClick={(e) => {
          // On ne gère le clic que si on n'est pas en train de glisser
          if (!isDragging) {
            e.stopPropagation();
            onCardClick?.(card);
          }
        }}
      >
        {/* Effets spéciaux */}
        {isRare && !isUltraRare && (
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, .6, 0] }}
            transition={{ duration: 0.8, delay: 0.15 }}
            style={{ background: 'radial-gradient(280px 160px at 50% 50%, rgba(147, 197, 253,.25), transparent 70%)' }}
          />
        )}
        {isUltraRare && (
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, .9, 0] }}
            transition={{ duration: 0.9, delay: 0.1 }}
            style={{ background: 'radial-gradient(300px 180px at 50% 50%, rgba(250,204,21,.35), transparent 70%)' }}
          />
        )}
        {/* Indicateurs de swipe */}
        {isDragging && (
          <>
            <motion.div
              className="absolute left-0 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-r-lg"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: dragDirection === 'right' ? 1 : 0, x: dragDirection === 'right' ? 0 : -20 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </motion.div>
            <motion.div
              className="absolute right-0 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-l-lg"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: dragDirection === 'left' ? 1 : 0, x: dragDirection === 'left' ? 0 : 20 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </motion.div>
          </>
        )}

        {/* Face arrière (visible au début) */}
        <motion.div
          className="absolute inset-0 w-full h-full"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          <Image
            src="/images/card-back.jpg"
            alt="Dos de la carte"
            width={380}
            height={506}
            sizes="(max-width: 640px) 220px, (max-width: 768px) 260px, (max-width: 1024px) 300px, (max-width: 1280px) 340px, 380px"
            loading="lazy"
            className={`w-full h-auto rounded-xl shadow-2xl ${
              isUltraRare ? 'ring-4 ring-yellow-400' :
              isRare ? 'ring-4 ring-purple-400' :
              isAlternative ? 'ring-4 ring-cyan-400' : ''
            }`}
          />
        </motion.div>

        {/* Face avant (carte réelle) */}
        <motion.div
          className="w-full h-full"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <div className="relative">
            <Image
              src={card.imageUrl}
              alt={typeof card.name === 'string' ? card.name : 'Carte'}
              width={380}
              height={506}
              sizes="(max-width: 640px) 220px, (max-width: 768px) 260px, (max-width: 1024px) 300px, (max-width: 1280px) 340px, 380px"
              loading="lazy"
              className={`w-full h-auto rounded-xl shadow-2xl ${
                isUltraRare ? 'ring-4 ring-yellow-400' :
                isRare ? 'ring-4 ring-purple-400' :
                isAlternative ? 'ring-4 ring-emerald-400' : ''
              }`}
            />
            {/* Shimmer au-dessus de la face avant */}
            {shimmer && (
              <motion.div
                className="pointer-events-none absolute inset-0 z-20 rounded-xl overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.65 }}
              >
                <motion.div
                  initial={{ x: '-120%' }}
                  animate={{ x: '120%' }}
                  transition={{ duration: 0.65, ease: 'easeOut' }}
                  className="absolute top-0 bottom-0 w-[45%] -skew-x-12"
                  style={{
                    background:
                      'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.45) 45%, rgba(255,255,255,0) 100%)'
                  }}
                />
              </motion.div>
            )}

            {/* Badge "Nouvelle" pour les nouvelles cartes */}
            {isNewCard && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 1, duration: 0.3 }}
                className="absolute  right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg"
              >
                Nouvelle!
              </motion.div>
            )}

           
            {/* Texte de rareté */}
            {(isUltraRare || isRare || isAlternative) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
                className={`absolute  left-[20%] transform -translate-x-1/2 px-4 py-2 rounded-full font-bold text-white shadow-lg text-sm sm:text-base ${
                  isUltraRare ? 'bg-yellow-500' :
                  isRare ? 'bg-purple-500' :
                  'bg-cyan-500'
                }`}
              >
                {isUltraRare ? 'ULTRA RARE' : isRare ? 'RARE' : 'ALTERNATIVE'}
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
} 