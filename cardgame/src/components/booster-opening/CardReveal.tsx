'use client'

import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion'
import { useState, useEffect, useCallback } from 'react'
import { ExtendedCardType } from '@/types/card'
import Image from 'next/image'
import type { PanInfo } from 'framer-motion'

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
  onComplete, 
  onCardClick,
  onDragStart,
  onDrag,
  onDragEnd,
  position,
  isMobile = false
}: Readonly<CardRevealProps>) {
  const [isRevealed, setIsRevealed] = useState(false)
  const [dragDirection, setDragDirection] = useState<'left' | 'right' | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const x = useMotionValue(0)
  const controls = useAnimation()
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsRevealed(true)
    }, 800)
    return () => clearTimeout(timer)
  }, [isUltraRare, isRare, isAlternative, card.name])

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
      controls.start({ x: 0, rotate: 0 })
    }
  }, [controls, onDragEnd, onCardClick, card, isDragging, isMobile])
  
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
        animate={controls}
        className="relative aspect-[3/4] w-[220px] sm:w-[260px] md:w-[300px] lg:w-[340px] xl:w-[380px]"
        onClick={(e) => {
          // On ne gère le clic que si on n'est pas en train de glisser
          if (!isDragging) {
            e.stopPropagation();
            onCardClick?.(card);
          }
        }}
      >
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
              className="w-full h-auto rounded-xl shadow-2xl"
            />

            {/* Badge "Nouvelle" pour les nouvelles cartes */}
            {isNewCard && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 1, duration: 0.3 }}
                className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg"
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
                className={`absolute top-3 left-[16%] transform -translate-x-1/2 px-4 py-2 rounded-full font-bold text-white shadow-lg text-sm sm:text-base ${
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