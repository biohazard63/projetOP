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
}

export default function CardReveal({ card, isNewCard = false, onComplete, onCardClick }: CardRevealProps) {
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

  const isUltraRare = ['L', 'SEC'].includes(card.rarity)
  const isRare = ['SR', 'SP CARD'].includes(card.rarity) && !card.imageUrl?.includes('_p2') && !card.isParallel
  const isAlternative = card.imageUrl?.includes('_p1') || card.isParallel

  useEffect(() => {
    // Attendre que BoosterPackAnimation soit terminée
    const timer = setTimeout(() => {
      setIsRevealed(true)
      // Décaler l'apparition des particules pour éviter le chevauchement
      setTimeout(() => {
        setShowParticles(true)
        
        // Afficher les effets spéciaux après la révélation
        if (isUltraRare) {
          setShowUltraRareEffect(true)
          setTimeout(() => setShowUltraRareEffect(false), 3000)
        } else if (isAlternative) {
          setShowAltArtEffect(true)
          setTimeout(() => setShowAltArtEffect(false), 3000)
        } else if (isRare) {
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
    
    if (info.offset.x > threshold) {
      // Swipe vers la droite -> carte précédente
      onCardClick?.(card)
    } else if (info.offset.x < -threshold) {
      // Swipe vers la gauche -> carte suivante
      onCardClick?.(card)
    } else {
      // Retour à la position initiale si le swipe n'est pas assez important
      controls.start({ x: 0, rotate: 0 })
    }
  }
  
  const handleDragStart = () => {
    setIsDragging(true)
    setDragDirection(null)
  }
  
  const handleDrag = (event: any, info: any) => {
    if (info.offset.x > 0) {
      setDragDirection('right')
    } else if (info.offset.x < 0) {
      setDragDirection('left')
    }
  }

  return (
    <div className="relative flex items-center justify-center min-h-[400px] sm:min-h-[500px] md:min-h-[600px]">
      {/* Effets spéciaux pour les cartes rares */}
      {showUltraRareEffect && <UltraRareEffect card={card} />}
      {showAltArtEffect && <AltArtEffect card={card} />}
      {showRareEffect && <RareCardEffect card={card} />}
      
      {/* Fond lumineux animé */}
      {showParticles && (isUltraRare || isRare || isAlternative) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.8, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className={`absolute inset-0 ${
            isUltraRare ? 'bg-gradient-conic from-yellow-500 via-amber-500 to-yellow-500' :
            isRare ? 'bg-gradient-conic from-purple-500 via-pink-500 to-purple-500' :
            'bg-gradient-conic from-blue-500 via-cyan-500 to-blue-500'
          } blur-3xl`}
        />
      )}

      {/* Particules d'arrière-plan */}
      {showParticles && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{
            position: 'absolute',
            top: '0%',
            left: '66%',
            transform: 'translate(-50%, -50%)',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          {/* Particules flottantes */}
          {Array.from({ length: isUltraRare ? 100 : isRare ? 75 : 50 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              initial={{
                x: '50%',
                y: '50%',
                scale: 0,
                opacity: 0
              }}
              animate={{
                x: `${Math.random() * 100}%`,
                y: `${Math.random() * 100}%`,
                scale: [0, 1, 0],
                opacity: [0, 1, 0],
                rotate: [0, 360]
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                delay: Math.random() * 0.5,
                repeat: Infinity,
                repeatType: "reverse"
              }}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)'
              }}
            >
              {isUltraRare ? (
                <Crown className="w-4 h-4 text-yellow-400" />
              ) : isRare ? (
                <Star className="w-4 h-4 text-purple-400" />
              ) : isAlternative ? (
                <Sparkles className="w-4 h-4 text-cyan-400" />
              ) : (
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: getParticleColors()[Math.floor(Math.random() * getParticleColors().length)],
                    boxShadow: '0 0 10px currentColor'
                  }}
                />
              )}
            </motion.div>
          ))}
        </motion.div>
      )}

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
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'pan-y pinch-zoom'
        }}
        animate={controls}
        className="relative"
        onClick={() => onCardClick && onCardClick(card)}
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
              className={`w-full h-auto rounded-xl shadow-2xl ${
                isUltraRare ? 'ring-4 ring-yellow-400' :
                isRare ? 'ring-4 ring-purple-400' :
                isAlternative ? 'ring-4 ring-cyan-400' : ''
              }`}
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

            {/* Effet de brillance */}
            <motion.div
              className={`absolute inset-0 bg-gradient-to-r ${
                isUltraRare ? 'from-yellow-500/0 via-yellow-500/50 to-yellow-500/0' :
                isRare ? 'from-purple-500/0 via-purple-500/50 to-purple-500/0' :
                isAlternative ? 'from-cyan-500/0 via-cyan-500/50 to-cyan-500/0' :
                'from-transparent via-white to-transparent'
              } opacity-0`}
              animate={{
                opacity: [0, 0.8, 0],
                x: ['-100%', '100%'],
              }}
              transition={{
                duration: 1.5,
                delay: 1,
                ease: "easeInOut",
                repeat: isUltraRare ? Infinity : 0,
                repeatDelay: 1
              }}
            />

            {/* Texte de rareté */}
            {(isUltraRare || isRare || isAlternative) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
                className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-full font-bold text-white shadow-lg text-sm sm:text-base ${
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