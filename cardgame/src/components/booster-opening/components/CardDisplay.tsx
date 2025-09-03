'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { memo, useMemo, useEffect, useState } from 'react'
import CardReveal from '../CardReveal'
import { ExtendedCardType } from '@/types/card'
import '@/styles/card-pile.css'

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
  const [isNavigating, setIsNavigating] = useState(false)
  const [swipeDirection, setSwipeDirection] = useState<'prev' | 'next' | null>(null)
  
  // Variants simplifiés: crossfade + léger zoom
  const transitionDuration = performanceMode ? 0.18 : (isMobile ? 0.2 : 0.24)
  const easing: number[] = [0.2, 0.8, 0.2, 1]

  const variants = useMemo(() => ({
    enter: (_dir: 'prev' | 'next') => ({
      opacity: 0,
      scale: 0.985
    }),
    center: {
      opacity: 1,
      scale: 1,
      transition: {
        type: 'tween' as const,
        ease: 'easeOut' as const,
        duration: transitionDuration
      }
    },
    exit: (_dir: 'prev' | 'next') => ({
      opacity: 0,
      scale: 1.015,
      transition: {
        type: 'tween' as const,
        ease: 'easeOut' as const,
        duration: transitionDuration
      }
    })
  }), [transitionDuration])

  // Fonction simplifiée pour déclencher l'animation de swipe
  const triggerSwipeAnimation = (direction: 'prev' | 'next') => {
    console.log('🚀 triggerSwipeAnimation appelé avec direction:', direction)
    
    if (isNavigating) {
      console.log('❌ Navigation déjà en cours, sortie')
      return
    }
    
    setIsNavigating(true)
    setSwipeDirection(direction)
    console.log('✅ État isNavigating mis à true, swipeDirection:', direction)
    
    // Attendre que l'animation se termine avant de naviguer
    setTimeout(() => {
      console.log('🔄 Appel de onArrowClick avec direction:', direction)
      onArrowClick(direction)
      setIsNavigating(false)
      setSwipeDirection(null)
      console.log('✅ États remis à zéro')
    }, 300)
  }

  // Navigation au clavier avec les flèches
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' && currentCardIndex > 0 && !isNavigating) {
        event.preventDefault()
        triggerSwipeAnimation('prev')
      } else if (event.key === 'ArrowRight' && currentCardIndex < booster.length - 1 && !isNavigating) {
        event.preventDefault()
        triggerSwipeAnimation('next')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentCardIndex, booster.length, isNavigating])

  if (booster.length === 0 || currentCardIndex < 0) return null

  return (
    <div className="w-[96%]  sm:max-w-6xl mx-auto px-2 sm:p-4 pb-32 md:pb-12">
      <div className="relative rounded-2xl p-3 sm:p-6 border bg-gradient-to-b from-[#0b1020] to-[#0a0f1a] border-white/10 shadow-xl">
        {/* Pile de cartes avec effet 3D */}
        <div 
          className={`relative flex items-center justify-center min-h-[320px] sm:min-h-[420px] md:min-h-[500px] swipe-container ${isDragging ? 'swiping' : ''}`}
          style={{
            touchAction: 'pan-y',
            overscrollBehavior: 'contain',
            perspective: '1000px'
          }}
          onTouchStart={(e) => {
            if (isMobile) {
              e.stopPropagation()
            }
          }}
          onTouchMove={(e) => {
            if (isMobile) {
              const touch = e.touches[0]
              const target = e.currentTarget as HTMLElement
              const startX = parseInt(target.dataset.touchStartX || '0')
              const startY = parseInt(target.dataset.touchStartY || '0')
              const deltaX = Math.abs(touch.clientX - startX)
              const deltaY = Math.abs(touch.clientY - startY)
              
              if (deltaX > deltaY && deltaX > 10) {
                e.preventDefault()
              }
            }
          }}
          onTouchEnd={(e) => {
            if (isMobile) {
              const target = e.currentTarget as HTMLElement
              delete target.dataset.touchStartX
              delete target.dataset.touchStartY
            }
          }}
        >
          {/* Cartes d'arrière-plan empilées */}
          <div className="relative w-full h-full flex items-center justify-center card-pile-container">
            {/* Carte 3 (arrière-plan) */}
            {currentCardIndex + 2 < booster.length && (
              <motion.div
                className="absolute transform-gpu card-pile-card card-pile-background"
                data-card-index="3"
                style={{
                  zIndex: 5,
                  filter: 'brightness(0.7) saturate(0.8)',
                  transform: 'translateY(16px) scale(0.88) rotateY(4deg)'
                }}
                initial={{ opacity: 0, y: 25, scale: 0.85 }}
                animate={{ 
                  opacity: 0, 
                  y: 16, 
                  scale: 0.88,
                  rotateY: 4
                }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              >
                <CardReveal
                  card={booster[currentCardIndex + 2]}
                  isNewCard={false}
                  position={currentCardIndex + 3}
                  isMobile={isMobile}
                  onComplete={() => {}}
                  onCardClick={() => {}}
                  onDragStart={() => {}}
                  onDrag={() => {}}
                  onDragEnd={() => {}}
                  isBackground={true}
                />
              </motion.div>
            )}

            {/* Carte 2 (milieu) */}
            {currentCardIndex + 1 < booster.length && (
              <motion.div
                className="absolute transform-gpu card-pile-card card-pile-background"
                data-card-index="2"
                style={{
                  zIndex: 10,
                  filter: 'brightness(0.8) saturate(0.9)',
                  transform: 'translateY(8px) scale(0.94) rotateY(2deg)'
                }}
                initial={{ opacity: 0, y: 18, scale: 0.9 }}
                animate={{ 
                  opacity: 0, 
                  y: 8, 
                  scale: 0.94,
                  rotateY: 2
                }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <CardReveal
                  card={booster[currentCardIndex + 1]}
                  isNewCard={false}
                  position={currentCardIndex + 2}
                  isMobile={isMobile}
                  onComplete={() => {}}
                  onCardClick={() => {}}
                  onDragStart={() => {}}
                  onDrag={() => {}}
                  onDragEnd={() => {}}
                  isBackground={true}
                />
              </motion.div>
            )}

            {/* Carte active (premier plan) avec swipe 3D */}
            <motion.div
              className="relative transform-gpu card-pile-card"
              data-card-index="1"
              style={{ zIndex: 20 }}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ 
                opacity: swipeDirection ? 0 : 1, 
                scale: swipeDirection ? 0.95 : 1,
                rotateY: swipeDirection ? (swipeDirection === 'next' ? -15 : 15) : 0,
                x: swipeDirection ? (swipeDirection === 'next' ? -150 : 150) : 0,
                y: 0
              }}
              transition={{ 
                duration: 0.3, 
                ease: [0.4, 0, 0.2, 1] 
              }}
              drag={isMobile ? "x" : false}
              dragConstraints={{ left: -150, right: 150 }}
              dragElastic={0.3}
              dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
              onDrag={(event, info) => {
                // Rotation 3D basée sur la position X
                const rotateY = info.offset.x * 0.15
                const rotateX = Math.abs(info.offset.x) * 0.05
                
                // Mise à jour de la position des cartes d'arrière-plan
                if (currentCardIndex + 1 < booster.length) {
                  const card2Element = document.querySelector('[data-card-index="2"]') as HTMLElement
                  if (card2Element) {
                    card2Element.style.transform = `translateY(6px) scale(0.97) rotateY(${rotateY * 0.3}deg)`
                  }
                }
                
                if (currentCardIndex + 2 < booster.length) {
                  const card3Element = document.querySelector('[data-card-index="3"]') as HTMLElement
                  if (card3Element) {
                    card3Element.style.transform = `translateY(12px) scale(0.95) rotateY(${rotateY * 0.6}deg)`
                  }
                }
              }}
              onDragEnd={(event, info) => {
                const threshold = 100
                if (Math.abs(info.offset.x) > threshold && !isNavigating) {
                  // Swipe réussi - naviguer vers la carte suivante/précédente
                  if (info.offset.x > threshold) {
                    triggerSwipeAnimation('prev')
                  } else {
                    triggerSwipeAnimation('next')
                  }
                } else {
                  // Swipe annulé - retour en douceur à la position initiale
                  setTimeout(() => {
                    // Remettre les cartes d'arrière-plan en position avec transition douce
                    if (currentCardIndex + 1 < booster.length) {
                      const card2Element = document.querySelector('[data-card-index="2"]') as HTMLElement
                      if (card2Element) {
                        card2Element.style.transition = 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)'
                        card2Element.style.transform = 'translateY(6px) scale(0.97) rotateY(1.5deg)'
                      }
                    }
                    
                    if (currentCardIndex + 2 < booster.length) {
                      const card3Element = document.querySelector('[data-card-index="3"]') as HTMLElement
                      if (card3Element) {
                        card3Element.style.transition = 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)'
                        card3Element.style.transform = 'translateY(12px) scale(0.95) rotateY(3deg)'
                      }
                    }
                    
                    // Nettoyer les transitions après l'animation
                    setTimeout(() => {
                      if (currentCardIndex + 1 < booster.length) {
                        const card2Element = document.querySelector('[data-card-index="2"]') as HTMLElement
                        if (card2Element) {
                          card2Element.style.transition = ''
                        }
                      }
                      if (currentCardIndex + 2 < booster.length) {
                        const card3Element = document.querySelector('[data-card-index="3"]') as HTMLElement
                        if (card3Element) {
                          card3Element.style.transition = ''
                        }
                      }
                    }, 300)
                  }, 100)
                }
              }}
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
                isBackground={false}
              />
            </motion.div>
          </div>

          {/* Effet de lueur d'arrière-plan */}
          <div aria-hidden className="pointer-events-none absolute inset-x-1/3 top-8 h-6 rounded-xl bg-black/30 blur-xl" />
        </div>

        {/* Zones de tap latérales (mobile) - réduites pour éviter les conflits */}
        {isMobile && (
          <>
            <button
              onClick={() => {
                if (currentCardIndex > 0 && !isNavigating) {
                  triggerSwipeAnimation('prev')
                }
              }}
              aria-label="Carte précédente"
              className="md:hidden absolute left-0 top-1/4 h-1/2 w-8 bg-gradient-to-r from-black/10 to-transparent"
            />
            <button
              onClick={() => {
                if (currentCardIndex < booster.length - 1 && !isNavigating) {
                  triggerSwipeAnimation('next')
                }
              }}
              aria-label="Carte suivante"
              className="md:hidden absolute right-0 top-1/4 h-1/2 w-8 bg-gradient-to-l from-black/10 to-transparent"
            />
          </>
        )}

        {/* Navigation: grandes cibles tactiles sur mobile */}
        <div className="flex justify-between items-center mb-6">
          {currentCardIndex > 0 && (
            <button
              onClick={() => {
                if (!isNavigating) {
                  triggerSwipeAnimation('prev')
                }
              }}
              aria-label="Carte précédente"
              disabled={isNavigating}
              className="bg-white/10 hover:bg-white/20 p-2 md:p-3 rounded-full transition-all duration-300 w-10 h-10 md:w-auto md:h-auto flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-6 md:w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all duration-300 w-10 h-10 flex items-center justify-center group"
              title="Zoomer sur la carte"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-4 w-4 text-white group-hover:text-yellow-300 transition-colors duration-300" 
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
              onClick={() => {
                if (!isNavigating) {
                  triggerSwipeAnimation('next')
                }
              }}
              aria-label="Carte suivante"
              disabled={isNavigating}
              className="bg-white/10 hover:bg-white/20 p-2 md:p-3 rounded-full transition-all duration-300 w-10 h-10 md:w-auto md:h-auto flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-6 md:w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
