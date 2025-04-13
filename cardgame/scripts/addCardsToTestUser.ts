import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function addCardsToTestUser() {
  try {
    // Récupérer l'utilisateur test (email: test@test.com)
    const testUser = await prisma.user.findUnique({
      where: {
        email: 'test@test.com'
      }
    });

    if (!testUser) {
      throw new Error('Utilisateur test non trouvé');
    }

    // Récupérer toutes les cartes
    const allCards = await prisma.card.findMany();
    console.log(`${allCards.length} cartes trouvées`);

    // Ajouter toutes les cartes à la collection de l'utilisateur
    const updatedUser = await prisma.user.update({
      where: {
        id: testUser.id
      },
      data: {
        collection: {
          connect: allCards.map(card => ({ id: card.id }))
        }
      }
    });

    console.log(`${allCards.length} cartes ajoutées à la collection de l'utilisateur ${updatedUser.email}`);
  } catch (error) {
    console.error('Erreur lors de l\'ajout des cartes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addCardsToTestUser(); 