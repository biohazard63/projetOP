import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// Interface pour représenter une carte
interface CardData {
  id: string
  code: string
  name: string
  type: string
  color: string
  cost: number
  power: number | null
  counter: string | null
  effect: string | null
  rarity: string
  imageUrl: string
  set: string | null
  attribute: string | null
  attributeImage: string | null
  family: string | null
  ability: string | null
  trigger: string | null
  notes: string | null
}

// Interface pour représenter un set
interface SetData {
  name: string
  code: string
  releaseDate: Date
  description: string | null
  imageUrl: string | null
}

// Interface pour représenter une rareté
interface RarityData {
  name: string
  color: string
  dropRate: number
}

async function importCards() {
  try {
    console.log('Début de l\'importation des cartes...')
    
    // Lire le fichier JSON
    const exportPath = path.join(process.cwd(), 'exports', 'cards.json')
    const cardsData: CardData[] = JSON.parse(fs.readFileSync(exportPath, 'utf-8'))
    
    console.log(`${cardsData.length} cartes à importer`)
    
    // Extraire les sets uniques
    const uniqueSets = new Map<string, SetData>()
    const uniqueRarities = new Map<string, RarityData>()
    
    cardsData.forEach((card: CardData) => {
      if (card.set && !uniqueSets.has(card.set)) {
        uniqueSets.set(card.set, {
          name: card.set,
          code: card.set.match(/\[(.*?)\]/)?.[1] || card.set.split(' ')[0],
          releaseDate: new Date(), // Date par défaut
          description: `Set ${card.set}`,
          imageUrl: null
        })
      }
      
      if (card.rarity && !uniqueRarities.has(card.rarity)) {
        uniqueRarities.set(card.rarity, {
          name: card.rarity,
          color: getRarityColor(card.rarity),
          dropRate: getRarityDropRate(card.rarity)
        })
      }
    })
    
    console.log(`${uniqueSets.size} sets uniques trouvés`)
    console.log(`${uniqueRarities.size} raretés uniques trouvées`)
    
    // Importer les sets
    for (const [_, setData] of uniqueSets) {
      await prisma.$executeRaw`
        INSERT INTO "CardSet" (id, name, code, "releaseDate", description, "imageUrl")
        VALUES (gen_random_uuid(), ${setData.name}, ${setData.code}, ${setData.releaseDate}, ${setData.description}, ${setData.imageUrl})
        ON CONFLICT (code) DO UPDATE
        SET name = ${setData.name}, "releaseDate" = ${setData.releaseDate}, description = ${setData.description}, "imageUrl" = ${setData.imageUrl}
      `
    }
    
    // Importer les raretés
    for (const [_, rarityData] of uniqueRarities) {
      await prisma.$executeRaw`
        INSERT INTO "CardRarity" (id, name, color, "dropRate")
        VALUES (gen_random_uuid(), ${rarityData.name}, ${rarityData.color}, ${rarityData.dropRate})
        ON CONFLICT (name) DO UPDATE
        SET color = ${rarityData.color}, "dropRate" = ${rarityData.dropRate}
      `
    }
    
    // Importer les cartes
    let importedCount = 0
    for (const cardData of cardsData) {
      try {
        // Convertir counter en nombre si possible
        let counterValue: number | null = null
        if (cardData.counter) {
          const parsedCounter = parseInt(cardData.counter)
          if (!isNaN(parsedCounter)) {
            counterValue = parsedCounter
          }
        }
        
        await prisma.$executeRaw`
          INSERT INTO "Card" (
            id, code, name, type, color, cost, power, counter, effect, rarity, "imageUrl", 
            set, attribute, "attributeImage", family, ability, trigger, notes, "setCode", "rarityName"
          )
          VALUES (
            ${cardData.id}, ${cardData.code}, ${cardData.name}, ${cardData.type}, ${cardData.color}, 
            ${cardData.cost}, ${cardData.power}, ${counterValue}, ${cardData.effect}, ${cardData.rarity}, 
            ${cardData.imageUrl}, ${cardData.set}, ${cardData.attribute}, ${cardData.attributeImage}, 
            ${cardData.family}, ${cardData.ability}, ${cardData.trigger}, ${cardData.notes}, 
            ${cardData.set?.match(/\[(.*?)\]/)?.[1] || cardData.set?.split(' ')[0]}, ${cardData.rarity}
          )
          ON CONFLICT (id) DO UPDATE
          SET 
            code = ${cardData.code}, name = ${cardData.name}, type = ${cardData.type}, 
            color = ${cardData.color}, cost = ${cardData.cost}, power = ${cardData.power}, 
            counter = ${counterValue}, effect = ${cardData.effect}, rarity = ${cardData.rarity}, 
            "imageUrl" = ${cardData.imageUrl}, set = ${cardData.set}, attribute = ${cardData.attribute}, 
            "attributeImage" = ${cardData.attributeImage}, family = ${cardData.family}, 
            ability = ${cardData.ability}, trigger = ${cardData.trigger}, notes = ${cardData.notes}, 
            "setCode" = ${cardData.set?.match(/\[(.*?)\]/)?.[1] || cardData.set?.split(' ')[0]}, 
            "rarityName" = ${cardData.rarity}
        `
        importedCount++
        
        if (importedCount % 100 === 0) {
          console.log(`${importedCount} cartes importées...`)
        }
      } catch (error) {
        console.error(`Erreur lors de l'importation de la carte ${cardData.id}:`, error)
      }
    }
    
    console.log(`Importation terminée. ${importedCount} cartes importées avec succès.`)
    
  } catch (error) {
    console.error('Erreur lors de l\'importation:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Fonction pour déterminer la couleur de la rareté
function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'C': return '#A0A0A0' // Common - Gris
    case 'UC': return '#0000FF' // Uncommon - Bleu
    case 'R': return '#FF0000' // Rare - Rouge
    case 'SR': return '#FF00FF' // Super Rare - Magenta
    case 'SEC': return '#FFD700' // Secret - Or
    case 'L': return '#00FF00' // Leader - Vert
    default: return '#FFFFFF' // Autre - Blanc
  }
}

// Fonction pour déterminer le taux de drop de la rareté
function getRarityDropRate(rarity: string): number {
  switch (rarity) {
    case 'C': return 0.70 // 70%
    case 'UC': return 0.20 // 20%
    case 'R': return 0.07 // 7%
    case 'SR': return 0.02 // 2%
    case 'SEC': return 0.01 // 1%
    case 'L': return 0.05 // 5%
    default: return 0.01 // Autre - 1%
  }
}

importCards() 