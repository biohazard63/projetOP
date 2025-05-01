import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
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
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        decks: {
          include: {
            versions: {
              orderBy: {
                createdAt: 'desc'
              },
              take: 1,
              include: {
                cards: {
                  include: {
                    card: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // Transformer les decks dans le format attendu
    const transformedDecks = user.decks.map(deck => {
      const latestVersion = deck.versions[0]
      return {
        id: deck.id,
        name: deck.name,
        cards: latestVersion ? latestVersion.cards.map(deckCard => ({
          id: deckCard.card.id,
          name: deckCard.card.name,
          type: deckCard.card.type,
          color: deckCard.card.color,
          cost: deckCard.card.cost,
          power: deckCard.card.power,
          counter: deckCard.card.counter,
          effect: deckCard.card.effect,
          rarity: deckCard.card.rarity,
          imageUrl: deckCard.card.imageUrl,
          set: deckCard.card.set,
          attribute: deckCard.card.attribute,
          attributeImage: deckCard.card.attributeImage,
          family: deckCard.card.family,
          ability: deckCard.card.ability,
          trigger: deckCard.card.trigger,
          notes: deckCard.card.notes,
          code: deckCard.card.code,
          isParallel: deckCard.card.isParallel,
          isAltArt: deckCard.card.isAltArt,
          isSpecial: deckCard.card.isSpecial,
          quantity: deckCard.quantity
        })) : []
      }
    })

    return NextResponse.json({ decks: transformedDecks })
  } catch (error) {
    console.error('Erreur lors de la récupération des decks:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
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

    // Créer le deck avec sa première version
    const deck = await prisma.$transaction(async (tx) => {
      // Créer le deck
      const newDeck = await tx.deck.create({
        data: {
          name,
          userId: user.id,
        }
      })

      // Créer la première version du deck
      const newVersion = await tx.deckVersion.create({
        data: {
          name: 'Version 1',
          deckId: newDeck.id,
        }
      })

      // Ajouter les cartes à la version
      for (const card of cards) {
        await tx.deckCard.create({
          data: {
            cardId: card.id,
            quantity: card.quantity || 1,
            deckVersionId: newVersion.id
          }
        })
      }

      // Récupérer le deck complet avec sa version et ses cartes
      return tx.deck.findUnique({
        where: { id: newDeck.id },
        include: {
          versions: {
            where: { id: newVersion.id },
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
    })

    if (!deck) {
      throw new Error('Erreur lors de la création du deck')
    }

    // Transformer le deck pour inclure les cartes avec leur quantité
    const transformedDeck: TransformedDeck = {
      id: deck.id,
      name: deck.name,
      cards: deck.versions[0].cards.map(deckCard => ({
        id: deckCard.card.id,
        name: deckCard.card.name,
        type: deckCard.card.type,
        color: deckCard.card.color,
        cost: deckCard.card.cost,
        power: deckCard.card.power,
        counter: deckCard.card.counter,
        effect: deckCard.card.effect,
        rarity: deckCard.card.rarity,
        imageUrl: deckCard.card.imageUrl,
        set: deckCard.card.set,
        attribute: deckCard.card.attribute,
        attributeImage: deckCard.card.attributeImage,
        family: deckCard.card.family,
        ability: deckCard.card.ability,
        trigger: deckCard.card.trigger,
        notes: deckCard.card.notes,
        code: deckCard.card.code,
        isParallel: deckCard.card.isParallel,
        isAltArt: deckCard.card.isAltArt,
        isSpecial: deckCard.card.isSpecial,
        quantity: deckCard.quantity
      }))
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