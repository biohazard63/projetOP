import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ 
        success: false, 
        error: 'Non authentifié' 
      }, { status: 401 });
    }

    const { cardIds } = await request.json();

    if (!Array.isArray(cardIds)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Format de données invalide' 
      }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Utilisateur non trouvé' 
      }, { status: 404 });
    }

    // Ajouter chaque carte à la collection
    for (const cardId of cardIds) {
      // Vérifier si l'utilisateur a déjà cette carte
      const existingUserCard = await prisma.userCard.findUnique({
        where: {
          userId_cardId: {
            userId: user.id,
            cardId: cardId
          }
        }
      });

      if (existingUserCard) {
        // Mettre à jour la quantité si la carte existe déjà
        await prisma.userCard.update({
          where: {
            userId_cardId: {
              userId: user.id,
              cardId: cardId
            }
          },
          data: {
            quantity: {
              increment: 1
            }
          }
        });
      } else {
        // Créer une nouvelle entrée si la carte n'existe pas
        await prisma.userCard.create({
          data: {
            userId: user.id,
            cardId: cardId,
            quantity: 1
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Cartes ajoutées à la collection avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout des cartes à la collection:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erreur serveur' 
    }, { status: 500 });
  }
} 