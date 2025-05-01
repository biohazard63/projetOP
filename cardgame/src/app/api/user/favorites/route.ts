import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ 
        success: false, 
        error: 'Non authentifié' 
      }, { status: 401 })
    }

    const { cardId } = await request.json()

    if (!cardId) {
      return NextResponse.json({ 
        success: false, 
        error: 'ID de carte manquant' 
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

    // Vérifier si la carte existe
    const card = await prisma.card.findUnique({
      where: { id: cardId }
    })

    if (!card) {
      return NextResponse.json({ 
        success: false, 
        error: 'Carte non trouvée' 
      }, { status: 404 })
    }

    // Ajouter la carte aux favoris
    await prisma.favoriteCard.create({
      data: {
        userId: user.id,
        cardId: cardId
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Carte ajoutée aux favoris'
    })
  } catch (error) {
    console.error('Erreur lors de l\'ajout aux favoris:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Erreur serveur' 
    }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ 
        success: false, 
        error: 'Non authentifié' 
      }, { status: 401 })
    }

    const { cardId } = await request.json()

    if (!cardId) {
      return NextResponse.json({ 
        success: false, 
        error: 'ID de carte manquant' 
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

    // Supprimer la carte des favoris
    await prisma.favoriteCard.delete({
      where: {
        userId_cardId: {
          userId: user.id,
          cardId: cardId
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Carte retirée des favoris'
    })
  } catch (error) {
    console.error('Erreur lors de la suppression des favoris:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Erreur serveur' 
    }, { status: 500 })
  }
} 