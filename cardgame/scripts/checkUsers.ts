import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function checkUsers() {
  try {
    console.log('Vérification des utilisateurs...')

    // Vérifier si l'utilisateur admin existe
    const adminUser = await prisma.user.findFirst({
      where: {
        email: 'admin@example.com'
      }
    })

    if (!adminUser) {
      console.log('Création de l\'utilisateur admin...')
      const hashedPassword = await hash('admin123', 12)
      
      const newAdmin = await prisma.user.create({
        data: {
          email: 'admin@example.com',
          name: 'Admin',
          password: hashedPassword,
        }
      })
      
      console.log('Utilisateur admin créé avec succès:', newAdmin.email)
    } else {
      console.log('Utilisateur admin existe déjà:', adminUser.email)
    }

  } catch (error) {
    console.error('Erreur lors de la vérification des utilisateurs:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsers() 