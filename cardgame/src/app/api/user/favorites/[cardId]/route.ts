import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { cardId: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.email) {
      return NextResponse.json({ 
        success: false, 
        error: 'Non authentifié' 
      }, { status: 401 })
    }

    const { cardId } = params

    if (!cardId) {
      return NextResponse.json({ 
        success: false, 
        error: 'ID de carte manquant' 
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

    // Vérifier si la carte est dans les favoris
    const favorite = await prisma.favoriteCard.findUnique({
      where: {
        userId_cardId: {
          userId: user.id,
          cardId: cardId
        }
      }
    })

    return NextResponse.json({
      success: true,
      isFavorite: !!favorite
    })
  } catch (error) {
    console.error('Erreur lors de la vérification des favoris:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Erreur serveur' 
    }, { status: 500 })
  }
} 