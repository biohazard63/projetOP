import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function exportCards() {
  try {
    const cards = await prisma.card.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        rarity: true,
        type: true
      }
    })

    const outputPath = path.join(process.cwd(), 'public', 'cards.json')
    fs.writeFileSync(outputPath, JSON.stringify(cards, null, 2))
    
    console.log(`Export réussi ! ${cards.length} cartes ont été exportées dans ${outputPath}`)
  } catch (error) {
    console.error('Erreur lors de l\'export:', error)
  } finally {
    await prisma.$disconnect()
  }
}

exportCards() 