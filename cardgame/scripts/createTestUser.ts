import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createTestUser() {
  console.log('Création de l\'utilisateur test...');

  try {
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    });

    if (existingUser) {
      console.log('L\'utilisateur test existe déjà');
      return;
    }

    // Créer l'utilisateur test
    const hashedPassword = await bcrypt.hash('testpassword', 10);
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        password: hashedPassword,
        hasStarterDecks: true
      }
    });

    console.log('Utilisateur test créé avec succès:', user.email);
  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter la fonction
createTestUser(); 