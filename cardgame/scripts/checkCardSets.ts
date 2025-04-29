import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkCardSets() {
  try {
    console.log('Vérification des CardSets...\n')

    // Récupérer tous les CardSets
    const cardSets = await prisma.cardSet.findMany({
      include: {
        cards: true,
        boosters: true
      }
    })

    console.log(`Nombre total de sets: ${cardSets.length}\n`)

    // Afficher les détails pour chaque set
    for (const set of cardSets) {
      console.log(`=== Set: ${set.name} (${set.code}) ===`)
      console.log(`Date de sortie: ${set.releaseDate.toLocaleDateString()}`)
      console.log(`Description: ${set.description || 'Non spécifiée'}`)
      console.log(`Image URL: ${set.imageUrl || 'Non spécifiée'}`)
      console.log(`Nombre de cartes: ${set.cards.length}`)
      console.log(`Nombre de boosters: ${set.boosters.length}`)

      // Compter les cartes par rareté
      const rarityCount = set.cards.reduce((acc, card) => {
        acc[card.rarity] = (acc[card.rarity] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      console.log('\nDistribution des raretés:')
      Object.entries(rarityCount).forEach(([rarity, count]) => {
        console.log(`- ${rarity}: ${count} cartes`)
      })

      // Compter les cartes par type
      const typeCount = set.cards.reduce((acc, card) => {
        acc[card.type] = (acc[card.type] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      console.log('\nDistribution des types:')
      Object.entries(typeCount).forEach(([type, count]) => {
        console.log(`- ${type}: ${count} cartes`)
      })

      console.log('\n' + '='.repeat(50) + '\n')
    }

  } catch (error) {
    console.error('Erreur lors de la vérification des CardSets:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkCardSets() 