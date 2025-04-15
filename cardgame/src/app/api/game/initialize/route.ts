import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'

export async function POST() {
  try {
    console.log('Initialisation du jeu')
    
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      console.log('Erreur: Utilisateur non authentifié')
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      console.log('Erreur: Utilisateur non trouvé')
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // Récupérer l'ID du deck actif depuis le cookie
    const cookieStore = cookies()
    const activeDeckId = cookieStore.get('activeDeckId')?.value

    console.log('ID du deck actif depuis le cookie:', activeDeckId)

    if (!activeDeckId) {
      console.log('Aucun deck actif trouvé dans les cookies')
      return NextResponse.json(
        { error: 'Aucun deck actif' },
        { status: 404 }
      )
    }

    // Récupérer le deck actif avec ses cartes
    const activeDeck = await prisma.deck.findFirst({
      where: {
        id: activeDeckId,
        userId: user.id
      },
      include: {
        deckCards: {
          include: {
            card: true
          }
        }
      }
    })

    if (!activeDeck) {
      console.log('Deck actif non trouvé ou n\'appartient pas à l\'utilisateur')
      return NextResponse.json(
        { error: 'Deck non trouvé' },
        { status: 404 }
      )
    }

    console.log('Deck actif trouvé:', activeDeck.name, 'avec', activeDeck.deckCards.length, 'cartes')

    // Générer un deck aléatoire pour l'adversaire
    const allCards = await prisma.card.findMany()
    const shuffledCards = [...allCards].sort(() => Math.random() - 0.5)
    const opponentDeckCards = shuffledCards.slice(0, 50)
    
    // S'assurer qu'il y a un leader dans le deck de l'adversaire
    const hasLeader = opponentDeckCards.some(card => card.type === 'LEADER')
    if (!hasLeader) {
      const leaders = allCards.filter(card => card.type === 'LEADER')
      const randomLeader = leaders[Math.floor(Math.random() * leaders.length)]
      opponentDeckCards[0] = randomLeader
    }

    // Préparer les cartes du joueur
    const playerCards = activeDeck.deckCards.map(dc => ({
      ...dc.card,
      quantity: dc.quantity
    }))

    // Mélanger les decks
    const shuffledPlayerDeck = [...playerCards].sort(() => Math.random() - 0.5)
    const shuffledOpponentDeck = [...opponentDeckCards].sort(() => Math.random() - 0.5)

    // Distribuer les mains initiales (5 cartes chacun)
    const playerHand = shuffledPlayerDeck.slice(0, 5)
    const playerDeck = shuffledPlayerDeck.slice(5)
    const opponentHand = shuffledOpponentDeck.slice(0, 5)
    const opponentDeck = shuffledOpponentDeck.slice(5)

    // Initialiser l'état du jeu
    const gameState = {
      player: {
        id: 'player',
        name: user.name || 'Joueur',
        lifePoints: 5,
        deck: playerDeck,
        hand: playerHand,
        field: [],
        leader: null,
        activeDon: 0
      },
      opponent: {
        id: 'opponent',
        name: 'Adversaire',
        lifePoints: 5,
        deck: opponentDeck,
        hand: opponentHand,
        field: [],
        leader: null,
        activeDon: 0
      },
      currentPhase: 'SETUP',
      currentPlayer: 'player',
      turnNumber: 1,
      gameOver: false
    }

    return NextResponse.json(gameState)
  } catch (error) {
    console.error('Erreur lors de l\'initialisation du jeu:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
} 