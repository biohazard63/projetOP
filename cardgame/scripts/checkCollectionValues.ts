import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCollectionValues() {
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
        // Calculer la valeur totale de la collection
        const totalValue = user.collection.reduce((acc, card) => {
          // Ici vous pouvez ajouter une logique pour calculer la valeur basée sur la rareté
          const value = getCardValue(card.rarity);
          return acc + value;
        }, 0);

        console.log('Valeur totale de la collection:', totalValue);

        // Afficher les statistiques par rareté
        const rarityStats = user.collection.reduce((acc, card) => {
          acc[card.rarity] = (acc[card.rarity] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        console.log('\nStatistiques par rareté:');
        Object.entries(rarityStats).forEach(([rarity, count]) => {
          console.log(`${rarity}: ${count} cartes`);
        });
      }
    }
  } catch (error) {
    console.error('Erreur lors de la vérification des valeurs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function getCardValue(rarity: string): number {
  // Définir les valeurs par rareté
  const values: Record<string, number> = {
    'C': 1,    // Common
    'U': 2,    // Uncommon
    'R': 5,    // Rare
    'SR': 10,  // Super Rare
    'SEC': 20, // Secret
    'L': 30,   // Leader
    'SPR': 40  // Special Rare
  };

  return values[rarity] || 1; // Retourne 1 si la rareté n'est pas trouvée
}

checkCollectionValues(); 