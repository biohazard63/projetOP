'use client'

import { motion, useMotionValue, useTransform } from 'framer-motion'
import { ExtendedCardType } from '@/types/card'
import { X, Heart } from 'lucide-react'
import { useState, useEffect, useRef, useCallback, useTransition } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'

interface CardDetailsModalProps {
  card: ExtendedCardType
  onClose: () => void
  getRarityGlow: (rarity: string) => string
  fullscreenMobile?: boolean
}

export default function CardDetailsModal({ 
  card, 
  onClose,
  getRarityGlow,
  fullscreenMobile = false
}: Readonly<CardDetailsModalProps>) {
  // Pinch-to-zoom (mobile friendly)
  const scale = useMotionValue(1)
  const rotate = useMotionValue(0)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const transform = useTransform([x, y, scale, rotate], ([xv, yv, sc, rot]) => `translate3d(${xv}px, ${yv}px, 0) scale(${sc}) rotate(${rot}deg)`) 
  const [isFavorite, setIsFavorite] = useState(false)
  const [lastClickTime, setLastClickTime] = useState(0)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const [isPending, startTransition] = useTransition()

  const handleClick = () => {
    const currentTime = new Date().getTime()
    const timeDiff = currentTime - lastClickTime
    
    if (timeDiff < 300) { // Double-clic détecté (moins de 300ms entre les clics)
      onClose()
    }
    
    setLastClickTime(currentTime)
  }

  useEffect(() => {
    const controller = new AbortController()
    const checkFavorite = async () => {
      try {
        const response = await fetch(`/api/user/favorites/${card.id}`, { signal: controller.signal })
        const data = await response.json()
        setIsFavorite(Boolean(data.isFavorite))
      } catch (error) {
        const isAbort = typeof error === 'object' && error !== null && 'name' in (error as Record<string, unknown>) && (error as { name?: unknown }).name === 'AbortError'
        if (isAbort) return
        console.error('Erreur lors de la vérification des favoris:', error)
      }
    }
    checkFavorite()
    return () => controller.abort()
  }, [card.id])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  const toggleFavorite = useCallback(async () => {
    try {
      const response = await fetch('/api/user/favorites', {
        method: isFavorite ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id }),
      })
      const data = await response.json()
      if (data.success) {
        startTransition(() => setIsFavorite(prev => !prev))
        toast.success(isFavorite ? 'Carte retirée des favoris' : 'Carte ajoutée aux favoris')
      } else {
        toast.error('Erreur lors de la modification des favoris')
      }
    } catch (error) {
      console.error('Erreur lors de la modification des favoris:', error)
      toast.error('Erreur lors de la modification des favoris')
    }
  }, [card.id, isFavorite])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-50 p-4 ${fullscreenMobile ? 'flex items-center justify-center' : 'flex items-center justify-center'} overflow-y-auto`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="card-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        aria-label="Fermer"
        onClick={handleClick}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClose() }}
      />
      
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className={`relative overflow-hidden w-[92vw] max-w-3xl ${fullscreenMobile ? 'my-0 rounded-2xl max-h-[88vh]' : 'my-6 sm:my-8 rounded-2xl max-h-[88vh]'} flex flex-col bg-gradient-to-b from-[#0B1020] to-[#0A0F1A] border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.6)]`}
      >
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <button 
            onClick={toggleFavorite}
            className={`p-2 rounded-full transition-colors ${
              isFavorite 
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400' 
                : 'bg-gray-800/50 hover:bg-gray-700/50 text-gray-300'
            }`}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            disabled={isPending}
          >
            <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
          <button 
            onClick={onClose}
            className="p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
            aria-label="Fermer la modale"
            ref={closeButtonRef}
          >
            <X size={20} />
          </button>
        </div>
        
        <div className={`${fullscreenMobile ? 'flex flex-col md:flex-row flex-1 min-h-0' : 'flex flex-col md:flex-row'} overflow-y-auto`}>
          <div className="w-full md:w-1/2 p-4 sm:p-6 flex items-center justify-center bg-white/2">
            <motion.div 
              className={`relative rounded-lg overflow-hidden touch-pan-y ${getRarityGlow(card.rarity)}`}
              style={{ transform }}
              drag
              dragMomentum={false}
              dragElastic={0.2}
              whileTap={{ cursor: 'grabbing' }}
              onWheel={(e) => {
                if (e.ctrlKey) {
                  e.preventDefault()
                  const delta = -e.deltaY * 0.001
                  const next = Math.min(2, Math.max(1, scale.get() + delta))
                  scale.set(next)
                }
              }}
              onPointerDown={(e) => {
                ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
              }}
              onPointerMove={(e) => {
                // Pinch-to-zoom via gesture (browsers mobiles gèrent souvent pinch natif)
              }}
            >
              <Image 
                src={card.imageUrl} 
                alt={card.name} 
                width={600}
                height={840}
                sizes="(max-width: 768px) 80vw, 600px"
                loading="lazy"
                className="w-full h-auto max-h-[70vh] object-contain select-none"
                draggable={false}
              />
            </motion.div>
          </div>
          
          <div className="w-full md:w-1/2 p-4 sm:p-6 bg-white/2">
            <h2 id="card-title" className="text-xl sm:text-2xl font-bold mb-2">{card.name}</h2>
            {card.counter && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-400 mb-1">Contre</h3>
                <p className="text-sm">{card.counter}</p>
              </div>
            )}
            {card.effect && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-400 mb-1">Effet</h3>
                <p className="text-sm">{card.effect}</p>
              </div>
            )}
            {card.trigger && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-400 mb-1">Trigger</h3>
                <p className="text-sm">{card.trigger}</p>
              </div>
            )}
          
            <div className="mt-auto  flex  gap-1 pt-4 border-t border-white/10">
              <p className="text-xs text-gray-500">
                ID: {card.id}
              </p>
              <p className="text-xs text-gray-500">
                Rarity: {card.rarity} 
              </p>
              <p className="text-xs text-gray-500">
                Parallel: {card.isParallel ? 'Yes' : 'No'}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
} 