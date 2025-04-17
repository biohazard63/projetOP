import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'test@example.com';
  const password = 'password123';
  const name = 'Utilisateur Test';

  try {
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      console.log('L\'utilisateur existe déjà');
      return;
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
      },
    });

    console.log('Utilisateur créé avec succès:', {
      id: user.id,
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 