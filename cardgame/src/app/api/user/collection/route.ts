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
      where: { userId: user.id, quantity: { gt: 0 } },
      include: {
        card: true
      }
    })

    // Transformer les résultats pour n'avoir que les cartes
    const cards = userCards.map(userCard => ({ ...userCard.card, quantity: userCard.quantity }))

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

export { acknowledgeOpening as POST } from '@/lib/boosters/http'
