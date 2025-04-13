'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

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
  cards: Card[]
}

export default function DeckBuilderPage() {
  const { data: session } = useSession()
  const [availableCards, setAvailableCards] = useState<Card[]>([])
  const [currentDeck, setCurrentDeck] = useState<Deck>({
    id: '',
    name: 'Nouveau Deck',
    cards: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    color: 'all',
    rarity: 'all'
  })
  const [isEditing, setIsEditing] = useState(false)
  const [deckName, setDeckName] = useState('')
  const [selectedCards, setSelectedCards] = useState<Card[]>([])
  const router = useRouter()

  // Récupérer l'ID du deck depuis l'URL
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const deckId = searchParams.get('deckId')

  useEffect(() => {
    const fetchCards = async () => {
      try {
        setLoading(true)
        setError(null)
        console.log('Deck Builder: Début de la récupération des cartes')
        
        const response = await fetch('/api/collection', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        })

        console.log('Deck Builder: Statut de la réponse:', response.status)
        
        if (!response.ok) {
          const errorData = await response.json()
          console.error('Deck Builder: Erreur de réponse:', errorData)
          throw new Error(errorData.message || 'Erreur lors de la récupération des cartes')
        }

        const data = await response.json()
        console.log('Deck Builder: Données reçues:', data.length, 'cartes')
        
        setAvailableCards(data)
      } catch (error) {
        console.error('Deck Builder: Erreur lors de la récupération:', error)
        setError(error instanceof Error ? error.message : 'Une erreur est survenue')
      } finally {
        setLoading(false)
      }
    }

    fetchCards()
  }, [])

  // Charger un deck existant si un ID est fourni
  useEffect(() => {
    const loadDeck = async () => {
      if (deckId) {
        try {
          const response = await fetch(`/api/decks/${deckId}`)
          if (!response.ok) {
            throw new Error('Erreur lors du chargement du deck')
          }
          const deck = await response.json()
          setDeckName(deck.name)
          setSelectedCards(deck.cards)
          setIsEditing(true)
        } catch (error) {
          console.error('Erreur:', error)
          setError('Erreur lors du chargement du deck')
        }
      }
    }
    loadDeck()
  }, [deckId])

  const addCardToDeck = (card: Card) => {
    setCurrentDeck(prev => ({
      ...prev,
      cards: [...prev.cards, card]
    }))
  }

  const removeCardFromDeck = (cardId: string) => {
    setCurrentDeck(prev => ({
      ...prev,
      cards: prev.cards.filter(card => card.id !== cardId)
    }))
  }

  const filteredCards = availableCards.filter(card => {
    if (filters.search && !card.name.toLowerCase().includes(filters.search.toLowerCase())) {
      return false
    }
    if (filters.type !== 'all' && card.type !== filters.type) return false
    if (filters.color !== 'all' && card.color !== filters.color) return false
    if (filters.rarity !== 'all' && card.rarity !== filters.rarity) return false
    return true
  })

  const saveDeck = async () => {
    try {
      const url = isEditing ? `/api/decks/${deckId}` : '/api/decks'
      const method = isEditing ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: deckName,
          cards: selectedCards,
        }),
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la sauvegarde du deck')
      }

      const savedDeck = await response.json()
      router.push('/decks')
    } catch (error) {
      console.error('Erreur:', error)
      setError('Erreur lors de la sauvegarde du deck')
    }
  }

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
        <h1 className="text-4xl font-bold mb-8">
          {isEditing ? 'Modifier le Deck' : 'Créateur de Deck'}
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Section des cartes disponibles */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">Cartes Disponibles</h2>
              
              {/* Filtres */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Input
                  type="text"
                  placeholder="Rechercher une carte..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
                <Select
                  value={filters.type}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="LEADER">Leader</SelectItem>
                    <SelectItem value="CHARACTER">Personnage</SelectItem>
                    <SelectItem value="EVENT">Événement</SelectItem>
                    <SelectItem value="STAGE">Stage</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filters.color}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, color: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Couleur" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les couleurs</SelectItem>
                    <SelectItem value="Red">Rouge</SelectItem>
                    <SelectItem value="Blue">Bleu</SelectItem>
                    <SelectItem value="Green">Vert</SelectItem>
                    <SelectItem value="Purple">Violet</SelectItem>
                    <SelectItem value="Black">Noir</SelectItem>
                    <SelectItem value="Yellow">Jaune</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filters.rarity}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, rarity: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Rareté" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les raretés</SelectItem>
                    <SelectItem value="C">Commune</SelectItem>
                    <SelectItem value="UC">Peu commune</SelectItem>
                    <SelectItem value="R">Rare</SelectItem>
                    <SelectItem value="SR">Super Rare</SelectItem>
                    <SelectItem value="L">Légendaire</SelectItem>
                    <SelectItem value="SEC">Secret Rare</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Grille de cartes */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredCards.map((card) => (
                  <Card
                    key={card.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => addCardToDeck(card)}
                  >
                    <div className="relative aspect-[3/4]">
                      <Image
                        src={card.imageUrl}
                        alt={card.name}
                        fill
                        className="object-cover rounded-t-lg"
                      />
                    </div>
                    <div className="p-2">
                      <h3 className="font-semibold text-sm truncate">{card.name}</h3>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{card.type}</span>
                        <span>{card.cost} ⭐</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Section du deck en cours */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">Mon Deck</h2>
              
              <div className="mb-4">
                <Input
                  type="text"
                  placeholder="Nom du deck"
                  value={deckName}
                  onChange={(e) => setDeckName(e.target.value)}
                  className="mb-4"
                />
                
                <div className="text-sm text-gray-500 mb-4">
                  <p>Cartes dans le deck: {selectedCards.length}/50</p>
                  <p>Leader: {selectedCards.filter(card => card.type === 'LEADER').length}/1</p>
                  <p>Personnages: {selectedCards.filter(card => card.type === 'CHARACTER').length}</p>
                  <p>Événements: {selectedCards.filter(card => card.type === 'EVENT').length}</p>
                  <p>Stages: {selectedCards.filter(card => card.type === 'STAGE').length}</p>
                </div>

                <Button className="w-full" onClick={saveDeck}>
                  Sauvegarder le Deck
                </Button>
              </div>

              <div className="space-y-2">
                {selectedCards.map((card) => (
                  <div
                    key={card.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="relative w-10 h-14">
                        <Image
                          src={card.imageUrl}
                          alt={card.name}
                          fill
                          className="object-cover rounded"
                        />
                      </div>
                      <span className="text-sm">{card.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCardFromDeck(card.id)}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 