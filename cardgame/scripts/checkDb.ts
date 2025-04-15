import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkDb() {
  try {
    console.log('Vérification de la base de données...')

    const cardCount = await prisma.card.count()
    console.log(`Nombre de cartes: ${cardCount}`)

    const userCount = await prisma.user.count()
    console.log(`Nombre d'utilisateurs: ${userCount}`)

    const deckCount = await prisma.deck.count()
    console.log(`Nombre de decks: ${deckCount}`)

  } catch (error) {
    console.error('Erreur lors de la vérification:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDb() 