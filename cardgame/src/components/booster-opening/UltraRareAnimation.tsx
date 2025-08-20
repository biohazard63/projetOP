'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useAudio } from '@/hooks/useAudio'
import { ExtendedCardType } from '@/types/card'
import Image from 'next/image'
import { Sparkles, Star } from 'lucide-react'

interface UltraRareAnimationProps {
  card: ExtendedCardType
  onComplete: () => void
}

export default function UltraRareAnimation({ card, onComplete }: Readonly<UltraRareAnimationProps>) {
  const [isVisible, setIsVisible] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const { playUltraRareSound } = useAudio()
  const hasPlayedSound = useRef(false)

  useEffect(() => {
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
    if (!hasPlayedSound.current) {
      playUltraRareSound()
      hasPlayedSound.current = true
    }

    const timer = setTimeout(() => {
      setIsVisible(false)
      onComplete()
    }, 2500)

    return () => clearTimeout(timer)
  }, [onComplete, playUltraRareSound])

  const particleIds = useMemo(() => {
    const len = isMobile ? 15 : 20
    const makeId = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`)
    return Array.from({ length: len }, () => makeId())
  }, [isMobile])

  const textParticleKeys = useMemo(() => ['p0','p1','p2','p3','p4','p5','p6','p7'], [])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 overflow-hidden bg-black/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Effet de fond dynamique */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 via-amber-500/20 to-orange-500/20"
            animate={{
              backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'linear'
            }}
          />

          {/* Particules dorées */}
          {particleIds.map((id, i) => (
            <motion.div
              key={id}
              className="absolute"
              initial={{
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                scale: 0,
                opacity: 0
              }}
              animate={{
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                scale: [0, 1, 0],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.1
              }}
            >
              <Star className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-yellow-400`} />
            </motion.div>
          ))}

          {/* Carte principale avec conteneur */}
          <motion.div
            className={`absolute ${isMobile ? 'top-1/3' : 'top-1/2'} ${isMobile ? 'left-1/3' : 'left-1/2'} transform -translate-x-1/2 -translate-y-1/2`}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 15
            }}
          >
             {/* Texte "ULTRA RARE" */}
             <motion.div
                className="absolute z-50   transform -translate-x-1/2"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <div className="relative">
                  {/* Effet de brillance derrière le texte */}
                  <motion.div
                    className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full blur-lg"
                    animate={{
                      opacity: [0.5, 0.8, 0.5],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                  
                  {/* Texte principal */}
                  <motion.div
                    className="relative bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-6 py-3 rounded-full font-bold shadow-lg"
                    animate={{
                      boxShadow: [
                        '0 0 20px rgba(234, 179, 8, 0.5)',
                        '0 0 40px rgba(234, 179, 8, 0.8)',
                        '0 0 20px rgba(234, 179, 8, 0.5)'
                      ]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <span className={`${isMobile ? 'text-sm' : 'text-lg'} tracking-wider`}>
                      UR!
                    </span>
                  </motion.div>

                  {/* Effet de particules autour du texte */}
                  {textParticleKeys.map((key, i) => (
                    <motion.div
                      key={key}
                      className="absolute w-1 h-1 bg-yellow-400 rounded-full"
                      initial={{
                        x: '50%',
                        y: '50%',
                        scale: 0
                      }}
                      animate={{
                        x: `${Math.cos(i * (Math.PI / 4)) * 30}px`,
                        y: `${Math.sin(i * (Math.PI / 4)) * 30}px`,
                        scale: [0, 1, 0],
                        opacity: [0, 1, 0]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.1
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            <div className="relative">
              {/* Effet de brillance autour de la carte */}
              <motion.div
                className={`absolute ${isMobile ? '-inset-2' : '-inset-4'} bg-gradient-to-r from-yellow-400 to-amber-500 rounded-xl blur-xl`}
                animate={{
                  opacity: [0.5, 0.8, 0.5],
                  scale: [1, 1.1, 1]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              />

              {/* Effet de halo */}
              <motion.div
                className={`absolute ${isMobile ? '-inset-4' : '-inset-8'} bg-gradient-to-r from-yellow-400/30 to-amber-500/30 rounded-xl blur-2xl`}
                animate={{
                  opacity: [0.3, 0.5, 0.3],
                  scale: [1, 1.2, 1]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              />
              
              {/* Image de la carte avec effet de brillance */}
              <motion.div
                className="relative z-10"
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(234, 179, 8, 0.5)',
                    '0 0 40px rgba(234, 179, 8, 0.8)',
                    '0 0 20px rgba(234, 179, 8, 0.5)'
                  ]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              >
                <div className={`${isMobile ? 'w-[220px] h-[294px]' : 'w-[340px] h-[454px]'} relative`}>
                  <Image
                    src={card.imageUrl}
                    alt={card.name}
                    fill
                    sizes="(max-width: 640px) 220px, (max-width: 1024px) 300px, 340px"
                    className="object-cover rounded-lg shadow-2xl"
                    priority={false}
                  />
                </div>
              </motion.div>

              {/* Effet décoratif */}
              <motion.div
                className="absolute -top-8 left-[10%] transform -translate-x-1/2"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Sparkles className={`${isMobile ? 'w-8 h-8' : 'w-12 h-12'} text-yellow-400`} />
              </motion.div>

             

              {/* Nom de la carte */}
              <motion.div
                className={`absolute ${isMobile ? '-bottom-12' : '-bottom-16'} left-1/2 transform -translate-x-1/2 text-center`}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <h2 className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-white drop-shadow-lg`}>{card.name}</h2>
                <p className={`${isMobile ? 'text-sm' : 'text-lg'} text-yellow-400 mt-1`}>{card.type}</p>
              </motion.div>
            </div>
          </motion.div>

          {/* Effet de flash initial */}
          <motion.div
            className="absolute inset-0 bg-white"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
} 