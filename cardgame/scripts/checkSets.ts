import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkSets() {
  try {
    // Récupérer tous les sets uniques
    const cards = await prisma.card.findMany({
      select: {
        set: true,
      },
      distinct: ['set'],
      where: {
        set: {
          not: null,
        },
      },
      orderBy: {
        set: 'asc',
      },
    })

    console.log('Sets disponibles :')
    cards.forEach((card) => {
      console.log(`- ${card.set}`)
    })

    // Compter le nombre de cartes par set
    const setCounts = await prisma.card.groupBy({
      by: ['set'],
      _count: {
        id: true,
      },
      orderBy: {
        set: 'asc',
      },
    })

    console.log('\nNombre de cartes par set :')
    setCounts.forEach((set) => {
      console.log(`- ${set.set}: ${set._count.id} cartes`)
    })
  } catch (error) {
    console.error('Erreur lors de la vérification des sets:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkSets() 