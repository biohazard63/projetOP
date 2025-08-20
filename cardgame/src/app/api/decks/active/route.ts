import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    console.log('Récupération du deck actif')
    
    const session = await auth()
    
    if (!session?.user?.email) {
      console.log('Erreur: Utilisateur non authentifié')
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      select: { id: true },
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

    // Récupérer le deck actif
    const deck = await prisma.deck.findUnique({
      where: {
        id: activeDeckId
      },
      include: {
        versions: {
          include: {
            cards: {
              include: {
                card: true
              }
            }
          }
        }
      }
    });

    if (!deck) {
      console.log('Erreur: Deck actif non trouvé')
      return NextResponse.json(
        { error: 'Deck actif non trouvé' },
        { status: 404 }
      )
    }

    // Obtenir la dernière version du deck
    const latestVersion = deck.versions[deck.versions.length - 1];
    const cards = latestVersion ? latestVersion.cards.map(dc => dc.card) : [];

    console.log('Deck actif trouvé:', deck.name, 'avec', cards.length, 'cartes')

    return NextResponse.json({
      deck: {
        id: deck.id,
        name: deck.name,
        cards: cards
      }
    })
  } catch (error) {
    console.error('Erreur lors de la récupération du deck actif:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    console.log('Définition du deck actif')
    
    const session = await auth()
    
    if (!session?.user?.email) {
      console.log('Erreur: Utilisateur non authentifié')
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      select: { id: true },
    })

    if (!user) {
      console.log('Erreur: Utilisateur non trouvé')
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // Récupérer l'ID du deck depuis le corps de la requête
    const { deckId } = await request.json()
    
    if (!deckId) {
      console.log('ID du deck non fourni')
      return NextResponse.json(
        { error: 'ID du deck requis' },
        { status: 400 }
      )
    }

    console.log('ID du deck à définir comme actif:', deckId)

    // Vérifier que le deck existe et appartient à l'utilisateur
    const deck = await prisma.deck.findFirst({
      where: {
        id: deckId,
        userId: user.id
      }
    })

    if (!deck) {
      console.log('Deck non trouvé ou n\'appartient pas à l\'utilisateur')
      return NextResponse.json(
        { error: 'Deck non trouvé' },
        { status: 404 }
      )
    }

    // Définir le deck comme actif en utilisant un cookie
    const cookieStore = cookies()
    cookieStore.set('activeDeckId', deckId, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 jours
    })

    console.log('Deck défini comme actif:', deck.name)

    return NextResponse.json({ success: true, deck })
  } catch (error) {
    console.error('Erreur lors de la définition du deck actif:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
} 