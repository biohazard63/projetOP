import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    console.log('API Collection: Début de la requête')
    
    const session = await getServerSession(authOptions)
    console.log('API Collection: Session récupérée', session ? 'Oui' : 'Non')

    if (!session?.user?.email) {
      console.log('API Collection: Utilisateur non authentifié')
      return NextResponse.json(
        { message: 'Non autorisé' },
        { status: 401 }
      )
    }

    console.log('API Collection: Email de l\'utilisateur', session.user.email)

    // Récupérer l'utilisateur avec sa collection
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { 
        collection: true
      }
    })

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
      return NextResponse.json([])
    }

    // Log des premières et dernières cartes pour le débogage
    if (user.collection.length > 0) {
      console.log('API Collection: Première carte:', user.collection[0].name)
      console.log('API Collection: Dernière carte:', user.collection[user.collection.length - 1].name)
    }

    return NextResponse.json(user.collection)
  } catch (error) {
    console.error('API Collection: Erreur lors de la récupération de la collection:', error)
    return NextResponse.json(
      { message: 'Erreur serveur', error: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    )
  } finally {
    // Ne pas déconnecter Prisma ici car cela peut causer des problèmes avec les connexions suivantes
    // await prisma.$disconnect()
  }
} 