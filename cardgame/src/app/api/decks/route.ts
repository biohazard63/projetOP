import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { Prisma, Card, Deck } from '@prisma/client'

type CardWithQuantity = Card & { quantity: number }

interface CreateDeckRequest {
  name: string
  cards: CardWithQuantity[]
}

interface TransformedDeck {
  id: string
  name: string
  cards: CardWithQuantity[]
}

interface RawDeckWithCards extends Deck {
  cards: Array<Card & { quantity: number }>
}

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
      where: { email: session.user.email }
    })

    if (!user) {
      console.log('API Decks: Utilisateur non trouvé')
      return NextResponse.json(
        { message: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // Récupérer les decks avec leurs cartes
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
      WHERE d."userId" = ${user.id}
      GROUP BY d.id
    `

    // Transformer les decks
    const transformedDecks: TransformedDeck[] = decksWithCards.map(deck => ({
      id: deck.id,
      name: deck.name,
      description: deck.description,
      userId: deck.userId,
      createdAt: deck.createdAt,
      updatedAt: deck.updatedAt,
      cards: deck.cards || []
    }))

    console.log('API Decks: Decks récupérés avec succès')
    return NextResponse.json(transformedDecks)
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
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    const body: CreateDeckRequest = await request.json()
    const { name, cards } = body

    // Vérifier les règles du deck en tenant compte des quantités
    const leaderCards = cards.filter(card => card.type === 'LEADER')
    const nonLeaderCards = cards.filter(card => card.type !== 'LEADER')
    
    const leaderCount = leaderCards.reduce((sum, card) => sum + (card.quantity || 1), 0)
    const nonLeaderCount = nonLeaderCards.reduce((sum, card) => sum + (card.quantity || 1), 0)

    if (leaderCount !== 1) {
      return NextResponse.json(
        { error: 'Le deck doit contenir exactement 1 leader' },
        { status: 400 }
      )
    }

    if (nonLeaderCount !== 50) {
      return NextResponse.json(
        { error: 'Le deck doit contenir exactement 50 cartes (sans compter le leader)' },
        { status: 400 }
      )
    }

    // Créer le deck avec ses cartes
    const deck = await prisma.$transaction(async (tx) => {
      // Créer le deck
      const newDeck = await tx.deck.create({
        data: {
          name,
          userId: user.id,
        }
      })

      // Ajouter les cartes avec leurs quantités
      for (const card of cards) {
        await tx.$executeRaw`
          INSERT INTO "DeckCard" (id, "deckId", "cardId", "quantity")
          VALUES (gen_random_uuid(), ${newDeck.id}, ${card.id}, ${card.quantity || 1})
        `
      }

      // Récupérer le deck avec ses cartes
      const result = await tx.$queryRaw<RawDeckWithCards[]>`
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
        WHERE d.id = ${newDeck.id}
        GROUP BY d.id
      `

      return result[0]
    })

    if (!deck) {
      throw new Error('Erreur lors de la création du deck')
    }

    // Transformer le deck pour inclure les cartes avec leur quantité
    const transformedDeck: TransformedDeck = {
      id: deck.id,
      name: deck.name,
      cards: deck.cards
    }

    console.log('API Decks: Deck créé avec succès')
    return NextResponse.json(transformedDeck)
  } catch (error) {
    console.error('API Decks: Erreur lors de la création du deck:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du deck' },
      { status: 500 }
    )
  }
} 