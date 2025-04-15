'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { GameBoard } from '@/components/game/GameBoard'
import { GameState, GameCard } from '@/types/game'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export default function GamePage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initializeGame = async () => {
      try {
        setIsLoading(true)
        console.log('Initialisation du jeu...')

        const response = await fetch('/api/game/initialize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message || 'Erreur lors de l\'initialisation du jeu')
        }

        const initialState = await response.json()
        console.log('État initial du jeu:', initialState)
        setGameState(initialState)
      } catch (error) {
        console.error('Erreur:', error)
        toast.error('Impossible de démarrer le jeu')
        router.push('/')
      } finally {
        setIsLoading(false)
      }
    }

    if (session) {
      initializeGame()
    }
  }, [session, router])

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

  if (isLoading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-center">
          <h1 className="text-2xl font-bold mb-4">Erreur</h1>
          <p>Impossible de charger l'état du jeu</p>
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