import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.email) {
      return NextResponse.json({ 
        success: false, 
        error: 'Non authentifié' 
      }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Utilisateur non trouvé' 
      }, { status: 404 })
    }

    // Récupérer les cartes de l'utilisateur via UserCard
    const userCards = await prisma.userCard.findMany({
      where: { userId: user.id },
      include: {
        card: true
      }
    })

    // Transformer les résultats pour n'avoir que les cartes
    const cards = userCards.map(userCard => userCard.card)

    return NextResponse.json({
      success: true,
      cards
    })
  } catch (error) {
    console.error('Erreur lors de la récupération de la collection:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Erreur serveur' 
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user?.email) {
      return NextResponse.json({ 
        success: false, 
        error: 'Non authentifié' 
      }, { status: 401 })
    }

    const { cardIds } = await request.json()

    if (!Array.isArray(cardIds)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Format de données invalide' 
      }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Utilisateur non trouvé' 
      }, { status: 404 })
    }

    // Ajouter les cartes à la collection de l'utilisateur via UserCard
    for (const cardId of cardIds) {
      // Vérifier si l'utilisateur a déjà cette carte
      const existingUserCard = await prisma.userCard.findUnique({
        where: {
          userId_cardId: {
            userId: user.id,
            cardId: cardId
          }
        }
      })

      if (existingUserCard) {
        // Incrémenter la quantité si l'utilisateur a déjà cette carte
        await prisma.userCard.update({
          where: {
            id: existingUserCard.id
          },
          data: {
            quantity: existingUserCard.quantity + 1
          }
        })
      } else {
        // Créer une nouvelle entrée UserCard
        await prisma.userCard.create({
          data: {
            userId: user.id,
            cardId: cardId,
            quantity: 1
          }
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Cartes ajoutées à la collection avec succès'
    })
  } catch (error) {
    console.error('Erreur lors de l\'ajout à la collection:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Erreur serveur' 
    }, { status: 500 })
  }
} 