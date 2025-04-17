import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserCollection() {
  try {
    // Récupérer tous les utilisateurs avec leurs collections et les informations des cartes
    const users = await prisma.user.findMany({
      include: {
        collection: true
      }
    });

    console.log('Nombre d\'utilisateurs trouvés:', users.length);

    // Afficher les informations sur chaque utilisateur et sa collection
    for (const user of users) {
      console.log(`\nUtilisateur: ${user.email}`);
      console.log('Nombre de cartes dans la collection:', user.collection.length);

      if (user.collection.length > 0) {
        console.log('\nDétails de la collection:');
        user.collection.forEach(card => {
          console.log(`- ${card.name} (${card.rarity})`);
        });
      } else {
        console.log('Collection vide');
      }
    }

  } catch (error) {
    console.error('Erreur lors de la vérification de la collection:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserCollection(); 