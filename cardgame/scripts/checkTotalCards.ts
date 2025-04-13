import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTotalCards() {
  try {
    // Récupérer le nombre total de cartes dans la base de données
    const totalCards = await prisma.card.count();
    console.log('Nombre total de cartes dans la base de données:', totalCards);

    // Récupérer le nombre de cartes par utilisateur
    const users = await prisma.user.findMany({
      include: {
        _count: {
          select: {
            collection: true
          }
        }
      }
    });

    console.log('\nNombre de cartes par utilisateur:');
    users.forEach(user => {
      console.log(`- ${user.email}: ${user._count.collection} cartes`);
    });

    // Vérifier s'il y a des cartes qui ne sont associées à aucun utilisateur
    const orphanedCards = await prisma.card.findMany({
      where: {
        users: {
          none: {}
        }
      }
    });

    console.log('\nNombre de cartes orphelines (non associées à un utilisateur):', orphanedCards.length);
    if (orphanedCards.length > 0) {
      console.log('Exemples de cartes orphelines:');
      orphanedCards.slice(0, 5).forEach(card => {
        console.log(`- ${card.name} (${card.id})`);
      });
    }

  } catch (error) {
    console.error('Erreur lors de la vérification des cartes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTotalCards(); 