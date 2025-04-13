import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // Créer un utilisateur test
    const hashedPassword = await bcrypt.hash('test123', 10);
    const user = await prisma.user.upsert({
      where: { email: 'test@test.com' },
      update: {},
      create: {
        email: 'test@test.com',
        name: 'Utilisateur Test',
        password: hashedPassword,
      },
    });

    console.log('Utilisateur test créé:', user);

    // Récupérer quelques cartes aléatoires
    const randomCards = await prisma.card.findMany({
      take: 30,
      orderBy: {
        id: 'asc',
      },
    });

    // Ajouter les cartes à la collection de l'utilisateur
    for (const card of randomCards) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          collection: {
            connect: {
              id: card.id,
            },
          },
        },
      });
    }

    console.log(`${randomCards.length} cartes ajoutées à la collection de l'utilisateur test`);

    // Afficher les détails de la collection
    const userWithCollection = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        collection: true,
      },
    });

    console.log('Collection de l\'utilisateur test:');
    userWithCollection?.collection.forEach(card => {
      console.log(`- ${card.name} (${card.type}, ${card.rarity})`);
    });

  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser(); 