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
import { toast } from 'sonner'

export default function BoosterOpening() {
  const [sets, setSets] = useState<string[]>([])
  const [selectedSet, setSelectedSet] = useState<string>('')
  const [booster, setBooster] = useState<(CardType & { uniqueId: string })[]>([])
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(-1)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})
  const [isAddingToCollection, setIsAddingToCollection] = useState<boolean>(false)

  useEffect(() => {
    fetch('/api/sets')
      .then(res => res.json())
      .then(data => {
        console.log('Sets chargés:', data.sets)
        setSets(data.sets)
      })
      .catch(error => console.error('Erreur lors du chargement des sets:', error))
  }, [])

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
      console.log('Booster reçu:', data.booster)
      
      const boosterWithUniqueIds = data.booster.map((card: CardType, index: number) => ({
        ...card,
        uniqueId: `${card.id}-${index}`
      }))
      
      setBooster(boosterWithUniqueIds)
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
    if (currentCardIndex < booster.length - 1) {
      setCurrentCardIndex(prev => prev + 1)
      
      // Si c'est la dernière carte, ajouter automatiquement à la collection
      if (currentCardIndex === booster.length - 2) {
        addToCollection()
      }
    }
  }

  const handleImageError = (cardId: string) => {
    console.error('Erreur de chargement de l\'image pour la carte:', cardId)
    setImageErrors(prev => ({ ...prev, [cardId]: true }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-4">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Ouverture de Booster</h1>
          <p className="text-gray-400">Sélectionnez un set et ouvrez un booster pour découvrir de nouvelles cartes !</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 items-center justify-center mb-8 bg-gray-800 p-4 rounded-lg shadow-lg">
          <Select value={selectedSet} onValueChange={setSelectedSet}>
            <SelectTrigger className="w-[300px] bg-gray-700 border-gray-600 text-white">
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
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            {isLoading ? 'Ouverture...' : 'Ouvrir un Booster'}
          </Button>
        </div>

        {booster.length > 0 && (
          <div className="relative">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-4">
              {booster.map((card, index) => {
                const isVisible = index <= currentCardIndex
                const hasImageError = imageErrors[card.uniqueId]
                
                return (
                  <div
                    key={card.uniqueId}
                    className={`relative aspect-[63/88] rounded-lg overflow-hidden transition-all duration-500 transform ${
                      isVisible
                        ? 'opacity-100 scale-100 rotate-0'
                        : 'opacity-0 scale-95 rotate-180'
                    }`}
                  >
                    {isVisible && (
                      <>
                        {!hasImageError && card.imageUrl ? (
                          <img
                            src={card.imageUrl}
                            alt={card.name}
                            className="w-full h-full object-cover"
                            onError={() => handleImageError(card.uniqueId)}
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                            <span className="text-gray-400">Image non disponible</span>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-2">
                          <p className="text-sm font-bold truncate">{card.name}</p>
                          <p className="text-xs text-gray-300">{card.rarity}</p>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>

            {currentCardIndex < booster.length - 1 && (
              <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
                <Button 
                  onClick={revealNextCard}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-full shadow-lg text-lg font-semibold transition-all hover:scale-105"
                >
                  Révéler la carte suivante
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 