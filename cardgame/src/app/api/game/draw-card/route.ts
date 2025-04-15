import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Récupérer une carte aléatoire pour la pioche
    const allCards = await prisma.card.findMany()
    const randomCard = allCards[Math.floor(Math.random() * allCards.length)]

    // Pour l'instant, on retourne simplement un état de jeu simulé
    // Dans une implémentation complète, on mettrait à jour l'état du jeu en base de données
    const gameState = {
      player: {
        id: 'player',
        name: session.user.name || 'Joueur',
        lifePoints: 5,
        deck: [],
        hand: [randomCard],
        field: [],
        leader: null,
        activeDon: 0
      },
      opponent: {
        id: 'opponent',
        name: 'Adversaire',
        lifePoints: 5,
        deck: [],
        hand: [],
        field: [],
        leader: null,
        activeDon: 0
      },
      currentPhase: 'MAIN',
      currentPlayer: 'player',
      turnNumber: 1,
      gameOver: false
    }

    return NextResponse.json(gameState)
  } catch (error) {
    console.error('Erreur lors de la pioche de carte:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
} 