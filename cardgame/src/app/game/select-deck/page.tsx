'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { ChevronLeft, Plus, Play } from 'lucide-react'
import Link from 'next/link'

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
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

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

  // Ne pas rendre si on n'est pas côté client
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex justify-center items-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex justify-center items-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (decks.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center mb-8">
            <Button 
              variant="ghost" 
              className="text-white hover:bg-white/10 mr-4"
              onClick={() => router.push('/')}
            >
              <ChevronLeft className="mr-2 h-5 w-5" />
              Retour
            </Button>
            <h1 className="text-3xl font-bold">Sélectionnez votre deck</h1>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 text-center max-w-2xl mx-auto border border-white/20 shadow-xl">
            <div className="text-6xl mb-6">🎴</div>
            <h2 className="text-2xl font-bold mb-4">Aucun deck disponible</h2>
            <p className="text-lg mb-8 text-gray-300">
              Vous n&apos;avez pas encore créé de deck. Créez-en un pour commencer à jouer !
            </p>
            <Link href="/deck-builder">
              <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all">
                <Plus className="mr-2 h-5 w-5" />
            Créer un deck
          </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              className="text-white hover:bg-white/10 mr-4"
              onClick={() => router.push('/')}
            >
              <ChevronLeft className="mr-2 h-5 w-5" />
              Retour
            </Button>
            <h1 className="text-3xl font-bold">Sélectionnez votre deck</h1>
          </div>
          <Link href="/deck-builder">
            <Button className="bg-white/10 hover:bg-white/20 text-white">
              <Plus className="mr-2 h-5 w-5" />
              Nouveau deck
            </Button>
          </Link>
        </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {decks.map((deck, index) => (
            <motion.div
              key={deck.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
          <Card
                className={`p-4 cursor-pointer transition-all h-full ${
                  selectedDeckId === deck.id 
                    ? 'ring-2 ring-blue-500 bg-blue-900/30' 
                    : 'bg-gray-800/50 hover:bg-gray-700/50'
            }`}
            onClick={() => handleDeckSelect(deck.id)}
          >
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl font-bold text-white">{deck.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-2 mb-4">
              {deck.cards.slice(0, 8).map((card) => (
                <div key={card.id} className="relative">
                  <Image
                    src={card.imageUrl}
                    alt={card.name}
                    width={160}
                    height={220}
                    sizes="(max-width: 640px) 25vw, 160px"
                    className="w-full h-auto rounded-lg shadow-md hover:shadow-lg transition-shadow"
                  />
                  {card.quantity > 1 && (
                          <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">
                      {card.quantity}
                    </div>
                  )}
                </div>
              ))}
            </div>
                  <div className="text-sm text-gray-400">
                    {deck.cards.length} cartes au total
                  </div>
                </CardContent>
          </Card>
            </motion.div>
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <Button
          onClick={handleStartGame}
          disabled={!selectedDeckId}
            className={`px-8 py-6 text-lg ${
              selectedDeckId 
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700' 
                : 'bg-gray-700 cursor-not-allowed'
            }`}
          >
            <Play className="mr-2 h-5 w-5" />
          Lancer la partie
        </Button>
        </div>
      </div>
    </div>
  )
} 