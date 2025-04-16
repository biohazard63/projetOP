'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'
import { Plus, Edit, Play, ChevronRight } from 'lucide-react'

interface Card {
  id: string
  code: string
  name: string
  type: string
  color: string
  cost: number
  power?: number
  counter?: number
  effect?: string
  rarity: string
  imageUrl: string
  set?: string
}

interface Deck {
  id: string
  name: string
  description: string | null
  cards: Card[]
  createdAt: string
  updatedAt: string
}

export default function DecksPage() {
  const { data: session } = useSession()
  const [decks, setDecks] = useState<Deck[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDecks = async () => {
      try {
        setLoading(true)
        setError(null)
        console.log('Decks: Début de la récupération des decks')
        
        const response = await fetch('/api/decks', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        })

        console.log('Decks: Statut de la réponse:', response.status)
        
        if (!response.ok) {
          const errorData = await response.json()
          console.error('Decks: Erreur de réponse:', errorData)
          throw new Error(errorData.message || 'Erreur lors de la récupération des decks')
        }

        const data = await response.json()
        console.log('Decks: Données reçues:', data)
        
        if (!data.decks || !Array.isArray(data.decks)) {
          throw new Error('Format de données invalide')
        }
        
        setDecks(data.decks)
      } catch (error) {
        console.error('Decks: Erreur lors de la récupération:', error)
        setError(error instanceof Error ? error.message : 'Une erreur est survenue')
      } finally {
        setLoading(false)
      }
    }

    fetchDecks()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg">
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-4 md:p-8 text-white">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 md:mb-8 gap-4">
          <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500">
            Mes Decks
          </h1>
          <Link href="/deck-builder">
            <Button className="bg-gradient-to-r from-red-600 via-red-500 to-orange-500 hover:from-red-700 hover:via-red-600 hover:to-orange-600 text-white px-6 py-2 rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center gap-2">
              <Plus className="h-5 w-5" />
              <span className="hidden md:inline">Créer un nouveau deck</span>
              <span className="md:hidden">Nouveau deck</span>
            </Button>
          </Link>
        </div>
        
        {decks.length === 0 ? (
          <div className="bg-gray-800/80 rounded-lg shadow-xl p-6 md:p-8 text-center backdrop-blur-sm border border-gray-700">
            <h2 className="text-xl md:text-2xl font-semibold mb-4 text-white">Vous n'avez pas encore de deck</h2>
            <p className="text-gray-400 mb-6">Commencez à créer votre premier deck pour jouer !</p>
            <Link href="/deck-builder">
              <Button className="bg-gradient-to-r from-red-600 via-red-500 to-orange-500 hover:from-red-700 hover:via-red-600 hover:to-orange-600 text-white px-6 py-2 rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center gap-2 mx-auto">
                <Plus className="h-5 w-5" />
                Créer mon premier deck
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {decks.map((deck) => (
              <Card key={deck.id} className="bg-gray-800/80 rounded-lg shadow-xl overflow-hidden backdrop-blur-sm border border-gray-700 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
                <div className="p-4 md:p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl md:text-2xl font-semibold text-white">{deck.name}</h2>
                    <div className="flex gap-2">
                      <Link href={`/deck-builder?deckId=${deck.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 bg-gray-700/50 hover:bg-gray-600 text-white">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/game?deckId=${deck.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 bg-red-600/50 hover:bg-red-500 text-white">
                          <Play className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                  
                  {deck.description && (
                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">{deck.description}</p>
                  )}
                  
                  <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                    <div className="bg-gray-700/30 p-2 rounded-lg">
                      <p className="text-gray-400">Cartes</p>
                      <p className="text-white font-medium">{deck.cards.length}/50</p>
                    </div>
                    <div className="bg-gray-700/30 p-2 rounded-lg">
                      <p className="text-gray-400">Leader</p>
                      <p className="text-white font-medium">{deck.cards.filter(card => card.type === 'LEADER').length}/1</p>
                    </div>
                    <div className="bg-gray-700/30 p-2 rounded-lg">
                      <p className="text-gray-400">Personnages</p>
                      <p className="text-white font-medium">{deck.cards.filter(card => card.type === 'CHARACTER').length}</p>
                    </div>
                    <div className="bg-gray-700/30 p-2 rounded-lg">
                      <p className="text-gray-400">Événements</p>
                      <p className="text-white font-medium">{deck.cards.filter(card => card.type === 'EVENT').length}</p>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <div className="flex -space-x-2 overflow-hidden">
                      {deck.cards.slice(0, 6).map((card, index) => (
                        <div 
                          key={card.id} 
                          className="relative w-12 h-16 border-2 border-gray-800 rounded-lg overflow-hidden"
                          style={{ zIndex: 6 - index }}
                        >
                          <Image
                            src={card.imageUrl}
                            alt={card.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ))}
                      {deck.cards.length > 6 && (
                        <div className="relative w-12 h-16 border-2 border-gray-800 rounded-lg bg-gray-700/50 flex items-center justify-center">
                          <span className="text-xs font-bold text-white">+{deck.cards.length - 6}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 