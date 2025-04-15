import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCards() {
  try {
    // Compter les cartes
    const cardCount = await prisma.card.count();
    console.log(`Nombre de cartes dans la base de données : ${cardCount}`);

    // Vérifier les relations
    const decksWithCards = await prisma.deck.count({
      where: {
        deckCards: {
          some: {}
        }
      }
    });
    console.log(`Nombre de decks contenant des cartes : ${decksWithCards}`);

    const usersWithCards = await prisma.user.count({
      where: {
        collection: {
          some: {}
        }
      }
    });
    console.log(`Nombre d'utilisateurs ayant des cartes : ${usersWithCards}`);

  } catch (error) {
    console.error('Erreur lors de la vérification :', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCards(); 