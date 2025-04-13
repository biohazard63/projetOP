import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteAllCards() {
  try {
    // Supprimer toutes les cartes (les relations seront automatiquement supprimées)
    const deleteResult = await prisma.card.deleteMany();
    console.log(`${deleteResult.count} cartes ont été supprimées`);
  } catch (error) {
    console.error('Erreur lors de la suppression des cartes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllCards(); 