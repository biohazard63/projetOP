import { PrismaClient } from '@prisma/client'
import { SET_RULES } from './configureSetRules'

const prisma = new PrismaClient()

// Fonction pour normaliser le code du set
function normalizeSetCode(setCode: string): string {
  // Si le code est au format OP09, le convertir en OP-09
  if (setCode.match(/^OP\d{2}$/)) {
    return `OP-${setCode.substring(2)}`
  }
  return setCode
}

// Fonction pour obtenir les deux formats possibles d'un code de set
function getSetCodeVariants(setCode: string): string[] {
  const variants = [setCode]
  if (setCode.match(/^OP\d{2}$/)) {
    variants.push(`OP-${setCode.substring(2)}`)
  } else if (setCode.match(/^OP-\d{2}$/)) {
    variants.push(`OP${setCode.substring(3)}`)
  }
  return variants
}

interface DropStats {
  total: number
  byRarity: {
    [rarity: string]: {
      count: number
      percentage: number
    }
  }
  byType: {
    [type: string]: {
      count: number
      percentage: number
    }
  }
  altArt: {
    count: number
    percentage: number
  }
}

async function simulateBoosterOpenings(setCode: string, numOpenings: number) {
  const variants = getSetCodeVariants(setCode)
  console.log(`\nSimulation de ${numOpenings} ouvertures de boosters pour le set ${variants.join(' / ')}...`)
  console.log('==================================================')

  try {
    // Récupérer l'utilisateur test
    const testUser = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    })

    if (!testUser) {
      console.log('Utilisateur test non trouvé')
      return
    }

    // Récupérer le booster pour ce set (essayer les deux formats)
    let booster = null
    for (const variant of variants) {
      booster = await prisma.booster.findFirst({
        where: { setCode: variant }
      })
      if (booster) break
    }

    if (!booster) {
      console.log(`Aucun booster trouvé pour le set ${variants.join(' / ')}`)
      return
    }

    const stats: DropStats = {
      total: 0,
      byRarity: {},
      byType: {},
      altArt: {
        count: 0,
        percentage: 0
      }
    }

    // Simuler les ouvertures
    for (let i = 0; i < numOpenings; i++) {
      // Générer un booster
      const cards = await generateBooster(booster.id)

      // Mettre à jour les statistiques
      for (const card of cards) {
        stats.total++
        
        // Statistiques par rareté
        if (!stats.byRarity[card.rarity]) {
          stats.byRarity[card.rarity] = { count: 0, percentage: 0 }
        }
        stats.byRarity[card.rarity].count++

        // Statistiques par type
        if (!stats.byType[card.type]) {
          stats.byType[card.type] = { count: 0, percentage: 0 }
        }
        stats.byType[card.type].count++

        // Statistiques pour les cartes alternatives
        if (card.isAltArt) {
          stats.altArt.count++
        }
      }
    }

    // Calculer les pourcentages
    for (const rarity in stats.byRarity) {
      stats.byRarity[rarity].percentage = (stats.byRarity[rarity].count / stats.total) * 100
    }

    for (const type in stats.byType) {
      stats.byType[type].percentage = (stats.byType[type].count / stats.total) * 100
    }

    stats.altArt.percentage = (stats.altArt.count / stats.total) * 100

    // Afficher les résultats
    console.log('\nRésultats de la simulation :')
    console.log('----------------------------')
    console.log(`Nombre total de cartes : ${stats.total}`)
    
    console.log('\nDistribution par rareté :')
    for (const rarity in stats.byRarity) {
      console.log(`${rarity}: ${stats.byRarity[rarity].count} (${stats.byRarity[rarity].percentage.toFixed(2)}%)`)
    }
    
    console.log('\nDistribution par type :')
    for (const type in stats.byType) {
      console.log(`${type}: ${stats.byType[type].count} (${stats.byType[type].percentage.toFixed(2)}%)`)
    }
    
    console.log('\nCartes alternatives :')
    console.log(`Nombre: ${stats.altArt.count} (${stats.altArt.percentage.toFixed(2)}%)`)

  } catch (error) {
    console.error('Erreur lors de la simulation:', error)
  }
}

async function generateBooster(boosterId: string) {
  // Récupérer toutes les cartes du booster avec leurs probabilités
  const boosterCards = await prisma.boosterCard.findMany({
    where: { boosterId },
    include: { card: true }
  })

  // Grouper les cartes par rareté
  const cardsByRarity: Record<string, Array<{ card: any, probability: number }>> = {}
  for (const boosterCard of boosterCards) {
    if (!cardsByRarity[boosterCard.card.rarity]) {
      cardsByRarity[boosterCard.card.rarity] = []
    }
    cardsByRarity[boosterCard.card.rarity].push({
      card: boosterCard.card,
      probability: boosterCard.probability
    })
  }

  // Générer un booster de 12 cartes
  const booster = []
  
  // 6 cartes communes
  for (let i = 0; i < 6; i++) {
    if (cardsByRarity['C'] && cardsByRarity['C'].length > 0) {
      const card = selectCardByProbability(cardsByRarity['C'])
      if (card) booster.push(card)
    }
  }

  // 3 cartes peu communes
  for (let i = 0; i < 3; i++) {
    if (cardsByRarity['UC'] && cardsByRarity['UC'].length > 0) {
      const card = selectCardByProbability(cardsByRarity['UC'])
      if (card) booster.push(card)
    }
  }

  // 2 cartes rares
  for (let i = 0; i < 2; i++) {
    if (cardsByRarity['R'] && cardsByRarity['R'].length > 0) {
      const card = selectCardByProbability(cardsByRarity['R'])
      if (card) booster.push(card)
    }
  }

  // 1 carte super rare, légendaire, secrète, TR, SP CARD ou P
  const rareTypes = ['SR', 'L', 'SEC', 'TR', 'SP CARD', 'P']
  const rareType = rareTypes[Math.floor(Math.random() * rareTypes.length)]
  if (cardsByRarity[rareType] && cardsByRarity[rareType].length > 0) {
    const card = selectCardByProbability(cardsByRarity[rareType])
    if (card) booster.push(card)
  } else if (cardsByRarity['SR'] && cardsByRarity['SR'].length > 0) {
    const card = selectCardByProbability(cardsByRarity['SR'])
    if (card) booster.push(card)
  }

  // Compléter avec des cartes communes si nécessaire
  while (booster.length < 12) {
    if (cardsByRarity['C'] && cardsByRarity['C'].length > 0) {
      const card = selectCardByProbability(cardsByRarity['C'])
      if (card) booster.push(card)
    } else {
      break
    }
  }

  return booster
}

function selectCardByProbability(cards: Array<{ card: any, probability: number }>) {
  const totalProbability = cards.reduce((sum, card) => sum + card.probability, 0)
  let random = Math.random() * totalProbability
  
  for (const { card, probability } of cards) {
    random -= probability
    if (random <= 0) {
      return card
    }
  }
  
  return cards[0]?.card // Retourner la première carte si aucune n'est sélectionnée
}

async function simulateAllSets() {
  console.log('Début de la simulation pour tous les sets...\n')

  // Simuler pour chaque set
  for (const setCode in SET_RULES) {
    if (setCode.startsWith('OP')) { // On ne simule que les sets principaux
      await simulateBoosterOpenings(setCode, 1000)
    }
  }
}

// Exécuter la simulation
simulateAllSets()
  .catch(console.error)
  .finally(() => prisma.$disconnect()) 