import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function assignAllCardsToUser() {
  try {
    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: {
        email: 'test@test.com'
      }
    });

    if (!user) {
      console.error('Utilisateur non trouvé');
      return;
    }

    // Récupérer toutes les cartes
    const cards = await prisma.card.findMany();
    console.log(`Nombre total de cartes: ${cards.length}`);

    // Mettre à jour la collection de l'utilisateur
    const updatedUser = await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        collection: {
          connect: cards.map(card => ({ id: card.id }))
        }
      },
      include: {
        collection: true
      }
    });

    console.log(`Mise à jour réussie ! L'utilisateur a maintenant ${updatedUser.collection.length} cartes dans sa collection.`);

  } catch (error) {
    console.error('Erreur lors de l\'association des cartes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

assignAllCardsToUser(); 