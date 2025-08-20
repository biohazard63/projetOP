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
      where: { email: session.user.email.toLowerCase() },
      select: { id: true },
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
      where: { email: session.user.email.toLowerCase() },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Utilisateur non trouvé' 
      }, { status: 404 })
    }

    // Upsert transactionnel pour éviter les doublons
    const counts = new Map<string, number>()
    for (const id of cardIds as string[]) counts.set(id, (counts.get(id) || 0) + 1)
    await prisma.$transaction(
      Array.from(counts.entries()).map(([cardId, qty]) =>
        prisma.userCard.upsert({
          where: { userId_cardId: { userId: user.id, cardId } },
          update: { quantity: { increment: qty } },
          create: { userId: user.id, cardId, quantity: qty },
        })
      )
    )

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