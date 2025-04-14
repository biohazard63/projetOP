import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    console.log('Récupération du deck actif')
    
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      console.log('Erreur: Utilisateur non authentifié')
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      console.log('Erreur: Utilisateur non trouvé')
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // Récupérer l'ID du deck actif depuis le cookie
    const cookieStore = cookies()
    const activeDeckId = cookieStore.get('activeDeckId')?.value

    console.log('ID du deck actif depuis le cookie:', activeDeckId)

    if (!activeDeckId) {
      console.log('Aucun deck actif trouvé dans les cookies')
      return NextResponse.json(
        { error: 'Aucun deck actif' },
        { status: 404 }
      )
    }

    // Récupérer le deck actif avec ses cartes
    const activeDeck = await prisma.deck.findFirst({
      where: {
        id: activeDeckId,
        userId: user.id
      },
      include: {
        deckCards: {
          include: {
            card: true
          }
        }
      }
    })

    if (!activeDeck) {
      console.log('Deck actif non trouvé ou n\'appartient pas à l\'utilisateur')
      return NextResponse.json(
        { error: 'Deck non trouvé' },
        { status: 404 }
      )
    }

    console.log('Deck actif trouvé:', activeDeck.name, 'avec', activeDeck.deckCards.length, 'cartes')

    return NextResponse.json({ deck: activeDeck })
  } catch (error) {
    console.error('Erreur lors de la récupération du deck actif:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
} 