'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'

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
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Mes Decks</h1>
          <Link href="/deck-builder">
            <Button>Créer un nouveau deck</Button>
          </Link>
        </div>
        
        {decks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h2 className="text-2xl font-semibold mb-4">Vous n'avez pas encore de deck</h2>
            <p className="text-gray-600 mb-6">Commencez à créer votre premier deck pour jouer !</p>
            <Link href="/deck-builder">
              <Button>Créer mon premier deck</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {decks.map((deck) => (
              <Card key={deck.id} className="overflow-hidden">
                <div className="p-6">
                  <h2 className="text-2xl font-semibold mb-2">{deck.name}</h2>
                  {deck.description && (
                    <p className="text-gray-600 mb-4">{deck.description}</p>
                  )}
                  
                  <div className="mb-4">
                    <p className="text-sm text-gray-500">
                      Cartes: {deck.cards.length}/50
                    </p>
                    <p className="text-sm text-gray-500">
                      Leader: {deck.cards.filter(card => card.type === 'LEADER').length}/1
                    </p>
                    <p className="text-sm text-gray-500">
                      Personnages: {deck.cards.filter(card => card.type === 'CHARACTER').length}
                    </p>
                    <p className="text-sm text-gray-500">
                      Événements: {deck.cards.filter(card => card.type === 'EVENT').length}
                    </p>
                    <p className="text-sm text-gray-500">
                      Stages: {deck.cards.filter(card => card.type === 'STAGE').length}
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {deck.cards.slice(0, 5).map((card) => (
                      <div key={card.id} className="relative w-10 h-14">
                        <Image
                          src={card.imageUrl}
                          alt={card.name}
                          fill
                          className="object-cover rounded"
                        />
                      </div>
                    ))}
                    {deck.cards.length > 5 && (
                      <div className="relative w-10 h-14 bg-gray-200 rounded flex items-center justify-center">
                        <span className="text-xs font-bold">+{deck.cards.length - 5}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between">
                    <Link href={`/deck-builder?deckId=${deck.id}`}>
                      <Button variant="outline">Modifier</Button>
                    </Link>
                    <Link href={`/game?deckId=${deck.id}`}>
                      <Button>Jouer</Button>
                    </Link>
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