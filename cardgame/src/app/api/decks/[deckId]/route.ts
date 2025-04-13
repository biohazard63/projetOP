import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { deckId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: 'Non autorisé' },
        { status: 401 }
      )
    }

    const deck = await prisma.deck.findUnique({
      where: {
        id: params.deckId,
        user: {
          email: session.user.email
        }
      },
      include: {
        cards: true
      }
    })

    if (!deck) {
      return NextResponse.json(
        { message: 'Deck non trouvé' },
        { status: 404 }
      )
    }

    return NextResponse.json(deck)
  } catch (error) {
    console.error('Erreur lors de la récupération du deck:', error)
    return NextResponse.json(
      { message: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { deckId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: 'Non autorisé' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, cards } = body

    // Vérifier que le deck existe et appartient à l'utilisateur
    const existingDeck = await prisma.deck.findUnique({
      where: {
        id: params.deckId,
        user: {
          email: session.user.email
        }
      }
    })

    if (!existingDeck) {
      return NextResponse.json(
        { message: 'Deck non trouvé' },
        { status: 404 }
      )
    }

    // Mettre à jour le deck
    const updatedDeck = await prisma.deck.update({
      where: {
        id: params.deckId
      },
      data: {
        name,
        cards: {
          set: cards.map((card: any) => ({
            id: card.id
          }))
        }
      },
      include: {
        cards: true
      }
    })

    return NextResponse.json(updatedDeck)
  } catch (error) {
    console.error('Erreur lors de la mise à jour du deck:', error)
    return NextResponse.json(
      { message: 'Erreur serveur' },
      { status: 500 }
    )
  }
} 