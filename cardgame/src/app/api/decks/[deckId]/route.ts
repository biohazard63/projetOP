import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

type RawDeckWithCards = {
  id: string
  name: string
  description: string | null
  userId: string
  createdAt: Date
  updatedAt: Date
  cards: {
    id: string
    code: string
    name: string
    type: string
    color: string
    cost: number
    power: number | null
    counter: number | null
    effect: string | null
    rarity: string
    imageUrl: string
    set: string | null
    attribute: string | null
    attributeImage: string | null
    family: string | null
    ability: string | null
    trigger: string | null
    notes: string | null
    quantity: number
  }[] | null
}

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

    const { deckId } = params

    // Récupérer le deck avec ses cartes
    const decksWithCards = await prisma.$queryRaw<RawDeckWithCards[]>`
      SELECT 
        d.*,
        json_agg(
          json_build_object(
            'id', c.id,
            'code', c.code,
            'name', c.name,
            'type', c.type,
            'color', c.color,
            'cost', c.cost,
            'power', c.power,
            'counter', c.counter,
            'effect', c.effect,
            'rarity', c.rarity,
            'imageUrl', c."imageUrl",
            'set', c.set,
            'attribute', c.attribute,
            'attributeImage', c."attributeImage",
            'family', c.family,
            'ability', c.ability,
            'trigger', c.trigger,
            'notes', c.notes,
            'quantity', dc.quantity
          )
        ) as cards
      FROM "Deck" d
      LEFT JOIN "DeckCard" dc ON d.id = dc."deckId"
      LEFT JOIN "Card" c ON dc."cardId" = c.id
      WHERE d.id = ${deckId}
      AND d."userId" = (
        SELECT id FROM "User" WHERE email = ${session.user.email}
      )
      GROUP BY d.id
    `

    if (!decksWithCards || decksWithCards.length === 0) {
      return NextResponse.json(
        { message: 'Deck non trouvé' },
        { status: 404 }
      )
    }

    const deck = decksWithCards[0]
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