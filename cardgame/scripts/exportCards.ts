import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function exportCards() {
  try {
    console.log('Début de l\'exportation des cartes...')
    
    // Récupérer toutes les cartes
    const cards = await prisma.card.findMany({
      orderBy: {
        id: 'asc'
      }
    })

    console.log(`${cards.length} cartes trouvées`)

    // Créer le dossier exports s'il n'existe pas
    const exportDir = path.join(process.cwd(), 'exports')
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir)
    }

    // Écrire les cartes dans un fichier JSON
    const exportPath = path.join(exportDir, 'cards.json')
    fs.writeFileSync(
      exportPath,
      JSON.stringify(cards, null, 2),
      'utf-8'
    )

    console.log(`Cartes exportées avec succès dans ${exportPath}`)

    // Créer un fichier CSV pour faciliter l'édition
    const csvPath = path.join(exportDir, 'cards.csv')
    const csvContent = [
      // En-têtes
      ['ID', 'Nom',  'Effet', 'Rareté', 'Set'].join(','),
      // Données
      ...cards.map(card => [
        card.id,
        `"${card.name}"`,
        `"${card.effect?.replace(/"/g, '""')}"`,
        card.rarity,
        `"${card.set}"`
      ].join(','))
    ].join('\n')

    fs.writeFileSync(csvPath, csvContent, 'utf-8')
    console.log(`CSV exporté avec succès dans ${csvPath}`)

  } catch (error) {
    console.error('Erreur lors de l\'exportation:', error)
  } finally {
    await prisma.$disconnect()
  }
}

exportCards() 