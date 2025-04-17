import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserCards() {
  try {
    const users = await prisma.user.findMany({
      include: {
        collection: true
      }
    });

    console.log('Nombre d\'utilisateurs trouvés:', users.length);

    for (const user of users) {
      console.log(`\nUtilisateur: ${user.email}`);
      console.log('Nombre de cartes dans la collection:', user.collection.length);
      
      if (user.collection.length > 0) {
        console.log('Première carte:', user.collection[0].name);
        console.log('Dernière carte:', user.collection[user.collection.length - 1].name);
      }
    }
  } catch (error) {
    console.error('Erreur lors de la vérification des cartes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserCards(); 