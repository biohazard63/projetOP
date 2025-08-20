import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
;
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    console.log('API add-to-collection: Début de la requête')
    const session = await auth();
    
    if (!session?.user?.email) {
      console.log('API add-to-collection: Utilisateur non authentifié')
      return NextResponse.json({ 
        success: false, 
        error: 'Non authentifié' 
      }, { status: 401 });
    }

    const { cardIds } = await request.json();
    console.log('API add-to-collection: Cartes reçues:', cardIds)

    if (!Array.isArray(cardIds)) {
      console.log('API add-to-collection: Format de données invalide')
      return NextResponse.json({ 
        success: false, 
        error: 'Format de données invalide' 
      }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      console.log('API add-to-collection: Utilisateur non trouvé')
      return NextResponse.json({ 
        success: false, 
        error: 'Utilisateur non trouvé' 
      }, { status: 404 });
    }

    console.log('API add-to-collection: Ajout des cartes à la collection de l\'utilisateur:', user.id)
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
        console.log('API add-to-collection: Mise à jour de la quantité pour la carte:', cardId)
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
        console.log('API add-to-collection: Création d\'une nouvelle entrée pour la carte:', cardId)
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

    console.log('API add-to-collection: Cartes ajoutées avec succès')
    return NextResponse.json({
      success: true,
      message: 'Cartes ajoutées à la collection avec succès'
    });
  } catch (error) {
    console.error('API add-to-collection: Erreur lors de l\'ajout des cartes à la collection:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erreur serveur' 
    }, { status: 500 });
  }
} 