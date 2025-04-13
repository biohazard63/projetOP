import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCardValues() {
  try {
    // Récupérer un échantillon de cartes
    const cards = await prisma.card.findMany({
      take: 10,
      select: {
        id: true,
        name: true,
        type: true,
        color: true,
        rarity: true,
      }
    });

    console.log('Échantillon de cartes :');
    cards.forEach(card => {
      console.log(`- ${card.name} (${card.id})`);
      console.log(`  Type: "${card.type}"`);
      console.log(`  Couleur: "${card.color}"`);
      console.log(`  Rareté: "${card.rarity}"`);
    });

    // Récupérer les valeurs uniques
    const uniqueTypes = await prisma.card.findMany({
      select: {
        type: true,
      },
      distinct: ['type'],
    });

    const uniqueColors = await prisma.card.findMany({
      select: {
        color: true,
      },
      distinct: ['color'],
    });

    const uniqueRarities = await prisma.card.findMany({
      select: {
        rarity: true,
      },
      distinct: ['rarity'],
    });

    console.log('\nTypes uniques :');
    uniqueTypes.forEach(item => console.log(`- "${item.type}"`));

    console.log('\nCouleurs uniques :');
    uniqueColors.forEach(item => console.log(`- "${item.color}"`));

    console.log('\nRaretés uniques :');
    uniqueRarities.forEach(item => console.log(`- "${item.rarity}"`));

  } catch (error) {
    console.error('Erreur lors de la vérification :', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCardValues(); 