import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function deleteAllDecks() {
  try {
    console.log('Début de la suppression de tous les decks...')

    // Supprimer tous les decks
    const result = await prisma.deck.deleteMany()
    console.log(`${result.count} decks supprimés avec succès`)

    console.log('Suppression de tous les decks terminée')
  } catch (error) {
    console.error('Erreur lors de la suppression des decks:', error)
  } finally {
    await prisma.$disconnect()
  }
}

deleteAllDecks() 