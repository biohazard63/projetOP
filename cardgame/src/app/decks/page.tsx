'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'
import { Plus, Edit, Play, Swords, Users, Scroll } from 'lucide-react'

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 bg-[url('/images/deck/haki-flash.png')] bg-contain bg-no-repeat animate-pulse"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-t-2 border-yellow-400 rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-900/20 backdrop-blur-sm border border-red-500/20 text-red-200 px-6 py-4 rounded-lg shadow-lg">
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="relative">
        {/* En-tête avec effet de haki */}
        <div className="mb-12 relative">
          <div className="absolute -top-4 -left-4 w-32 h-32 bg-[url('/images/deck/haki-flash.png')] bg-contain bg-no-repeat opacity-40 animate-pulse"></div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative">
            <h1 className="text-4xl md:text-5xl font-bold text-white relative z-10">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400">
                Mes Decks
              </span>
            </h1>
            <Link href="/deck-builder">
              <Button className="relative group overflow-hidden bg-gradient-to-r from-yellow-600 to-red-600 hover:from-yellow-500 hover:to-red-500 text-white px-6 py-3 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(255,165,0,0.3)] transform">
                <div className="absolute inset-0 bg-[url('/images/deck/explosion.png')] bg-cover opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                <Plus className="h-5 w-5 mr-2" />
                <span className="relative z-10">Nouveau Deck</span>
              </Button>
            </Link>
          </div>
        </div>

        {decks.length === 0 ? (
          <div className="relative overflow-hidden rounded-2xl backdrop-blur-sm border border-yellow-500/20 shadow-[0_0_30px_rgba(0,0,0,0.3)]">
            <div className="absolute inset-0 bg-gradient-to-b from-gray-900/90 to-gray-800/90"></div>
            <div className="relative p-8 md:p-12 text-center">
              <div className="mb-6">
                <Swords className="h-16 w-16 mx-auto text-yellow-500 animate-pulse" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Commencez votre aventure !
              </h2>
              <p className="text-gray-300 mb-8 text-lg">
                Créez votre premier deck et partez à la conquête des mers !
              </p>
              <Link href="/deck-builder">
                <Button className="relative group overflow-hidden bg-gradient-to-r from-yellow-600 to-red-600 hover:from-yellow-500 hover:to-red-500 text-white px-8 py-4 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(255,165,0,0.3)] transform">
                  <div className="absolute inset-0 bg-[url('/images/deck/explosion.png')] bg-cover opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                  <Plus className="h-6 w-6 mr-2" />
                  <span className="relative z-10 text-lg">Créer mon premier deck</span>
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {decks.map((deck) => (
              <Card key={deck.id} className="group relative overflow-hidden rounded-xl backdrop-blur-sm border border-yellow-500/10 hover:border-yellow-500/30 bg-gradient-to-b from-gray-900/90 to-gray-800/90 transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,165,0,0.1)] transform hover:scale-[1.02]">
                <div className="absolute inset-0 bg-[url('/images/deck/marineford-war.png')] bg-cover opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
                <div className="relative p-6">
                  <div className="flex justify-between items-start mb-6">
                    <h2 className="text-2xl font-bold text-white group-hover:text-yellow-400 transition-colors duration-300">
                      {deck.name}
                    </h2>
                    <div className="flex gap-2">
                      <Link href={`/deck-builder?deckId=${deck.id}`}>
                        <Button aria-label={`Modifier le deck ${deck.name}`} variant="ghost" size="sm" className="h-9 w-9 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/game?deckId=${deck.id}`}>
                        <Button aria-label={`Jouer avec le deck ${deck.name}`} variant="ghost" size="sm" className="h-9 w-9 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400">
                          <Play className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {deck.description && (
                    <p className="text-gray-300 text-sm mb-6 line-clamp-2">{deck.description}</p>
                  )}

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-yellow-500/5 border border-yellow-500/10 p-3 rounded-lg">
                      <div className="flex items-center gap-2 text-yellow-400 mb-1">
                        <Users className="h-4 w-4" />
                        <span className="text-sm font-medium">Leader</span>
                      </div>
                      <p className="text-lg font-bold text-white">{deck.cards.filter(card => card.type === 'LEADER').length}/1</p>
                    </div>
                    <div className="bg-yellow-500/5 border border-yellow-500/10 p-3 rounded-lg">
                      <div className="flex items-center gap-2 text-yellow-400 mb-1">
                        <Scroll className="h-4 w-4" />
                        <span className="text-sm font-medium">Cartes</span>
                      </div>
                      <p className="text-lg font-bold text-white">{deck.cards.length}/50</p>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="flex -space-x-3 overflow-hidden">
                      {deck.cards.slice(0, 5).map((card, index) => (
                        <div 
                          key={card.id} 
                          className="relative w-14 h-20 rounded-lg overflow-hidden border-2 border-gray-800 transform transition-transform duration-300 hover:scale-110 hover:z-10"
                          style={{ zIndex: 5 - index }}
                        >
                          <Image
                            src={card.imageUrl}
                            alt={card.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 40vw, (max-width: 1024px) 20vw, 10vw"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                        </div>
                      ))}
                      {deck.cards.length > 5 && (
                        <div className="relative w-14 h-20 flex items-center justify-center rounded-lg bg-yellow-500/10 border-2 border-yellow-500/20">
                          <span className="text-sm font-bold text-yellow-400">+{deck.cards.length - 5}</span>
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