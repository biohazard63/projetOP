import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const { cardId } = await request.json()
    
    if (!cardId) {
      return NextResponse.json(
        { error: 'ID de carte manquant' },
        { status: 400 }
      )
    }

    // Récupérer la carte
    const card = await prisma.card.findUnique({
      where: { id: cardId }
    })

    if (!card) {
      return NextResponse.json(
        { error: 'Carte non trouvée' },
        { status: 404 }
      )
    }

    // Pour l'instant, on retourne simplement un état de jeu simulé
    // Dans une implémentation complète, on mettrait à jour l'état du jeu en base de données
    const gameState = {
      player: {
        id: 'player',
        name: session.user.name || 'Joueur',
        lifePoints: 5,
        deck: [],
        hand: [],
        field: [card],
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
      currentPlayer: 'opponent',
      turnNumber: 1,
      gameOver: false
    }

    return NextResponse.json(gameState)
  } catch (error) {
    console.error('Erreur lors du jeu de la carte:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
} 