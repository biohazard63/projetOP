import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET /api/decks - Récupérer tous les decks de l'utilisateur
export async function GET(request: Request) {
  try {
    console.log('API Decks: Début de la requête GET')
    
    const session = await getServerSession(authOptions)
    console.log('API Decks: Session récupérée', session ? 'Oui' : 'Non')

    if (!session?.user?.email) {
      console.log('API Decks: Utilisateur non authentifié')
      return NextResponse.json(
        { message: 'Non autorisé' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        decks: {
          include: {
            cards: true
          }
        }
      }
    })

    if (!user) {
      console.log('API Decks: Utilisateur non trouvé')
      return NextResponse.json(
        { message: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    console.log('API Decks: Decks récupérés avec succès')
    return NextResponse.json(user.decks)
  } catch (error) {
    console.error('API Decks: Erreur lors de la récupération des decks:', error)
    return NextResponse.json(
      { message: 'Erreur serveur', error: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    )
  }
}

// POST /api/decks - Créer un nouveau deck
export async function POST(request: Request) {
  try {
    console.log('API Decks: Début de la requête POST')
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: 'Non autorisé' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, cards } = body

    if (!name || !Array.isArray(cards)) {
      return NextResponse.json(
        { message: 'Données invalides' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json(
        { message: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier les règles du deck
    const leaderCount = cards.filter(card => card.type === 'LEADER').length
    if (leaderCount !== 1) {
      return NextResponse.json(
        { message: 'Le deck doit contenir exactement 1 leader' },
        { status: 400 }
      )
    }

    if (cards.length !== 50) {
      return NextResponse.json(
        { message: 'Le deck doit contenir exactement 50 cartes' },
        { status: 400 }
      )
    }

    // Créer le deck
    const deck = await prisma.deck.create({
      data: {
        name,
        userId: user.id,
        cards: {
          connect: cards.map(card => ({ id: card.id }))
        }
      },
      include: {
        cards: true
      }
    })

    console.log('API Decks: Deck créé avec succès')
    return NextResponse.json(deck)
  } catch (error) {
    console.error('API Decks: Erreur lors de la création du deck:', error)
    return NextResponse.json(
      { message: 'Erreur serveur', error: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    )
  }
} 