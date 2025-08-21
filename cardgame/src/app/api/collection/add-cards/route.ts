import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    // Récupérer la session de l'utilisateur
    const session = await auth()
    
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json(
        { error: 'Utilisateur non authentifié' },
        { status: 401 }
      );
    }

    const { cardIds } = await request.json()
    
    if (!cardIds || !Array.isArray(cardIds) || cardIds.length === 0) {
      return NextResponse.json(
        { error: 'Aucune carte à ajouter' },
        { status: 400 }
      );
    }

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Ajouter les cartes (upsert + transaction pour éviter les doublons)
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

    return NextResponse.json({ success: true, message: `${cardIds.length} cartes ajoutées à votre collection` })
  } catch (error) {
    console.error('Erreur lors de l\'ajout des cartes à la collection:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'ajout des cartes à la collection' },
      { status: 500 }
    )
  }
} 