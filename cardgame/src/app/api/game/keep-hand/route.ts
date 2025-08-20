import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

import { prisma } from '@/lib/prisma'
import { GameState, GameCard } from '@/types/game'

function parseGameCard(jsonCard: any): GameCard | null {
  if (!jsonCard) return null;
  return {
    id: jsonCard.id,
    name: jsonCard.name,
    type: jsonCard.type,
    color: jsonCard.color,
    cost: jsonCard.cost,
    power: jsonCard.power,
    imageUrl: jsonCard.imageUrl,
    effect: jsonCard.effect,
    trigger: jsonCard.trigger,
    isLeader: jsonCard.isLeader,
    isDon: jsonCard.isDon,
    position: jsonCard.position,
    hasAttacked: jsonCard.hasAttacked,
    hasRush: jsonCard.hasRush,
    hasBlocker: jsonCard.hasBlocker,
    hasDoubleAttack: jsonCard.hasDoubleAttack,
    hasTrigger: jsonCard.hasTrigger,
    hasCounter: jsonCard.hasCounter,
    counterValue: jsonCard.counterValue,
    attachedDons: jsonCard.attachedDons || 0,
    attachedCards: jsonCard.attachedCards?.map(parseGameCard).filter(Boolean) || [],
    isFaceUp: jsonCard.isFaceUp,
    effects: jsonCard.effects || [],
    isBlocking: jsonCard.isBlocking,
    isBlocked: jsonCard.isBlocked,
    blocker: jsonCard.blocker ? (parseGameCard(jsonCard.blocker) || undefined) : undefined
  };
}

function parseGameCards(jsonCards: any[]): GameCard[] {
  if (!Array.isArray(jsonCards)) return [];
  return jsonCards.map(parseGameCard).filter((card): card is GameCard => card !== null);
}

export async function POST() {
  try {
    const session = await auth()
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
        name: updatedGameState.player.name || 'Joueur',
        lifePoints: updatedGameState.playerLife,
        leader: parseGameCard(updatedGameState.playerLeader),
        deck: parseGameCards(Array.isArray(updatedGameState.playerDeck) ? updatedGameState.playerDeck : []),
        hand: parseGameCards(Array.isArray(updatedGameState.playerHand) ? updatedGameState.playerHand : []),
        field: parseGameCards(Array.isArray(updatedGameState.playerField) ? updatedGameState.playerField : []),
        donDeck: parseGameCards(Array.isArray(updatedGameState.playerDonDeck) ? updatedGameState.playerDonDeck : []),
        trash: parseGameCards(Array.isArray(updatedGameState.playerTrash) ? updatedGameState.playerTrash : []),
        activeDon: Number(updatedGameState.playerActiveDon) || 0,
        donAddedThisTurn: Number(updatedGameState.playerDonAddedThisTurn) || 0,
        usedDonDeck: parseGameCards(Array.isArray(updatedGameState.playerUsedDonDeck) ? updatedGameState.playerUsedDonDeck : []),
        discardPile: parseGameCards(Array.isArray(updatedGameState.playerDiscardPile) ? updatedGameState.playerDiscardPile : [])
      },
      opponent: {
        id: updatedGameState.opponent.id,
        name: updatedGameState.opponent.name || 'Adversaire',
        lifePoints: updatedGameState.opponentLife,
        leader: parseGameCard(updatedGameState.opponentLeader),
        deck: parseGameCards(Array.isArray(updatedGameState.opponentDeck) ? updatedGameState.opponentDeck : []),
        hand: parseGameCards(Array.isArray(updatedGameState.opponentHand) ? updatedGameState.opponentHand : []),
        field: parseGameCards(Array.isArray(updatedGameState.opponentField) ? updatedGameState.opponentField : []),
        donDeck: parseGameCards(Array.isArray(updatedGameState.opponentDonDeck) ? updatedGameState.opponentDonDeck : []),
        trash: parseGameCards(Array.isArray(updatedGameState.opponentTrash) ? updatedGameState.opponentTrash : []),
        activeDon: Number(updatedGameState.opponentActiveDon) || 0,
        donAddedThisTurn: Number(updatedGameState.opponentDonAddedThisTurn) || 0,
        usedDonDeck: parseGameCards(Array.isArray(updatedGameState.opponentUsedDonDeck) ? updatedGameState.opponentUsedDonDeck : []),
        discardPile: parseGameCards(Array.isArray(updatedGameState.opponentDiscardPile) ? updatedGameState.opponentDiscardPile : [])
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