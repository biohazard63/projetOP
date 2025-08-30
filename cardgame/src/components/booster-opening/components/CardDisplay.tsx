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
  // Variants simplifiés: légère translation + fondu, sans rotation
  const transitionDuration = performanceMode ? 0.22 : (isMobile ? 0.25 : 0.3)
  const easing: number[] = [0.22, 1, 0.36, 1] // easeOutCubic-like

  const variants = useMemo(() => ({
    enter: (dir: 'prev' | 'next') => ({
      x: dir === 'next' ? 40 : -40,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: {
        type: 'tween' as const,
        ease: 'easeOut' as const,
        duration: transitionDuration
      }
    },
    exit: (dir: 'prev' | 'next') => ({
      x: dir === 'next' ? -40 : 40,
      opacity: 0,
      transition: {
        type: 'tween' as const,
        ease: 'easeOut' as const,
        duration: transitionDuration
      }
    })
  }), [transitionDuration])

  if (booster.length === 0 || currentCardIndex < 0) return null

  return (
    <div className="w-[96%] sm:max-w-6xl mx-auto px-2 sm:p-4 pb-28 md:pb-0">
      <div className="relative rounded-2xl p-3 sm:p-6 border border-white/10 shadow-xl">
        {/* Carte actuelle avec transition type pile */}
        <div 
          className={`relative flex items-center justify-center min-h-[360px] sm:min-h-[420px] md:min-h-[500px] swipe-container ${isDragging ? 'swiping' : ''}`}
          style={{
            touchAction: 'pan-y',
            overscrollBehavior: 'contain'
          }}
          onTouchStart={(e) => {
            // Permettre le scroll vertical
            if (isMobile) {
              e.stopPropagation();
            }
          }}
          onTouchMove={(e) => {
            // Empêcher la propagation des événements touch horizontaux
            if (isMobile) {
              const touch = e.touches[0];
              const target = e.currentTarget as HTMLElement;
              const startX = parseInt(target.dataset.touchStartX || '0');
              const startY = parseInt(target.dataset.touchStartY || '0');
              const deltaX = Math.abs(touch.clientX - startX);
              const deltaY = Math.abs(touch.clientY - startY);
              
              // Si le mouvement est plus horizontal que vertical, empêcher le scroll
              if (deltaX > deltaY && deltaX > 10) {
                e.preventDefault();
              }
            }
          }}
          onTouchEnd={(e) => {
            // Nettoyer les références
            if (isMobile) {
              const target = e.currentTarget as HTMLElement;
              delete target.dataset.touchStartX;
              delete target.dataset.touchStartY;
            }
          }}
        >
          <AnimatePresence mode="wait" initial={false} custom={navDirection}>
            <motion.div
              key={booster[currentCardIndex]?.id ?? `idx-${currentCardIndex}`}
              custom={navDirection}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              className="will-change-transform transform-gpu"
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

          <div className="flex items-center gap-4">
            <div className="text-white/80 text-lg font-bold">
              Carte {currentCardIndex + 1} sur {booster.length}
            </div>
            
            {/* Bouton de zoom avec loupe */}
            <button
              onClick={() => onCardClick(booster[currentCardIndex])}
              aria-label="Zoomer sur la carte"
              className="bg-white/10 hover:bg-white/20 p-3 rounded-full transition-all duration-300 w-14 h-14 flex items-center justify-center group"
              title="Zoomer sur la carte"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-6 w-6 text-white group-hover:text-yellow-300 transition-colors duration-300" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" 
                />
              </svg>
            </button>
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
