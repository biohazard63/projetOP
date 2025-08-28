'use client'

import { motion } from 'framer-motion'
import NextImage from 'next/image'
import { useMemo } from 'react'

interface BoosterHeaderProps {
  isMobile: boolean
  performanceMode: boolean
  isLowEndDevice: boolean
  stage: 'chest' | 'pack'
  stageFx: { opening: boolean }
  selectedSetData: { code: string; name: string } | null
  particleKeys: string[]
}

export default function BoosterHeader({
  isMobile,
  performanceMode,
  isLowEndDevice,
  stage,
  stageFx,
  selectedSetData,
  particleKeys
}: BoosterHeaderProps) {
  // Mémoisation des valeurs de transition pour éviter les recalculs
  const stageTransition = useMemo(() => ({
    type: 'spring' as const,
    stiffness: performanceMode ? 150 : (isLowEndDevice ? 100 : 250),
    damping: performanceMode ? 25 : (isLowEndDevice ? 20 : 25),
    duration: performanceMode ? 0.6 : (isLowEndDevice ? 0.5 : 0.8)
  }), [performanceMode, isLowEndDevice])

  const titleTransition = useMemo(() => ({
    duration: isMobile ? 1.5 : (performanceMode ? 1.0 : 1.3),
    ease: 'easeOut' as const
  }), [isMobile, performanceMode])

  return (
    <div className="w-[95%] md:w-[90%] mx-auto p-2 sm:p-4 md:p-6">
      <div className="flex justify-center">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={titleTransition}
          className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 text-center title-halo mx-auto w-fit"
        >
          <span className="shimmer-gold drop-shadow-glow">Ouverture de Booster</span>
        </motion.h1>
      </div>

      {/* Scène centrale: coffre/pack + infos du set */}
      <div className="stage mb-6 sm:mb-8">
        <div aria-hidden className="stage-glow" />
        
        {/* Indicateur de mode performance */}
        {performanceMode && (
          <div className="absolute top-2 right-2 z-10 bg-amber-500/90 text-black text-xs px-2 py-1 rounded-full font-medium">
            {isLowEndDevice ? "Mode Éco" : "Mode Performance"}
          </div>
        )}
   
        <motion.div
          className="relative stage-item"
          initial={false}
          animate={{ 
            scale: stageFx.opening ? (performanceMode ? 1.03 : (isLowEndDevice ? 1.02 : 1.06)) : 1, 
            rotate: stageFx.opening ? (performanceMode ? -1 : (isLowEndDevice ? -0.5 : -2)) : 0 
          }}
          transition={stageTransition}
        >
          <NextImage
            src={stage === 'pack' ? `/images/booster/${(selectedSetData?.code || '').toLowerCase()}.png` : '/images/boostercartoon.png'}
            alt="Trésor"
            width={220}
            height={300}
            className="w-[140px] sm:w-[180px] md:w-[220px] h-auto object-contain"
            priority={false}
          />
          {/* Effet de déchirure du pack */}
          {stage === 'pack' && stageFx.opening && (
            <>
              <div className="tear-left" />
              <div className="tear-right" />
            </>
          )}
          {/* Particules dorées lors de l'ouverture */}
          {stageFx.opening && !performanceMode && !isLowEndDevice && (
            particleKeys.map((k, i) => (
              <div
                key={k}
                className="gold-particle"
                style={{ left: `${35 + (i%10)*3}%`, animationDelay: `${i*0.035}s` }}
              />
            ))
          )}
          {stageFx.opening && !performanceMode && !isLowEndDevice && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, .9, 0] }}
              transition={{ duration: .6 }}
              style={{
                background: 'radial-gradient(220px 120px at 50% 60%, rgba(255,215,0,.55), transparent 70%)'
              }}
            />
          )}
        </motion.div>
      </div>
    </div>
  )
}
