import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GameState } from '@/types/game'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer l'état du jeu actuel
    const gameState = await prisma.gameState.findFirst({
      where: {
        player: {
          email: session.user.email
        },
        isActive: true
      },
      include: {
        player: true,
        opponent: true
      }
    })

    if (!gameState) {
      return NextResponse.json({ error: 'Aucune partie en cours' }, { status: 404 })
    }

    // Vérifier que nous sommes bien en phase de SETUP
    if (gameState.currentPhase !== 'SETUP') {
      return NextResponse.json({ error: 'Action non autorisée dans cette phase' }, { status: 400 })
    }

    // Mettre à jour l'état du jeu pour passer à la phase suivante
    const updatedGameState = await prisma.gameState.update({
      where: {
        id: gameState.id
      },
      data: {
        currentPhase: 'DRAW',
        hasKeptHand: true
      },
      include: {
        player: true,
        opponent: true
      }
    })

    // Convertir en format GameState pour le frontend
    const gameStateForFrontend: GameState = {
      id: updatedGameState.id,
      player: {
        id: updatedGameState.player.id,
        name: updatedGameState.player.name,
        lifePoints: updatedGameState.playerLife,
        leader: updatedGameState.playerLeader,
        deck: updatedGameState.playerDeck,
        hand: updatedGameState.playerHand,
        field: updatedGameState.playerField,
        donDeck: updatedGameState.playerDonDeck,
        trash: updatedGameState.playerTrash,
        activeDon: updatedGameState.playerActiveDon,
        donAddedThisTurn: updatedGameState.playerDonAddedThisTurn,
        usedDonDeck: updatedGameState.playerUsedDonDeck,
        discardPile: updatedGameState.playerDiscardPile
      },
      opponent: {
        id: updatedGameState.opponent.id,
        name: updatedGameState.opponent.name,
        lifePoints: updatedGameState.opponentLife,
        leader: updatedGameState.opponentLeader,
        deck: updatedGameState.opponentDeck,
        hand: updatedGameState.opponentHand,
        field: updatedGameState.opponentField,
        donDeck: updatedGameState.opponentDonDeck,
        trash: updatedGameState.opponentTrash,
        activeDon: updatedGameState.opponentActiveDon,
        donAddedThisTurn: updatedGameState.opponentDonAddedThisTurn,
        usedDonDeck: updatedGameState.opponentUsedDonDeck,
        discardPile: updatedGameState.opponentDiscardPile
      },
      currentPlayer: updatedGameState.currentPlayer as 'player' | 'opponent',
      currentPhase: updatedGameState.currentPhase as any,
      turnNumber: updatedGameState.turnNumber,
      winner: updatedGameState.winner,
      canPlayCard: updatedGameState.canPlayCard,
      canAttack: updatedGameState.canAttack,
      canEndTurn: updatedGameState.canEndTurn,
      gameOver: updatedGameState.gameOver,
      isFirstTurn: updatedGameState.isFirstTurn
    }

    return NextResponse.json(gameStateForFrontend)
  } catch (error) {
    console.error('Erreur lors de la confirmation de la main:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
} 