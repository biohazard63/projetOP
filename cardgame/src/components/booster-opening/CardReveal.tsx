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
  const [dragDirection, setDragDirection] = useState<DragDirection>(null)
  const [isDragging, setIsDragging] = useState(false)
  // Shimmer désactivé pour éviter l'effet blanc

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
    common: {
      opacity: [0, 1], 
      y: [15, 0], 
      scale: [0.98, 1],
      transition: { 
        type: 'tween' as const,
        ease: 'easeOut' as const,
        duration: 0.25 
      } 
    },
    rare: {
      opacity: [0, 1], 
      y: [18, 0], 
      scale: [0.97, 1],
      transition: { 
        type: 'tween' as const,
        ease: 'easeOut' as const,
        duration: 0.3 
      }
    },
    secret: {
      opacity: [0, 1], 
      y: [20, 0], 
      scale: [0.96, 1],
      boxShadow: ['0 0 0 rgba(0,0,0,0)', '0 0 50px rgba(250,204,21,.45)'],
      transition: { 
        type: 'tween' as const,
        duration: 0.35,
        ease: 'easeOut' as const
      }
    }
  }

  useEffect(() => {
    // plus de dos: affichage direct
  }, [card.id])

  // (Shimmer supprimé)

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
      // Si le swipe est trop petit, on ne fait rien (plus de clic automatique)
      console.log('CardReveal - Swipe insuffisant, aucun effet')
      x.set(0)
    }
  }, [onDragEnd, isDragging, isMobile, x])
  
  const handleDragStart = useCallback((event: MouseEvent | TouchEvent | PointerEvent) => {
    console.log('CardReveal - Début du glissement')
    
    // Stocker la position initiale pour détecter la direction
    if (event instanceof TouchEvent) {
      const touch = event.touches[0];
      const target = event.currentTarget as HTMLElement;
      target.dataset.touchStartX = touch.clientX.toString();
      target.dataset.touchStartY = touch.clientY.toString();
    }
    
    setIsDragging(true)
    setDragDirection(null)
    onDragStart?.()
  }, [onDragStart])
  
  const handleDrag = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    console.log('CardReveal - Glissement en cours:', {
      offsetX: info.offset.x,
      offsetY: info.offset.y,
      isDragging
    })

    // Détecter la direction du mouvement
    if (Math.abs(info.offset.x) > Math.abs(info.offset.y)) {
      // Mouvement horizontal - swipe de carte
      if (info.offset.x > 0) {
        setDragDirection('right')
      } else if (info.offset.x < 0) {
        setDragDirection('left')
      }
    } else {
      // Mouvement vertical - scroll de page
      setDragDirection(null)
    }

    onDrag?.(event, info)
  }, [isDragging, onDrag])

  return (
    <div className="relative flex items-center justify-center min-h-[360px] sm:min-h-[420px] md:min-h-[500px]">
    

      {/* Carte */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={isMobile ? 0.7 : 0.5}
        dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        dragMomentum={false}
        dragDirectionLock
        dragPropagation={false}
        style={{ 
          x, 
          rotate, 
          opacity,
          cursor: isDragging ? 'grabbing' : 'pointer',
          touchAction: isMobile ? 'pan-y' : 'none',
          marginBottom: '2rem'
        }}
        initial={{ opacity: 0, y: 15, scale: 0.98 }}
        animate={appearanceTargets[revealVariant]}
        className="relative aspect-[3/4] w-[220px] sm:w-[260px] md:w-[300px] lg:w-[340px] xl:w-[380px] overflow-hidden rounded-xl bg-black/10"
        onTouchStart={(e) => {
          // Permettre le scroll vertical sur mobile
          if (isMobile) {
            e.stopPropagation();
          }
        }}
        onTouchMove={(e) => {
          // Empêcher la propagation des événements touch sur mobile
          if (isMobile) {
            e.stopPropagation();
          }
        }}
      >
        {/* Effets spéciaux */}
        {isRare && !isUltraRare && (
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.6] }}
            transition={{ 
              type: 'tween' as const,
              duration: 1.2, 
              delay: 0.2,
              ease: 'easeOut'
            }}
            style={{ background: 'radial-gradient(280px 160px at 50% 50%, rgba(147, 197, 253,.25), transparent 70%)' }}
          />
        )}
        {isUltraRare && (
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.9] }}
            transition={{ 
              type: 'tween' as const,
              duration: 1.4, 
              delay: 0.15,
              ease: 'easeOut'
            }}
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

        {/* Face avant unique */}
        <div className="w-full h-full">
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

            {isNewCard && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.25 }}
                className="absolute right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg"
              >
                Nouvelle!
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.2 }}
              className={`absolute left-[20%] bottom-[-9%] transform -translate-x-1/2 px-3 py-1.5 rounded-lg font-semibold text-white shadow-xl text-xs sm:text-sm backdrop-blur-sm border border-white/20 ${
                isUltraRare ? 'bg-yellow-500/90' :
                isRare ? 'bg-purple-500/90' :
                isAlternative ? 'bg-cyan-500/90' :
                card.rarity === 'C' ? 'bg-gray-500/90' :
                card.rarity === 'UC' ? 'bg-blue-500/90' :
                card.rarity === 'U' ? 'bg-blue-500/90' :
                card.rarity === 'R' ? 'bg-green-500/90' :
                card.rarity === 'SR' ? 'bg-orange-500/90' :
                card.rarity === 'L' ? 'bg-red-500/90' :
                card.rarity === 'SEC' ? 'bg-yellow-500/90' :
                card.rarity === 'SP CARD' ? 'bg-pink-500/90' :
                card.rarity === 'TR' ? 'bg-indigo-500/90' :
                card.rarity === 'P' ? 'bg-teal-500/90' :
                'bg-gray-600/90'
              }`}
            >
              {card.rarity}
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  )
} 
