import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { PrismaClient } from '@prisma/client'
import { authOptions } from '../auth/[...nextauth]/route'

const prisma = new PrismaClient()

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { message: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Récupérer le nombre total de cartes
    const totalCards = await prisma.card.count({
      where: {
        users: {
          some: {
            email: session.user.email
          }
        }
      }
    });

    console.log('Nombre total de cartes dans la base de données:', totalCards);

    // Récupérer toutes les cartes de l'utilisateur sans pagination
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { 
        collection: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { message: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    console.log('Nombre de cartes dans la collection:', user.collection.length)
    console.log('Premières 5 cartes:', user.collection.slice(0, 5))
    console.log('Dernières 5 cartes:', user.collection.slice(-5))

    return NextResponse.json(user.collection)
  } catch (error) {
    console.error('Erreur lors de la récupération de la collection:', error)
    return NextResponse.json(
      { message: 'Erreur serveur' },
      { status: 500 }
    )
  }
} 