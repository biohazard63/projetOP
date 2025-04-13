import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserCollection() {
  try {
    // Récupérer tous les utilisateurs
    const users = await prisma.user.findMany({
      include: {
        collection: true
      }
    });

    console.log(`Nombre d'utilisateurs : ${users.length}`);

    // Afficher les informations sur chaque utilisateur et sa collection
    users.forEach((user, index) => {
      console.log(`\nUtilisateur ${index + 1}:`);
      console.log(`- ID: ${user.id}`);
      console.log(`- Email: ${user.email}`);
      console.log(`- Nombre de cartes dans la collection: ${user.collection.length}`);
      
      // Afficher les 5 premières cartes de la collection
      if (user.collection.length > 0) {
        console.log('Exemples de cartes:');
        user.collection.slice(0, 5).forEach(card => {
          console.log(`- ${card.name} (${card.type}, ${card.rarity})`);
        });
      }
    });

  } catch (error) {
    console.error('Erreur lors de la vérification de la collection:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserCollection(); 