import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { Card, User } from '@prisma/client'

export const dynamic = 'force-dynamic'

type UserWithCollection = User & {
  collection: Card[]
}

export async function GET(request: Request) {
  try {
    console.log('API Collection: Début de la requête')
    
    const session = await getServerSession(authOptions)
    console.log('API Collection: Session récupérée', session ? 'Oui' : 'Non')
    console.log('API Collection: Détails de la session:', JSON.stringify(session, null, 2))

    if (!session?.user?.email) {
      console.log('API Collection: Utilisateur non authentifié, retour d\'une collection vide')
      return NextResponse.json({ cards: [] })
    }

    console.log('API Collection: Email de l\'utilisateur', session.user.email)

    // Récupérer l'utilisateur avec sa collection
    console.log('API Collection: Tentative de récupération de l\'utilisateur')
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { 
        collection: true
      }
    }) as UserWithCollection | null

    console.log('API Collection: Résultat de la requête utilisateur:', user ? 'Utilisateur trouvé' : 'Utilisateur non trouvé')

    if (!user) {
      console.log('API Collection: Utilisateur non trouvé dans la base de données')
      return NextResponse.json(
        { message: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    console.log('API Collection: Utilisateur trouvé, ID:', user.id)
    console.log('API Collection: Nombre de cartes dans la collection:', user.collection.length)

    // Vérifier si la collection est vide
    if (user.collection.length === 0) {
      console.log('API Collection: Collection vide, renvoi d\'un tableau vide')
      return NextResponse.json({ cards: [] })
    }

    // Log des premières et dernières cartes pour le débogage
    if (user.collection.length > 0) {
      console.log('API Collection: Première carte:', user.collection[0].name)
      console.log('API Collection: Dernière carte:', user.collection[user.collection.length - 1].name)
    }

    return NextResponse.json({ cards: user.collection })
  } catch (error) {
    console.error('API Collection: Erreur détaillée:', error)
    console.error('API Collection: Stack trace:', error instanceof Error ? error.stack : 'Pas de stack trace disponible')
    return NextResponse.json(
      { message: 'Erreur serveur', error: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    )
  }
} 