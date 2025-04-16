import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function resetUserCollections() {
  try {
    console.log('🔄 Début de la réinitialisation des collections...');

    // Récupérer tous les utilisateurs
    const users = await prisma.user.findMany({
      include: {
        collection: true
      }
    });

    console.log(`📊 Nombre d'utilisateurs trouvés: ${users.length}`);

    // Afficher un résumé des collections actuelles
    users.forEach(user => {
      console.log(`- ${user.email}: ${user.collection.length} cartes`);
    });

    // Demander confirmation
    await new Promise<void>((resolve) => {
      rl.question('\n⚠️ Cette opération va supprimer toutes les cartes des collections. Continuer? (o/n): ', async (answer) => {
        rl.close();
        if (answer.toLowerCase() === 'o') {
          // Réinitialiser les collections
          for (const user of users) {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                collection: {
                  set: [] // Déconnecter toutes les cartes
                }
              }
            });
            console.log(`✅ Collection réinitialisée pour ${user.email}`);
          }

          console.log('\n✨ Toutes les collections ont été réinitialisées avec succès!');
        } else {
          console.log('\n❌ Opération annulée');
        }
        resolve();
      });
    });

  } catch (error) {
    console.error('❌ Erreur lors de la réinitialisation des collections:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le script
resetUserCollections(); 