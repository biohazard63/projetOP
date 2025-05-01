'use client'

import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion'
import { useState, useEffect } from 'react'
import { ExtendedCardType } from '@/types/card'
import { Star, Sparkles, Crown } from 'lucide-react'
import RareCardEffect from './RareCardEffect'
import AltArtEffect from './AltArtEffect'
import UltraRareEffect from './UltraRareEffect'

interface CardRevealProps {
  card: ExtendedCardType
  isNewCard?: boolean
  onComplete?: () => void
  onCardClick?: (card: ExtendedCardType) => void
  onDragStart?: () => void
  onDrag?: (event: any, info: any) => void
  onDragEnd?: (event: any, info: any) => void
}

export default function CardReveal({ 
  card, 
  isNewCard = false, 
  onComplete, 
  onCardClick,
  onDragStart,
  onDrag,
  onDragEnd
}: CardRevealProps) {
  const [isRevealed, setIsRevealed] = useState(false)
  const [showParticles, setShowParticles] = useState(false)
  const [showRareEffect, setShowRareEffect] = useState(false)
  const [showAltArtEffect, setShowAltArtEffect] = useState(false)
  const [showUltraRareEffect, setShowUltraRareEffect] = useState(false)
  const [dragDirection, setDragDirection] = useState<'left' | 'right' | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const x = useMotionValue(0)
  const controls = useAnimation()
  const rotate = useTransform(x, [-200, 200], [-30, 30])
  const opacity = useTransform(x, [-200, 0, 200], [0.5, 1, 0.5])

  // Nouvelle logique de détection des raretés
  const isUltraRare = (card.rarity === 'SR' && card.id.endsWith('_p1')) || 
                     card.id.match(/_p[3-9]/) || 
                     ['SEC', 'SP CARD', 'TR', 'P'].includes(card.rarity)
  const isAlternative = card.id.endsWith('_p1') && !isUltraRare
  const isRare = card.id.endsWith('_p2') || 
                (card.rarity === 'SR' && !card.id.endsWith('_p1') && !card.id.match(/_p[3-9]/))

  useEffect(() => {
    console.log('CardReveal - Détection des raretés pour:', card.name)
    console.log('isUltraRare:', isUltraRare)
    console.log('isAlternative:', isAlternative)
    console.log('isRare:', isRare)

    // Attendre que BoosterPackAnimation soit terminée
    const timer = setTimeout(() => {
      setIsRevealed(true)
      // Décaler l'apparition des particules pour éviter le chevauchement
      setTimeout(() => {
        setShowParticles(true)
        
        // Afficher les effets spéciaux après la révélation
        if (isUltraRare) {
          console.log('Affichage de l\'effet Ultra Rare pour:', card.name)
          setShowUltraRareEffect(true)
          setTimeout(() => setShowUltraRareEffect(false), 3000)
        } else if (isAlternative) {
          console.log('Affichage de l\'effet Alternative pour:', card.name)
          setShowAltArtEffect(true)
          setTimeout(() => setShowAltArtEffect(false), 3000)
        } else if (isRare) {
          console.log('Affichage de l\'effet Rare pour:', card.name)
          setShowRareEffect(true)
          setTimeout(() => setShowRareEffect(false), 3000)
        }
      }, 1000)
    }, 800)

    return () => clearTimeout(timer)
  }, [isUltraRare, isRare, isAlternative])

  const handleAnimationComplete = () => {
    if (onComplete) {
      // Réduire le délai avant onComplete
      setTimeout(onComplete, 500)
    }
  }

  const getParticleColors = () => {
    if (isUltraRare) {
      return ['#FFD700', '#FFA500', '#FF8C00'] // Or, orange foncé, orange
    }
    if (isRare) {
      return ['#9333EA', '#C026D3', '#DB2777'] // Violet, rose, rose foncé
    }
    if (isAlternative) {
      return ['#06B6D4', '#0EA5E9', '#2563EB'] // Cyan, bleu clair, bleu
    }
    return ['#606060', '#7F7F7F', '#303030'] // gris par défaut
  }

  const handleDragEnd = (event: any, info: any) => {
    setIsDragging(false)
    const threshold = 100
    
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
  }
  
  const handleDragStart = () => {
    console.log('CardReveal - Début du glissement')
    setIsDragging(true)
    setDragDirection(null)
    onDragStart?.()
  }
  
  const handleDrag = (event: any, info: any) => {
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
  }

  return (
    <div className="relative flex items-center justify-center min-h-[400px] sm:min-h-[500px] md:min-h-[600px]">
    

      {/* Carte */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
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
          touchAction: 'pan-y pinch-zoom'
        }}
        animate={controls}
        className="relative"
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
          <img
            src="/images/card-back.jpg"
            alt="Dos de la carte"
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
            <img
              src={card.imageUrl}
              alt={typeof card.name === 'string' ? card.name : 'Carte'}
              className={`w-full h-auto rounded-xl shadow-2xl `}
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