import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function createAdminUser() {
  try {
    console.log('Vérification de l\'existence de l\'utilisateur admin...')

    const existingAdmin = await prisma.user.findFirst({
      where: {
        email: 'admin@example.com'
      }
    })

    if (existingAdmin) {
      console.log('L\'utilisateur admin existe déjà')
      return
    }

    const hashedPassword = await hash('admin123', 12)

    const admin = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        name: 'Admin',
        password: hashedPassword
      }
    })

    console.log('Utilisateur admin créé avec succès:', admin.email)
  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur admin:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAdminUser() 