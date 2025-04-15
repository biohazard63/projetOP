'use client'

import { useState, useEffect } from 'react'
import { Card as CardType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast, Toaster } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

export default function BoosterOpening() {
  const [sets, setSets] = useState<string[]>([])
  const [selectedSet, setSelectedSet] = useState<string>('')
  const [booster, setBooster] = useState<(CardType & { uniqueId: string })[]>([])
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(-1)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})
  const [isAddingToCollection, setIsAddingToCollection] = useState<boolean>(false)
  const [showPackOpening, setShowPackOpening] = useState<boolean>(false)
  const [preloadedImages, setPreloadedImages] = useState<Record<string, boolean>>({})
  const [selectedCard, setSelectedCard] = useState<(CardType & { uniqueId: string }) | null>(null)
  const [isRevealing, setIsRevealing] = useState(false)

  useEffect(() => {
    fetch('/api/sets')
      .then(res => res.json())
      .then(data => {
        console.log('Sets chargés:', data.sets)
        setSets(data.sets)
      })
      .catch(error => console.error('Erreur lors du chargement des sets:', error))
  }, [])

  // Préchargement des images
  useEffect(() => {
    if (booster.length > 0) {
      const preloadImages = async () => {
        const newPreloadedImages: Record<string, boolean> = {}
        
        for (const card of booster) {
          if (card.imageUrl) {
            try {
              const img = new Image()
              img.src = card.imageUrl
              await new Promise((resolve, reject) => {
                img.onload = resolve
                img.onerror = reject
              })
              newPreloadedImages[card.uniqueId] = true
            } catch (error) {
              console.error(`Erreur de préchargement pour ${card.name}:`, error)
              handleImageError(card.uniqueId)
            }
          }
        }
        
        setPreloadedImages(newPreloadedImages)
      }
      
      preloadImages()
    }
  }, [booster])

  const startPackOpening = async () => {
    setShowPackOpening(true)
    await new Promise(resolve => setTimeout(resolve, 3000))
    setShowPackOpening(false)
    setCurrentCardIndex(0)
  }

  const openBooster = async () => {
    if (!selectedSet) return
    
    setIsLoading(true)
    setCurrentCardIndex(-1)
    setBooster([])
    setImageErrors({})

    try {
      const response = await fetch('/api/booster', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ set: selectedSet }),
      })

      const data = await response.json()
      
      const boosterWithUniqueIds = data.booster.map((card: CardType, index: number) => ({
        ...card,
        uniqueId: `${card.id}-${index}`
      }))
      
      setBooster(boosterWithUniqueIds)
      startPackOpening()
    } catch (error) {
      console.error('Erreur lors de l\'ouverture du booster:', error)
      toast.error('Erreur lors de l\'ouverture du booster')
    } finally {
      setIsLoading(false)
    }
  }

  const addToCollection = async () => {
    if (!booster.length) return

    setIsAddingToCollection(true)
    try {
      const response = await fetch('/api/collection/add-cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardIds: booster.map(card => card.id)
        }),
      })

      const data = await response.json()
      
      if (response.ok) {
        toast.success(data.message)
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout à la collection:', error)
      toast.error('Erreur lors de l\'ajout à la collection')
    } finally {
      setIsAddingToCollection(false)
    }
  }

  const revealNextCard = () => {
    if (!isRevealing) {
      setIsRevealing(true)
      let currentIndex = 0
      const interval = setInterval(() => {
        if (currentIndex < booster.length) {
          setCurrentCardIndex(currentIndex)
          currentIndex++
        } else {
          clearInterval(interval)
          setIsRevealing(false)
          addToCollection()
        }
      }, 400)
    }
  }

  const handleImageError = (cardId: string) => {
    console.error('Erreur de chargement de l\'image pour la carte:', cardId)
    setImageErrors(prev => ({ ...prev, [cardId]: true }))
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'SEC':
        return 'from-amber-300 via-yellow-400 to-amber-500'
      case 'SR':
        return 'from-red-500 via-orange-500 to-red-600'
      case 'R':
        return 'from-blue-500 via-indigo-500 to-blue-600'
      case 'UC':
        return 'from-green-500 via-emerald-500 to-green-600'
      default:
        return 'from-gray-400 via-gray-500 to-gray-600'
    }
  }

  const getRarityGlow = (rarity: string) => {
    switch (rarity) {
      case 'SEC':
        return 'shadow-[0_0_20px_rgba(251,191,36,0.8)]'
      case 'SR':
        return 'shadow-[0_0_20px_rgba(239,68,68,0.8)]'
      case 'R':
        return 'shadow-[0_0_20px_rgba(59,130,246,0.8)]'
      case 'UC':
        return 'shadow-[0_0_20px_rgba(34,197,94,0.8)]'
      default:
        return 'shadow-[0_0_20px_rgba(156,163,175,0.8)]'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-900 to-gray-900 text-white p-4">
      <Toaster position="top-center" richColors />
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-4">
          <h1 className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500">Ouverture de Booster</h1>
          <p className="text-gray-400">Sélectionnez un set et ouvrez un booster pour découvrir de nouvelles cartes !</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 items-center justify-center mb-4 bg-gray-800/50 p-4 rounded-lg shadow-lg backdrop-blur-sm">
          <Select value={selectedSet} onValueChange={setSelectedSet}>
            <SelectTrigger className="w-[300px] bg-gray-700/80 border-gray-600 text-white">
              <SelectValue placeholder="Sélectionnez un set" />
            </SelectTrigger>
            <SelectContent>
              {sets.map((set) => (
                <SelectItem key={set} value={set}>
                  {set}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button 
            onClick={openBooster} 
            disabled={!selectedSet || isLoading}
            className="bg-gradient-to-r from-red-600 via-red-500 to-orange-500 hover:from-red-700 hover:via-red-600 hover:to-orange-600 text-white px-6 py-2 rounded-lg transition-all hover:scale-105 hover:shadow-lg"
          >
            {isLoading ? 'Ouverture...' : 'Ouvrir un Booster'}
          </Button>
        </div>

        <AnimatePresence>
          {showPackOpening && (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ 
                scale: [0, 1.5, 1.2],
                rotate: [-180, 0, 0],
              }}
              exit={{ 
                scale: [1.2, 1.5, 0],
                rotate: [0, 0, 180],
              }}
              transition={{ 
                duration: 2.5,
                times: [0, 0.7, 1],
                ease: "easeInOut"
              }}
              className="fixed inset-0 flex items-center justify-center z-50"
            >
              <div className="relative w-72 h-[420px]">
                <img
                  src="/card-back.jpg"
                  alt="Booster Pack"
                  className="w-full h-full object-cover rounded-lg shadow-2xl"
                />
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ 
                    opacity: [0, 1, 0.8, 1],
                    scale: [1, 1.1, 1, 1.1]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-red-600 via-yellow-400 to-red-600 mix-blend-overlay rounded-lg"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {booster.length > 0 && (
          <div className="relative">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
              {booster.map((card, index) => {
                const isVisible = index <= currentCardIndex
                const hasImageError = imageErrors[card.uniqueId]
                const isLastCard = index === booster.length - 1
                const delay = index * 0.15
                const isPreloaded = preloadedImages[card.uniqueId]
                
                return (
                  <motion.div
                    key={card.uniqueId}
                    initial={{ scale: 0, y: 50, opacity: 0 }}
                    animate={{
                      scale: 1,
                      y: 0,
                      opacity: 1,
                      transition: {
                        type: "spring",
                        stiffness: 60,
                        damping: 15,
                        duration: 0.5,
                        delay
                      }
                    }}
                    className={`relative w-full aspect-[63/88] rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-700 cursor-pointer perspective-1000 ${
                      isLastCard ? 'scale-110' : ''
                    }`}
                    onClick={() => isVisible && setSelectedCard(card)}
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    {isVisible ? (
                      <motion.div
                        initial={{ rotateY: 180, scale: 0.8 }}
                        animate={{ 
                          rotateY: 0,
                          scale: 1,
                          transition: {
                            type: "spring",
                            stiffness: 100,
                            damping: 15,
                            duration: 0.8,
                            delay: 0.1
                          }
                        }}
                        className={`w-full h-full relative group ${getRarityGlow(card.rarity)}`}
                        style={{ transformStyle: 'preserve-3d' }}
                      >
                        {!hasImageError && card.imageUrl ? (
                          <div className="w-full h-full relative group">
                            {isPreloaded ? (
                              <motion.img
                                src={card.imageUrl}
                                alt={card.name}
                                initial={{ scale: 1.2, opacity: 0 }}
                                animate={{ 
                                  scale: 1,
                                  opacity: 1,
                                  transition: {
                                    duration: 0.5,
                                    delay: 0.2
                                  }
                                }}
                                className="w-full h-full object-contain transform transition-all duration-500"
                                onError={() => handleImageError(card.uniqueId)}
                                style={{ transformStyle: 'preserve-3d' }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                                <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                              </div>
                            )}
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                              <div className={`absolute inset-0 bg-gradient-to-r ${getRarityColor(card.rarity)} opacity-30`} />
                              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-85 text-white p-2 backdrop-blur-sm transform translate-y-0">
                                <p className="text-xs font-bold truncate">{card.name}</p>
                                <p className="text-[10px] text-gray-300">{card.rarity}</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                            <span className="text-gray-400 text-xs">Image non disponible</span>
                          </div>
                        )}
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ rotateY: 0 }}
                        animate={{ rotateY: 0 }}
                        className="w-full h-full"
                        style={{ transformStyle: 'preserve-3d' }}
                      >
                        <div className="absolute inset-0 w-full h-full">
                          <motion.img
                            src="/card-back.jpg"
                            alt="Dos de carte"
                            initial={{ scale: 1.1 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.5 }}
                            className="w-full h-full object-cover rounded-lg"
                          />
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5 }}
                            className="absolute inset-0 bg-gradient-to-br from-red-900/50 to-gray-900/50 rounded-lg"
                          >
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 0.1 }}
                              transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent"
                              style={{
                                backgroundSize: '200% 100%',
                              }}
                            />
                          </motion.div>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )
              })}
            </div>

            {!isRevealing && currentCardIndex < booster.length - 1 && (
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50"
              >
                <Button 
                  onClick={revealNextCard}
                  className="bg-gradient-to-r from-red-600 via-red-500 to-orange-500 hover:from-red-700 hover:via-red-600 hover:to-orange-600 text-white px-6 py-2 rounded-full shadow-lg text-sm font-semibold transition-all hover:scale-105 hover:shadow-xl"
                >
                  Révéler les cartes
                </Button>
              </motion.div>
            )}
          </div>
        )}

        <AnimatePresence>
          {selectedCard && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
              onClick={() => setSelectedCard(null)}
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: "spring", damping: 20, stiffness: 200 }}
                className={`relative max-w-xl w-full aspect-[63/88] rounded-lg overflow-hidden shadow-2xl ${getRarityGlow(selectedCard.rarity)}`}
                onClick={e => e.stopPropagation()}
              >
                {selectedCard.imageUrl && !imageErrors[selectedCard.uniqueId] ? (
                  <img
                    src={selectedCard.imageUrl}
                    alt={selectedCard.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                    <span className="text-gray-400">Image non disponible</span>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
} 