import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

import { prisma } from '@/lib/prisma'
import { GameState, GameCard, CardType, CardColor } from '@/types/game'
import { cookies } from 'next/headers'

type BasicCard = {
  id: string
  name: string
  type: string
  color?: string | null
  cost?: number | null
  power?: number | null
  imageUrl?: string | null
  effect?: string | null
  trigger?: string | null
  counter?: number | null
}

function toCardType(typeValue: string): CardType {
  switch (typeValue) {
    case 'LEADER':
    case 'CHARACTER':
    case 'EVENT':
    case 'STAGE':
    case 'DON':
      return typeValue
    default:
      return 'CHARACTER'
  }
}

function toCardColor(colorValue?: string | null): CardColor {
  switch (colorValue) {
    case 'RED':
    case 'BLUE':
    case 'GREEN':
    case 'BLACK':
    case 'PURPLE':
    case 'YELLOW':
      return colorValue
    default:
      return 'RED'
  }
}

function convertToGameCard(card: BasicCard): GameCard {
  return {
    id: card.id,
    name: card.name,
    type: toCardType(card.type),
    color: toCardColor(card.color ?? undefined),
    cost: card.cost || 0,
    power: card.power || 0,
    imageUrl: card.imageUrl || '',
    effect: card.effect || '',
    trigger: card.trigger || '',
    hasTrigger: !!card.trigger,
    hasRush: card.effect?.includes('[Rush]') || false,
    hasBlocker: card.effect?.includes('[Blocker]') || false,
    hasDoubleAttack: card.effect?.includes('[Double Attack]') || false,
    hasCounter: card.counter !== null && card.counter !== undefined,
    counterValue: card.counter || 0,
    isFaceUp: true
  }
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
        playerId: session.user.id,
        isActive: true
      }
    })

    if (!gameState) {
      return NextResponse.json({ error: 'Aucune partie en cours' }, { status: 404 })
    }

    // Vérifier que nous sommes bien en phase de SETUP
    if (gameState.currentPhase !== 'SETUP') {
      return NextResponse.json({ error: 'Action non autorisée dans cette phase' }, { status: 400 })
    }

    // Récupérer l'ID du deck actif depuis le cookie
    const cookieStore = await cookies()
    const activeDeckId = cookieStore.get('activeDeckId')?.value

    if (!activeDeckId) {
      return NextResponse.json({ error: 'Aucun deck actif' }, { status: 404 })
    }

    // Récupérer le deck du joueur
    const playerDeck = await prisma.deck.findFirst({
      where: {
        id: activeDeckId,
        userId: gameState.playerId
      },
      include: {
        versions: {
          include: {
            cards: {
              include: {
                card: true
              }
            }
          }
        }
      }
    })

    if (!playerDeck) {
      return NextResponse.json({ error: 'Deck non trouvé' }, { status: 404 })
    }

    // Obtenir la dernière version du deck
    const latestVersion = playerDeck.versions[playerDeck.versions.length - 1]
    if (!latestVersion) {
      return NextResponse.json({ error: 'Aucune version du deck trouvée' }, { status: 404 })
    }

    // Mélanger le deck et la main actuelle
    const currentHand = Array.isArray(gameState.playerHand) ? (gameState.playerHand as BasicCard[]).map(convertToGameCard) : []
    const deckCards = latestVersion.cards.map(dc => convertToGameCard(dc.card as unknown as BasicCard))
    const allCards = [...deckCards, ...currentHand]
    const shuffledCards = [...allCards]
    shuffledCards.sort(() => Math.random() - 0.5)

    // Piocher une nouvelle main
    const newHand = shuffledCards.slice(0, 5)
    const newDeck = shuffledCards.slice(5)

    // Convertir les cartes en format JSON pour le stockage
    const newHandJson = newHand.map(card => ({
      id: card.id,
      name: card.name,
      type: card.type,
      color: card.color,
      cost: card.cost,
      power: card.power,
      imageUrl: card.imageUrl,
      effect: card.effect,
      trigger: card.trigger,
      hasTrigger: card.hasTrigger,
      hasRush: card.hasRush,
      hasBlocker: card.hasBlocker,
      hasDoubleAttack: card.hasDoubleAttack,
      hasCounter: card.hasCounter,
      counterValue: card.counterValue,
      isFaceUp: true,
      attachedCards: [],
      effects: []
    }))

    const newDeckJson = newDeck.map(card => ({
      id: card.id,
      name: card.name,
      type: card.type,
      color: card.color,
      cost: card.cost,
      power: card.power,
      imageUrl: card.imageUrl,
      effect: card.effect,
      trigger: card.trigger,
      hasTrigger: card.hasTrigger,
      hasRush: card.hasRush,
      hasBlocker: card.hasBlocker,
      hasDoubleAttack: card.hasDoubleAttack,
      hasCounter: card.hasCounter,
      counterValue: card.counterValue,
      isFaceUp: false,
      attachedCards: [],
      effects: []
    }))

    // Mettre à jour l'état du jeu
    const updatedGameState = await prisma.gameState.update({
      where: {
        id: gameState.id
      },
      data: {
        playerDeck: newDeckJson,
        playerHand: newHandJson,
        hasKeptHand: true
      }
    })

    // Convertir en format GameState pour le frontend
    const toBasicCards = (json: unknown): BasicCard[] => Array.isArray(json) ? (json as BasicCard[]) : []

    const gameStateForFrontend: GameState = {
      id: updatedGameState.id,
      player: {
        id: updatedGameState.playerId,
        name: session.user.name || 'Joueur',
        lifePoints: Number(updatedGameState.playerLife) || 5,
        leader: convertToGameCard(updatedGameState.playerLeader as unknown as BasicCard),
        deck: toBasicCards(updatedGameState.playerDeck).map(convertToGameCard),
        hand: toBasicCards(updatedGameState.playerHand).map(convertToGameCard),
        field: toBasicCards(updatedGameState.playerField).map(convertToGameCard),
        donDeck: toBasicCards(updatedGameState.playerDonDeck).map(convertToGameCard),
        trash: toBasicCards(updatedGameState.playerTrash).map(convertToGameCard),
        activeDon: Number(updatedGameState.playerActiveDon) || 0,
        donAddedThisTurn: Number(updatedGameState.playerDonAddedThisTurn) || 0,
        usedDonDeck: toBasicCards(updatedGameState.playerUsedDonDeck).map(convertToGameCard),
        discardPile: toBasicCards(updatedGameState.playerDiscardPile).map(convertToGameCard)
      },
      opponent: {
        id: updatedGameState.opponentId,
        name: 'Adversaire',
        lifePoints: Number(updatedGameState.opponentLife) || 5,
        leader: convertToGameCard(updatedGameState.opponentLeader as unknown as BasicCard),
        deck: toBasicCards(updatedGameState.opponentDeck).map(convertToGameCard),
        hand: toBasicCards(updatedGameState.opponentHand).map(convertToGameCard),
        field: toBasicCards(updatedGameState.opponentField).map(convertToGameCard),
        donDeck: toBasicCards(updatedGameState.opponentDonDeck).map(convertToGameCard),
        trash: toBasicCards(updatedGameState.opponentTrash).map(convertToGameCard),
        activeDon: Number(updatedGameState.opponentActiveDon) || 0,
        donAddedThisTurn: Number(updatedGameState.opponentDonAddedThisTurn) || 0,
        usedDonDeck: toBasicCards(updatedGameState.opponentUsedDonDeck).map(convertToGameCard),
        discardPile: toBasicCards(updatedGameState.opponentDiscardPile).map(convertToGameCard)
      },
      currentPlayer: updatedGameState.currentPlayer as 'player' | 'opponent',
      currentPhase: updatedGameState.currentPhase as GameState['currentPhase'],
      turnNumber: updatedGameState.turnNumber,
      winner: updatedGameState.winner,
      canPlayCard: Boolean(updatedGameState.canPlayCard),
      canAttack: Boolean(updatedGameState.canAttack),
      canEndTurn: Boolean(updatedGameState.canEndTurn),
      gameOver: Boolean(updatedGameState.gameOver),
      isFirstTurn: Boolean(updatedGameState.isFirstTurn)
    }

    return NextResponse.json(gameStateForFrontend)
  } catch (error) {
    console.error('Erreur lors du mulligan:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
} 