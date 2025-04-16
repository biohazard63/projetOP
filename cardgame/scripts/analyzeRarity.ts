import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function analyzeRarity() {
  try {
    // Récupérer toutes les cartes
    const cards = await prisma.card.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        rarity: true,
        type: true
      }
    })

    // Compter les cartes par rareté
    const rarityCounts: Record<string, number> = {}
    const typeCounts: Record<string, number> = {}
    const alternativeCounts: Record<string, number> = {}
    const rarityTypeCounts: Record<string, Record<string, number>> = {}
    const alternativeRarityCounts: Record<string, number> = {}

    cards.forEach(card => {
      // Compter par rareté
      rarityCounts[card.rarity] = (rarityCounts[card.rarity] || 0) + 1

      // Compter par type
      typeCounts[card.type] = (typeCounts[card.type] || 0) + 1

      // Compter les cartes alternatives
      if (card.id.includes('_p')) {
        alternativeCounts[card.rarity] = (alternativeCounts[card.rarity] || 0) + 1
        alternativeRarityCounts[card.rarity] = (alternativeRarityCounts[card.rarity] || 0) + 1
      }

      // Compter par combinaison rareté/type
      if (!rarityTypeCounts[card.rarity]) {
        rarityTypeCounts[card.rarity] = {}
      }
      rarityTypeCounts[card.rarity][card.type] = (rarityTypeCounts[card.rarity][card.type] || 0) + 1
    })

    // Calculer les pourcentages
    const totalCards = cards.length
    const rarityPercentages: Record<string, number> = {}
    const typePercentages: Record<string, number> = {}
    const alternativePercentages: Record<string, number> = {}
    const rarityTypePercentages: Record<string, Record<string, number>> = {}

    // Pourcentages par rareté
    Object.entries(rarityCounts).forEach(([rarity, count]) => {
      rarityPercentages[rarity] = (count / totalCards) * 100
    })

    // Pourcentages par type
    Object.entries(typeCounts).forEach(([type, count]) => {
      typePercentages[type] = (count / totalCards) * 100
    })

    // Pourcentages des cartes alternatives par rareté
    Object.entries(alternativeCounts).forEach(([rarity, count]) => {
      const totalOfRarity = rarityCounts[rarity] || 0
      alternativePercentages[rarity] = totalOfRarity > 0 ? (count / totalOfRarity) * 100 : 0
    })

    // Pourcentages par combinaison rareté/type
    Object.entries(rarityTypeCounts).forEach(([rarity, types]) => {
      rarityTypePercentages[rarity] = {}
      Object.entries(types).forEach(([type, count]) => {
        const totalOfRarity = rarityCounts[rarity] || 0
        rarityTypePercentages[rarity][type] = totalOfRarity > 0 ? (count / totalOfRarity) * 100 : 0
      })
    })

    // Afficher les résultats
    console.log('=== ANALYSE DES RARETÉS ===')
    console.log(`Nombre total de cartes: ${totalCards}`)
    
    console.log('\n=== RARETÉS ===')
    Object.entries(rarityPercentages).forEach(([rarity, percentage]) => {
      console.log(`${rarity}: ${percentage.toFixed(2)}% (${rarityCounts[rarity]} cartes)`)
    })
    
    console.log('\n=== TYPES ===')
    Object.entries(typePercentages).forEach(([type, percentage]) => {
      console.log(`${type}: ${percentage.toFixed(2)}% (${typeCounts[type]} cartes)`)
    })
    
    console.log('\n=== CARTES ALTERNATIVES ===')
    Object.entries(alternativeRarityCounts).forEach(([rarity, count]) => {
      const percentage = alternativePercentages[rarity] || 0
      console.log(`${rarity} alternatives: ${percentage.toFixed(2)}% (${count} cartes)`)
    })
    
    console.log('\n=== RARETÉS PAR TYPE ===')
    Object.entries(rarityTypePercentages).forEach(([rarity, types]) => {
      console.log(`\n${rarity}:`)
      Object.entries(types).forEach(([type, percentage]) => {
        console.log(`  ${type}: ${percentage.toFixed(2)}%`)
      })
    })

    // Sauvegarder les résultats dans un fichier JSON
    const results = {
      totalCards,
      rarityCounts,
      typeCounts,
      alternativeCounts,
      rarityTypeCounts,
      rarityPercentages,
      typePercentages,
      alternativePercentages,
      rarityTypePercentages
    }

    const outputPath = path.join(process.cwd(), 'public', 'rarity-analysis.json')
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2))
    console.log(`\nAnalyse sauvegardée dans ${outputPath}`)

  } catch (error) {
    console.error('Erreur lors de l\'analyse:', error)
  } finally {
    await prisma.$disconnect()
  }
}

analyzeRarity() 