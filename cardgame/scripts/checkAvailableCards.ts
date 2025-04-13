import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkAvailableCards() {
  try {
    console.log('Vérification des cartes disponibles...')

    // Récupérer toutes les cartes
    const cards = await prisma.card.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        color: true,
        rarity: true
      }
    })

    console.log(`Nombre total de cartes: ${cards.length}`)

    // Afficher un échantillon de cartes
    console.log('\nÉchantillon de cartes:')
    cards.slice(0, 10).forEach(card => {
      console.log(`${card.code} - ${card.name} (${card.type}, ${card.color}, ${card.rarity})`)
    })

    // Compter les cartes par type
    const typeCount = cards.reduce((acc, card) => {
      acc[card.type] = (acc[card.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    console.log('\nNombre de cartes par type:')
    Object.entries(typeCount).forEach(([type, count]) => {
      console.log(`${type}: ${count}`)
    })

    // Compter les cartes par couleur
    const colorCount = cards.reduce((acc, card) => {
      acc[card.color] = (acc[card.color] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    console.log('\nNombre de cartes par couleur:')
    Object.entries(colorCount).forEach(([color, count]) => {
      console.log(`${color}: ${count}`)
    })

  } catch (error) {
    console.error('Erreur lors de la vérification des cartes:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAvailableCards() 