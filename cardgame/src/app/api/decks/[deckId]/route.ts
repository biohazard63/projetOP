import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { deckId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const deck = await prisma.deck.findUnique({
      where: {
        id: params.deckId
      },
      include: {
        deckCards: {
          include: {
            card: true
          }
        }
      }
    })

    if (!deck) {
      return NextResponse.json(
        { error: 'Deck non trouvé' },
        { status: 404 }
      )
    }

    return NextResponse.json(deck)
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur serveur' },
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
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, description, cards } = body

    const updatedDeck = await prisma.deck.update({
      where: {
        id: params.deckId
      },
      data: {
        name,
        description,
        deckCards: {
          deleteMany: {},
          create: cards.map((card: any) => ({
            cardId: card.id,
            quantity: card.quantity
          }))
        }
      },
      include: {
        deckCards: {
          include: {
            card: true
          }
        }
      }
    })

    return NextResponse.json(updatedDeck)
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { deckId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    await prisma.deck.delete({
      where: {
        id: params.deckId
      }
    })

    return NextResponse.json({ message: 'Deck supprimé avec succès' })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
} 