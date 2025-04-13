import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addMoreCardsToUser() {
  try {
    // Récupérer l'utilisateur test
    const user = await prisma.user.findUnique({
      where: { email: 'test@test.com' },
      include: { collection: true }
    });

    if (!user) {
      console.error('Utilisateur test non trouvé');
      return;
    }

    console.log(`Utilisateur trouvé: ${user.email}`);
    console.log(`Nombre actuel de cartes dans la collection: ${user.collection.length}`);

    // Récupérer toutes les cartes disponibles
    const allCards = await prisma.card.findMany({
      take: 100, // Limiter à 100 cartes pour éviter de surcharger la base de données
    });

    console.log(`Nombre total de cartes disponibles: ${allCards.length}`);

    // Filtrer les cartes qui ne sont pas déjà dans la collection
    const existingCardIds = new Set(user.collection.map(card => card.id));
    const newCards = allCards.filter(card => !existingCardIds.has(card.id));

    console.log(`Nombre de nouvelles cartes à ajouter: ${newCards.length}`);

    // Ajouter les nouvelles cartes à la collection
    if (newCards.length > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          collection: {
            connect: newCards.map(card => ({ id: card.id }))
          }
        }
      });

      console.log(`${newCards.length} cartes ajoutées à la collection`);
    } else {
      console.log('Aucune nouvelle carte à ajouter');
    }

    // Vérifier la collection mise à jour
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { collection: true }
    });

    console.log(`Nombre final de cartes dans la collection: ${updatedUser?.collection.length}`);

  } catch (error) {
    console.error('Erreur lors de l\'ajout de cartes à la collection:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addMoreCardsToUser(); 