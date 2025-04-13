import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const testUserEmail = 'test@example.com';

  try {
    // Récupérer l'utilisateur de test
    const user = await prisma.user.findUnique({
      where: { email: testUserEmail },
      include: {
        collection: true
      }
    });

    if (!user) {
      console.error('Utilisateur de test non trouvé');
      return;
    }

    console.log('Utilisateur trouvé:', user.email);
    console.log('Nombre de cartes dans la collection:', user.collection.length);
    console.log('Cartes dans la collection:');
    user.collection.forEach(card => {
      console.log(`- ${card.name} (${card.id})`);
    });

  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 