import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    // Récupérer la session de l'utilisateur
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json(
        { error: 'Utilisateur non authentifié' },
        { status: 401 }
      );
    }

    const { cardIds } = await request.json();
    
    if (!cardIds || !Array.isArray(cardIds) || cardIds.length === 0) {
      return NextResponse.json(
        { error: 'Aucune carte à ajouter' },
        { status: 400 }
      );
    }

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: {
        email: session.user.email
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Ajouter les cartes à la collection de l'utilisateur
    await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        collection: {
          connect: cardIds.map(id => ({ id }))
        }
      }
    });

    return NextResponse.json({ success: true, message: `${cardIds.length} cartes ajoutées à votre collection` });
  } catch (error) {
    console.error('Erreur lors de l\'ajout des cartes à la collection:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'ajout des cartes à la collection' },
      { status: 500 }
    );
  }
} 