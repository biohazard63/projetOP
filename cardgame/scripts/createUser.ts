import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function createUser() {
  try {
    const email = 'test@test.com';
    const password = 'test123';
    
    // Hash du mot de passe
    const hashedPassword = await hash(password, 10);
    
    // Création de l'utilisateur
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: 'Test User'
      }
    });
    
    console.log('Utilisateur créé avec succès:', user);
  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createUser(); 