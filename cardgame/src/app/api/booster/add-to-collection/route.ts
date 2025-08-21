import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const { cardIds } = (await request.json()) as { cardIds: unknown }

    if (!Array.isArray(cardIds) || cardIds.some((id) => typeof id !== 'string')) {
      return NextResponse.json(
        { success: false, error: 'Format de données invalide' },
        { status: 400 }
      )
    }

    // normaliser email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    if (cardIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Aucune carte fournie' },
        { status: 400 }
      )
    }

    // Compter les occurrences en cas de doublons
    const counts = new Map<string, number>()
    for (const id of cardIds as string[]) {
      counts.set(id, (counts.get(id) || 0) + 1)
    }

    // Transaction atomique avec upsert par carte
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
      message: 'Cartes ajoutées à la collection avec succès',
      added: counts.size,
    })
  } catch (error) {
    console.error('API add-to-collection: erreur:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}