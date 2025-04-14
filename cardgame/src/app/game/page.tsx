'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GameState, GameCard, PlayerState } from '@/types/game'
import { Card } from '@prisma/client'
import { toast } from 'sonner'
import GameBoard from '@/components/GameBoard'
import GameNav from '@/components/GameNav'

export default function Game() {
  const router = useRouter()
  const [playerDeck, setPlayerDeck] = useState<Card[]>([])
  const [opponentDeck, setOpponentDeck] = useState<Card[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeDeckName, setActiveDeckName] = useState<string>('')

  useEffect(() => {
    const initializeGame = async () => {
      try {
        // Récupérer le deck du joueur
        const playerDeckResponse = await fetch('/api/decks/active')
        const playerDeckData = await playerDeckResponse.json()
        
        if (!playerDeckResponse.ok) {
          if (playerDeckResponse.status === 404) {
            // Aucun deck trouvé, rediriger vers la sélection
            router.replace('/game/select-deck')
            return
          }
          throw new Error(playerDeckData.error || 'Erreur lors de la récupération du deck')
        }

        // Stocker le nom du deck actif
        setActiveDeckName(playerDeckData.deck.name)

        // Transformer les cartes du deck
        const cards = playerDeckData.deck.deckCards.map((deckCard: any) => ({
          ...deckCard.card,
          quantity: deckCard.quantity
        }))

        setPlayerDeck(cards)

        // Log des informations du deck du joueur
        console.log('=== DECK DU JOUEUR ===')
        console.log(`Nom du deck: ${playerDeckData.deck.name}`)
        console.log(`Nombre de cartes: ${cards.length}`)
        console.log('Liste des cartes:')
        cards.forEach(card => {
          console.log(`- ${card.name} (x${card.quantity})`)
        })
        console.log('=====================')

        // TODO: Implémenter la logique pour générer le deck de l'adversaire
        // Pour l'instant, on utilise un deck aléatoire
        const opponentDeckResponse = await fetch('/api/decks/random')
        const opponentDeckData = await opponentDeckResponse.json()
        
        if (!opponentDeckResponse.ok) {
          throw new Error(opponentDeckData.error || 'Erreur lors de la génération du deck adverse')
        }

        setOpponentDeck(opponentDeckData.deck)

        // Log des informations du deck de l'adversaire
        console.log('=== DECK DE L\'ADVERSAIRE ===')
        console.log(`Nombre de cartes: ${opponentDeckData.deck.length}`)
        console.log('Liste des cartes:')
        opponentDeckData.deck.forEach((card: Card) => {
          console.log(`- ${card.name}`)
        })
        console.log('==========================')
      } catch (error) {
        console.error('Erreur lors de l\'initialisation du jeu:', error)
        toast.error('Erreur lors de l\'initialisation du jeu')
      } finally {
        setIsLoading(false)
      }
    }

    initializeGame()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-2xl">Chargement du jeu...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <GameNav />
      <div className="pt-4">
        <div className="container mx-auto px-4 mb-4">
          <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
            <h2 className="text-white text-xl font-bold mb-2">Informations sur les decks</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-blue-400 font-semibold">Votre deck</h3>
                <p className="text-white">Nom: {activeDeckName}</p>
                <p className="text-white">Nombre de cartes: {playerDeck.length}</p>
              </div>
              <div>
                <h3 className="text-red-400 font-semibold">Deck de l'adversaire</h3>
                <p className="text-white">Nombre de cartes: {opponentDeck.length}</p>
              </div>
            </div>
          </div>
        </div>
        <GameBoard
          playerId="player"
          opponentId="opponent"
          playerDeck={playerDeck}
          opponentDeck={opponentDeck}
        />
      </div>
    </div>
  )
} 