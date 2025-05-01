import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        userCards: true,
        favorites: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    // Formater les données pour le frontend
    const userData = {
      cards: user.userCards.map(card => ({
        cardId: card.cardId,
        quantity: card.quantity
      })),
      favorites: user.favorites.map(favorite => ({
        cardId: favorite.cardId
      }))
    }

    return NextResponse.json(userData)
  } catch (error) {
    console.error('Erreur lors de la récupération des cartes utilisateur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
} 