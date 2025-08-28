'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { memo, useMemo } from 'react'
import CardReveal from '../CardReveal'
import { ExtendedCardType } from '@/types/card'

interface CardDisplayProps {
  booster: ExtendedCardType[]
  currentCardIndex: number
  isNewCard: boolean
  isMobile: boolean
  isDragging: boolean
  performanceMode: boolean
  navDirection: 'prev' | 'next'
  onCardClick: (card: ExtendedCardType) => void
  onDragStart: () => void
  onDrag: (event: MouseEvent | TouchEvent | PointerEvent, info: { offset: { x: number; y: number } }) => void
  onDragEnd: (event: MouseEvent | TouchEvent | PointerEvent, info: { offset: { x: number; y: number } }) => void
  onArrowClick: (direction: 'prev' | 'next') => void
}

const CardDisplay = memo(function CardDisplay({
  booster,
  currentCardIndex,
  isNewCard,
  isMobile,
  isDragging,
  performanceMode,
  navDirection,
  onCardClick,
  onDragStart,
  onDrag,
  onDragEnd,
  onArrowClick
}: CardDisplayProps) {
  // Mémoisation des transitions pour éviter les recalculs
  const cardTransitions = useMemo(() => ({
    center: {
      x: 0,
      y: 0,
      rotate: 0,
      opacity: 1,
      transition: { 
        type: 'spring' as const,
        stiffness: performanceMode ? 250 : 350, 
        damping: performanceMode ? 28 : 35,
        duration: performanceMode ? 0.6 : 0.8
      }
    },
    exit: (dir: 'prev' | 'next') => ({
      x: dir === 'next' ? (performanceMode ? -100 : -160) : (performanceMode ? 100 : 160),
      y: performanceMode ? -15 : -30,
      rotate: dir === 'next' ? (performanceMode ? 8 : 12) : (performanceMode ? -8 : -12),
      opacity: 0,
      transition: { duration: performanceMode ? 0.5 : 0.6, ease: 'easeInOut' as const }
    })
  }), [performanceMode])

  const enterVariants = useMemo(() => (dir: 'prev' | 'next') => ({
    x: dir === 'next' ? (performanceMode ? 100 : 160) : (performanceMode ? -100 : -160),
    y: performanceMode ? 15 : 30,
    rotate: dir === 'next' ? (performanceMode ? -8 : -12) : (performanceMode ? 8 : 12),
    opacity: 0
  }), [performanceMode])

  if (booster.length === 0 || currentCardIndex < 0) return null

  return (
    <div className="w-[96%] sm:max-w-6xl mx-auto px-2 sm:px-4 pb-28 md:pb-0">
      <div className="relative rounded-2xl p-3 sm:p-6 border border-white/10 shadow-xl">
        {/* Carte actuelle avec transition type pile */}
        <div className={`relative flex items-center justify-center min-h-[360px] sm:min-h-[420px] md:min-h-[500px] swipe-container ${isDragging ? 'swiping' : ''}`}>
          <AnimatePresence initial={false} custom={navDirection}>
            <motion.div
              key={booster[currentCardIndex]?.id ?? `idx-${currentCardIndex}`}
              custom={navDirection}
              variants={{
                enter: enterVariants,
                center: cardTransitions.center,
                exit: cardTransitions.exit
              }}
              initial="enter"
              animate="center"
              exit="exit"
              className="will-change-transform"
            >
              <CardReveal
                card={booster[currentCardIndex]}
                isNewCard={isNewCard}
                position={currentCardIndex + 1}
                isMobile={isMobile}
                onComplete={() => {}}
                onCardClick={onCardClick}
                onDragStart={onDragStart}
                onDrag={onDrag}
                onDragEnd={onDragEnd}
              />
            </motion.div>
          </AnimatePresence>
          <div aria-hidden className="pointer-events-none absolute inset-x-1/3 top-8 h-6 rounded-xl bg-black/30 blur-xl" />
        </div>

        {/* Zones de tap latérales (mobile) - réduites pour éviter les conflits */}
        {isMobile && (
          <>
            <button
              onClick={() => currentCardIndex > 0 && onArrowClick('prev')}
              aria-label="Carte précédente"
              className="md:hidden absolute left-0 top-1/4 h-1/2 w-8 bg-gradient-to-r from-black/10 to-transparent"
            />
            <button
              onClick={() => currentCardIndex < booster.length - 1 && onArrowClick('next')}
              aria-label="Carte suivante"
              className="md:hidden absolute right-0 top-1/4 h-1/2 w-8 bg-gradient-to-l from-black/10 to-transparent"
            />
          </>
        )}

        {/* Navigation: grandes cibles tactiles sur mobile */}
        <div className="flex justify-between items-center mb-6">
          {currentCardIndex > 0 && (
            <button
              onClick={() => onArrowClick('prev')}
              aria-label="Carte précédente"
              className="bg-white/10 hover:bg-white/20 p-3 md:p-3 rounded-full transition-all duration-300 w-14 h-14 md:w-auto md:h-auto flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          <div className="text-white/80 text-lg font-bold">
            Carte {currentCardIndex + 1} sur {booster.length}
          </div>

          {currentCardIndex < booster.length - 1 && (
            <button
              onClick={() => onArrowClick('next')}
              aria-label="Carte suivante"
              className="bg-white/10 hover:bg-white/20 p-3 md:p-3 rounded-full transition-all duration-300 w-14 h-14 md:w-auto md:h-auto flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
})

export default CardDisplay
