import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'

export async function POST(
  request: Request,
  { params }: { params: { deckId: string } }
) {
  try {
    console.log('Début de l\'activation du deck:', params.deckId)
    
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

    console.log('Vérification du deck:', params.deckId, 'pour l\'utilisateur:', user.id)

    // Vérifier que le deck appartient à l'utilisateur
    const deck = await prisma.deck.findFirst({
      where: {
        id: params.deckId,
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

    if (!deck) {
      console.log('Erreur: Deck non trouvé ou n\'appartient pas à l\'utilisateur')
      return NextResponse.json(
        { error: 'Deck non trouvé' },
        { status: 404 }
      )
    }

    console.log('Deck trouvé:', deck.name, 'avec', deck.deckCards.length, 'cartess')

    // Stocker l'ID du deck actif dans un cookie
    const cookieStore = cookies()
    cookieStore.set('activeDeckId', deck.id, {
      path: '/',
      maxAge: 60 * 60 * 24, // 24 heures
      httpOnly: true
    })

    console.log('Cookie activeDeckId défini:', deck.id)

    return NextResponse.json({ 
      message: 'Deck activé avec succès',
      deck: {
        id: deck.id,
        name: deck.name,
        cardCount: deck.deckCards.length
      }
    })
  } catch (error) {
    console.error('Erreur lors de l\'activation du deck:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
} 