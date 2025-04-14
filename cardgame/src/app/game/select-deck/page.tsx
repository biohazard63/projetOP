'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface Deck {
  id: string
  name: string
  cards: Array<{
    id: string
    name: string
    imageUrl: string
    quantity: number
  }>
}

export default function SelectDeckPage() {
  const router = useRouter()
  const [decks, setDecks] = useState<Deck[]>([])
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDecks()
  }, [])

  const fetchDecks = async () => {
    try {
      const response = await fetch('/api/decks')
      if (!response.ok) throw new Error('Erreur lors de la récupération des decks')
      const data = await response.json()
      
      // S'assurer que data.decks est un tableau
      if (Array.isArray(data.decks)) {
        setDecks(data.decks)
      } else {
        console.error('Format de données invalide:', data)
        setDecks([])
        toast.error('Format de données invalide reçu du serveur')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la récupération des decks')
      setDecks([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeckSelect = (deckId: string) => {
    console.log('Deck sélectionné:', deckId)
    setSelectedDeckId(deckId)
  }

  const handleStartGame = async () => {
    if (!selectedDeckId) {
      toast.error('Veuillez sélectionner un deck')
      return
    }

    console.log('Tentative d\'activation du deck:', selectedDeckId)
    try {
      const response = await fetch(`/api/decks/${selectedDeckId}/activate`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Erreur lors de l\'activation:', errorData)
        throw new Error(errorData.error || 'Erreur lors de l\'activation du deck')
      }
      
      const data = await response.json()
      console.log('Réponse de l\'activation:', data)
      toast.success(`Deck "${data.deck.name}" activé avec succès`)
      
      // Rediriger vers la page de jeu avec un rechargement complet
      console.log('Redirection vers /game avec rechargement')
      window.location.href = '/game'
    } catch (error) {
      console.error('Erreur lors de l\'activation du deck:', error)
      toast.error('Erreur lors de l\'activation du deck')
    }
  }

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Chargement...</div>
  }

  if (decks.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">Sélectionnez votre deck</h1>
        <div className="text-center">
          <p className="text-lg mb-4">Aucun deck disponible</p>
          <Button onClick={() => router.push('/decks')}>
            Créer un deck
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Sélectionnez votre deck</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {decks.map((deck) => (
          <Card
            key={deck.id}
            className={`p-4 cursor-pointer transition-all ${
              selectedDeckId === deck.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => handleDeckSelect(deck.id)}
          >
            <h2 className="text-xl font-semibold mb-4">{deck.name}</h2>
            <div className="grid grid-cols-4 gap-2">
              {deck.cards.slice(0, 8).map((card) => (
                <div key={card.id} className="relative">
                  <img
                    src={card.imageUrl}
                    alt={card.name}
                    className="w-full rounded-lg"
                  />
                  {card.quantity > 1 && (
                    <div className="absolute top-1 right-1 bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">
                      {card.quantity}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <Button
          onClick={handleStartGame}
          disabled={!selectedDeckId}
          className="px-8"
        >
          Lancer la partie
        </Button>
      </div>
    </div>
  )
} 