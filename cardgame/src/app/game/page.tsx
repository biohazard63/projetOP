'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { GameBoard } from '@/components/game/GameBoard'
import { GameState, GameCard } from '@/types/game'
import { toast } from 'sonner'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

function GameContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [decks, setDecks] = useState<any[]>([])
  const [showDeckSelection, setShowDeckSelection] = useState(false)

  useEffect(() => {
    const fetchDecks = async () => {
      try {
        const response = await fetch('/api/decks', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des decks')
        }

        const data = await response.json()
        setDecks(data.decks || [])
      } catch (error) {
        console.error('Erreur:', error)
        toast.error('Impossible de récupérer les decks')
      }
    }

    if (showDeckSelection) {
      fetchDecks()
    }
  }, [showDeckSelection])

  useEffect(() => {
    const initializeGame = async () => {
      try {
        setIsLoading(true)
        setError(null)
        console.log('Initialisation du jeu...')

        // Vérifier si un deckId est fourni dans l'URL
        const deckId = searchParams.get('deckId')
        
        if (deckId) {
          console.log('Deck ID trouvé dans l\'URL:', deckId)
          // Définir ce deck comme actif
          const activeResponse = await fetch('/api/decks/active', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ deckId }),
          })
          
          if (!activeResponse.ok) {
            throw new Error('Erreur lors de la définition du deck actif')
          }
          
          console.log('Deck défini comme actif avec succès')
        }

        // Attendre un court instant pour s'assurer que le cookie est bien défini
        await new Promise(resolve => setTimeout(resolve, 500))

        const response = await fetch('/api/game/initialize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          const errorData = await response.json()
          if (response.status === 404 && errorData.error === 'Deck non trouvé') {
            setShowDeckSelection(true)
            setIsLoading(false)
            return
          }
          throw new Error(errorData.error || 'Erreur lors de l\'initialisation du jeu')
        }

        const initialState = await response.json()
        console.log('État initial du jeu:', initialState)
        setGameState(initialState)
      } catch (error) {
        console.error('Erreur:', error)
        setError(error instanceof Error ? error.message : 'Erreur lors de l\'initialisation du jeu')
        toast.error('Impossible de démarrer le jeu')
      } finally {
        setIsLoading(false)
      }
    }

    if (session) {
      initializeGame()
    }
  }, [session, router, searchParams])

  const handleCardClick = async (card: GameCard) => {
    if (!gameState) return

    try {
      const response = await fetch('/api/game/play-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cardId: card.id }),
      })

      if (!response.ok) {
        throw new Error('Erreur lors du jeu de la carte')
      }

      const updatedState = await response.json()
      setGameState(updatedState)
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Impossible de jouer la carte')
    }
  }

  const handleEndTurn = async () => {
    if (!gameState) return

    try {
      const response = await fetch('/api/game/end-turn', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la fin du tour')
      }

      const updatedState = await response.json()
      setGameState(updatedState)
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Impossible de terminer le tour')
    }
  }

  const handleDrawCard = async () => {
    if (!gameState) return

    try {
      const response = await fetch('/api/game/draw-card', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la pioche')
      }

      const updatedState = await response.json()
      setGameState(updatedState)
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Impossible de piocher une carte')
    }
  }

  const selectDeck = async (deckId: string) => {
    try {
      setIsLoading(true)
      
      // Définir ce deck comme actif
      const response = await fetch('/api/decks/active', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deckId }),
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la sélection du deck')
      }

      // Forcer le rechargement complet de la page
      window.location.href = `/game?deckId=${deckId}`
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Impossible de sélectionner le deck')
      setIsLoading(false)
    }
  }

  if (isLoading && !showDeckSelection) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (showDeckSelection) {
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold text-white mb-6">Sélectionnez un deck pour jouer</h1>
          
          {decks.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-6 text-center">
              <p className="text-white mb-4">Vous n'avez pas encore de deck. Créez-en un pour commencer à jouer !</p>
              <Link href="/deck-builder">
                <Button>Créer un deck</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {decks.map((deck) => (
                <div key={deck.id} className="bg-gray-800 rounded-lg p-6">
                  <h2 className="text-xl font-semibold text-white mb-2">{deck.name}</h2>
                  <p className="text-gray-400 mb-4">
                    {deck.cards.length} cartes
                  </p>
                  <Button 
                    onClick={() => selectDeck(deck.id)}
                    className="w-full"
                  >
                    Jouer avec ce deck
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-center">
          <h1 className="text-2xl font-bold mb-4">Erreur</h1>
          <p className="mb-4">{error}</p>
          <Button onClick={() => router.push('/decks')}>
            Retour aux decks
          </Button>
        </div>
      </div>
    )
  }

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-center">
          <h1 className="text-2xl font-bold mb-4">Erreur</h1>
          <p className="mb-4">Impossible de charger l'état du jeu</p>
          <Button onClick={() => router.push('/decks')}>
            Retour aux decks
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <GameBoard
        gameState={gameState}
        onCardClick={handleCardClick}
        onEndTurn={handleEndTurn}
        onDrawCard={handleDrawCard}
      />
    </div>
  )
}

export default function GamePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    }>
      <GameContent />
    </Suspense>
  )
} 