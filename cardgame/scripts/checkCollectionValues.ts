import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCollectionValues() {
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
    console.log(`Nombre de cartes dans la collection: ${user.collection.length}`);

    // Récupérer les valeurs uniques des types, couleurs et raretés
    const uniqueTypes = new Set<string>();
    const uniqueColors = new Set<string>();
    const uniqueRarities = new Set<string>();
    const uniqueSets = new Set<string>();

    user.collection.forEach(card => {
      if (card.type) uniqueTypes.add(card.type);
      if (card.color) uniqueColors.add(card.color);
      if (card.rarity) uniqueRarities.add(card.rarity);
      if (card.set) uniqueSets.add(card.set);
    });

    console.log('\nTypes uniques dans la collection:');
    console.log([...uniqueTypes].sort());

    console.log('\nCouleurs uniques dans la collection:');
    console.log([...uniqueColors].sort());

    console.log('\nRaretés uniques dans la collection:');
    console.log([...uniqueRarities].sort());

    console.log('\nSets uniques dans la collection:');
    console.log([...uniqueSets].sort());

    // Afficher quelques exemples de cartes
    console.log('\nExemples de cartes:');
    user.collection.slice(0, 5).forEach(card => {
      console.log(`- ${card.name} (${card.type}, ${card.color}, ${card.rarity}, ${card.set || 'Pas de set'})`);
    });

  } catch (error) {
    console.error('Erreur lors de la vérification des valeurs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCollectionValues(); 