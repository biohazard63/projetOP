import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const testUserEmail = 'test@example.com';

  try {
    // Récupérer l'utilisateur de test
    const user = await prisma.user.findUnique({
      where: { email: testUserEmail }
    });

    if (!user) {
      console.error('Utilisateur de test non trouvé');
      return;
    }

    // Récupérer toutes les cartes
    const cards = await prisma.card.findMany();

    // Ajouter les cartes à la collection de l'utilisateur
    for (const card of cards) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          collection: {
            connect: { id: card.id }
          }
        }
      });
    }

    console.log('Cartes ajoutées à la collection de l\'utilisateur avec succès !');
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 