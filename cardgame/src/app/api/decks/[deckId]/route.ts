import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

import { prisma } from '@/lib/prisma'
import { Card } from '@prisma/client'

type CardWithQuantity = Card & { quantity: number }

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const pathname = new URL(request.url).pathname
    const match = /\/api\/decks\/([^/]+)$/.exec(pathname)
    const deckId = match?.[1]
    if (!deckId) {
      return NextResponse.json({ error: 'deckId manquant dans l\'URL' }, { status: 400 })
    }
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const deck = await prisma.deck.findUnique({
      where: {
        id: deckId
      },
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
    })

    if (!deck) {
      return NextResponse.json(
        { error: 'Deck non trouvé' },
        { status: 404 }
      )
    }

    // Transformer le deck pour inclure les cartes avec leur quantité
    const transformedDeck = {
      id: deck.id,
      name: deck.name,
      description: deck.description,
      cards: deck.versions[0]?.cards.map(deckCard => ({
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
        quantity: deckCard.quantity || 1
      })) || []
    }

    return NextResponse.json(transformedDeck)
  } catch (error) {
    console.error('Erreur lors de la récupération du deck:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const pathname = new URL(request.url).pathname
    const match = /\/api\/decks\/([^/]+)$/.exec(pathname)
    const deckId = match?.[1]
    if (!deckId) {
      return NextResponse.json({ error: 'deckId manquant dans l\'URL' }, { status: 400 })
    }
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, cards } = body

    type IncomingCard = { id: string; type: string; quantity?: number }
    console.log('Validation du deck côté serveur: nombre de cartes', Array.isArray(cards) ? cards.length : 0)

    // Vérifier les règles du deck
    const normalizedCards: IncomingCard[] = Array.isArray(cards) ? cards : []
    const leaderCards = normalizedCards.filter((card) => card.type === 'LEADER')
    const nonLeaderCards = normalizedCards.filter((card) => card.type !== 'LEADER')
    
    const leaderCount = leaderCards.reduce((sum: number, card) => sum + (card.quantity || 1), 0)
    const nonLeaderCount = nonLeaderCards.reduce((sum: number, card) => sum + (card.quantity || 1), 0)

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

    // Créer une nouvelle version du deck
    const updatedDeck = await prisma.$transaction(async (tx) => {
      // Créer la nouvelle version
      const newVersion = await tx.deckVersion.create({
        data: {
          name: `Version ${new Date().toISOString()}`,
          deckId: deckId,
        }
      })

      // Ajouter les cartes à la version
      for (const card of normalizedCards) {
        await tx.deckCard.create({
          data: {
            cardId: card.id,
            quantity: card.quantity || 1,
            deckVersionId: newVersion.id
          }
        })
      }

      // Mettre à jour le nom du deck
      await tx.deck.update({
        where: { id: deckId },
        data: { name }
      })

      // Récupérer le deck complet avec sa dernière version
      return tx.deck.findUnique({
        where: { id: deckId },
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

    if (!updatedDeck) {
      throw new Error('Erreur lors de la mise à jour du deck')
    }

    // Transformer le deck pour inclure les cartes avec leur quantité
    const transformedDeck = {
      id: updatedDeck.id,
      name: updatedDeck.name,
      description: updatedDeck.description,
      cards: updatedDeck.versions[0].cards.map(deckCard => ({
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
        quantity: deckCard.quantity || 1
      }))
    }

    return NextResponse.json(transformedDeck)
  } catch (error) {
    console.error('Erreur lors de la mise à jour du deck:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const pathname = new URL(request.url).pathname
    const match = /\/api\/decks\/([^/]+)$/.exec(pathname)
    const deckId = match?.[1]
    if (!deckId) {
      return NextResponse.json({ error: 'deckId manquant dans l\'URL' }, { status: 400 })
    }
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    await prisma.deck.delete({
      where: {
        id: deckId
      }
    })

    return NextResponse.json({ message: 'Deck supprimé avec succès' })
  } catch (error) {
    console.error('Erreur lors de la suppression du deck:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
} 